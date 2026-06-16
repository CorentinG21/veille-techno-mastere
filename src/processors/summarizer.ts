import { Mistral } from '@mistralai/mistralai';
import { config } from '../config/index.js';
import type { Article } from '../collectors/rss.js';

const client = new Mistral({ apiKey: config.mistral.apiKey });

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function scoreRelevance(article: Article): Promise<number> {
    const prompt = `
Tu évalues la pertinence d'un article pour une veille technologique de développeur Full Stack, centrée sur 3 axes uniquement :
1. Frontend & Frameworks JS (React, Vue, patterns front, CSS avancé, performance web)
2. Backend, API & Outillage (Node.js, TypeScript, bases de données, outils DevEx)
3. Sécurité Web (CVE, failles OWASP, vulnérabilités, bonnes pratiques sécu)

Note la pertinence de cet article sur une échelle de 1 à 5 :
1 = hors sujet (ex: crypto, robots, wallpapers, actualité générale)
3 = lié au dev web mais générique ou peu actionnable
5 = directement exploitable, technique, et clairement dans un des 3 axes

Titre : ${article.title}
Source : ${article.source}
Contenu : ${article.content.slice(0, 800)}

Réponds uniquement avec le chiffre (1, 2, 3, 4 ou 5), sans aucun autre texte.
  `;

    try {
        const result = await client.chat.complete({
            model: 'mistral-small-latest',
            messages: [{ role: 'user', content: prompt }],
        });
        const text = result.choices?.[0]?.message?.content as string ?? '1';
        const score = parseInt(text.trim().match(/[1-5]/)?.[0] ?? '1', 10);
        return score;
    } catch (err) {
        console.error(`❌ Erreur scoring pour "${article.title}":`, err);
        return 1;
    }
}

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