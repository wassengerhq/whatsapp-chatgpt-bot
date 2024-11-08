import functions from './functions.js'
const { env } = process

//
// CONFIGURATION
// Set your API keys and edit the configuration as needed for your use case.
//

// Required. Specify the Wassenger API key to be used
// You can obtain it here: https://app.wassenger.com/developers/apikeys
const apiKey = env.API_KEY || 'ENTER API KEY HERE'

// Required. Specify the OpenAI API key to be used
// You can sign up for free here: https://platform.openai.com/signup
// Obtain your API key here: https://platform.openai.com/account/api-keys
const openaiKey = env.OPENAI_API_KEY || ''

// Required. Set the OpenAI model to use.
// You can use a pre-existing model or create your fine-tuned model.
// Fastest and cheapest: gpt-4o-mini
// Recommended: gpt-4o
// List of available models: https://platform.openai.com/docs/models
const openaiModel = env.OPENAI_MODEL || 'gpt-4o'

// Ngrok tunnel authentication token.
// Required if webhook URL is not provided or running the program from your computer.
// sign up for free and get one: https://ngrok.com/signup
// Learn how to obtain the auth token: https://ngrok.com/docs/agent/#authtokens
const ngrokToken = env.NGROK_TOKEN || ''

// Default message when the user sends an unknown message.
const unknownCommandMessage = `I'm sorry, I can only understand text. Can you please describe your query?

If you would like to chat with a human, just reply with *human*.`

// Default welcome message. Change it as you need.
const welcomeMessage = 'Hey there 👋 Welcome to this ChatGPT-powered AI chatbot demo using *Wassenger API*! I can also speak many languages 😁'

// AI bot instructions to adjust its bevarior. Change it as you need.
// Use concise and clear instructions.
const botInstructions = `You are a smart virtual customer support assistant who works for Wassenger.
You can identify yourself as Molly, the Wassenger AI Assistant.
You will be chatting with random customers who may contact you with general queries about the product.
Wassenger is a cloud solution that offers WhatsApp API and multi-user live communication services designed for businesses and developers.
Wassenger also enables customers to automate WhatsApp communication and build chatbots.
You are an expert customer support agent.
Be polite. Be helpful. Be emphatic. Be concise.
Politely reject any queries that are not related to customer support tasks or Wassenger services itself.
Stick strictly to your role as a customer support virtual assistant for Wassenger.
Always speak in the language the user prefers or uses.
If you can't help with something, ask the user to type *human* in order to talk with customer support.
Do not use Markdown formatted and rich text, only raw text.`

// Default help message. Change it as you need.
const defaultMessage = `Don't be shy 😁 try asking anything to the AI chatbot, using natural language!

Example queries:

1️⃣ Explain me what is Wassenger
2️⃣ Can I use Wassenger to send automatic messages?
3️⃣ Can I schedule messages using Wassenger?
4️⃣ Is there a free trial available?

Type *human* to talk with a person. The chat will be assigned to an available member of the team.

Give it a try! 😁`

// Chatbot features. Edit as needed.
const features = {
  // Enable or disable text input processing
  audioInput: true,
  // Enable or disable audio voice responses.
  // By default the bot will only reply with an audio messages if the user sends an audio message first.
  audioOutput: true,
  // Reply only using audio voice messages instead of text.
  // Requires "features.audioOutput" to be true.
  audioOnly: false,
  // Audio voice to use for the bot responses. Requires "features.audioOutput" to be true.
  // Options: 'alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'
  // More info: https://platform.openai.com/docs/guides/text-to-speech
  voice: 'echo',
  // Audio voice speed from 0.25 to 2. Requires "features.audioOutput" to be true.
  voiceSpeed: 1,
  // Enable or disable image input processing
  // Note: image processing can significnantly increase the AI token processing costs compared to text
  imageInput: true
}

// Template messages to be used by the chatbot on specific scenarios. Customize as needed.
const templateMessages = {
  // When the user sends an audio message that is not supported or transcription failed
  noAudioAccepted: 'Audio messages are not supported: gently ask the user to send text messages only.',
  // Chat assigned to a human agent
  chatAssigned: 'You will be contact shortly by someone from our team. Thank you for your patience.'
}

const limits = {
  // Required. Maximum number of characters from user inbound messages to be procesed.
  // Exceeding characters will be ignored.
  maxInputCharacters: 1000,
  // Required: maximum number of tokens to generate in AI responses.
  // The number of tokens is the length of the response text.
  // Tokens represent the smallest unit of text the model can process and generate.
  // AI model cost is primarely based on the input/output tokens.
  // Learn more about tokens: https://platform.openai.com/docs/concepts#tokens
  maxOutputTokens: 1000,
  // Required. Maximum number of messages to store in cache per user chat.
  // A higher number means higher OpenAI costs but more accurate responses thanks to more conversational context.
  // The recommendation is to keep it between 10 and 20.
  chatHistoryLimit: 20,
  // Required. Maximum number of messages that the bot can reply on a single chat.
  // This is useful to prevent abuse from users sending too many messages.
  // If the limit is reached, the chat will be automatically assigned to an agent
  // and the metadata key will be addded to the chat contact: "bot:chatgpt:status" = "too_many_messages"
  maxMessagesPerChat: 500,
  // Maximum number of messages per chat counter time window to restart the counter in seconds.
  maxMessagesPerChatCounterTime: 24 * 60 * 60,
  // Maximum input audio duration in seconds: default to 2 minutes
  // If the audio duration exceeds this limit, the message will be ignored.
  maxAudioDuration: 2 * 60,
  // Maximum image size in bytes: default to 2 MB
  // If the image size exceeds this limit, the message will be ignored.
  maxImageSize: 2 * 1024 * 1024
}

// TODO: knowledge files are not yet supported
// Knowledge files to be used for the AI model contextual data augmentation at processing time.
// Files should be stored in the `files/*` folder.
// Supported file formats and extentions: pdf, docx, txt, html, md
const knowledge = [
  { id: 'faq', path: 'faq.pdf' },
  { id: 'webhooks', path: 'webhooks.pdf' },
  { id: 'pricing', path: 'pricing.html' }
]

// Chatbot config
export default {
  // Required. Wassenger API key to be used. See the `apiKey` declaration above.
  apiKey,

  // Required. Specify the OpenAI API key to be used. See the `openaiKey` declaration above.
  // You can sign up for free here: https://platform.openai.com/signup
  // Obtain your API key here: https://platform.openai.com/account/api-keys
  openaiKey,

  // Required. Set the OpenAI model to use. See the `openaiModel` declaration above.
  // You can use a pre-existing model or create your fine-tuned model.
  openaiModel,

  // Optional. Specify the Wassenger device ID (24 characters hexadecimal length) to be used for the chatbot
  // If no device is defined, the first connected WhatsApp device will be used.
  // In case you have multiple WhatsApp number connected in your Wassenter account, you should specify the device ID to be used.
  // Obtain the device ID in the Wassenger app: https://app.wassenger.com/number
  device: env.DEVICE || 'ENTER WHATSAPP DEVICE ID',

  // Callable functions for RAG to be interpreted by the AI. Optional.
  // See: functions.js
  // Edit as needed to cover your business use cases.
  // Using it you can instruct the AI to inform you to execute arbitrary functions
  // in your code based in order to augment information for a specific user query.
  // For example, you can call an external CRM in order to retrieve, save or validate
  // specific information about the customer, such as email, phone number, user ID, etc.
  // Learn more here: https://platform.openai.com/docs/guides/function-calling
  functions,

  // Supported AI features: see features declaration above
  features,

  // Limits for the chatbot: see limits declaration above
  limits,

  // Template message responses
  templateMessages,

  // Knowledge files to be used for the AI model training. See knowledge declaration above
  knowledge,

  // Optional. HTTP server TCP port to be used. Defaults to 8080
  port: +env.PORT || 8080,

  // Optional. Use NODE_ENV=production to run the chatbot in production mode
  production: env.NODE_ENV === 'production',

  // Optional. Specify the webhook public URL to be used for receiving webhook events
  // If no webhook is specified, the chatbot will autoamtically create an Ngrok tunnel
  // and register it as the webhook URL.
  // IMPORTANT: in order to use Ngrok tunnels, you need to sign up for free, see the option below.
  webhookUrl: env.WEBHOOK_URL,

  // Ngrok tunnel authentication token.
  // Required if webhook URL is not provided or running the program from your computer.
  // sign up for free and get one: https://ngrok.com/signup
  // Learn how to obtain the auth token: https://ngrok.com/docs/agent/#authtokens
  ngrokToken,

  // Optional. Full path to the ngrok binary.
  ngrokPath: env.NGROK_PATH,

  // Temporal files path to store audio and image files. Defaults to `.tmp/`
  tempPath: '.tmp',

  // Set one or multiple labels on chatbot-managed chats
  setLabelsOnBotChats: ['bot'],

  // Remove labels when the chat is assigned to a person
  removeLabelsAfterAssignment: true,

  // Set one or multiple labels on chatbot-managed chats
  setLabelsOnUserAssignment: ['from-bot'],

  // Optional. Set a list of labels that will tell the chatbot to skip it
  skipChatWithLabels: ['no-bot'],

  // Optional. Ignore processing messages sent by one of the following numbers
  // Important: the phone number must be in E164 format with no spaces or symbols
  // Example number: 1234567890
  numbersBlacklist: ['1234567890'],

  // Optional. OpenAI model completion inference params
  // Learn more: https://platform.openai.com/docs/api-reference/chat/create
  inferenceParams: {
    temperature: 0.2
  },

  // Optional. Only process messages one of the the given phone numbers
  // Important: the phone number must be in E164 format with no spaces or symbols
  // Example number: 1234567890
  numbersWhitelist: [],

  // Skip chats that were archived in WhatsApp
  skipArchivedChats: true,

  // If true, when the user requests to chat with a human, the bot will assign
  // the chat to a random available team member.
  // You can specify which members are eligible to be assigned using the `teamWhitelist`
  // and which should be ignored using `teamBlacklist`
  enableMemberChatAssignment: true,

  // If true, chats assigned by the bot will be only assigned to team members that are
  // currently available and online (not unavailable or offline)
  assignOnlyToOnlineMembers: false,

  // Optional. Skip specific user roles from being automatically assigned by the chat bot
  // Available roles are: 'admin', 'supervisor', 'agent'
  skipTeamRolesFromAssignment: ['admin'], // 'supervisor', 'agent'

  // Enter the team member IDs (24 characters length) that can be eligible to be assigned
  // If the array is empty, all team members except the one listed in `skipMembersForAssignment`
  // will be eligible for automatic assignment
  teamWhitelist: [],

  // Optional. Enter the team member IDs (24 characters length) that should never be automatically assigned chats to
  teamBlacklist: [],

  // Optional. Set metadata entries on bot-assigned chats
  setMetadataOnBotChats: [
    {
      key: 'bot_start',
      value: () => new Date().toISOString()
    }
  ],

  // Optional. Set metadata entries when a chat is assigned to a team member
  setMetadataOnAssignment: [
    {
      key: 'bot_stop',
      value: () => new Date().toISOString()
    }
  ],

  defaultMessage,
  botInstructions,
  welcomeMessage,
  unknownCommandMessage,

  // Do not change: specifies the base URL for the Wassenger API
  apiBaseUrl: env.API_URL || 'https://api.wassenger.com/v1'
}
