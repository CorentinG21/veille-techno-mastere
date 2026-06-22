import Database from 'better-sqlite3';
import { config } from '../config/index.js';
import { mkdirSync } from 'fs';
import { dirname } from 'path';

mkdirSync(dirname(config.db.path), { recursive: true });

const db = new Database(config.db.path);
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');

function closeDb() {
  try {
    db.close();
  } finally {
    process.exit(0);
  }
}

process.on('SIGINT', closeDb);
process.on('SIGTERM', closeDb);

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

  db.exec(`
    CREATE TABLE IF NOT EXISTS seen_urls (
      url TEXT PRIMARY KEY,
      seen_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS rss_sources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      url TEXT UNIQUE NOT NULL,
      added_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS pending_validations (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      url TEXT NOT NULL,
      source TEXT,
      summary TEXT,
      content TEXT,
      published_at TEXT,
      score INTEGER
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS more_info_cache (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      url TEXT NOT NULL
    )
  `);
}

export function savePendingValidation(id: string, article: { title: string; url: string; source: string; summary: string; content: string; published_at: string; score?: number }) {
  db.prepare(`INSERT OR REPLACE INTO pending_validations (id, title, url, source, summary, content, published_at, score) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(id, article.title, article.url, article.source, article.summary, article.content, article.published_at, article.score ?? null);
}

export function deletePendingValidation(id: string) {
  db.prepare(`DELETE FROM pending_validations WHERE id = ?`).run(id);
}

export function getAllPendingValidations(): { id: string; title: string; url: string; source: string; summary: string; content: string; published_at: string; score: number | null }[] {
  return db.prepare(`SELECT * FROM pending_validations`).all() as any[];
}

export function saveMoreInfo(id: string, info: { title: string; summary: string; url: string }) {
  db.prepare(`INSERT OR REPLACE INTO more_info_cache (id, title, summary, url) VALUES (?, ?, ?, ?)`).run(id, info.title, info.summary, info.url);
}

export function getMoreInfo(id: string): { title: string; summary: string; url: string } | null {
  return db.prepare(`SELECT title, summary, url FROM more_info_cache WHERE id = ?`).get(id) as any ?? null;
}

export function getRSSSources(): { id: number; name: string; url: string }[] {
  return db.prepare(`SELECT id, name, url FROM rss_sources ORDER BY name`).all() as any[];
}

export function addRSSSource(name: string, url: string): boolean {
  try {
    db.prepare(`INSERT INTO rss_sources (name, url) VALUES (?, ?)`).run(name, url);
    return true;
  } catch {
    return false;
  }
}

export function removeRSSSource(id: number): boolean {
  const result = db.prepare(`DELETE FROM rss_sources WHERE id = ?`).run(id);
  return result.changes > 0;
}

export function isSeen(url: string): boolean {
  const row = db.prepare(`SELECT 1 FROM seen_urls WHERE url = ?`).get(url);
  return !!row;
}

export function markSeen(url: string) {
  db.prepare(`INSERT OR IGNORE INTO seen_urls (url) VALUES (?)`).run(url);
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

export function articleExists(url: string): boolean {
  const row = db.prepare(`SELECT 1 FROM articles WHERE url = ?`).get(url);
  return !!row;
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