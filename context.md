# Context — Veille Technologique PKM

## Profil

- **Nom** : Matthias Dauvel
- **Formation** : Master 1 Expert en Ingénierie des Systèmes d'Information, Option Développement
- **École** : IRIS (MediaSchool)
- **Certification** : RNCP Niveau 7
- **Alternance** : Interfas SAS (interfas.fr)
- **Période de veille** : Juin 2026 — Octobre 2026

## Métier visé

Développeur Full Stack — orienté web moderne (React, Node.js, TypeScript)

## Sujet de veille

Technologies et tendances du développement web Full Stack en 2026 :
- Frameworks front-end (React, Vue, Angular, Svelte)
- Écosystème Node.js / TypeScript / Deno
- CSS moderne et Web APIs
- Outils IA pour développeurs
- Sécurité web (OWASP, API security)
- Architecture (micro-frontends, edge computing, serverless)
- Bonnes pratiques (accessibilité, performance, Core Web Vitals)

## Sources surveillées

| Source | Type | Focus |
|---|---|---|
| Dev.to | RSS | Articles dev généralistes |
| Smashing Magazine | RSS | Web design, front-end |
| CSS Tricks | RSS | CSS, front-end |
| Node Weekly | RSS | Écosystème Node.js |
| Human Coders | RSS | Dev FR |
| Reddit r/webdev | RSS | Discussions communautaires |
| Reddit r/javascript | RSS | Écosystème JS |
| Reddit r/reactjs | RSS | React |
| Reddit r/typescript | RSS | TypeScript |

## Pipeline technique

- **Collecte** : Script TypeScript, toutes les 2h, déployé sur Fly.io Paris
- **IA résumés** : Mistral AI (mistral-small-latest) — souveraineté française
- **Stockage** : SQLite sur volume persistant Fly.io
- **Interface** : Bot Telegram (@veille_tech_dauvel_bot)
- **RAG** : Recherche locale SQLite + fallback Tavily Search

## Ce que j'attends de toi (Claude Cowork)

- Analyser mes exports de veille (`veille_export_YYYY-MM-DD.md`)
- Identifier les tendances émergentes sur mes thématiques
- Repérer les lacunes dans ma collecte
- M'aider à rédiger les sections de ma note de veille E1
- Challenger mes analyses et m'aider à structurer mes arguments
- Toujours ancrer les réponses sur 2026, pas sur des données antérieures

## Structure de la note de veille E1 (à produire)

1. Introduction — contexte et méthodologie
2. Écosystème cible — le métier de développeur Full Stack en 2026
3. Panorama des tendances (issu de la collecte)
4. Analyse approfondie (3-4 sujets clés)
5. Boîte à outils N+2 — technologies à maîtriser dans 2 ans
6. Feuille de route personnelle 5 ans

## Instructions

- Lire ce fichier en premier avant toute analyse
- Utiliser les exports `veille_export_*.md` comme source principale
- Ne pas inventer de sources — s'appuyer uniquement sur les articles collectés
- Signaler les lacunes plutôt que de combler avec des généralités