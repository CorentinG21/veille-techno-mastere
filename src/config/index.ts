import dotenv from 'dotenv';
dotenv.config();

export const config = {
    mistral: {
        apiKey: process.env.MISTRAL_API_KEY || '',
    },
    discord: {
        token: process.env.DISCORD_BOT_TOKEN || '',
        clientId: process.env.DISCORD_CLIENT_ID || '',
        channelId: process.env.DISCORD_CHANNEL_ID || '',
        channels: {
            frontend: process.env.DISCORD_CHANNEL_FRONTEND || '',
            backend: process.env.DISCORD_CHANNEL_BACKEND || '',
            securite: process.env.DISCORD_CHANNEL_SECURITE || '',
            validation: process.env.DISCORD_CHANNEL_VALIDATION || '',
            digest: process.env.DISCORD_CHANNEL_DIGEST || '',
        },
    },
    db: {
        path: process.env.DB_PATH || './data/veille.db',
    },
    tavily: {
        apiKey: process.env.TAVILY_API_KEY || '',
    },
};