import dotenv from 'dotenv';
dotenv.config();

export const config = {
    mistral: {
        apiKey: process.env.MISTRAL_API_KEY || '',
    },
    telegram: {
        token: process.env.TELEGRAM_BOT_TOKEN || '',
        chatId: process.env.TELEGRAM_CHAT_ID || '',
    },
    db: {
        path: process.env.DB_PATH || './data/veille.db',
    },
    tavily: {
        apiKey: process.env.TAVILY_API_KEY || '',
    },
};