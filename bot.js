import path from 'path'
import fs from 'fs/promises'
import OpenAI from 'openai'
import config from './config.js'
import { state, stats } from './store.js'
import * as actions from './actions.js'

// Initialize OpenAI client
const ai = new OpenAI({ apiKey: config.openaiKey })

// Determine if a given inbound message can be replied by the AI bot
function canReply ({ data, device }) {
  const { chat } = data

  // Skip chat if already assigned to a team member
  if (chat.owner?.agent) {
    return false
  }

  // Skip messages receive from the same number: prevent self-reply loops
  if (chat.fromNumber === device.phone) {
    console.log('[debug] Skip message: cannot chat with your own WhatsApp number:', device.phone)
    return false
  }

  // Skip messages from group chats and channels
  if (chat.type !== 'chat') {
    return false
  }

  // Skip replying chat if it has one of the configured labels, when applicable
  if (config.skipChatWithLabels && config.skipChatWithLabels.length && chat.labels && chat.labels.length) {
    if (config.skipChatWithLabels.some(label => chat.labels.includes(label))) {
      return false
    }
  }

  // Only reply to chats that were whitelisted, when applicable
  if (config.numbersWhitelist && config.numbersWhitelist.length && chat.fromNumber) {
    if (config.numbersWhitelist.some(number => number === chat.fromNumber || chat.fromNumber.slice(1) === number)) {
      return true
    } else {
      return false
    }
  }

  // Skip replying to chats that were explicitly blacklisted, when applicable
  if (config.numbersBlacklist && config.numbersBlacklist.length && chat.fromNumber) {
    if (config.numbersBlacklist.some(number => number === chat.fromNumber || chat.fromNumber.slice(1) === number)) {
      return false
    }
  }

  // Skip replying to blocked chats
  if (chat.status === 'banned' || chat.waStatus === 'banned') {
    return false
  }

  // Skip blocked contacts
  if (chat.contact?.status === 'blocked') {
    return false
  }

  // Skip replying chats that were archived, when applicable
  if (config.skipArchivedChats && (chat.status === 'archived' || chat.waStatus === 'archived')) {
    return false
  }

  return true
}

// Send message back to the user and perform post-message required actions like
// adding labels to the chat or updating the chat's contact metadata
function replyMessage ({ data, device, useAudio }) {
  return async ({ message, ...params }, { text } = {}) => {
    const { phone } = data.chat.contact

    // If audio mode, create a new voice message
    let fileId = null
    if (config.features.audioOutput && !text && message.length <= 4096 && (useAudio || config.features.audioOnly)) {
      // Send recording audio chat state in background
      actions.sendTypingState({ data, device, action: 'recording' })

      // Generate audio recording
      console.log('[info] generating audio response for chat:', data.fromNumber, message)
      const audio = await ai.audio.speech.create({
        input: message,
        model: 'tts-1',
        voice: config.features.voice,
        response_format: 'mp3',
        speed: config.features.voiceSpeed
      })

      const timestamp = Date.now().toString(16)
      const random = Math.floor(Math.random() * 0xfffff).toString(16)
      fileId = `${timestamp}${random}`

      const filepath = path.join(`${config.tempPath}`, `${fileId}.mp3`)
      const buffer = Buffer.from(await audio.arrayBuffer())
      await fs.writeFile(filepath, buffer)
    } else {
      // Send text typing chat state in background
      actions.sendTypingState({ data, device, action: 'typing' })
    }

    const payload = {
      phone,
      device: device.id,
      message,
      reference: 'bot:chatgpt',
      ...params
    }

    if (fileId) {
      payload.message = undefined
      // Get base URL and add path to the webhook
      const schema = new URL(config.webhookUrl)
      const url = `${schema.protocol}//${schema.host}${path.dirname(schema.pathname)}files/${fileId}${schema.search}`
      payload.media = { url, format: 'ptt' }
    }

    const msg = await actions.sendMessage(payload)

    // Store sent message in chat history
    state[data.chat.id] = state[data.chat.id] || {}
    state[data.chat.id][msg.waId] = {
      id: msg.waId,
      flow: 'outbound',
      date: msg.createdAt,
      body: message
    }

    // Increase chat messages quota
    stats[data.chat.id] = stats[data.chat.id] || { messages: 0, time: Date.now() }
    stats[data.chat.id].messages += 1

    // Add bot-managed chat labels, if required
    if (config.setLabelsOnBotChats.length) {
      const labels = config.setLabelsOnBotChats.filter(label => (data.chat.labels || []).includes(label))
      if (labels.length) {
        await actions.updateChatLabels({ data, device, labels })
      }
    }

    // Add bot-managed chat metadata, if required
    if (config.setMetadataOnBotChats.length) {
      const metadata = config.setMetadataOnBotChats.filter(entry => entry && entry.key && entry.value).map(({ key, value }) => ({ key, value }))
      await actions.updateChatMetadata({ data, device, metadata })
    }
  }
}

function parseArguments (json) {
  try {
    return JSON.parse(json || '{}')
  } catch (err) {
    return {}
  }
}

function hasChatMetadataQuotaExceeded (chat) {
  const key = chat.contact?.metadata?.find(x => x.key === 'bot:chatgpt:status')
  if (key?.value === 'too_many_messages') {
    return true
  }
  return false
}

// Messages quota per chat
function hasChatMessagesQuota (chat) {
  const stat = stats[chat.id] = stats[chat.id] || { messages: 0, time: Date.now() }
  if (stat.messages >= config.limits.maxMessagesPerChat) {
    // Reset chat messages quota after the time limit
    if ((Date.now() - stat.time) >= (config.limits.maxMessagesPerChatTime * 1000)) {
      stat.messages = 0
      stat.time = Date.now()
      return true
    }
    return false
  }
  return true
}

// Update chat metadata if messages quota is exceeded
async function updateChatOnMessagesQuota ({ data, device }) {
  const { chat } = data
  if (hasChatMetadataQuotaExceeded(chat)) {
    return false
  }

  await Promise.all([
    // Assign chat to an agent
    actions.assignChatToAgent({
      data,
      device,
      force: true
    }),
    // Update metadata status to 'too_many_messages'
    actions.updateChatMetadata({
      data,
      device,
      metadata: [{ key: 'bot:chatgpt:status', value: 'too_many_messages' }]
    })
  ])
}

// Process message received from the user on every new inbound webhook event
export async function processMessage ({ data, device } = {}, { rag } = {}) {
  // Can reply to this message?
  if (!canReply({ data, device })) {
    return console.log('[info] Skip message - chat is not eligible to reply due to active filters:', data.fromNumber, data.date, data.body)
  }

  const { chat } = data

  // Chat has enough messages quota
  if (!hasChatMessagesQuota(chat)) {
    console.log('[info] Skip message - chat has reached the maximum messages quota:', data.fromNumber)
    return await updateChatOnMessagesQuota({ data, device })
  }

  // Update chat status metadata if messages quota is not exceeded
  if (hasChatMetadataQuotaExceeded(chat)) {
    actions.updateChatMetadata({ data, device, metadata: [{ key: 'bot:chatgpt:status', value: 'active' }] })
      .catch(err => console.error('[error] failed to update chat metadata:', data.chat.id, err.message))
  }

  // If audio message, transcribe it to text
  if (data.type === 'audio') {
    const noAudioMessage = config.templateMessages.noAudioAccepted || 'Audio messages are not supported: gently ask the user to send text messages only.'
    if (config.features.audioInput && +data.media.meta?.duration <= config.limits.maxAudioDuration) {
      const transcription = await actions.transcribeAudio({ message: data, device })
      if (transcription) {
        data.body = transcription
      } else {
        console.error('[error] failed to transcribe audio message:', data.fromNumber, data.date, data.media.id)
        data.body = noAudioMessage
      }
    } else {
      // console.log('[info] skip message - audio input processing is disabled, enable it on config.js:', data.fromNumber)
      data.body = noAudioMessage
    }
  }

  // Extract input body per message type
  if (data.type === 'video' && !data.body) {
    data.body = 'Video message cannot be processed. Send a text message.'
  }
  if (data.type === 'document' && !data.body) {
    data.body = 'Document message cannot be processed. Send a text message.'
  }
  if (data.type === 'location' && !data.body) {
    data.body = `Location: ${data.location.name || ''} ${data.location.address || ''}`
  }
  if (data.type === 'poll' && !data.body) {
    data.body = `Poll: ${data.poll.name || 'unamed'}\n${data.poll.options.map(x => '-' + x.name).join('\n')}`
  }
  if (data.type === 'event' && !data.body) {
    data.body = [
      `Meeting event: ${data.event.name || 'unamed'}`,
      `Description: ${data.event.description || 'no description'}`,
      `Date: ${data.event.date || 'no date'}`,
      `Location: ${data.event.location || 'undefined location'}``Call link: ${data.event.link || 'no call link'}`
    ].join('\n')
  }
  if (data.type === 'contacts') {
    data.body = data.contacts.map(x => `- Contact card: ${x.formattedName || x.name || x.firstName || ''} - Phone: ${x.phones ? x.phones.map(x => x.number || x.waid) : ''}}`).join('\n')
  }

  // User message input
  const body = data?.body?.trim().slice(0, Math.min(config.limits.maxInputCharacters, 10000))
  console.log('[info] New inbound message received:', chat.id, data.type, body || '<empty message>')

  // If input message is audio, reply with an audio message, unless features.audioOutput is false
  const useAudio = data.type === 'audio'

  // Create partial function to reply the chat
  const reply = replyMessage({ data, device, useAudio })

  if (!body) {
    if (data.type !== 'image' || (data.type === 'image' && !config.features.imageInput) || (data.type === 'image' && config.features.imageInput && data.media.size > config.limits.maxImageSize)) {
      // Default to unknown command response
      const unknownCommand = `${config.unknownCommandMessage}\n\n${config.defaultMessage}`
      await reply({ message: unknownCommand }, { text: true })
    }
  }

  // Assign the chat to an random agent
  if (/^human|person|help|stop$/i.test(body) || /^human/i.test(body)) {
    actions.assignChatToAgent({ data, device, force: true }).catch(err => {
      console.error('[error] failed to assign chat to user:', data.chat.id, err.message)
    })
    const message = config.templateMessages.chatAssigned || 'You will be contact shortly by someone from our team. Thank you for your patience.'
    return await reply({ message }, { text: true })
  }

  // Generate response using AI
  if (!state[data.chat.id]) {
    console.log('[info] fetch previous messages history for chat:', data.chat.id)
    await actions.pullChatMessages({ data, device })
  }

  // Chat messages history
  const chatMessages = state[data.chat.id] = state[data.chat.id] || {}

  // Chat configuration
  const { apiBaseUrl } = config

  // Compose chat previous messages to context awareness better AI responses
  const previousMessages = Object.values(chatMessages)
    .sort((a, b) => +new Date(b.date) - +new Date(a.date))
    .slice(0, 40)
    .reverse()
    .map(message => {
      if (message.flow === 'inbound' && !message.body && message.type === 'image' && config.features.imageInput && message.media.size <= config.limits.maxImageSize) {
        const url = apiBaseUrl + message.media.links.download.slice(3) + '?token=' + config.apiKey
        return {
          role: 'user',
          content: [{
            type: 'image_url',
            image_url: { url }
          }, message.media.caption ? { type: 'text', text: message.media.caption } : null].filter(x => x)
        }
      } else {
        return {
          role: message.flow === 'inbound' ? 'user' : (message.role || 'assistant'),
          content: message.body
        }
      }
    })
    .filter(message => message.content).slice(-(+config.limits.chatHistoryLimit || 20))

  const messages = [
    { role: 'system', content: config.botInstructions },
    ...previousMessages
  ]

  const lastMessage = messages[messages.length - 1]
  if (lastMessage.role !== 'user' || lastMessage.content !== body) {
    if (config.features.imageInput && data.type === 'image' && !data.body && data.media.size <= config.limits.maxImageSize) {
      const url = apiBaseUrl + data.media.links.download.slice(3) + '?token=' + config.apiKey
      messages.push({
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url }
          },
          data.media.caption ? { type: 'text', text: data.media.caption } : null
        ].filter(x => x)
      })
    } else {
      messages.push({ role: 'user', content: body })
    }
  }

  // Add tool functions to the AI model, if available
  const tools = (config.functions || []).filter(x => x && x.name).map(({ name, description, parameters, strict }) => (
    { type: 'function', function: { name, description, parameters, strict } }
  ))

  // If knowledge is enabled, query it
  if (rag && body && (data.type === 'text' || data.type === 'audio')) {
    const result = await rag.query(body)
    // const result = await rag.search(body)
    console.log('==> rag result:', result?.content)
    if (result?.content) {
      messages.push({ role: 'assistant', content: result.content })
    }
  }

  // Generate response using AI
  let completion = await ai.chat.completions.create({
    tools,
    messages,
    model: config.openaiModel,
    max_completion_tokens: config.limits.maxOutputTokens,
    temperature: config.inferenceParams.temperature,
    user: `${device.id}_${chat.id}`
  })

  // Reply with unknown / default response on invalid/error
  if (!completion.choices?.length) {
    const unknownCommand = `${config.unknownCommandMessage}\n\n${config.defaultMessage}`
    return await reply({ message: unknownCommand })
  }

  // Process tool function calls, if required by the AI model
  const maxCalls = 10
  let [response] = completion.choices
  let count = 0
  while (response?.message?.tool_calls?.length && count < maxCalls) {
    count += 1

    // If response is a function call, return the custom result
    const responses = []

    // Store tool calls in history
    messages.push({ role: 'assistant', tool_calls: response.message.tool_calls })

    // Call tool functions triggerd by the AI
    const calls = response.message.tool_calls.filter(x => x.id && x.type === 'function')
    for (const call of calls) {
      const func = config.functions.find(x => x.name === call.function.name)
      if (func && typeof func.run === 'function') {
        const parameters = parseArguments(call.function.arguments)
        console.log('[info] run function:', call.function.name, parameters)

        // Run the function and get the response message
        const message = await func.run({ parameters, response, data, device, messages })
        if (message) {
          responses.push({ role: 'tool', content: message, tool_call_id: call.id })
        }
      } else if (!func) {
        console.error('[warning] missing function call in config.functions', call.function.name)
      }
    }

    if (!responses.length) {
      break
    }

    // Add tool responses to the chat history
    messages.push(...responses)

    // Generate a new response based on the tool functions responses
    completion = await ai.chat.completions.create({
      tools,
      messages,
      temperature: 0.2,
      model: config.openaiModel,
      user: `${device.id}_${chat.id}`
    })

    // Reply with unknown / default response on invalid/error
    if (!completion.choices?.length) {
      break
    }
    // Reply with unknown / default response on invalid/error
    response = completion.choices[0]
    if (!response || response.finish_reason === 'stop') {
      break
    }
  }

  // Reply with the AI generated response
  if (completion.choices?.length) {
    return await reply({ message: response?.message?.content || config.unknownCommandMessage })
  }

  // Unknown default response
  const unknownCommand = `${config.unknownCommandMessage}\n\n${config.defaultMessage}`
  await reply({ message: unknownCommand })
}
