## WhatsApp ChatGPT-Powered AI Chatbot Tutorial 🤖 🤖

**Turn your WhatsApp number into a ChatGPT-powered AI powerful chatbot in minutes with this tutorial using the [Wassenger API](https://wassenger.com).**

[![Open in Codeflow](https://developer.stackblitz.com/img/open_in_codeflow.svg)](https:///pr.new/wassengerhq/whatsapp-chatgpt-bot)

Have a powerful AI chatbot based on GPT-4o running in minutes on your computer or server and easily adjust it to cover you own business use cases.

By following this tutorial you will be able to have a fully functional ChatGPT-like AI chatbot running in minutes on your computer or cloud server that behaves like a virtual customer support assistant for a specific business purpose.

You can [easily customize and instruct the AI](#customization) to adjust its behaviour, role, purpose and knowledge boundaries.
Also, the AI bot will be conversation-aware based on the previous messages you had with the user on WhatsApp, providing more context-specific accurate responses.

The chatbot will be able to understand and speak many languages and has been trained to behave like a customer support virtual assistant specialized in certain tasks.

You can also easily augment domain-specific knowledge about your business in real-time [by using function actions](/config.js#L38-L80) that let the AI bot arbitrarily communicate with your code functions or remote APIs to retrieve and feed the AI with custom information.

👉 *[Read the blog tutorial here](https://medium.com/@wassenger/build-a-whatsapp-chatgpt-powered-ai-chatbot-for-your-business-595a60eb17da)*

👉 *[Watch the video tutorial here](https://www.youtube.com/watch?v=v6hi4TlYnbw)* 🤩 ▶️

👉 *[Run the bot program right from your web browser](https:///pr.new/wassengerhq/whatsapp-chatgpt-bot)* 🤩 💻

> 🤩 🤖 [**Wassenger is a complete WhatsApp API cloud solution. Sign up for free and get started in minutes!**](https://wassenger.com)

### Contents

- [How it works](#how-it-works)
- [Demo](#demo)
- [Features](#features)
- [Bot behavior](#bot-behavior)
- [Requirements](#requirements)
- [Project structure](#project-structure)
- [Installation](#installation)
- [Configuration](#configuration)
- [Customization](#customization)
- [External data integration (RAG)](#external-data-integrations-rag)
- [Usage](#usage)
- [Questions](#questions)

<a href="https://wassenger.com">
 <img src="https://wassenger.com/images/screenshots/main-chat.webp" width="100%" style="box-shadow: 0 0.5rem 1rem rgb(0 0 0 / 10%) !important"/>
</a>

### Demo

![demo](https://miro.medium.com/v2/resize:fit:2000/format:webp/1*p-noYzcPwiaX4w8wYzJCyQ.jpeg)

### How it works

1. Starts a web service that automatically connects to the Wassenger API and your WhatsApp number
2. Creates a tunnel using Ngrok to be able to receive Webhook events on your computer (or you can use a dedicated webhook URL instead if you run the bot program in your cloud server).
3. Registers the webhook endpoint automatically in order to receive incoming messages.
4. Processes and replies to messages received using a [ChatGPT-powered AI model](https://openai.com/chatgpt) trained with custom instructions.
5. You can start playing with the AI bot by sending messages to the Wassenger connected WhatsApp number.

### Features

This tutorial provides a complete ChatGPT-powered AI chatbot implementation in Node.js that:

- Provides a fully featured chatbot in your WhatsApp number connected to [Wassenger](https://wassenger.com)
- Replies automatically to any incoming messages from arbitrary users
- Can understand any text in natural language and reply in 90+ different human languages
- Allows any user to ask talking with a human, in which case the chat will be assigned to an agent and exit the bot flow
- AI bot behavior can be easily adjusted in the [configuration file](config.js)

### Bot behavior

The AI bot will always reply to inbound messages based on the following criteria:

- The chat belong to a user (group chats are always ignored)
- The chat is not assigned to any agent inside Wassenger
- The chat has not any of the blacklisted labels (see config.js)
- The chat user number has not been blacklisted (see config.js)
- The chat or contact has not been archived or blocked
- If a chat is unassigned from an agent, the bot will take over it again and automatically reply to new incoming messages

### Requirements

- [Node.js](https://nodejs.org) >= v16 ([download it here](https://nodejs.org/en/download))
- [WhatsApp](https://whatsapp.com) Personal or Business number
- [OpenAI API key](https://platform.openai.com/account/api-keys) - [Sign up for free](https://platform.openai.com/signup)
- [Add OpenAI credits](https://help.openai.com/en/articles/8264644-what-is-prepaid-billing): you may be required to prepaid OpenAI in order to use the OpenAI API.
- [Wassenger](https://wassenger.com) API key - [Sign up for free](https://app.wassenger.com/register)
- [Connect your WhatsApp](https://app.wassenger.com/create) Personal or Business number to Wassenger
- [Sign up for a Ngrok free account](https://dashboard.ngrok.com/signup) to create a webhook tunnel (only if running the program on your local computer)

### Project structure

```
\
 |- bot.js -> the bot source code in a single file
 |- config.js -> configuration file to customize credentials and bot behavior
 |- functions.js -> Function call definitions for retrieval-augmented information (RAG)
 |- actions.js -> functions to perform actions through the Wassenger API
 |- server.js -> initializes the web server to process webhook events
 |- main.js -> initializes the bot server and creates the webhook tunnel (when applicable)
 |- store.js -> the bot source code in a single file
 |- package.json -> node.js package manifest required to install dependencies
 |- node_modules -> where the project dependencies will be installed, managed by npm
```

### Installation

If you have [git](https://git-scm.org) installed, run the following command from the Terminal:

```bash
git clone https://github.com/wassengerhq/whatsapp-chatgpt-bot.git
```

If you don't have `git`, download the project sources [using this link](https://github.com/wassengerhq/whatsapp-chatgpt-bot/download) and unzip it.

### Configuration

Open your favorite terminal and change directory to project folder where `package.json` is located:

```
cd ~/Downloads/whatsapp-chatgpt-bot/
```

From that folder, install dependencies by running:
```bash
npm install
```

With your preferred code editor, open [`config.js`](config.js) file and follow the steps below.

#### Set your Wassenger API key

Enter your [Wassenger](https://wassenger.com) API key
([sign up here for free](https://app.wassenger.com/register)) and [obtain the API key here](https://app.wassenger.com/apikeys):

```js
// Required. Specify the Wassenger API key to be used
// You can obtain it here: https://app.wassenger.com/apikeys
apiKey: env.API_KEY || 'ENTER API KEY HERE',
```

#### Set your OpenAI API key

Enter your [OpenAI](https://openai.com) API key
([sign up here for free](https://platform.openai.com/signup)) and [obtain the API key here](https://platform.openai.com/account/api-keys):

```js
// Required. Specify the OpenAI API key to be used
// You can sign up for free here: https://platform.openai.com/signup
// Obtain your API key here: https://platform.openai.com/account/api-keys
openaiKey: env.OPENAI_API_KEY || 'ENTER OPENAI API KEY HERE',
```

> **Important**: in order to use OpenAI API, [you may be required to add prepaid credits](https://help.openai.com/en/articles/8264644-what-is-prepaid-billing) in your OpenAI account due to the new payment policy.

#### Set your Ngrok token (optional)

If you need to run the program on your local computer, the program needs to create a tunnel using [Ngrok](https://ngrok.com) in to process webhook events for incoming WhatsApp messages.

[Sign up for a Ngrok free account](https://dashboard.ngrok.com/signup) and [obtain your auth token as explained here](https://ngrok.com/docs/agent/#authtokens).
Then set the token in the line 90th:

```js
// Ngrok tunnel authentication token.
// Required if webhook URL is not provided.
// sign up for free and get one: https://ngrok.com/signup
// Learn how to obtain the auth token: https://ngrok.com/docs/agent/#authtokens
ngrokToken: env.NGROK_TOKEN || 'ENTER NGROK TOKEN HERE',
```

> If you run the program in a cloud server that is publicly accesible from the Internet, you don't need to use Ngrok. Instead, set your server URL in `config.js` > `webhookUrl` field.

### Customization

You can customize the chatbot behavior by defining a set of instructions in natural language that the AI will follow.

Read the comments for further instructions.

**That's it! You can now test the chatbot from another WhatsApp number**

You're welcome to adjust the code to fit your own needs. The possibilities are nearly endless!

To do so, open [`config.js`](config.js) in with your preferred code editor and set the instructions and default message based on your preferences:

```js
// Default message when the user sends an unknown message.
const unknownCommandMessage = `I'm sorry, I can only understand text. Can you please describe your query?

If you would like to chat with a human, just reply with *human*.`

// Default welcome message. Change it as you need.
const welcomeMessage = `Hey there 👋 Welcome to this ChatGPT-powered AI chatbot demo using *Wassenger API*! I can also speak many languages 😁`

// AI bot instructions to adjust its bevarior. Change it as you need.
// Use concise and clear instructions.
const botInstructions = `You are an smart virtual customer support assistant that works for Wassenger.
You can identify yourself as Molly, the Wassenger chatbot assistant.
You will be chatting with random customers who may contact you with general queries about the product.
Wassenger is a cloud solution that offers WhatsApp API and multi-user live communication services designed for businesses and developers.
Wassenger also enables customers to automate WhatsApp communication and build chatbots.
You are an expert in customer support. Be polite, be gentle, be helpful and emphatic.
Politely reject any queries that are not related to customer support or Wassenger itself.
Strictly stick to your role as customer support virtual assistant for Wassenger.
If you can't help with something, ask the user to type *human* in order to talk with customer support.
Sales meeting can be booked with a human sales representative: ask for a date and time to book it.
Assume date time zone is GMT.`

// Default help message. Change it as you need.
const defaultMessage = `Don't be shy 😁 try asking anything to the AI chatbot, using natural language!

Example queries:

1️⃣ Explain me what is Wassenger
2️⃣ Can I use Wassenger to send automatic messages?
3️⃣ Can I schedule messages using Wassenger?
4️⃣ Is there a free trial available?

Type *human* to talk with a person. The chat will be assigned to an available member of the team.

Give it a try! 😁`
```

### External data integration (RAG)

With function calls you can easily feed the AI model to have contextual, real-time and user-specific information to generate better and accurate responses using [Retrieval-Augmented Generation (RAG)](https://medium.com/@alexgnibus/from-rag-to-riches-retrieval-augmented-generation-explained-2f55efdc7fa6) techniques.

Behind the scenes, it uses the [OpenAI Tool Function Calling feature](https://platform.openai.com/docs/guides/function-calling).

When the AI model needs certain information, it will instruct to run one or multiple functions to retrieve additional that information, for instance, in a function you can query an external CRM API or database to retrieve customer-specific information with whom the AI agent is having the chat with, such as email address, username, shipping address, etc, then provide that information as text or JSON to the AI model for accurate user-specific response generation.

Using tool functions is very powerful and enables you to build complex and domain-specific use cases for an AI agent bot.

Here is an example of multiple tool functions RAG implementation:

```js
// Tool functions to be consumed by the AI when needed.
// Edit as needed to cover your business use cases.
// Using it you can instruct the AI to inform you to execute arbitrary functions
// in your code based in order to augment information for a specific user query.
// For example, you can call an external CRM in order to retrieve, save or validate
// specific information about the customer, such as email, phone number, user ID, etc.
// Learn more here: https://platform.openai.com/docs/guides/function-calling
const functions = [
  // Sample function to retrieve plan prices of the product
  // Edit as needed to cover your business use cases
  {
    name: 'getPlanPrices',
    description: 'Get available plans and prices information available in Wassenger',
    parameters: { type: 'object', properties: {} },
    // Function implementation that will be executed when the AI requires to call this function
    // The function must return a string with the information to be sent back to the AI for the response generation
    // You can also return a JSON or a prompt message instructing the AI how to respond to a user
    // Functions may be synchronous or asynchronous.
    //
    // The bot will inject the following parameters:
    // - parameters: function parameters provided by the AI when the function has parameters defined
    // - response: AI generated response object, useful to evaluate the AI response and take actions
    // - data: webhook event context, useful to access the last user message, chat and contact information
    // - device: WhatsApp number device information provided the by Wassenger API
    // - messages: an list of previous messages in the same user chat
    run: async ({ parameters, response, data, device, messages }) => {
      // console.log('=> data:', response)
      // console.log('=> response:', response)
      const reply = [
        '*Send & Receive messages + API + Webhooks + Team Chat + Campaigns + CRM + Analytics*',
        '',
        '- Platform Professional: 30,000 messages + unlimited inbound messages + 10 campaigns / month',
        '- Platform Business: 60,000 messages + unlimited inbound messages + 20 campaigns / month',
        '- Platform Enterprise: unlimited messages + 30 campaigns',
        '',
        'Each plan is limited to one WhatsApp number. You can purchase multiple plans if you have multiple numbers.',
        '',
        '*Find more information about the different plan prices and features here:*',
        'https://wassenger.com/#pricing'
      ].join('\n')
      return reply
    },
  },

  // Sample function to load user information from a CRM
  {
    name: 'loadUserInformation',
    description: 'Find user name and email from the CRM',
    parameters: {
      type: 'object',
      properties: {}
    },
    run: async ({ parameters, response, data, device, messages }) => {
      // You may call an remote API and run a database query
      const reply = 'I am sorry, I am not able to access the CRM at the moment. Please try again later.'
      return reply
    }
  },

   // Sample function to verify the current date and time
   {
    name: 'verifyMeetingAvaiability',
    description: 'Verify if a given date and time is available for a meeting before booking it',
    parameters: {
      type: 'object',
      properties: {
        date: { type: 'string', format: 'date-time', description: 'Date of the meeting' }
      },
      required: ['date']
    },
    run: async ({ parameters, response, data, device, messages }) => {
      console.log('=> verifyMeetingAvaiability call parameters:', parameters)
      // Example: you can make an API call to verify the date and time availability and return the confirmation or rejection message
      const date = new Date(parameters.date)
      if (date.getUTCDay() > 5) {
        return 'Not available on weekends'
      }
      if (date.getHours() < 9 || date.getHours() > 17) {
        return 'Not available outside business hours: 9 am to 5 pm'
      }
      return 'Available'
    }
  },

  // Sample function to determine the current date and time
  {
    name: 'bookSalesMeeting',
    description: 'Book a sales or demo meeting with the customer on a specific date and time',
    parameters: {
      type: 'object',
      properties: {
        date: { type: 'string', format: 'date-time', description: 'Date of the meeting' }
      },
      required: ['date']
    },
    run: async ({ parameters, response, data, device, messages }) => {
      console.log('=> bookSalesMeeting call parameters:', parameters)
      // Make an API call to book the meeting and return the confirmation or rejection message
      return 'Meeting booked successfully. You will receive a confirmation email shortly.'
    }
  },

  // Sample function to determine the current date and time
  {
    name: 'currentDateAndTime',
    description: 'What is the current date and time',
    run: async ({ parameters, response, data, device, messages }) => {
      return new Date().toLocaleString()
    }
  }
]
```

### Usage

Run the bot:
```bash
node main
```

Or using `npm`:
```bash
npm run main
```

Run the bot on a custom port:
```
PORT=80 node main
```

Run the bot for a specific Wassenger connected device:
```
DEVICE=WHATSAPP_DEVICE_ID node main
```

Run the bot in [local development mode](https://nodemon.io/) with auto-reload on changes:
```
npm run dev
```

Run the bot in production mode:
```
NODE_ENV=production node main
```

Run the bot with an existing webhook server without the Ngrok tunnel:
```bash
WEBHOOK_URL=https://bot.company.com:8080/webhook node main
```

> Note: `https://bot.company.com:8080` must point to the bot program itself running in your server and it must be network reachable using HTTPS for secure connection.

### Questions

#### Can I train the AI to behave in a customized way?

Yes! You can provide customized instructions to the AI to determine the bot behavior, identity and more.

To set your instructions, enter the text in `config.js` > `botInstructions`.

#### The program returns an OpenAI error: what should I do?

Because of the new payment policy by OpenAI, in order to use OpenAI API, [you may be required to add prepaid credits](https://help.openai.com/en/articles/8264644-what-is-prepaid-billing) in your OpenAI account.

You can prepaid a small amount in order to use the API like $5 or $10.

#### Can I instruct the AI not to reply about unrelated topics?

Yes! By defining a set of clear and explicit instructions, you can teach the AI to stick to the role and politely do not answer to topics that are unrelated to the relevant topic.

For instance, you can add the following in your instruction:

```
You are an smart virtual customer support assistant that works for Wassenger.
Be polite, be gentle, be helpful and emphatic.
Politely reject any queries that are not related to your customer support role or Wassenger itself.
Strictly stick to your role as customer support virtual assistant for Wassenger.
```

#### How to stop the bot from replying to certain chats?

You should simply assign the chat(s) to any agent on the [Wassenger web chat](https://app.wassenger.com) or [using the API](https://app.wassenger.com/docs/#tag/Chats/operation/assignChatAgent).

Alternatively, you can set blacklisted labels in the `config.js` > `skipChatWithLabels` field, then add one or these labels to the specific chat you want to be ignored by the bot. You can assign labels to chats using the [Wassenger web chat](https://app.wassenger.com) or [using the API](https://app.wassenger.com/docs/#tag/Chats/operation/updateChatLabels).

#### Can I customize the chatbot response and behavior?

For sure! The code is available for free and you can adapt it as much as you need.

You just need to have some JavaScript/Node.js knowledge, and you can always ask ChatGPT to help you write the code you need.

#### Do I have to use Ngrok?

No, you don't. Ngrok is only used for development/testing purposes when running the program from your local computer. If you run the program in a cloud server, most likely you won't need Ngrok if your server can be reachable via Internet using a public domain (e.g: bot.company.com) or a public IP.

In that case, you simply need to provide your server full URL ended with `/webhook` like this when running the bot program:

```
WEBHOOK_URL=https://bot.company.com:8080/webhook node main
```

Note: `https://bot.company.com:8080` must point to the bot program itself running in your server and it must be network reachable using HTTPS for secure connection.

#### What happens if the program fails?

Please check the error in the terminal and make sure you are running the program with enough permissions to start it in port 8080 in localhost.

#### How to avoid certain chats being replied by the bot?

By default the bot will ignore messages sent in group chats, blocked and archived chats/contacts.

Besides that, you can blacklist or whitelist specific phone numbers and chat with labels that be handled by the bot.

See `numbersBlacklist`, `numbersWhitelist`, and `skipChatWithLabels` options in `config.js` for more information.

#### Can I run this bot on my server?

Absolutely! Just deploy or transfer the program source code to your server and run the start command from there.
The requirements are the same, no matter where you run the bot.

Also remember to define the `WEBHOOK_URL` environment variable with your server Internet accessible public URL as explained before.
