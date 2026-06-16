import { initDB, articleExists, isSeen, markSeen } from './storage/database.js';
import { fetchRSSFeeds } from './collectors/rss.js';
import { summarizeArticle, scoreRelevance } from './processors/summarizer.js';
import { startBot, sendForValidation, updateCollectStats } from './bot/discord.js';

const RELEVANCE_THRESHOLD = 4;

async function collect() {
    console.log('🔍 Démarrage de la collecte...');

    const [rssArticles] = await Promise.all([
        fetchRSSFeeds(),
    ]);

    const newArticles = rssArticles.filter(a => !articleExists(a.url) && !isSeen(a.url));
    const toValidate: any[] = [];
    let relevantCount = 0;

    for (let i = 0; i < newArticles.length; i++) {
        const article = newArticles[i];
        const score = await scoreRelevance(article);
        markSeen(article.url);

        if (score < RELEVANCE_THRESHOLD) {
            console.log(`⏭️ (${i + 1}/${newArticles.length}) Ignoré (score ${score}/5) : ${article.title}`);
            continue;
        }

        relevantCount++;
        console.log(`📝 (${i + 1}/${newArticles.length}) Pertinent (score ${score}/5), résumé : ${article.title}`);
        const summary = await summarizeArticle(article);
        toValidate.push({ ...article, summary });
    }

    if (toValidate.length > 0) {
        console.log(`📲 Envoi de ${toValidate.length} articles en validation...`);
        await sendForValidation(toValidate);
    }

    updateCollectStats();
    console.log(`✅ Collecte terminée — ${newArticles.length} articles analysés, ${relevantCount} pertinents.`);
}

async function main() {
    initDB();
    startBot();
    await collect();

    setInterval(async () => {
        await collect();
    }, 2 * 60 * 60 * 1000);
}

main().catch(console.error);