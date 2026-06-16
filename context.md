# Context — Veille Technologique PKM

## Profil

- **Nom** : Corentin Godon
- **Formation** : Mastère 1 — Expert IT, Développement & BDD
- **École** : MediaSchool
- **Domaine de veille** : Développement Web — Technologies & Sécurité

## Métier visé

Développeur Full Stack — orienté développement web (frontend, backend, sécurité)

## Sujet de veille

Mon domaine de veille principal est le développement web dans son ensemble, découpé en 3 axes complémentaires :

| Axe | Ce que je surveille | But final |
|---|---|---|
| **Frontend & Frameworks JS** | Sorties React, Vue, nouveaux patterns (Server Components, Islands Architecture) | Rester compétent sur les technos les plus demandées du marché |
| **Backend, API & Outillage** | Node.js, .NET, TypeScript, nouvelles versions SQL, outils DevEx (Bun, Biome, Vite) | Améliorer la qualité du code et la productivité dans mes projets |
| **Sécurité Web** | CVE récents, failles OWASP Top 10, publications CNIL/ANSSI, fuites de données | Écrire du code sécurisé par défaut et anticiper les risques en entreprise |

Ces trois axes sont indissociables : une nouvelle version d'un framework peut introduire des failles, et un outil de build peut changer radicalement le workflow backend.

## Sources surveillées

| Source | Type | Axe |
|---|---|---|
| Dev.to | RSS | Frontend |
| Smashing Magazine | RSS | Frontend |
| This Week in React | Newsletter | Frontend |
| web.dev (Google) | Blog | Frontend |
| Alsacréations | Blog | Frontend |
| Node Weekly | Newsletter | Backend |
| JavaScript Weekly | Newsletter | Backend |
| TypeScript Blog (Microsoft) | Blog | Backend |
| Bun Blog | Blog | Backend |
| GitHub Changelog | Blog | Backend |
| The Hacker News | RSS | Sécurité |
| CERT-FR (ANSSI) | RSS | Sécurité |
| Zero Day Initiative | RSS | Sécurité |

## Pipeline technique

- **Collecte** : Script TypeScript, toutes les 2h, déployé sur Fly.io Paris
- **Scoring de pertinence** : chaque article reçoit une note IA de 1 à 5 par rapport aux 3 axes de veille ; seuls les articles notés ≥ 4 sont retenus
- **IA résumés** : Mistral AI (mistral-small-latest) — souveraineté française
- **Validation** : chaque article retenu est soumis à validation manuelle (✅/❌) sur Discord avant insertion en base
- **Stockage** : SQLite sur volume persistant Fly.io
- **Interface** : Bot Discord (commandes slash)
- **RAG** : Recherche locale SQLite + fallback Tavily Search

## Ce que j'attends de toi (Claude)

- Analyser mes exports de veille (`veille_export_YYYY-MM-DD.md`)
- Identifier les tendances émergentes sur mes 3 axes (Frontend, Backend, Sécurité)
- Repérer les lacunes dans ma collecte
- M'aider à rédiger les sections de ma note de veille E1
- Challenger mes analyses et m'aider à structurer mes arguments
- Toujours ancrer les réponses sur l'année en cours, pas sur des données antérieures

## Structure de la note de veille E1 (à produire)

1. Introduction — contexte et méthodologie
2. Écosystème cible — le métier de développeur Full Stack
3. Panorama des tendances (issu de la collecte)
4. Analyse approfondie (3-4 sujets clés)
5. Boîte à outils N+2 — technologies à maîtriser dans 2 ans
6. Feuille de route personnelle 5 ans

## Instructions

- Lire ce fichier en premier avant toute analyse
- Utiliser les exports `veille_export_*.md` comme source principale
- Ne pas inventer de sources — s'appuyer uniquement sur les articles collectés
- Signaler les lacunes plutôt que de combler avec des généralités
