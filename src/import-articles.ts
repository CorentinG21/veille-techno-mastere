import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { initDB, insertArticle } from './storage/database.js';
import { Mistral } from '@mistralai/mistralai';
import { config } from './config/index.js';

const mistralClient = new Mistral({ apiKey: config.mistral.apiKey });

async function summarizeContent(title: string, content: string): Promise<string> {
    try {
        const result = await mistralClient.chat.complete({
            model: 'mistral-small-latest',
            messages: [{
                role: 'user',
                content: `Tu es un assistant de veille technologique. Résume cet article en 3-4 phrases en français, orienté développeur Full Stack. Sois concis et factuel.

Titre : ${title}

Contenu :
${content.slice(0, 3000)}

Résumé :`
            }]
        });
        return result.choices?.[0]?.message?.content as string ?? 'Résumé indisponible.';
    } catch (err) {
        console.error('❌ Erreur Mistral:', err);
        return 'Résumé indisponible.';
    }
}

function parseArticleFile(filepath: string) {
    const raw = readFileSync(filepath, 'utf-8');

    const titleMatch = raw.match(/^Title:\s*(.+)$/m);
    const urlMatch = raw.match(/^URL Source:\s*(.+)$/m);
    const contentMatch = raw.match(/Markdown Content:\n([\s\S]+?)(?:\n---\n|$)/);

    const title = titleMatch?.[1]?.trim() ?? 'Sans titre';
    const url = urlMatch?.[1]?.trim() ?? '';
    const content = contentMatch?.[1]?.trim() ?? '';

    return { title, url, content };
}

async function importArticles(folderPath: string) {
    initDB();

    const files = readdirSync(folderPath).filter(f => f.endsWith('.md'));
    console.log(`📂 ${files.length} fichiers trouvés dans ${folderPath}`);

    let imported = 0;
    let skipped = 0;

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const filepath = join(folderPath, file);

        const { title, url, content } = parseArticleFile(filepath);

        if (!url) {
            console.log(`⚠️ Skipped (pas d'URL) : ${file}`);
            skipped++;
            continue;
        }

        console.log(`📝 (${i + 1}/${files.length}) Résumé en cours : ${title}`);
        const summary = await summarizeContent(title, content);

        const result = insertArticle({
            title,
            url,
            source: 'Import manuel',
            summary,
            content: content.slice(0, 5000),
            published_at: new Date().toISOString(),
        });

        if (result.changes > 0) {
            console.log(`✅ Importé : ${title}`);
            imported++;
        } else {
            console.log(`⏭️ Déjà en base : ${title}`);
            skipped++;
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`\n✅ Import terminé — ${imported} importés, ${skipped} ignorés`);
}

const folderPath = process.argv[2];
if (!folderPath) {
    console.error('❌ Usage : npx tsx src/import-articles.ts <chemin-du-dossier>');
    process.exit(1);
}

importArticles(folderPath).catch(console.error);
