# PEDAGOGEN — AUDIT TECHNIQUE COMPLET
**Date :** 2026-09-18  
**Auditeur :** Agent technique senior (architecture + produit + sécurité)  
**Périmètre :** pedagogen/  
**Méthodologie :** Lecture seule. Chaque constat cite fichier + ligne.

Sévérité : Critical · High · Medium · Low

---

## PHASE 0 — RECONNAISSANCE

### Métriques brutes

| Indicateur | Valeur |
|---|---|
| Fichiers .ts (hors node_modules / .next / .git) | 127 |
| Fichiers .tsx | 61 |
| Lignes TypeScript (.ts) | ~18 212 |
| Lignes TypeScript React (.tsx) | ~15 668 |
| **Total LoC source** | **~33 880** |
| Fichiers générés dans data/ (.docx, .pdf, .pptx, .html, .txt, .md, .zip) | ~131 |
| Base de données SQLite | 1 .db + .db-shm + .db-wal (WAL mode actif) |

### Dépendances (package.json:11-34)

Runtime (24 deps) : next@16.2.7, react@19.2.4, better-sqlite3@12.10.0, jose@6.2.3, bcryptjs@3.0.3, docx@9.7.1, pptxgenjs@4.0.1, jspdf@4.2.1, marked@18.0.5, zod@4.4.3, zustand@5.0.14, animejs@4.4.1, ai@6.0.204, ai-sdk-provider-opencode-sdk@3.0.6, react-hook-form@7.78.0, react-hot-toast@2.6.0

**Observations :** zustand@5.0.14 importé mais AUCUN store Zustand n'existe dans le projet.

---

## PHASE 3 — ARCHITECTURE

**A1. agentTools.ts est un God File (74 KB / 1637 lignes)**
- src/lib/agents/agentTools.ts — Contient en un seul fichier : definitions outils IA (500+ lignes JSON schema), callHuggingFace(), callLocalModel(), buildSystemPrompt(), 3 fallbacks fabrication geants (~150 lignes de mock chacun), fonctions estimation tokens.
- Fait : Violation du principe de responsabilité unique.

**A2. Double singleton getDb()**
- src/lib/db/index.ts:19 — export function getDb() avec _db local
- src/lib/db/client.ts:8 — second singleton potentiellement divergent

**A3. Deux pipelines de génération parallèles non unifiés**
- Pipeline legacy : api/generate/heavy/route.ts (589 L) + medium/route.ts utilisent directement callHuggingFace()
- Pipeline nouveau : api/generate/stream/route.ts utilise runAgent() de orchestrator.ts via providers lib/ai/
- Les deux coexistent avec duplication de parsing, gestion d'erreur et configuration provider.

**A4. Settings hardcodes a user_id='default'**
- api/generate/stream/route.ts:82 — "SELECT value FROM settings WHERE key = ? AND user_id = 'default'"
- Systeme multi-utilisateur inexistant en pratique.

---

## PHASE 4 — COUCHE IA (CRITIQUE)

**I1. callLocalModel() envoie stream:false mais parse SSE**
- agentTools.ts:854 — stream: false dans le body → serveur local renvoie JSON unique → code lit lignes SSE data: ... → fullText reste vide → fallback fabrication silencieux (lignes 1060-1117).
- Toute génération en mode Local Model via pipeline legacy produit un document FABRIQUE VIDE.

**I4. OpenCode generateWithTools() ne supporte que tools[0]**
- providers/opencode.ts:61 — const tool = request.tools[0]! — Multi-documents silencieusement ignores.
- providers/opencode.ts:101 — usage: { prompt_tokens: 0 } — Métriques de tokens falsifiées.

**I5. Prompt injection non protégée**
- Prompts personnalisés et contenus références uploadées concaténés verbatim dans prompt système sans delimitation.

---

## PHASE 5 — PIPELINE GÉNÉRATION FICHIERS

**B1. htmlBuilder.ts — XSS dans bloc script**
- Valeurs AI (duree, titres) interpolées dans blocs script sans JSON.stringify() — injection possible.

**B2. fichePedagogiqueDocxBuilder.ts:255-257 — Mutation objet partagé**
- delete (content as any).timing_consistency_check — Casse les exports ZIP multi-format.

**B3. pptxBuilder.ts — Durees hardcodées**
- validateSlideDurations ignore les slide_duration_minutes AI, recalcule depuis ratio fixe 20/50/20.

**B4. pdfBuilder.ts — timing_consistency_check fuité**
- Pas de sanitizeText() contrairement a docxBuilder. Champ interne aparaît dans les PDFs.

**B7. QR codes factices dans resumeBuilder.ts**
- Liens YouTube/Kahoot générés (https://youtube.com/shorts/abc123) sont fictifs.

---

## PHASE 6 — DONNÉES ET PERSISTANCE

**D1. Migrations inline fragiles**
- db/index.ts:321-391 — Migrations ALTER TABLE inline au démarrage. Pas de versioning de schéma, pas de rollback.

**D2. historyStore.ts — Écriture historique silencieusement echouée**
- lib/utils/historyStore.ts:67-82 — addHistoryEntry swallowe les erreurs SQLite.

**D3. Settings multi-user défait**
- Table settings a user_id en cle primaire mais toutes les lectures utilisent user_id='default'.

---

## PHASE 7 — SÉCURITÉ ET CONFORMITÉ

| ID | Sévérité | Constat | Fichier:Ligne |
|---|---|---|---|
| S1 | CRITIQUE | JWT secret fallback hardcode connu | middleware.ts:6, lib/db/auth.ts:10 |
| S2 | CRITIQUE | XSS dans HTML genere — interpolation non echappee dans script | htmlBuilder.ts |
| S3 | CRITIQUE | Path traversal partiel sur /api/downloads/[...path] | downloads/[...path]/route.ts:14-25 |
| S4 | CRITIQUE | Token HuggingFace retourne en clair dans GET /api/settings | settings/route.ts |
| S5 | HAUTE | Cookie auth-token : secure: false | auth/login/route.ts:26-31 |
| S6 | HAUTE | Upload fichiers sans validation type ni limite taille | api/references/route.ts:32-50 |
| S7 | HAUTE | Rate limiting en memoire perdu au redemarrage | utils/rateLimit.ts:9 |
| S8 | HAUTE | Settings ecrits sans verification appartenance | settings/route.ts:25-50 |
| S9 | HAUTE | Prompt injection via prompts custom et references | agentTools.ts (buildSystemPrompt) |
| S10 | HAUTE | content-disposition injection noms fichiers non sanitises | downloads/route.ts:32 |
| S11 | MOYENNE | Registration : pas validation email, pas rate limit | auth/register/route.ts:8-21 |
| S12 | MOYENNE | NODE_ENV non defini → compte test seede en prod | db/index.ts:414-415 |

**Note positive :** middleware.ts existe et est correctement configure pour /api/:path*. Guard JWT_SECRET en production present dans lib/db/auth.ts:5-7.

---

## PHASE 8 — QUALITÉ DU CODE

**Q1. any omniprésent dans les builders**
- fichePedagogiqueBuilder.ts:243-249,278,283 — (doc as any).__currentY
- evaluationBuilder.ts, planificationBuilder.ts — multiple as any

**Q2. Code mort**
- hooks/useSettings.ts — jamais importe dans le projet
- zustand en dependance — 0 stores créés
- orchestrator.ts:74 — model: undefined des deux cotes ternaire (toujours undefined)

**Q5. Typo curriculum**
- lib/curriculum/moroccoCollege.ts:29 — 'التربية Musikique' au lieu de 'التربية الموسيقية'

---

## PHASE 9 — UX ET ACCESSIBILITÉ

**U1.** Pas de focus trap dans les modales portalisées
**U2.** Boutons icon-only sans aria-label (files/, history/, dashboard)
**U3.** Auth forms labels/inputs non liés (AuthPage.tsx:60,68,84,99,116)
**U4.** OnboardingWizard sans aria-modal ni role="dialog"
**U6.** Aucune gestion prefers-reduced-motion sur les animations Anime.js

---

## PHASE 10 — BUILD, TESTS ET OPÉRATIONS

**T1.** Aucun framework de test configure — ni Jest ni Vitest ni Playwright
**T2.** Pas de CI/CD (aucun .github/workflows/)
**T3.** Logs en fichiers locaux sans rotation (data/dev.log, data/generation.log)
**T4.** tokenTracker.ts:19-21 — "1.8x savings" est une estimation statique fictive

---

## PHASE 11 — MATRICE DES RISQUES

### Risques bloquants pour mise en production

1. S1 + S4 (JWT secret + token HF en clair) — Vol possible
2. B1 (XSS HTML) — JS arbitraire dans fichiers générés
3. I1 (stream:false parsé comme SSE) — Local Model silencieusement cassé
4. A3 (double pipeline) — Comportement divergent, impossible a maintenir
5. T1 (aucun test) — Chaque refactoring casse un builder sans filet

---

## RÉCAPITULATIF

- CRITIQUE : S1, S2, S3, S4 (4 items)
- HAUTE : S5-S10, I1, I4, I5, A1, A3, D1, D2 (14 items)
- MOYENNE : S11-S12, I2, I3, I6, I7, B2-B7, Q1, Q2, A2, A4, D3, D4 (15 items)
- FAIBLE : Q3-Q5, U1-U6, T1-T5 (10 items)

*Voir IMPROVEMENTS.md pour le plan de remédiation priorisé.*
