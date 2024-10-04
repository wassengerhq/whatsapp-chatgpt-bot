import OpenAI from 'openai'
import config from './config.js'
import { state } from './store.js'
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

  // Skip replying chats that were archived, when applicable
  if (config.skipArchivedChats && (chat.status === 'archived' || chat.waStatus === 'archived')) {
    return false
  }

  return true
}

// Send message back to the user and perform post-message required actions like
// adding labels to the chat or updating the chat's contact metadata
function replyMessage ({ data, device }) {
  return async ({ message, ...params }) => {
    const { phone } = data.chat.contact

    await actions.sendMessage({
      phone,
      device: device.id,
      message,
      ...params
    })

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

// Process message received from the user on every new inbound webhook event
export async function processMessage ({ data, device } = {}) {
  // Can reply to this message?
  if (!canReply({ data, device })) {
    return console.log('[info] Skip message - chat is not eligible to reply due to active filters:', data.fromNumber, data.date, data.body)
  }

  const reply = replyMessage({ data, device })
  const { chat } = data
  const body = data?.body?.trim().slice(0, 1000)

  console.log('[info] New inbound message received:', chat.id, body || '<empty message>')

  // First inbound message, reply with a welcome message
  if (!data.chat.lastOutboundMessageAt || data.meta.isFirstMessage) {
    const message = `${config.welcomeMessage}\n\n${config.defaultMessage}}`
    return await reply({ message })
  }

  if (!body) {
    // Default to unknown command response
    const unknownCommand = `${config.unknownCommandMessage}\n\n${config.defaultMessage}`
    await reply({ message: unknownCommand })
  }

  // Assign the chat to an random agent
  if (/^human|person|help|stop$/i.test(body) || /^human/i.test(body)) {
    actions.assignChatToAgent({ data, device }).catch(err => {
      console.error('[error] failed to assign chat to user:', data.chat.id, err.message)
    })
    return await reply({
      message: `This chat was assigned to a member of our support team. You will be contacted shortly.`,
    })
  }

  // Generate response using AI
  if (!state[data.chat.id]) {
    console.log('[info] fetch previous messages history for chat:', data.chat.id)
    await actions.pullChatMessages({ data, device })
  }

  // Compose chat previous messages to context awareness better AI responses
  const previousMessages = Object.values(state[data.chat.id] || {})
    .reverse()
    .slice(0, 40)
    .map(message => ({
      role: message.flow === 'inbound' ? 'user' : 'assistant',
      content: message.body
    }))
    .filter(message => message.content).slice(-20)

  const messages = [
    { role: 'system', content: config.botInstructions },
    ...previousMessages,
    { role: 'user', content: body }
  ]

  const tools = (config.functions || []).filter(x => x && x.name).map(({ name, description, parameters, strict }) => (
    { type: 'function', function: { name, description, parameters, strict } }
  ))

  // Generate response using AI
  const completion = await ai.chat.completions.create({
    tools,
    messages,
    temperature: 0.2,
    model: config.openaiModel,
    user: `${device.id}_${chat.id}`
  })

  // Reply with the AI generated message
  if (completion.choices && completion.choices.length) {
    const [response] = completion.choices

    // If response is a function call, return the custom result
    if (response.message?.tool_calls?.length) {
      let message = ''

      // Call tool functions triggerd by the AI
      const calls = response.message.tool_calls.filter(x => x.id && x.type === 'function')
      for (const call of calls) {
        const func = config.functions.find(x => x.name === call.function.name)
        if (func && typeof func.run === 'function') {
          const parameters = parseArguments(call.function.arguments)
          console.log('[info] run function:', call.function.name, parameters)
          message = await func.run({ message, parameters, response, data, device, messages })
        } else if (!func) {
          console.error('[warning] missing function call in config.functions', call.function.name)
        }
      }
      await reply({ message })
    }

    // Otherwise forward the AI generate message
    return await reply({ message: response.message.content || config.unknownCommandMessage })
  }

  // Unknown default response
  const unknownCommand = `${config.unknownCommandMessage}\n\n${config.defaultMessage}`
  await reply({ message: unknownCommand })
}
