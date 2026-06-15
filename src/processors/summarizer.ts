import { Mistral } from '@mistralai/mistralai';
import { config } from '../config/index.js';
import type { Article } from '../collectors/rss.js';

const client = new Mistral({ apiKey: config.mistral.apiKey });

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function summarizeArticle(article: Article): Promise<string> {
    const prompt = `
Tu es un assistant de veille technologique spécialisé en développement web Full Stack.

Résume cet article en français en 3-4 phrases concises :
- L'idée principale
- Ce qui est pertinent pour un développeur Full Stack
- Pourquoi c'est important à retenir

Titre : ${article.title}
Source : ${article.source}
Contenu : ${article.content.slice(0, 2000)}

Réponds uniquement avec le résumé, sans introduction.
  `;

    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            const result = await client.chat.complete({
                model: 'mistral-small-latest',
                messages: [{ role: 'user', content: prompt }],
            });
            await sleep(1000);
            return result.choices?.[0]?.message?.content as string ?? 'Résumé indisponible.';
        } catch (err: any) {
            if (err?.status === 429) {
                console.log(`⏳ Rate limit — attente 30s avant retry (${attempt}/3)`);
                await sleep(30000);
            } else {
                console.error(`❌ Erreur résumé pour "${article.title}":`, err);
                return 'Résumé indisponible.';
            }
        }
    }

    return 'Résumé indisponible.';
}