import TelegramBot from 'node-telegram-bot-api';
import { config } from '../config/index.js';
import { exportAllArticles, getRecentArticles, searchArticles } from '../storage/database.js';
import { tavily } from '@tavily/core';
import { Mistral } from '@mistralai/mistralai';
import { writeFileSync } from 'fs';


const bot = new TelegramBot(config.telegram.token, { polling: true });
const tavilyClient = tavily({ apiKey: config.tavily.apiKey });
const mistralClient = new Mistral({ apiKey: config.mistral.apiKey });

export let lastCollectTime: Date | null = null;
export let collectCount = 0;

export function updateCollectStats() {
    lastCollectTime = new Date();
    collectCount++;
}

export function startBot() {
    console.log('🤖 Bot Telegram démarré...');

    bot.onText(/\/start/, (msg) => {
        bot.sendMessage(msg.chat.id, `👋 Bienvenue sur ton bot de veille technologique !\n\nCommandes disponibles :\n/summary — Les 5 derniers articles résumés\n/ask [question] — Pose une question sur ta base de veille\n/export — Exporte ta veille en Markdown\n/analyze — Analyse automatique de ta veille\n/infos — Statut et informations du système`);
    });

    bot.onText(/\/summary/, (msg) => {
        const articles = getRecentArticles(5) as any[];

        if (articles.length === 0) {
            bot.sendMessage(msg.chat.id, '📭 Aucun article collecté pour le moment.');
            return;
        }

        for (const a of articles) {
            const message = `📌 ${a.title}\n📰 ${a.source}\n📝 ${a.summary ?? 'Résumé indisponible'}\n🔗 ${a.url}`;
            bot.sendMessage(msg.chat.id, message).catch(console.error);
        }
    });

    bot.onText(/\/infos/, async (msg) => {
        const now = new Date();
        const nextCollect = lastCollectTime
            ? new Date(lastCollectTime.getTime() + 2 * 60 * 60 * 1000)
            : null;
        const timeUntilNext = nextCollect
            ? Math.max(0, Math.round((nextCollect.getTime() - now.getTime()) / 60000))
            : null;

        const articles = exportAllArticles() as any[];
        const recentArticles = getRecentArticles(1) as any[];
        const lastArticle = recentArticles[0];

        const message = `
ℹ️ *Infos PKM Veille Tech*

🤖 *Bot*
├ Statut : ✅ En ligne
├ Collectes effectuées : ${collectCount}
└ Articles en base : ${articles.length}

⏱️ *Collecte*
├ Dernière : ${lastCollectTime ? lastCollectTime.toLocaleString('fr-FR', { timeZone: 'Europe/Paris' }) : 'Pas encore effectuée'}
├ Prochaine : ${nextCollect ? nextCollect.toLocaleString('fr-FR', { timeZone: 'Europe/Paris' }) : 'Inconnue'}
└ Dans : ${timeUntilNext !== null ? `${timeUntilNext} min` : 'Inconnue'}

📰 *Dernier article collecté*
└ ${lastArticle ? `${lastArticle.title} (${lastArticle.source})` : 'Aucun'}

📡 *Sources actives*
├ RSS/Newsletters : 13 sources
└ Fréquence : toutes les 2h

🚀 *Infrastructure*
├ Hébergement : Fly.io Paris (cdg) 🇫🇷
├ IA : Mistral AI 🇫🇷
└ Stockage : SQLite (volume persistant)
    `.trim();

        await bot.sendMessage(msg.chat.id, message, { parse_mode: 'Markdown' });
    });

    bot.onText(/\/ask (.+)/, async (msg, match) => {
        const question = match?.[1];
        if (!question) return;

        await bot.sendMessage(msg.chat.id, '🔍 Recherche en cours...');

        // 1. Cherche dans la base locale
        const localArticles = searchArticles(question) as any[];
        let context = '';

        if (localArticles.length > 0) {
            context += `📚 Articles de ta veille :\n`;
            context += localArticles.map(a =>
                `- ${a.title} (${a.source})\n  ${a.summary}`
            ).join('\n');
        }

        // 2. Fallback web si peu de résultats locaux
        if (localArticles.length < 2) {
            try {
                const webResults = await tavilyClient.search(question, {
                    maxResults: 3,
                    searchDepth: 'basic',
                });
                if (webResults.results.length > 0) {
                    context += `\n\n🌐 Résultats web :\n`;
                    context += webResults.results.map(r =>
                        `- ${r.title}\n  ${r.content?.slice(0, 300)}`
                    ).join('\n');
                }
            } catch (err) {
                console.error('❌ Erreur Tavily:', err);
            }
        }

        // 3. Synthèse Mistral
        try {
            const result = await mistralClient.chat.complete({
                model: 'mistral-small-latest',
                messages: [{
                    role: 'user',
                    content: `Tu es un assistant de veille technologique Full Stack.
Nous sommes en 2026. Réponds uniquement avec des informations actuelles (2026) ou très récentes.
Pour les tendances, concentre-toi sur l'état actuel en 2026 et les perspectives 2027.
Ignore toute information antérieure à 2025 sauf si elle est encore pertinente aujourd'hui.

Question : ${question}

Contexte disponible :
${context}

Réponds en français de manière concise et structurée.
Si le contexte est insuffisant, dis-le clairement mais reste focalisé sur 2026.`
                }]
            });

            const answer = result.choices?.[0]?.message?.content as string ?? 'Réponse indisponible.';
            await bot.sendMessage(msg.chat.id, `💡 ${answer}`);
        } catch (err) {
            console.error('❌ Erreur Mistral:', err);
            await bot.sendMessage(msg.chat.id, '❌ Erreur lors de la génération de la réponse.');
        }
    });

    bot.onText(/\/analyze/, async (msg) => {
        await bot.sendMessage(msg.chat.id, '🧠 Analyse de ta veille en cours...');

        const articles = exportAllArticles() as any[];

        if (articles.length === 0) {
            await bot.sendMessage(msg.chat.id, '📭 Aucun article à analyser.');
            return;
        }

        const context = articles.slice(0, 50).map(a =>
            `- [${a.source}] ${a.title} : ${a.summary}`
        ).join('\n');

        try {
            const result = await mistralClient.chat.complete({
                model: 'mistral-small-latest',
                messages: [{
                    role: 'user',
                    content: `Tu es un assistant de veille technologique Full Stack. Nous sommes en 2026.

Analyse ces ${articles.length} articles collectés et génère un rapport structuré en français :

1. 🔥 Top 3 tendances détectées (avec nombre d'articles)
2. 📚 Sources les plus actives
3. ⚠️ Lacunes détectées (sujets sous-représentés pour un dev Full Stack)
4. 💡 Recommandations (nouvelles sources ou sujets à surveiller)

Articles :
${context}

Sois concis et actionnable.`
                }]
            });

            const analysis = result.choices?.[0]?.message?.content as string ?? 'Analyse indisponible.';
            const full = `📊 Analyse de ta veille\n\n${analysis}`;
            const chunks = full.match(/[\s\S]{1,4000}/g) ?? [];
            for (const chunk of chunks) {
                await bot.sendMessage(msg.chat.id, chunk).catch(console.error);
            }
        } catch (err) {
            console.error('❌ Erreur analyse:', err);
            await bot.sendMessage(msg.chat.id, '❌ Erreur lors de l\'analyse.');
        }
    });

    bot.onText(/\/export/, async (msg) => {
        await bot.sendMessage(msg.chat.id, '⏳ Génération de l\'export en cours...');

        const articles = exportAllArticles() as any[];

        if (articles.length === 0) {
            await bot.sendMessage(msg.chat.id, '📭 Aucun article à exporter.');
            return;
        }

        const date = new Date().toISOString().split('T')[0];
        let content = `# Export Veille Technologique — ${date}\n\n`;
        content += `> ${articles.length} articles collectés\n\n---\n\n`;

        for (const a of articles) {
            content += `## ${a.title}\n\n`;
            content += `- **Source** : ${a.source}\n`;
            content += `- **Date** : ${a.published_at}\n`;
            content += `- **Lien** : ${a.url}\n\n`;
            content += `**Résumé** : ${a.summary}\n\n`;
            content += `---\n\n`;
        }

        const filename = `/data/veille_export_${date}.md`;
        writeFileSync(filename, content);

        await bot.sendDocument(msg.chat.id, Buffer.from(content), {}, {
            filename: `veille_export_${date}.md`,
            contentType: 'text/markdown',
        });

        console.log(`📤 Export généré : ${filename} (${articles.length} articles)`);
    });
}

export async function notifyNewArticles(articles: any[]) {
    for (const a of articles) {
        const message = `🆕 Nouvel article !\n\n📌 ${a.title}\n📰 ${a.source}\n📝 ${a.summary ?? 'Résumé indisponible'}\n🔗 ${a.url}`;
        await bot.sendMessage(config.telegram.chatId, message).catch(console.error);
        await new Promise(resolve => setTimeout(resolve, 500));
    }
}