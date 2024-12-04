const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('.'));

app.post('/api/chat', async (req, res) => {
    try {
        console.log('Received request:', req.body);
        
        // Ensure the system message is in English
        const messages = req.body.messages.map(msg => {
            if (msg.role === 'system') {
                return {
                    ...msg,
                    content: "You are a helpful AI assistant. Keep your answers concise and informative. Always respond in English."
                };
            }
            return msg;
        });

        const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', 
            { ...req.body, messages },
            {
                headers: {
                    'Authorization': 'Bearer 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',
                    'Content-Type': 'application/json'
                }
            }
        );
        
        console.log('Groq API Response:', response.data);
        res.json(response.data);
    } catch (error) {
        console.error('Groq API Error:', error.response ? error.response.data : error.message);
        res.status(500).json({ 
            error: 'Failed to connect to AI service',
            details: error.response ? error.response.data : error.message 
        });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
