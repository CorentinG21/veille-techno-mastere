import Database from 'better-sqlite3';
import { config } from '../config/index.js';
import { mkdirSync } from 'fs';
import { dirname } from 'path';

mkdirSync(dirname(config.db.path), { recursive: true });

const db = new Database(config.db.path);

export function initDB() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      url TEXT UNIQUE NOT NULL,
      source TEXT,
      summary TEXT,
      content TEXT,
      published_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
}

export function insertArticle(article: {
  title: string;
  url: string;
  source: string;
  summary: string;
  content: string;
  published_at: string;
}) {
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO articles (title, url, source, summary, content, published_at)
    VALUES (@title, @url, @source, @summary, @content, @published_at)
  `);
  return stmt.run(article);
}

export function getRecentArticles(limit = 10) {
  return db.prepare(`
    SELECT * FROM articles ORDER BY created_at DESC LIMIT ?
  `).all(limit);
}

export function searchArticles(query: string, limit = 5) {
  return db.prepare(`
    SELECT * FROM articles 
    WHERE title LIKE ? OR summary LIKE ? OR content LIKE ?
    ORDER BY created_at DESC 
    LIMIT ?
  `).all(`%${query}%`, `%${query}%`, `%${query}%`, limit);
}

export function exportAllArticles() {
  return db.prepare(`
    SELECT * FROM articles 
    WHERE summary != 'Résumé indisponible.'
    ORDER BY created_at DESC
  `).all();
}

export { db };