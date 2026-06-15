import RSSParser from 'rss-parser';

const parser = new RSSParser();

export const RSS_SOURCES = [
    { name: 'Dev.to', url: 'https://dev.to/feed' },
    { name: 'Smashing Magazine', url: 'https://www.smashingmagazine.com/feed/' },
    { name: 'CSS Tricks', url: 'https://css-tricks.com/feed/' },
    { name: 'Node Weekly', url: 'https://nodeweekly.com/rss/' },
    { name: 'Human Coders', url: 'https://news.humancoders.com/t/javascript.rss' },
    { name: 'Reddit r/webdev', url: 'https://www.reddit.com/r/webdev/.rss' },
    { name: 'JavaScript Weekly', url: 'https://javascriptweekly.com/rss/' },
    { name: 'Frontend Focus', url: 'https://frontendfoc.us/rss' },
    { name: 'This Week in React', url: 'https://thisweekinreact.com/newsletter/rss.xml' },
    { name: 'web.dev (Google)', url: 'https://web.dev/feed.xml' },
    { name: 'Deno Blog', url: 'https://deno.com/feed' },
    { name: 'Korben', url: 'https://korben.info/feed' },
    { name: 'Alsacréations', url: 'https://www.alsacreations.com/rss/actualites.xml' },
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
            for (const item of feed.items.slice(0, 5)) {
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