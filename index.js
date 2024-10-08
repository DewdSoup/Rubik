const OpenAI = require('openai');
const express = require('express');
const path = require('path');
const session = require('express-session');
require('dotenv').config();

const app = express();
app.use(express.json());

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Middleware to manage session data
app.use(
    session({
        secret: 'your-secret-key', // Replace with a strong secret
        resave: false,
        saveUninitialized: true,
    })
);

// Function to initialize a new conversation
function initializeConversation() {
    return [
        {
            role: 'system',
            content: `
You are Rubik, a friendly and helpful real estate assistant for AgentMatch. Your primary goal is to obtain the user's contact information (phone number or email) so that an agent can reach out to discuss their real estate needs.

- **Introduction**: Start by introducing yourself as Rubik and ask for the user's name.
- **Focus on Buying/Selling**: After getting the name, ask, "Hi [name], are you looking to buy or sell?"
- **Ask One Question at a Time**: Always ask only one question in each message. Do not combine multiple questions into one message.
- **Gather Key Details & Contact Info**:
  - If buying: Ask for their preferred property type. In the next message, ask for the location. Then, ask for any general requirements.
  - If selling: Ask for the property's address, including zip code. In the next message, ask for their contact information.
  - Always direct the conversation back to collecting their contact info (phone number or email) and be capable of recognizing different formats (e.g., 540-454-2408 or 5404542408).
  - Acknowledge their name and thank them for sharing any information.
  - Once the contact info is provided, let the user know that an agent will be in touch and then end the conversation with, "Is there anything else I can help you with?"
- **Stay Concise & Helpful**: Respond concisely and focus on guiding the conversation towards collecting the necessary contact details.
- **Support Real Estate Questions**: Answer up to two brief questions about cities or zip codes related to real estate to be helpful, but always redirect back to obtaining their contact information.
- **End the Session Smoothly**: Once all necessary details are collected, politely thank the user and confirm that an agent will reach out soon.
`,
        },
    ];
}

// Handle session reset on page refresh
app.get('/', (req, res, next) => {
    req.session.conversationHistory = null; // Reset the conversation history
    next();
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Route to handle chat completion
app.post('/chat', async (req, res) => {
    const userMessage = req.body.message.trim();

    // Retrieve or initialize conversation history from session
    if (!req.session.conversationHistory) {
        req.session.conversationHistory = initializeConversation();
    }
    const conversationHistory = req.session.conversationHistory;

    try {
        // Add user's message to the conversation history
        conversationHistory.push({ role: 'user', content: userMessage });

        // Create a chat completion with OpenAI
        const response = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo', // Use the appropriate model
            messages: conversationHistory,
            max_tokens: 150,
            temperature: 0.7,
        });

        // Extract bot's reply
        const botReply = response.choices[0].message.content.trim();

        // Add bot's reply to the conversation history
        conversationHistory.push({ role: 'assistant', content: botReply });

        // Save updated conversation history back to session
        req.session.conversationHistory = conversationHistory;

        // Send back the bot's reply
        res.json({ reply: botReply });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Error processing your request.');
    }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Rubik is running on port ${PORT}`);
});
