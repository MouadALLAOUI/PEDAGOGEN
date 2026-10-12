# PEDAGOGEN — PLAN D'AMÉLIORATIONS PRIORITAIRES
**Date :** 2026-09-18  
**Source :** Audit AUDIT.md (même date)  
**Convention :** Chaque item = constat source + action minimale + effort estimé

---

## SPRINT 0 — SÉCURITÉ CRITIQUE (Faire avant toute mise en prod) 🔴

### S1. JWT Secret hardcodé
**Constat :** middleware.ts:6 et lib/db/auth.ts:10 — fallback 'pedagogen-dev-secret-key-change-in-production-2024'  
**Action :** Dans middleware.ts, ajouter le même guard que uth.ts:5-7 :
`	ypescript
if (!process.env.JWT_SECRET) throw new Error('FATAL: JWT_SECRET requis');
`
Puis s'assurer que .env.local.example documente la variable.  
**Effort :** 2 lignes · 5 min

### S2. XSS dans HTML généré
**Constat :** htmlBuilder.ts — interpolation de valeurs AI dans blocs <script> sans JSON.stringify()  
**Action :** Remplacer chaque interpolation directe par JSON.stringify(value) et échapper </script → <\/script.  
**Effort :** ~10 lignes · 30 min

### S3. Path Traversal sur téléchargements
**Constat :** downloads/[...path]/route.ts:14-25 — test '..' substring bypass par %2e%2e  
**Action :**
`	ypescript
import { resolve, sep } from 'path';
const resolved = resolve(GENERATED_DIR, ...params.path);
if (!resolved.startsWith(GENERATED_DIR + sep)) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
`
**Effort :** 5 lignes · 15 min

### S4. Token HuggingFace en clair dans l'API
**Constat :** GET /api/settings retourne huggingface_token en clair  
**Action :** Dans settings/route.ts, masquer les clés sensibles avant retour :
`	ypescript
const SENSITIVE_KEYS = ['huggingface_token'];
// Dans la réponse : value = key in SENSITIVE_KEYS ? '***' : value
`
**Effort :** 5 lignes · 15 min

### S5. Cookie non sécurisé
**Constat :** uth/login/route.ts:26-31 — secure: false  
**Action :** secure: process.env.NODE_ENV === 'production'  
**Effort :** 1 ligne · 2 min

---

## SPRINT 1 — BUGS FONCTIONNELS CRITIQUES (Génération cassée) 🟠

### I1. Local Model — stream:false parsé comme SSE
**Constat :** gentTools.ts:854 — stream: false → réponse JSON unique → code lit SSE → fullText vide → fallback fabrication  
**Action :** Changer stream: false → stream: true dans le body de callLocalModel(). La boucle de lecture SSE existante fonctionne déjà pour le streaming.  
**Effort :** 1 ligne · 5 min  
**Impact :** Corrige 100% des générations Local Model qui produisent actuellement des documents vides.

### H1. Evaluation générée avec le mauvais outil (DÉJÀ CORRIGÉ dans mediumAgent.ts)
**Constat :** mediumAgent.ts:8 — Vérifier que evaluation: 'generate_evaluation' (pas generate_fiche_pedagogique)  
**Statut :** Corrigé — mediumAgent.ts:8 montre evaluation: 'generate_evaluation' ✅

### H2. Double pipeline divergent
**Constat :** Legacy (heavy/route.ts + medium/route.ts) et nouveau (stream/route.ts) coexistent  
**Action :** Migrer progressivement — d'abord rediriger medium vers stream/route.ts, puis heavy. Garder le code legacy en parallèle jusqu'à validation.  
**Effort :** 2-3 jours · Moyen

### B2. Mutation objet partagé dans fichePedagogiqueDocxBuilder
**Constat :** ichePedagogiqueDocxBuilder.ts:255-257 — delete (content as any).timing_consistency_check  
**Action :** Remplacer le delete par un skip lors de l'itération :
`	ypescript
for (const [key, value] of Object.entries(content)) {
  if (key === 'timing_consistency_check') continue;
  // ...
}
`
**Effort :** 2 lignes · 10 min

### B4. timing_consistency_check dans les PDFs
**Constat :** pdfBuilder.ts — pas de filtre sur ce champ interne  
**Action :** Ajouter la même logique de skip que pour le DOCX.  
**Effort :** 2 lignes · 10 min

---

## SPRINT 2 — DONNÉES ET PERSISTANCE 🟡

### D1. Migrations inline — Versioning de schéma
**Constat :** db/index.ts:321-391 — ALTER TABLE inline au démarrage sans versioning  
**Action :** Créer src/lib/db/migrations/ avec fichiers numérotés SQL et une table schema_migrations(version).  
**Effort :** 1-2 jours · Moyen

### D2. historyStore — Erreurs swallowées
**Constat :** lib/utils/historyStore.ts:67-82 — catch vide  
**Action :** Logger l'erreur avec contexte et retourner { ok: false, error } au lieu de swallower.  
**Effort :** 5 lignes · 15 min

### D3. Settings multi-user
**Constat :** Toutes les routes lisent user_id='default'  
**Action :** Extraire getUserId(request) depuis le header x-user-id (injecté par middleware), l'utiliser partout.  
**Effort :** 3-4 heures · Moyen

### D4. Compte seed conditionnel
**Constat :** db/index.ts:414-415 — Guard sur NODE_ENV  
**Action :** Ajouter un fallback : if (process.env.NODE_ENV === 'production' || process.env.DISABLE_SEED) return;  
**Effort :** 1 ligne · 2 min

---

## SPRINT 3 — ARCHITECTURE ET QUALITÉ 🟡

### A1. Éclater agentTools.ts (74 KB God File)
**Constat :** src/lib/agents/agentTools.ts — 1637 lignes, 5 responsabilités  
**Plan de découpage :**
- lib/agents/tools/schemas.ts — Définitions JSON schema de tous les outils
- lib/agents/callHuggingFace.ts — Client HF + SSE parser
- lib/agents/callLocalModel.ts — Client local model + SSE parser + custom API
- lib/agents/prompts/builder.ts — buildSystemPrompt(), assembleSystemPrompt()
- lib/agents/fallbacks.ts — Les 3 fallbacks fabrication (factoriser en 1)

**Effort :** 3-4 jours · Élevé (refactoring pur, comportement inchangé)

### A2. Supprimer le double singleton getDb()
**Constat :** db/client.ts:8 — second singleton  
**Action :** Faire que client.ts importe et ré-exporte getDb de index.ts, ou supprimer client.ts si non utilisé.  
**Effort :** 10 min

### Q4. Factoriser getDbSetting() dupliqué 5x
**Constat :** Implémentation identique dans 5 routes  
**Action :** Créer src/lib/db/settings.ts avec getDbSetting(key, userId?) et l'importer.  
**Effort :** 1 heure

### Q5. Typo curriculum
**Constat :** lib/curriculum/moroccoCollege.ts:29 — 'التربية Musikique'  
**Action :** Corriger en 'التربية الموسيقية'  
**Effort :** 1 mot · 2 min

### Q3. Centraliser les clés localStorage
**Constat :** 11+ clés pedagogen_* dispersées dans le code  
**Action :** Créer src/lib/utils/storageKeys.ts avec un objet STORAGE_KEYS et importer dans chaque fichier.  
**Effort :** 30 min

---

## SPRINT 4 — UX ET ACCESSIBILITÉ ⚪

### U2. aria-label sur boutons icon-only
**Constat :** iles/page.tsx, history/page.tsx, dashboard — boutons sans aria-label  
**Action :** Ajouter ria-label="Télécharger", ria-label="Supprimer" etc. sur chaque bouton icon-only.  
**Effort :** 30 min

### U3. Auth forms — lier labels et inputs
**Constat :** AuthPage.tsx:60,68,84,99,116  
**Action :** Ajouter id="email" sur chaque input, htmlFor="email" sur le label correspondant.  
**Effort :** 15 min

### U4. Modales — attributs ARIA
**Constat :** Modales portalisées sans ole="dialog" ni ria-modal="true" ni ria-labelledby  
**Action :** Ajouter sur chaque <div> de modale :
`jsx
role="dialog"
aria-modal="true"
aria-labelledby="modal-title"
`
**Effort :** 1 heure (toutes les modales)

### U6. prefers-reduced-motion
**Constat :** Aucun check dans le projet  
**Action :** Dans PageTransition.tsx et partout où Anime.js est appelé :
`	ypescript
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (!prefersReduced) { animate(...) }
`
**Effort :** 2 heures

---

## SPRINT 5 — TESTS ET CI 🟡

### T1. Ajouter un framework de test
**Constat :** Aucun test dans le projet  
**Recommandation :** Vitest (compatible Next.js/TypeScript sans configuration complexe)  
**Priorités de tests à écrire :**
1. lib/utils/tokenEstimator.ts — logique pure, facile à tester
2. lib/builders/mdBuilder.ts — transformation pure, facile à tester
3. lib/db/auth.ts — hashPassword, erifyPassword (avec mock DB)
4. lib/agents/orchestrator.ts — logique d'orchestration avec mock provider

**Effort :** 1 jour de setup + 1-2 jours de tests initiaux

### T2. CI/CD minimal
**Action :** Créer .github/workflows/ci.yml avec :
- 
pm run build (vérif TypeScript + build)
- 
pm run lint
- Tests Vitest quand ils existent

**Effort :** 2 heures

---

## QUICK WINS — Moins de 10 minutes chacun

| Fix | Fichier | Effort |
|---|---|---|
| stream: true dans callLocalModel() | gentTools.ts:854 | 1 ligne |
| secure: process.env.NODE_ENV === 'production' | uth/login/route.ts:26 | 1 ligne |
| Guard JWT_SECRET dans middleware.ts | middleware.ts:5 | 2 lignes |
| Typo 'التربية الموسيقية' | moroccoCollege.ts:29 | 1 mot |
| JSON.stringify() sur valeurs dans script | htmlBuilder.ts | ~10 lignes |
| delete → skip par itération | ichePedagogiqueDocxBuilder.ts:255 | 2 lignes |
| Swallow erreur historyStore → log | historyStore.ts:82 | 3 lignes |
| Masquer token dans GET settings | settings/route.ts | 5 lignes |
| DISABLE_SEED env var guard | db/index.ts:414 | 1 ligne |
| Supprimer model: undefined ? undefined : undefined | orchestrator.ts:74 | 1 ligne |

---

## ORDRE DE PRIORITÉ GLOBAL

`
SEMAINE 1 — Sprint 0 (Sécurité critique) + Quick Wins
SEMAINE 2 — Sprint 1 (Bugs génération cassée)
SEMAINE 3 — Sprint 2 (Données/persistance)
SEMAINE 4 — Sprint 3 (Architecture — agentTools.ts)
SEMAINE 5 — Sprint 4 (UX/a11y)
SEMAINE 6+ — Sprint 5 (Tests + CI/CD)
`

---

## CE QUI N'EST PAS À FAIRE MAINTENANT

- Réécriture complète de l'application (REMAKE_RULES.md phase 1-6) — Trop coûteux pour la valeur apportée si le produit fonctionne.
- Migration vers Server Actions — Les API routes existantes fonctionnent, la migration est un refactoring pur à faible priorité.
- Système d'i18n pour l'interface — L'utilisateur final est francophone. Priorité faible.
- Zustand stores — Le state management React Context actuel est suffisant pour cette taille de projet.
