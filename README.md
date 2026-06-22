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
#veille-validation — Validation manuelle (✅ Valider / ❌ Rejeter) + score affiché
      ↓ (si validé)
SQLite (volume persistant Fly.io)
      ↓ (routing automatique par thème)
  ├── #veille-frontend  → Frontend & Frameworks JS  [bouton 🔍 En savoir plus]
  ├── #veille-backend   → Backend, API & Outillage  [bouton 🔍 En savoir plus]
  └── #veille-securite  → Sécurité Web              [bouton 🔍 En savoir plus]
      ↓
#veille-digest — Digest hebdomadaire automatique (lundi 8h)
      ↓
#veille-commandes — Commandes slash
  ├── /summary    → 5 derniers articles résumés
  ├── /ask        → RAG local + Tavily + Mistral
  ├── /export     → Export Markdown de la veille
  ├── /analyze    → Analyse IA automatique de la veille
  ├── /submit     → Soumettre un article via URL → envoi dans #veille-validation
  ├── /rss-list   → Lister les sources RSS
  ├── /rss-add    → Ajouter une source RSS
  ├── /rss-remove → Supprimer une source RSS
  ├── /infos      → Statut du système
  └── /help       → Liste des commandes
```

Tout le pipeline tourne sur **Fly.io (région Paris, cdg)** en continu.

---

## 3. Organisation des salons Discord

| Salon | Rôle |
|---|---|
| `#veille-commandes` | Toutes les commandes slash |
| `#veille-validation` | Articles à valider (boutons ✅/❌ + score) |
| `#veille-frontend` | Articles validés — Frontend (bouton 🔍 En savoir plus) |
| `#veille-backend` | Articles validés — Backend (bouton 🔍 En savoir plus) |
| `#veille-securite` | Articles validés — Sécurité (bouton 🔍 En savoir plus) |
| `#veille-digest` | Résumé hebdomadaire automatique chaque lundi 8h |

---

## 4. Stack technique

| Composant | Technologie | Justification |
|---|---|---|
| **Runtime** | Node.js 20 + TypeScript | Typage fort, écosystème riche |
| **Collecte RSS** | rss-parser | Léger, simple, sans dépendance lourde |
| **IA — Scoring** | Mistral AI (`mistral-small-latest`) | Souveraineté française 🇫🇷 |
| **IA — Résumés** | Mistral AI (`mistral-small-latest`) | Souveraineté française 🇫🇷 |
| **IA — RAG /ask** | Mistral AI + Tavily Search | Recherche locale + fallback web |
| **IA — /analyze** | Mistral AI | Analyse automatique de la veille |
| **IA — En savoir plus** | Mistral AI | Analyse approfondie à la demande (retry x3) |
| **Stockage** | SQLite via better-sqlite3 | Zéro configuration, persistant |
| **Bot** | discord.js (commandes slash) | API officielle Discord, gratuit |
| **Hébergement** | Fly.io (Paris cdg) | Docker natif, volume persistant |
| **Versionning** | GitHub (repo privé) | CI/CD, traçabilité |

---

## 5. Sources de collecte

Les sources par défaut sont hardcodées dans `src/collectors/rss.ts`. Elles peuvent être surchargées dynamiquement via les commandes `/rss-add` / `/rss-remove` (stockées en base SQLite). Si aucune source n'est en base, les sources par défaut s'appliquent.

| Axe | Source | Salon cible |
|---|---|---|
| **Frontend & Frameworks JS** | Dev.to, Smashing Magazine, This Week in React, web.dev (Google), Alsacréations 🇫🇷 | `#veille-frontend` |
| **Backend, API & Outillage** | Node Weekly, JavaScript Weekly, TypeScript Blog (Microsoft), Bun Blog, GitHub Changelog | `#veille-backend` |
| **Sécurité Web** | The Hacker News, CERT-FR (ANSSI) 🇫🇷, Zero Day Initiative | `#veille-securite` |

La collecte s'exécute **toutes les 2 heures**. Un délai de 1 seconde est appliqué entre chaque source pour éviter le rate limiting.

---

## 6. Structure du projet

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
│   │   └── database.ts         ← SQLite (CRUD + 5 tables)
│   └── bot/
│       └── discord.ts          ← Bot Discord (commandes + validation + routing + digest)
├── Dockerfile                  ← Image Docker Alpine Node.js 20
├── fly.toml                    ← Config Fly.io (région cdg, volume)
├── context.md                  ← Fichier de cadrage pour Claude (analyse de veille)
├── .env                        ← Secrets locaux (non commités)
├── .env.example                ← Template des variables
└── .gitignore                  ← Exclut .env, data/, node_modules/
```

---

## 7. Fonctionnement détaillé

### 7.1 Collecte, scoring et résumé (toutes les 2h)

1. Fetch de chaque flux RSS séquentiellement (délai 1s anti-rate-limit), 3 articles max par source
2. Filtrage des articles déjà vus via la table `seen_urls`
3. Mistral AI attribue un **score de pertinence 1 à 5** — l'article est marqué "vu" immédiatement
4. Seuls les articles avec un score **≥ 4** sont résumés en 3-4 phrases en français
5. L'article est envoyé dans `#veille-validation` avec le score (`⭐ Score : X/5`) et les boutons ✅/❌
6. Les articles en attente sont **persistés en SQLite** (`pending_validations`) — les boutons restent fonctionnels même après un redémarrage du bot

### 7.2 Validation et routing thématique

- **✅ Valider** → insertion en SQLite + post automatique dans le bon salon thématique avec le bouton 🔍 En savoir plus
- **❌ Rejeter** → article ignoré définitivement

| Source | Salon |
|---|---|
| Dev.to, Smashing Magazine, This Week in React, web.dev, Alsacréations | `#veille-frontend` |
| Node Weekly, JavaScript Weekly, TypeScript Blog, Bun Blog, GitHub Changelog | `#veille-backend` |
| The Hacker News, CERT-FR (ANSSI), Zero Day Initiative | `#veille-securite` |
| Articles soumis via `/submit` | `#veille-backend` par défaut |

### 7.3 Bouton 🔍 En savoir plus

Chaque article posté dans un salon thématique dispose d'un bouton **En savoir plus**. En cliquant :
- Mistral génère une analyse approfondie (contexte technique, points clés, pistes pour aller plus loin)
- La réponse est visible **uniquement par toi** (message éphémère)
- Les informations sont persistées en SQLite (`more_info_cache`) pour survivre aux redémarrages
- Retry automatique x3 en cas de rate limit Mistral

### 7.4 Commande /summary

Retourne les 5 derniers articles validés avec titre, source, résumé et lien.

### 7.5 Commande /ask [question]

Pipeline RAG en 3 étapes :
1. **Recherche locale** : requête `LIKE` sur titre, résumé et contenu dans SQLite
2. **Fallback web** : si moins de 2 résultats locaux → appel Tavily Search API (3 résultats)
3. **Synthèse Mistral** : contexte local + web → réponse structurée en français

### 7.6 Commande /export

Génère un fichier Markdown complet de tous les articles résumés et l'envoie en pièce jointe Discord. Sauvegardé sur le volume persistant (`/data/veille_export_YYYY-MM-DD.md`).

### 7.7 Commande /analyze

Analyse automatique par Mistral : top 3 tendances, sources actives, lacunes, recommandations.

### 7.8 Commande /submit [url]

1. Fetch le contenu de la page
2. Mistral génère un résumé en français
3. L'article est envoyé dans `#veille-validation` (pas dans le salon de commande) avec les boutons ✅/❌

### 7.9 Digest hebdomadaire automatique

Chaque **lundi à 8h (heure de Paris)**, le bot poste automatiquement dans `#veille-digest` :
- Top tendances de la semaine
- Articles incontournables (2-3 max)
- Ce qu'il faut retenir

### 7.10 Gestion des sources RSS

| Commande | Description |
|---|---|
| `/rss-list` | Liste les sources actives avec leur ID |
| `/rss-add [nom] [url]` | Ajoute une source (initialise les défauts si première fois) |
| `/rss-remove [id]` | Supprime une source par son ID |

### 7.11 Commande /infos

Statut du système : dernière collecte, prochaine collecte, nombre d'articles en base, dernier article, infrastructure.

### 7.12 Commande /help

Liste complète des commandes (message éphémère visible uniquement par toi).

---

## 8. Base de données SQLite

| Table | Rôle |
|---|---|
| `articles` | Articles validés (titre, url, source, résumé, contenu, date) |
| `seen_urls` | URLs déjà traitées — évite les doublons entre collectes |
| `rss_sources` | Sources RSS gérées dynamiquement via Discord |
| `pending_validations` | Articles en attente de validation — persistés pour survivre aux redémarrages |
| `more_info_cache` | Données des boutons "En savoir plus" — persistés pour survivre aux redémarrages |

---

## 9. Variables d'environnement

```bash
MISTRAL_API_KEY=                # Clé API Mistral AI (mistral.ai)
DISCORD_BOT_TOKEN=              # Token du bot Discord
DISCORD_CLIENT_ID=              # Application ID Discord (commandes slash)
DISCORD_CHANNEL_ID=             # Salon principal (fallback)
DISCORD_CHANNEL_VALIDATION=     # ID du salon #veille-validation
DISCORD_CHANNEL_FRONTEND=       # ID du salon #veille-frontend
DISCORD_CHANNEL_BACKEND=        # ID du salon #veille-backend
DISCORD_CHANNEL_SECURITE=       # ID du salon #veille-securite
DISCORD_CHANNEL_DIGEST=         # ID du salon #veille-digest
TAVILY_API_KEY=                 # Clé API Tavily Search (fallback web /ask)
DB_PATH=./data/veille.db        # Chemin SQLite (monté sur /data sur Fly.io)
```

---

## 10. Déploiement

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

## 11. Choix de souveraineté numérique

| Composant | Solution choisie | Origine | Alternative écartée |
|---|---|---|---|
| IA résumés + scoring | Mistral AI | 🇫🇷 France | GPT-4 (USA) |
| IA analyse + digest | Mistral AI | 🇫🇷 France | Claude API (USA) |
| Hébergement | Fly.io région Paris | 🇫🇷 France | AWS/GCP (USA) |
| Sources FR | Alsacréations, CERT-FR (ANSSI) | 🇫🇷 France | — |
| Base de données | SQLite (open source) | Open Source | MongoDB Atlas (USA) |
| Recherche web | Tavily | 🇺🇸 USA | Brave (pas de free tier) |
| Versionning | GitHub (privé) | 🇺🇸 USA | GitLab FR possible |

---

## 12. Utilisation avec Claude

### Workflow

1. Envoyer `/export` sur Discord → recevoir `veille_export_YYYY-MM-DD.md`
2. Uploader le fichier + `context.md` sur Google Drive
3. Ouvrir Claude (claude.ai) avec Google Drive connecté
4. Demander à Claude d'analyser les fichiers pour rédiger la note de veille E1

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

## 13. Compétences E1 couvertes

| Compétence | Sections couvertes |
|---|---|
| **C1 — Organiser un système de veille** | Sources §5, Architecture §2, Salons §3, Gestion RSS §7.10 |
| **C2 — Analyser les informations** | Scoring §7.1, Résumés §7.1, RAG /ask §7.5, /analyze §7.7, En savoir plus §7.3 |
| **C3 — Expérimenter et mobiliser** | Déploiement §10, /submit §7.8, Digest §7.9, Claude §12 |
