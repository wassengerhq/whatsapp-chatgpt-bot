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

export default functions
