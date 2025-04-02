import path from 'path'
import fs from 'fs/promises'
import { createReadStream } from 'fs'
import express from 'express'
import bodyParser from 'body-parser'
import config from './config.js'
import * as bot from './bot.js'
import * as actions from './actions.js'

// Create web server
const app = express()

// Middleware to parse incoming request bodies
app.use(bodyParser.json())

// Index route
app.get('/', (req, res) => {
  res.send({
    name: 'chatbot',
    description: 'WhatsApp ChatGPT powered chatbot for Wassenger',
    endpoints: {
      webhook: {
        path: '/webhook',
        method: 'POST'
      },
      sendMessage: {
        path: '/message',
        method: 'POST'
      },
      sample: {
        path: '/sample',
        method: 'GET'
      }
    }
  })
})

// POST route to handle incoming webhook messages
app.post('/webhook', (req, res) => {
  const { body } = req
  if (!body || !body.event || !body.data) {
    return res.status(400).send({ message: 'Invalid payload body' })
  }
  if (body.event !== 'message:in:new') {
    return res.status(202).send({ message: 'Ignore webhook event: only message:in:new is accepted' })
  }

  // Send immediate response to acknowledge the webhook event
  res.send({ ok: true })

  // Process message response in background
  bot.processMessage(body, { rag: app.rag }).catch(err => {
    console.error('[error] failed to process inbound message:', body.id, body.data.fromNumber, body.data.body, err)
  })
})

// Send message on demand
app.post('/message', (req, res) => {
  const { body } = req
  if (!body || !body.phone || !body.message) {
    return res.status(400).send({ message: 'Invalid payload body' })
  }

  actions.sendMessage(body).then((data) => {
    res.send(data)
  }).catch(err => {
    res.status(+err.status || 500).send(err.response
      ? err.response.data
      : {
          message: 'Failed to send message'
        })
  })
})

// Send a sample message to your own number, or to a number specified in the query string
app.get('/sample', (req, res) => {
  const { phone, message } = req.query
  const data = {
    phone: phone || app.device.phone,
    message: message || 'Hello World from Wassenger!',
    device: app.device.id
  }
  actions.sendMessage(data).then((data) => {
    res.send(data)
  }).catch(err => {
    res.status(+err.status || 500).send(err.response
      ? err.response.data
      : {
          message: 'Failed to send sample message'
        })
  })
})

async function fileExists (filepath) {
  try {
    await fs.access(filepath, fs.constants.F_OK)
    return true
  } catch (err) {
    return false
  }
}

async function fileSize (filepath) {
  try {
    const stat = await fs.stat(filepath)
    return stat.size
  } catch (err) {
    return -1
  }
}

app.get('/files/:id', async (req, res) => {
  if (!(/^[a-f0-9]{15,18}$/i.test(req.params.id))) {
    return res.status(400).send({ message: 'Invalid ID' })
  }

  const filename = `${req.params.id}.mp3`
  const filepath = path.join(config.tempPath, filename)
  if (!(await fileExists(filepath))) {
    return res.status(404).send({ message: 'Invalid or deleted file' })
  }

  const size = await fileSize(filepath)
  if (!size) {
    return res.status(404).send({ message: 'Invalid or deleted file' })
  }

  res.set('Content-Length', size)
  res.set('Content-Type', 'application/octet-stream')

  createReadStream(filepath).pipe(res)

  res.once('close', () => {
    fs.unlink(filepath).catch(err => {
      console.error('[error] failed to delete temp file:', filepath, err.message)
    })
  })
})

app.use((err, req, res, next) => {
  res.status(+err.status || 500).send({
    message: `Unexpected error: ${err.message}`
  })
})

export default app
