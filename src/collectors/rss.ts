import RSSParser from 'rss-parser';

const parser = new RSSParser();

export const RSS_SOURCES = [
    // Frontend & Frameworks JS
    { name: 'Dev.to', url: 'https://dev.to/feed' },
    { name: 'Smashing Magazine', url: 'https://www.smashingmagazine.com/feed/' },
    { name: 'This Week in React', url: 'https://thisweekinreact.com/newsletter/rss.xml' },
    { name: 'web.dev (Google)', url: 'https://web.dev/feed.xml' },
    { name: 'Alsacréations', url: 'https://www.alsacreations.com/rss/actualites.xml' },

    // Backend, API & Outillage
    { name: 'Node Weekly', url: 'https://nodeweekly.com/rss/' },
    { name: 'JavaScript Weekly', url: 'https://javascriptweekly.com/rss/' },
    { name: 'TypeScript Blog (Microsoft)', url: 'https://devblogs.microsoft.com/typescript/feed/' },
    { name: 'Bun Blog', url: 'https://bun.sh/rss.xml' },
    { name: 'GitHub Changelog', url: 'https://github.blog/changelog/feed/' },

    // Sécurité Web
    { name: 'The Hacker News', url: 'https://feeds.feedburner.com/TheHackersNews' },
    { name: 'CERT-FR (ANSSI)', url: 'https://www.cert.ssi.gouv.fr/feed/' },
    { name: 'Zero Day Initiative', url: 'https://www.zerodayinitiative.com/rss/published/' },
];

export interface Article {
    title: string;
    url: string;
    source: string;
    content: string;
    published_at: string;
}

export async function fetchRSSFeeds(): Promise<Article[]> {
    const articles: Article[] = [];

    for (const source of RSS_SOURCES) {
        try {
            const feed = await parser.parseURL(source.url);
            for (const item of feed.items.slice(0, 3)) {
                articles.push({
                    title: item.title || 'Sans titre',
                    url: item.link || '',
                    source: source.name,
                    content: item.contentSnippet || item.content || '',
                    published_at: item.pubDate || new Date().toISOString(),
                });
            }
            console.log(`✅ ${source.name} — ${feed.items.length} articles récupérés`);
        } catch (err) {
            console.error(`❌ Erreur sur ${source.name}:`, err);
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return articles;
}