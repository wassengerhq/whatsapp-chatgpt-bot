import axios from 'axios'
import config from './config.js'
import { state, cache, cacheTTL } from './store.js'

// Base URL API endpoint. Do not edit!
const API_URL = process.env.API_URL || 'https://api.wassenger.com/v1'

// Function to send a message using the Wassenger API
export async function sendMessage ({ phone, message, media, device, ...fields }) {
  const url = `${API_URL}/messages`
  const body = {
    phone,
    message,
    media,
    device,
    ...fields,
    enqueue: 'never'
  }

  let retries = 3
  while (retries) {
    retries -= 1
    try {
      const res = await axios.post(url, body, {
        headers: { Authorization: config.apiKey }
      })
      console.log('[info] Message sent:', phone, res.data.id, res.data.status)
      return res.data
    } catch (err) {
      console.error('[error] failed to send message:', phone, message || (body.list ? body.list.description : '<no message>'), err.response ? err.response.data : err)
    }
  }
  return false
}

export async function pullMembers (device) {
  if (cache.members && +cache.members.time && (Date.now() - +cache.members.time) < cacheTTL) {
    return cache.members.data
  }
  const url = `${API_URL}/devices/${device.id}/team`
  const { data: members } = await axios.get(url, { headers: { Authorization: config.apiKey } })
  cache.members = { data: members, time: Date.now() }
  return members
}

export async function validateMembers (device, members) {
  const validateMembers = (config.teamWhitelist || []).concat(config.teamBlacklist || [])
  for (const id of validateMembers) {
    if (typeof id !== 'string' || string.length !== 24) {
      return exit('Team user ID in config.teamWhitelist and config.teamBlacklist must be a 24 characters hexadecimal value:', id)
    }
    const exists = members.some(user => user.id === id)
    if (!exists) {
      return exit('Team user ID in config.teamWhitelist or config.teamBlacklist does not exist:', id)
    }
  }
}

export async function createLabels (device) {
  const labels = cache.labels.data || []
  const requiredLabels = (config.setLabelsOnUserAssignment || []).concat(config.setLabelsOnBotChats || [])
  const missingLabels = requiredLabels.filter(label => labels.every(l => l.name !== label))
  for (const label of missingLabels) {
    console.log('[info] creating missing label:', label)
    const url = `${API_URL}/devices/${device.id}/labels`
    const body = {
      name: label.slice(0, 30).trim(),
      color: [
        'tomato', 'orange', 'sunflower', 'bubble',
        'rose', 'poppy', 'rouge', 'raspberry',
        'purple', 'lavender', 'violet', 'pool',
        'emerald', 'kelly', 'apple', 'turquoise',
        'aqua', 'gold', 'latte', 'cocoa'
      ][Math.floor(Math.random() * 20)],
      description: 'Automatically created label for the chatbot'
    }
    try {
      await axios.post(url, body, { headers: { Authorization: config.apiKey } })
    } catch (err) {
      console.error('[error] failed to create label:', label, err.message)
    }
  }
  if (missingLabels.length) {
    await pullLabels(device, { force: true })
  }
}

export async function pullLabels (device, { force } = {}) {
  if (!force && cache.labels && +cache.labels.time && (Date.now() - +cache.labels.time) < cacheTTL) {
    return cache.labels.data
  }
  const url = `${API_URL}/devices/${device.id}/labels`
  const { data: labels } = await axios.get(url, { headers: { Authorization: config.apiKey } })
  cache.labels = { data: labels, time: Date.now() }
  return labels
}

export async function updateChatLabels ({ data, device, labels }) {
  const url = `${API_URL}/chat/${device.id}/chats/${data.chat.id}/labels`
  const newLabels = (data.chat.labels || [])
  for (const label of labels) {
    if (newLabels.includes(label)) {
      newLabels.push(label)
    }
  }
  if (newLabels.length) {
    console.log('[info] update chat labels:', data.chat.id, newLabels)
    await axios.patch(url, newLabels, { headers: { Authorization: config.apiKey } })
  }
}

export async function updateChatMetadata ({ data, device, metadata }) {
  const url = `${API_URL}/chat/${device.id}/contacts/${data.chat.id}/metadata`
  const entries = []
  const contactMetadata = data.chat.contact.metadata
  for (const entry of metadata) {
    if (entry && entry.key && entry.value) {
      const value = typeof entry.value === 'function' ? entry.value() : value
      if (!entry.key || !value || typeof entry.key !== 'string' || typeof value !== 'string') {
        continue
      }
      if (contactMetadata && contactMetadata.some(e => e.key === entry.key && e.value === value)) {
        continue // skip if metadata entry is already present
      }
      entries.push({
        key: entry.key.slice(0, 30).trim(),
        value: value.slice(0, 1000).trim()
      })
    }
  }
  if (entries.length) {
    await axios.patch(url, entries, { headers: { Authorization: config.apiKey } })
  }
}

export async function selectAssignMember (device) {
  const members = await pullMembers(device)

  const isMemberEligible = (member) => {
    if (config.teamBlacklist.length && config.teamBlacklist.includes(member.id)) {
      return false
    }
    if (config.teamWhitelist.length && !config.teamWhitelist.includes(member.id)) {
      return false
    }
    if (config.assignOnlyToOnlineMembers && (member.availability.mode !== 'auto' || ((Date.now() - +new Date(member.lastSeenAt)) > 30 * 60 * 1000))) {
      return false
    }
    if (config.skipTeamRolesFromAssignment && config.skipTeamRolesFromAssignment.some(role => member.role === role)) {
      return false
    }
    return true
  }

  const activeMembers = members.filter(member => member.status === 'active' && isMemberEligible(member))
  if (!activeMembers.length) {
    return console.log('[warning] Unable to assign chat: no eligible team members')
  }

  const targetMember = activeMembers[activeMembers.length * Math.random() | 0]
  return targetMember
}

async function assignChat ({ member, data, device }) {
  const url = `${API_URL}/chat/${device.id}/chats/${data.chat.id}/owner`
  const body = { agent: member.id }
  await axios.patch(url, body, { headers: { Authorization: config.apiKey } })

  if (config.setMetadataOnAssignment && config.setMetadataOnAssignment.length) {
    const metadata = config.setMetadataOnAssignment.filter(entry => entry && entry.key && entry.value).map(({ key, value }) => ({ key, value }))
    await updateChatMetadata({ data, device, metadata })
  }
}

export async function assignChatToAgent ({ data, device }) {
  if (!config.enableMemberChatAssignment) {
    return console.log('[debug] Unable to assign chat: member chat assignment is disabled. Enable it in config.enableMemberChatAssignment = true')
  }
  try {
    const member = await selectAssignMember(device)
    if (member) {
      let updateLabels = []

      // Remove labels before chat assigned, if required
      if (config.removeLabelsAfterAssignment && config.setLabelsOnBotChats && config.setLabelsOnBotChats.length) {
        const labels = (data.chat.labels || []).filter(label => !config.setLabelsOnBotChats.includes(label))
        console.log('[info] remove labels before assiging chat to user', data.chat.id, labels)
        if (labels.length) {
          updateLabels = labels
        }
      }

      // Set labels on chat assignment, if required
      if (config.setLabelsOnUserAssignment && config.setLabelsOnUserAssignment.length) {
        let labels = (data.chat.labels || [])
        if (updateLabels.length) {
          labels = labels.filter(label => !updateLabels.includes(label))
        }
        for (const label of config.setLabelsOnUserAssignment) {
          if (!updateLabels.includes(label)) {
            updateLabels.push(label)
          }
        }
      }

      if (updateLabels.length) {
        console.log('[info] set labels on chat assignment to user', data.chat.id, updateLabels)
        await updateChatLabels({ data, device, labels: updateLabels })
      }

      console.log('[info] automatically assign chat to user:', data.chat.id, member.displayName, member.email)
      await assignChat({ member, data, device })
    } else {
      console.log('[info] Unable to assign chat: no eligible or available team members based on the current configuration:', data.chat.id)
    }
    return member
  } catch (err) {
    console.error('[error] failed to assign chat:', data.id, data.chat.id, err)
  }
}

export async function pullChatMessages ({ data, device }) {
  try {
    const url = `${API_URL}/chat/${device.id}/messages/?chat=${data.chat.id}&limit=25`
    const res = await axios.get(url, { headers: { Authorization: config.apiKey } })
    state[data.chat.id] = res.data.reduce((acc, message) => {
      acc[message.id] = message
      return acc
    }, state[data.chat.id] || {})
    return res.data
  } catch (err) {
    console.error('[error] failed to pull chat messages history:', data.id, data.chat.id, err)
  }
}

// Find an active WhatsApp device connected to the Wassenger API
export async function loadDevice () {
  const url = `${API_URL}/devices`
  const { data } = await axios.get(url, {
    headers: { Authorization: config.apiKey }
  })
  if (config.device && !config.device.includes(' ')) {
    if (/^[a-f0-9]{24}$/i.test(config.device) === false) {
      return exit('Invalid WhatsApp device ID: must be 24 characers hexadecimal value. Get the device ID here: https://app.wassenger.com/number')
    }
    return data.find(device => device.id === config.device)
  }
  return data.find(device => device.status === 'operative')
}

// Function to register a Ngrok tunnel webhook for the chatbot
// Only used in local development mode
export async function registerWebhook (tunnel, device) {
  const webhookUrl = `${tunnel}/webhook`

  const url = `${API_URL}/webhooks`
  const { data: webhooks } = await axios.get(url, {
    headers: { Authorization: config.apiKey }
  })

  const findWebhook = webhook => {
    return (
      webhook.url === webhookUrl &&
      webhook.device === device.id &&
      webhook.status === 'active' &&
      webhook.events.includes('message:in:new')
    )
  }

  // If webhook already exists, return it
  const existing = webhooks.find(findWebhook)
  if (existing) {
    return existing
  }

  for (const webhook of webhooks) {
    // Delete previous ngrok webhooks
    if (webhook.url.includes('ngrok-free.app') || webhook.url.startsWith(tunnel)) {
      const url = `${API_URL}/webhooks/${webhook.id}`
      await axios.delete(url, { headers: { Authorization: config.apiKey } })
    }
  }

  await new Promise(resolve => setTimeout(resolve, 500))
  const data = {
    url: webhookUrl,
    name: 'Chatbot',
    events: ['message:in:new'],
    device: device.id
  }

  const { data: webhook } = await axios.post(url, data, {
    headers: { Authorization: config.apiKey }
  })

  return webhook
}

export function exit (msg, ...args) {
  console.error('[error]', msg, ...args)
  process.exit(1)
}

