# PKM Veille Technologique — Documentation complète

**Auteur** : Corentin Godon
**Projet** : E1 — Veille Technologique (Mastère 1 Expert IT, Développement & BDD)
**Domaine de veille** : Développement Web — Technologies & Sécurité
**Repository** : https://github.com/CorentinG21/veille-techno-mastere
**Déploiement** : Fly.io (app `veille-tech-corentin`, région Paris cdg)

---

## 1. Présentation du projet

Ce projet est un système de **PKM (Personal Knowledge Management)** automatisé, conçu dans le cadre de l'épreuve E1 de veille technologique. Il collecte, résume et met à disposition des articles techniques en lien avec le développement web (frontend, backend, sécurité), via un bot Discord accessible 24h/24.

L'objectif est de construire un vrai pipeline d'intelligence : capturer l'information brute, la trier manuellement par validation, la traiter par IA, la stocker, et la rendre interrogeable en langage naturel.

---

## 2. Architecture globale

```
Sources RSS (Frontend / Backend / Sécurité) + soumission manuelle /submit
      ↓ (collecte toutes les 2h / à la demande)
Collecteur TypeScript
      ↓ (texte brut)
Mistral AI — Scoring de pertinence (1-5) 🇫🇷
      ↓ (score ≥ 4 uniquement)
Mistral AI — Résumé en français 🇫🇷
      ↓
Bot Discord — Validation manuelle (✅ Valider / ❌ Rejeter) + affichage du score
      ↓ (si validé)
SQLite (volume persistant Fly.io)
      ↓ (routing automatique par thème)
  ├── #veille-frontend   → Frontend & Frameworks JS
  ├── #veille-backend    → Backend, API & Outillage
  └── #veille-securite   → Sécurité Web
      ↓
Bot Discord — Commandes slash
  ├── /summary   → 5 derniers articles résumés
  ├── /ask       → RAG local + Tavily + Mistral
  ├── /export    → Export Markdown de la veille
  ├── /analyze   → Analyse IA automatique de la veille
  ├── /submit    → Soumettre un article via URL
  ├── /rss-list  → Lister les sources RSS
  ├── /rss-add   → Ajouter une source RSS
  ├── /rss-remove→ Supprimer une source RSS
  ├── /infos     → Statut du système
  └── /help      → Liste des commandes
```

Tout le pipeline tourne sur **Fly.io (région Paris, cdg)** en continu.

---

## 3. Stack technique

| Composant | Technologie | Justification |
|---|---|---|
| **Runtime** | Node.js 20 + TypeScript | Typage fort, écosystème riche |
| **Collecte RSS** | rss-parser | Léger, simple, sans dépendance lourde |
| **IA — Scoring** | Mistral AI (`mistral-small-latest`) | Souveraineté française 🇫🇷 |
| **IA — Résumés** | Mistral AI (`mistral-small-latest`) | Souveraineté française 🇫🇷 |
| **IA — RAG /ask** | Mistral AI + Tavily Search | Recherche locale + fallback web |
| **IA — /analyze** | Mistral AI | Analyse automatique de la veille |
| **Stockage** | SQLite via better-sqlite3 | Zéro configuration, persistant |
| **Bot** | discord.js (commandes slash) | API officielle Discord, gratuit |
| **Hébergement** | Fly.io (Paris cdg) | Docker natif, volume persistant |
| **Versionning** | GitHub (repo privé) | CI/CD, traçabilité |

---

## 4. Sources de collecte

Les sources par défaut sont hardcodées dans `src/collectors/rss.ts`. Elles peuvent être surchargées dynamiquement via les commandes `/rss-add` / `/rss-remove` (stockées en base SQLite). Si aucune source n'est en base, les sources par défaut s'appliquent.

| Axe | Source | Type |
|---|---|---|
| **Frontend & Frameworks JS** | Dev.to | RSS |
| | Smashing Magazine | RSS |
| | This Week in React | Newsletter |
| | web.dev (Google) | Blog |
| | Alsacréations 🇫🇷 | Blog |
| **Backend, API & Outillage** | Node Weekly | Newsletter |
| | JavaScript Weekly | Newsletter |
| | TypeScript Blog (Microsoft) | Blog |
| | Bun Blog | Blog |
| | GitHub Changelog | Blog |
| **Sécurité Web** | The Hacker News | RSS |
| | CERT-FR (ANSSI) 🇫🇷 | RSS |
| | Zero Day Initiative | RSS |

La collecte s'exécute **toutes les 2 heures** via un `setInterval`. Un délai de 1 seconde est appliqué entre chaque source pour éviter le rate limiting.

---

## 5. Structure du projet

```
veille-tech-pkm/
├── src/
│   ├── index.ts                ← Point d'entrée, orchestration
│   ├── import-articles.ts      ← Import manuel d'articles (.md) dans la base
│   ├── config/
│   │   └── index.ts            ← Variables d'environnement centralisées
│   ├── collectors/
│   │   └── rss.ts              ← Collecte des flux RSS (sources DB ou défaut)
│   ├── processors/
│   │   └── summarizer.ts       ← Scoring + Résumé IA via Mistral (retry 429)
│   ├── storage/
│   │   └── database.ts         ← SQLite (CRUD + recherche + export + sources RSS)
│   └── bot/
│       └── discord.ts          ← Bot Discord (commandes + validation + routing thème)
├── Dockerfile                  ← Image Docker Alpine Node.js 20
├── fly.toml                    ← Config Fly.io (région cdg, volume)
├── context.md                  ← Fichier de cadrage pour Claude (analyse de veille)
├── .env                        ← Secrets locaux (non commités)
├── .env.example                ← Template des variables
└── .gitignore                  ← Exclut .env, data/, node_modules/
```

---

## 6. Fonctionnement détaillé

### 6.1 Collecte, scoring et résumé (toutes les 2h)

1. Le collecteur fetch chaque flux RSS séquentiellement (délai anti-rate-limit), 3 articles max par source
2. Les articles déjà vus (en base OU déjà analysés) sont filtrés via la table `seen_urls`
3. Mistral AI attribue un **score de pertinence de 1 à 5** par rapport aux 3 axes de veille. L'article est marqué "vu" immédiatement après le scoring
4. Seuls les articles avec un score **≥ 4** sont résumés en 3-4 phrases en français
5. L'article résumé est envoyé sur Discord avec le score affiché (`⭐ Score : X/5`) et deux boutons : **✅ Valider** / **❌ Rejeter**
6. Si validé → insertion en base SQLite + post automatique dans le salon thématique (`#veille-frontend`, `#veille-backend` ou `#veille-securite`)
7. Système de retry automatique en cas de rate limit Mistral (3 tentatives, délai 30s)

### 6.2 Routing automatique par thème

Quand un article est validé, il est automatiquement posté dans le bon salon Discord selon sa source :

| Source | Salon |
|---|---|
| Dev.to, Smashing Magazine, This Week in React, web.dev, Alsacréations | `#veille-frontend` |
| Node Weekly, JavaScript Weekly, TypeScript Blog, Bun Blog, GitHub Changelog | `#veille-backend` |
| The Hacker News, CERT-FR (ANSSI), Zero Day Initiative | `#veille-securite` |
| Articles soumis via `/submit` | `#veille-backend` par défaut |

### 6.3 Commande /summary

Retourne les 5 derniers articles validés et stockés en base, avec titre, source, résumé et lien.

### 6.4 Commande /ask [question]

Pipeline RAG en 3 étapes :

1. **Recherche locale** : requête `LIKE` sur titre, résumé et contenu dans SQLite
2. **Fallback web** : si moins de 2 résultats locaux → appel Tavily Search API (3 résultats)
3. **Synthèse Mistral** : contexte local + web envoyé à Mistral pour une réponse structurée en français

### 6.5 Commande /export

Génère un fichier Markdown complet de tous les articles résumés et l'envoie directement en pièce jointe Discord. Le fichier est aussi sauvegardé sur le volume persistant Fly.io (`/data/veille_export_YYYY-MM-DD.md`).

Usage avec Claude : charger l'export + `context.md` dans Claude pour rédiger la note de veille E1.

### 6.6 Commande /analyze

Analyse automatique de la veille par Mistral AI :
- Top 3 tendances détectées (avec nombre d'articles)
- Sources les plus actives
- Lacunes détectées (sujets sous-représentés)
- Recommandations (nouvelles sources ou sujets à surveiller)

### 6.7 Commande /submit [url]

Permet de soumettre manuellement un article via son URL sans passer par le flux RSS :
1. Le bot fetch le contenu de la page
2. Mistral génère un résumé en français
3. L'article est envoyé en validation Discord avec les boutons ✅ / ❌ comme un article RSS normal

### 6.8 Gestion des sources RSS

Les sources RSS sont gérables dynamiquement depuis Discord :

| Commande | Description |
|---|---|
| `/rss-list` | Liste toutes les sources actives avec leur ID |
| `/rss-add [nom] [url]` | Ajoute une source (initialise les sources par défaut si première ajout) |
| `/rss-remove [id]` | Supprime une source par son ID |

Les sources sont stockées dans la table SQLite `rss_sources`. Tant qu'aucune source n'est en base, les 13 sources par défaut s'appliquent.

### 6.9 Commande /help

Affiche la liste complète des commandes disponibles (message visible uniquement par toi).

### 6.10 Commande /infos

Affiche le statut du système : dernière collecte, prochaine collecte, nombre d'articles en base, dernier article collecté, infrastructure.

### 6.11 Validation manuelle des articles

Chaque article collecté est envoyé sur Discord avec son **score de pertinence** (`⭐ Score : X/5`) et des boutons de validation avant tout enregistrement en base. Cela permet de filtrer le bruit avant qu'il ne pollue la base de connaissances.

### 6.12 Import manuel d'articles (script)

Le script `src/import-articles.ts` permet d'importer des articles externes (fichiers `.md`) directement dans la base, avec génération automatique du résumé Mistral :

```bash
npx tsx src/import-articles.ts <chemin-du-dossier>
```

---

## 7. Variables d'environnement

```bash
MISTRAL_API_KEY=                # Clé API Mistral AI (mistral.ai)
DISCORD_BOT_TOKEN=              # Token du bot Discord
DISCORD_CLIENT_ID=              # Application ID Discord (commandes slash)
DISCORD_CHANNEL_ID=             # ID du salon principal (validation + commandes)
DISCORD_CHANNEL_FRONTEND=       # ID du salon #veille-frontend
DISCORD_CHANNEL_BACKEND=        # ID du salon #veille-backend
DISCORD_CHANNEL_SECURITE=       # ID du salon #veille-securite
TAVILY_API_KEY=                 # Clé API Tavily Search (fallback web /ask)
DB_PATH=./data/veille.db        # Chemin SQLite (monté sur /data sur Fly.io)
```

---

## 8. Schéma de la base de données SQLite

| Table | Rôle |
|---|---|
| `articles` | Articles validés (titre, url, source, résumé, contenu, date) |
| `seen_urls` | URLs déjà traitées (évite les doublons entre collectes) |
| `rss_sources` | Sources RSS gérées dynamiquement via Discord |

---

## 9. Déploiement

### Infrastructure

- **Hébergeur** : Fly.io
- **Région** : `cdg` (Paris Charles de Gaulle) — souveraineté numérique
- **VM** : 1 machine, 1 OCPU, 512 MB RAM, shared-cpu-1x
- **Stockage** : Volume persistant `veille_data` (1 GB, chiffré)
- **Image Docker** : Node.js 20 Alpine (~193 MB)

### Commandes de déploiement

```bash
# Déployer une nouvelle version
flyctl deploy --app veille-tech-corentin

# Voir les logs en temps réel
flyctl logs --app veille-tech-corentin

# Gérer les secrets
flyctl secrets set CLE=valeur --app veille-tech-corentin

# Lister les machines
flyctl machines list --app veille-tech-corentin

# Arrêter une machine
flyctl machines stop <ID> --app veille-tech-corentin
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

## 10. Choix de souveraineté numérique

| Composant | Solution choisie | Origine | Alternative écartée |
|---|---|---|---|
| IA résumés | Mistral AI | 🇫🇷 France | GPT-4 (USA) |
| IA analyse | Mistral AI | 🇫🇷 France | Claude API (USA) |
| Hébergement | Fly.io région Paris | 🇫🇷 France | AWS/GCP (USA) |
| Sources FR | Alsacréations, CERT-FR (ANSSI) | 🇫🇷 France | — |
| Base de données | SQLite (open source) | Open Source | MongoDB Atlas (USA) |
| Recherche web | Tavily | 🇺🇸 USA | Brave (pas de free tier) |
| Versionning | GitHub (privé) | 🇺🇸 USA | GitLab FR possible |

---

## 11. Utilisation avec Claude

### Workflow

1. Envoyer `/export` sur Discord → recevoir `veille_export_YYYY-MM-DD.md`
2. Uploader le fichier sur Google Drive
3. Uploader `context.md` sur Google Drive
4. Ouvrir Claude (claude.ai) avec Google Drive connecté
5. Demander à Claude d'analyser les fichiers pour rédiger la note de veille E1

### Exemples de prompts

```
Lis d'abord context.md, puis analyse veille_export_2026-06-16.md
et identifie les 5 grandes tendances de ma veille Développement Web 2026.
```

```
Rédige la section "Panorama des tendances" de ma note de veille E1
en t'appuyant uniquement sur mes articles collectés.
```

---

## 12. Compétences E1 couvertes

| Compétence | Sections couvertes |
|---|---|
| **C1 — Organiser un système de veille** | Sources §4, Architecture §2, Pipeline §6, Gestion RSS §6.8 |
| **C2 — Analyser les informations** | Scoring §6.1, Résumés Mistral §6.1, RAG /ask §6.4, /analyze §6.6, Validation §6.11 |
| **C3 — Expérimenter et mobiliser** | Déploiement §9, /submit §6.7, Routing thématique §6.2, Claude §11 |
