# PKM Veille Technologique — Documentation complète

**Auteur** : Matthias Dauvel  
**Projet** : E1 — Veille Technologique (Master IRIS, RNCP Niveau 7)  
**Date** : Juin 2026  
**Repository** : https://github.com/MDAprogra/veille-tech-pkm  
**Déploiement** : https://veille-tech-dauvel.fly.dev

---

## 1. Présentation du projet

Ce projet est un système de **PKM (Personal Knowledge Management)** automatisé, conçu dans le cadre de l'épreuve E1 de veille technologique. Il collecte, résume et met à disposition des articles techniques en lien avec le développement web Full Stack, via un bot Telegram accessible 24h/24.

L'objectif est de construire un vrai pipeline d'intelligence : capturer l'information brute, la traiter par IA, la stocker, et la rendre interrogeable en langage naturel.

---

## 2. Architecture globale

```
Sources RSS/Reddit/Newsletters
      ↓ (collecte toutes les 2h)
Collecteur TypeScript
      ↓ (texte brut)
Mistral AI (API HTTPS) 🇫🇷
      ↓ (résumé en français)
SQLite (volume persistant Fly.io)
      ↓
Bot Telegram
  ├── /summary  → 5 derniers articles résumés
  ├── /ask      → RAG local + Tavily + Mistral
  ├── /export   → Export Markdown de la veille
  ├── /analyze  → Analyse IA automatique de la veille
  └── 🔔        → Notifications automatiques
```

Tout le pipeline tourne sur **Fly.io (région Paris, cdg)** en continu.

---

## 3. Stack technique

| Composant | Technologie | Justification |
|---|---|---|
| **Runtime** | Node.js 20 + TypeScript | Typage fort, ecosystème riche |
| **Collecte RSS** | rss-parser | Léger, simple, sans dépendance lourde |
| **IA — Résumés** | Mistral AI (`mistral-small-latest`) | Souveraineté française 🇫🇷 |
| **IA — RAG /ask** | Mistral AI + Tavily Search | Recherche locale + fallback web |
| **IA — /analyze** | Mistral AI | Analyse automatique de la veille |
| **Stockage** | SQLite via better-sqlite3 | Zéro configuration, persistant |
| **Bot** | node-telegram-bot-api (polling) | API officielle Telegram, gratuit |
| **Hébergement** | Fly.io (Paris cdg) | Gratuit, Docker natif, volume persistant |
| **Versionning** | GitHub (repo privé) | CI/CD, traçabilité |

---

## 4. Sources de collecte (13 sources actives)

| Source | Type | Sujet | Statut |
|---|---|---|---|
| Dev.to | RSS | Articles dev généralistes | ✅ |
| Smashing Magazine | RSS | Web design, front-end | ✅ |
| CSS Tricks | RSS | CSS, front-end | ✅ |
| Node Weekly | Newsletter | Écosystème Node.js | ✅ |
| Human Coders 🇫🇷 | RSS | Dev FR — JS, web | ✅ |
| Reddit r/webdev | RSS | Discussions communautaires | ✅ |
| JavaScript Weekly | Newsletter | Écosystème JS | ✅ |
| Frontend Focus | Newsletter | Front-end, web | ✅ |
| This Week in React | Newsletter | React, écosystème | ✅ |
| web.dev (Google) | Blog | Web moderne, performance | ✅ |
| Deno Blog | Blog | Deno, runtime JS | ✅ |
| Korben 🇫🇷 | Blog | Tech, sécu, dev | ✅ |
| Alsacréations 🇫🇷 | Blog | HTML, CSS, accessibilité | ✅ |

La collecte s'exécute **toutes les 2 heures** via un `setInterval`. Un délai de 1 seconde est appliqué entre chaque source pour éviter le rate limiting.

**Volume** : ~62 articles collectés par cycle.

---

## 5. Structure du projet

```
veille_tech/
├── src/
│   ├── index.ts                ← Point d'entrée, orchestration
│   ├── config/
│   │   └── index.ts            ← Variables d'environnement centralisées
│   ├── collectors/
│   │   └── rss.ts              ← Collecte des flux RSS/Reddit/Newsletters
│   ├── processors/
│   │   └── summarizer.ts       ← Résumé IA via Mistral (retry 429)
│   ├── storage/
│   │   └── database.ts         ← SQLite (CRUD + recherche + export)
│   └── bot/
│       └── telegram.ts         ← Bot Telegram (toutes les commandes)
├── Dockerfile                  ← Image Docker Alpine Node.js 20
├── fly.toml                    ← Config Fly.io (région cdg, volume)
├── context.md                  ← Fichier de cadrage pour Claude Cowork
├── .env                        ← Secrets locaux (non commités)
├── .env.example                ← Template des variables
└── .gitignore                  ← Exclut .env, data/, node_modules/
```

---

## 6. Fonctionnement détaillé

### 6.1 Collecte et résumé (toutes les 2h)

1. Le script fetch chaque flux RSS séquentiellement (avec délai anti-rate-limit)
2. Pour chaque article, Mistral AI génère un résumé en 3-4 phrases en français, orienté développeur Full Stack
3. L'article + résumé sont insérés en base SQLite (`INSERT OR IGNORE` — pas de doublon)
4. Les nouveaux articles (uniquement) déclenchent une notification Telegram automatique
5. Système de retry automatique (3 tentatives, 60s d'attente) en cas de rate limit Mistral

### 6.2 Commande /summary

Retourne les 5 derniers articles stockés en base, avec titre, source, résumé et lien.

### 6.3 Commande /ask [question]

Pipeline RAG en 3 étapes :

1. **Recherche locale** : requête `LIKE` sur titre, résumé et contenu dans SQLite
2. **Fallback web** : si moins de 2 résultats locaux → appel Tavily Search API (3 résultats)
3. **Synthèse Mistral** : contexte local + web envoyé à Mistral pour une réponse structurée en français, ancrée sur 2026

### 6.4 Commande /export

Génère un fichier Markdown complet de tous les articles résumés et l'envoie directement dans le chat Telegram. Le fichier est aussi sauvegardé sur le volume persistant Fly.io (`/data/veille_export_YYYY-MM-DD.md`).

Usage avec Claude Cowork : charger l'export + `context.md` dans Claude pour rédiger la note de veille E1.

### 6.5 Commande /analyze

Analyse automatique de la veille par Mistral AI :
- Top 3 tendances détectées (avec nombre d'articles)
- Sources les plus actives
- Lacunes détectées (sujets sous-représentés)
- Recommandations (nouvelles sources ou sujets à surveiller)

La réponse est découpée en chunks de 4000 caractères pour respecter la limite Telegram.

### 6.6 Notifications automatiques

À chaque collecte, les articles dont `result.changes > 0` (nouveaux en base) sont envoyés automatiquement au chat Telegram configuré via `TELEGRAM_CHAT_ID`.

### 6.7 Mode polling Telegram

Le bot utilise le mode **long polling** : le script interroge les serveurs Telegram toutes les ~1 seconde pour récupérer les nouveaux messages. Telegram ne contacte jamais directement le serveur — c'est le script qui initie toujours la communication.

---

## 7. Variables d'environnement

```bash
MISTRAL_API_KEY=          # Clé API Mistral AI (mistral.ai)
TELEGRAM_BOT_TOKEN=       # Token du bot (@veille_tech_dauvel_bot)
TELEGRAM_CHAT_ID=         # ID du chat pour les notifications auto
TAVILY_API_KEY=           # Clé API Tavily Search (fallback web /ask)
DB_PATH=./data/veille.db  # Chemin SQLite (monté sur /data sur Fly.io)
```

---

## 8. Déploiement

### Infrastructure

- **Hébergeur** : Fly.io (plan gratuit avec CB de vérification)
- **Région** : `cdg` (Paris Charles de Gaulle) — souveraineté numérique
- **VM** : 1 machine, 1 OCPU, 512 MB RAM, shared-cpu-1x
- **Stockage** : Volume persistant `veille_data` (1 GB, chiffré)
- **Image Docker** : Node.js 20 Alpine (~188 MB)

### Commandes de déploiement

```bash
# Déployer une nouvelle version
flyctl deploy --app veille-tech-dauvel

# Voir les logs en temps réel
flyctl logs --app veille-tech-dauvel

# Gérer les secrets
flyctl secrets set CLE=valeur --app veille-tech-dauvel

# Lister les machines
flyctl machines list --app veille-tech-dauvel

# Arrêter une machine
flyctl machines stop <ID> --app veille-tech-dauvel
```

### Dockerfile

```dockerfile
FROM node:20-alpine
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
CMD ["npx", "tsx", "src/index.ts"]
```

---

## 9. Schéma de communication

```
┌──────────────────────────────────────────────────────────┐
│                      Fly.io (Paris cdg)                  │
│                                                          │
│  RSS/Reddit/Newsletters                                  │
│       ↓ (toutes les 2h)                                  │
│  Collecteur TypeScript ──► Mistral AI 🇫🇷                │
│       │           ◄────────── résumé FR                  │
│       ↓                                                  │
│    SQLite (volume persistant)                            │
│       ↓                                                  │
│  Bot Telegram (polling)                                  │
│       ├──► /summary  → lecture SQLite                    │
│       ├──► /ask      → SQLite + Tavily + Mistral         │
│       ├──► /export   → génération fichier .md            │
│       ├──► /analyze  → Mistral analyse globale           │
│       └──► 🔔 auto   → nouveaux articles                 │
│                                                          │
└──────────────────────────────┬───────────────────────────┘
                               │ HTTPS (polling)
                               ▼
                       Telegram API
                               │
                               ▼
                    Matthias (@veille_tech_dauvel_bot)
```

---

## 10. Choix de souveraineté numérique

Conformément aux exigences du référentiel RNCP Niveau 7 :

| Composant | Solution choisie | Origine | Alternative écartée |
|---|---|---|---|
| IA résumés | Mistral AI | 🇫🇷 France | GPT-4 (USA) |
| IA analyse | Mistral AI | 🇫🇷 France | Claude API (USA) |
| Hébergement | Fly.io région Paris | 🇫🇷 France | AWS/GCP (USA) |
| Sources FR | Human Coders, Korben, Alsacréations | 🇫🇷 France | — |
| Base de données | SQLite (open source) | Open Source | MongoDB Atlas (USA) |
| Recherche web | Tavily | 🇺🇸 USA | Brave (pas de free tier) |
| Versionning | GitHub (privé) | 🇺🇸 USA | GitLab FR possible |

---

## 11. Utilisation avec Claude Cowork

### Workflow

1. Envoyer `/export` sur Telegram → recevoir `veille_export_YYYY-MM-DD.md`
2. Uploader le fichier sur Google Drive
3. Uploader `context.md` sur Google Drive
4. Ouvrir Claude (claude.ai) avec Google Drive connecté
5. Demander à Claude d'analyser les fichiers pour rédiger la note de veille E1

### Exemples de prompts

```
Lis d'abord context.md, puis analyse veille_export_2026-06-15.md 
et identifie les 5 grandes tendances de ma veille Full Stack 2026.
```

```
Rédige la section "Panorama des tendances" de ma note de veille E1
en t'appuyant uniquement sur mes articles collectés.
```

---

## 12. Roadmap d'évolution

### Court terme (1-2 mois)
- Ajout sources YouTube (transcriptions via API)
- Filtrage par thème (`/summary react`, `/summary securite`)
- Score de pertinence Mistral (1-5 par article)
- Export PDF hebdomadaire automatique

### Moyen terme (3-6 mois)
- Embeddings vectoriels (RAG sémantique avec sqlite-vss)
- Interface web React (dashboard de visualisation)
- Alertes thématiques automatiques
- Multi-utilisateurs

### Long terme (6-12 mois)
- Fine-tuning Mistral sur les résumés validés
- API REST exposant la base de veille
- Plugin Obsidian (sync vers vault)
- Analyse de tendances temporelles

---

## 13. Compétences E1 couvertes

| Compétence | Sections couvertes |
|---|---|
| **C1 — Organiser un système de veille** | Sources §4, Architecture §2, Pipeline §6 |
| **C2 — Analyser les informations** | Résumés Mistral §6.1, RAG /ask §6.3, /analyze §6.5 |
| **C3 — Expérimenter et mobiliser** | Déploiement §8, Roadmap §12, Claude Cowork §11 |

---