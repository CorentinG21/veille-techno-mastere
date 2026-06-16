import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, ChatInputCommandInteraction, AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { config } from '../config/index.js';
import { exportAllArticles, getRecentArticles, searchArticles, insertArticle } from '../storage/database.js';
import { tavily } from '@tavily/core';
import { Mistral } from '@mistralai/mistralai';
import { writeFileSync } from 'fs';
import { randomUUID } from 'crypto';

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const tavilyClient = tavily({ apiKey: config.tavily.apiKey });
const mistralClient = new Mistral({ apiKey: config.mistral.apiKey });

export let lastCollectTime: Date | null = null;
export let collectCount = 0;

export function updateCollectStats() {
    lastCollectTime = new Date();
    collectCount++;
}

interface PendingArticle {
    title: string;
    url: string;
    source: string;
    summary: string;
    content: string;
    published_at: string;
}

const pendingArticles = new Map<string, PendingArticle>();

const commands = [
    new SlashCommandBuilder().setName('summary').setDescription('Les 5 derniers articles résumés'),
    new SlashCommandBuilder().setName('ask').setDescription('Pose une question sur ta base de veille')
        .addStringOption(opt => opt.setName('question').setDescription('Ta question').setRequired(true)),
    new SlashCommandBuilder().setName('export').setDescription('Exporte ta veille en Markdown'),
    new SlashCommandBuilder().setName('analyze').setDescription('Analyse automatique de ta veille'),
    new SlashCommandBuilder().setName('infos').setDescription('Statut et informations du système'),
].map(cmd => cmd.toJSON());

async function registerCommands() {
    const rest = new REST({ version: '10' }).setToken(config.discord.token);
    await rest.put(Routes.applicationCommands(config.discord.clientId), { body: commands });
    console.log('✅ Commandes slash Discord enregistrées');
}

function splitIntoChunks(text: string, maxLength = 1900): string[] {
    const lines = text.split('\n');
    const chunks: string[] = [];
    let current = '';

    for (const line of lines) {
        if ((current + '\n' + line).length > maxLength) {
            if (current) chunks.push(current);
            current = line;
        } else {
            current = current ? `${current}\n${line}` : line;
        }
    }
    if (current) chunks.push(current);

    return chunks;
}

async function sendLongMessage(interaction: ChatInputCommandInteraction, text: string) {
    const chunks = splitIntoChunks(text);
    for (let i = 0; i < chunks.length; i++) {
        if (i === 0) {
            await interaction.editReply(chunks[i] ?? '');
        } else {
            await interaction.followUp(chunks[i] ?? '');
        }
    }
}

export function startBot() {
    console.log('🤖 Bot Discord démarré...');

    client.once('ready', async () => {
        console.log(`✅ Connecté en tant que ${client.user?.tag}`);
        await registerCommands();
    });

    client.on('interactionCreate', async (interaction) => {
        if (interaction.isButton()) {
            const [action, id] = interaction.customId.split('_');
            const article = pendingArticles.get(id);

            if (!article) {
                await interaction.update({ content: '⚠️ Cet article n\'est plus en attente.', components: [] });
                return;
            }

            if (action === 'validate') {
                insertArticle(article);
                await interaction.update({
                    content: `✅ **Ajouté à la base !**\n\n📌 ${article.title}\n📰 ${article.source}`,
                    components: [],
                });
            } else if (action === 'reject') {
                await interaction.update({
                    content: `❌ **Ignoré**\n\n📌 ${article.title}\n📰 ${article.source}`,
                    components: [],
                });
            }

            pendingArticles.delete(id);
            return;
        }

        if (!interaction.isChatInputCommand()) return;

        if (interaction.commandName === 'summary') {
            await interaction.deferReply();
            const articles = getRecentArticles(5) as any[];

            if (articles.length === 0) {
                await interaction.editReply('📭 Aucun article collecté pour le moment.');
                return;
            }

            const messages = articles.map(a =>
                `📌 **${a.title}**\n📰 ${a.source}\n📝 ${a.summary ?? 'Résumé indisponible'}\n🔗 <${a.url}>`
            ).join('\n\n---\n\n');

            await sendLongMessage(interaction, messages);
        }

        if (interaction.commandName === 'infos') {
            await interaction.deferReply();
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

            const message = `**ℹ️ Infos PKM Veille Tech**

**🤖 Bot**
├ Statut : ✅ En ligne
├ Collectes effectuées : ${collectCount}
└ Articles en base : ${articles.length}

**⏱️ Collecte**
├ Dernière : ${lastCollectTime ? lastCollectTime.toLocaleString('fr-FR', { timeZone: 'Europe/Paris' }) : 'Pas encore effectuée'}
├ Prochaine : ${nextCollect ? nextCollect.toLocaleString('fr-FR', { timeZone: 'Europe/Paris' }) : 'Inconnue'}
└ Dans : ${timeUntilNext !== null ? `${timeUntilNext} min` : 'Inconnue'}

**📰 Dernier article collecté**
└ ${lastArticle ? `${lastArticle.title} (${lastArticle.source})` : 'Aucun'}

**🚀 Infrastructure**
├ Hébergement : Fly.io (Paris cdg) 🇫🇷
├ IA : Mistral AI 🇫🇷
└ Stockage : SQLite (volume persistant)`;

            await interaction.editReply(message);
        }

        if (interaction.commandName === 'ask') {
            await interaction.deferReply();
            const question = interaction.options.getString('question', true);

            const localArticles = searchArticles(question) as any[];
            let context = '';

            if (localArticles.length > 0) {
                context += `📚 Articles de ta veille :\n`;
                context += localArticles.map(a =>
                    `- ${a.title} (${a.source})\n  ${a.summary}`
                ).join('\n');
            }

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

            try {
                const result = await mistralClient.chat.complete({
                    model: 'mistral-small-latest',
                    messages: [{
                        role: 'user',
                        content: `Tu es un assistant de veille technologique Full Stack.
Nous sommes en 2026. Réponds uniquement avec des informations actuelles (2026) ou très récentes.

Question : ${question}

Contexte disponible :
${context}

Réponds en français de manière concise et structurée. IMPORTANT : n'utilise JAMAIS de tableaux Markdown (pas de symboles |), Discord ne les affiche pas correctement. Utilise uniquement des titres en gras et des listes à puces (-).`
                    }]
                });

                const answer = result.choices?.[0]?.message?.content as string ?? 'Réponse indisponible.';
                await sendLongMessage(interaction, `💡 ${answer}`);
            } catch (err) {
                console.error('❌ Erreur Mistral:', err);
                await interaction.editReply('❌ Erreur lors de la génération de la réponse.');
            }
        }

        if (interaction.commandName === 'analyze') {
            await interaction.deferReply();
            const articles = exportAllArticles() as any[];

            if (articles.length === 0) {
                await interaction.editReply('📭 Aucun article à analyser.');
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
3. ⚠️ Lacunes détectées (sujets sous-représentés)
4. 💡 Recommandations (nouvelles sources ou sujets à surveiller)

Articles :
${context}

Sois concis et actionnable. IMPORTANT : n'utilise JAMAIS de tableaux Markdown (pas de symboles |), Discord ne les affiche pas correctement. Utilise uniquement des titres en gras et des listes à puces (-).`
                    }]
                });

                const analysis = result.choices?.[0]?.message?.content as string ?? 'Analyse indisponible.';
                await sendLongMessage(interaction, `📊 **Analyse de ta veille**\n\n${analysis}`);
            } catch (err) {
                console.error('❌ Erreur analyse:', err);
                await interaction.editReply('❌ Erreur lors de l\'analyse.');
            }
        }

        if (interaction.commandName === 'export') {
            await interaction.deferReply();
            const articles = exportAllArticles() as any[];

            if (articles.length === 0) {
                await interaction.editReply('📭 Aucun article à exporter.');
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

            const filename = `veille_export_${date}.md`;
            writeFileSync(`/data/${filename}`, content);

            const attachment = new AttachmentBuilder(Buffer.from(content), { name: filename });
            await interaction.editReply({ content: `✅ Export généré — ${articles.length} articles`, files: [attachment] });
        }
    });

    client.login(config.discord.token);
}

export async function sendForValidation(articles: PendingArticle[]) {
    const channel = await client.channels.fetch(config.discord.channelId).catch(() => null);
    if (!channel || !channel.isTextBased()) return;

    for (const a of articles) {
        const id = randomUUID();
        pendingArticles.set(id, a);

        const message = `🆕 **Nouvel article à valider**\n\n📌 **${a.title}**\n📰 ${a.source}\n📝 ${a.summary ?? 'Résumé indisponible'}\n🔗 <${a.url}>`;

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder().setCustomId(`validate_${id}`).setLabel('✅ Valider').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId(`reject_${id}`).setLabel('❌ Rejeter').setStyle(ButtonStyle.Danger),
        );

        await (channel as any).send({ content: message, components: [row] }).catch(console.error);
        await new Promise(resolve => setTimeout(resolve, 500));
    }
}
