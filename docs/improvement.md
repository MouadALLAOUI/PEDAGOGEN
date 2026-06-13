# Améliorations Pédagogiques & Idées Créatives pour PEDAGOGEN

Ce document présente une feuille de route d'idées innovantes et créatives spécialement adaptées au contexte des enseignants du collège marocain (1AC, 2AC, 3AC) pour faire évoluer la plateforme **PEDAGOGEN**.

---

## 🎨 1. Transition Linguistique & Glossaires Interactifs (Français/Arabe/Darija)
>
> [!IMPORTANT]
> Depuis la réforme de la Charte Nationale d'Éducation, les matières scientifiques et techniques au collège (Maths, SVT, Physique, Informatique) sont enseignées en français, ce qui pose un défi de transition majeur pour les élèves issus du primaire arabophone.

* **Générateur de Fiches Vocabulaires Bilingues** : Générer automatiquement à la fin de chaque cours un lexique visuel et textuel des termes clés (ex: *algorithme = خوارزمية*, *boucle = boucle répétitive = tahrir/tikrar*).
* **Script de Code-Switching Pédagogique** : Proposer au professeur un script "Guide de transition" indiquant à quels moments clés du cours utiliser des reformulations en Darija ou en Arabe classique pour débloquer les incompréhensions, tout en maintenant le support de cours en Français.

---

## 🏫 2. Modèle de Tableau Noir Virtuel (Blackboard Layout)

Au collège marocain, le tableau noir (ou blanc) reste l'outil central de transmission. L'organisation physique du tableau est un art difficile pour les jeunes enseignants.

* **Générateur de "Plan de Tableau"** : Exporter un schéma visuel montrant comment diviser le tableau de classe en 3 ou 4 colonnes (ex: *Gauche : Date & Plan du cours ; Centre : Définitions et Théorèmes ; Droite : Exemples & Exercices rapides*).
* **Tracés de Schémas simplifiés** : Pour les matières comme la SVT ou la Technologie, fournir des versions simplifiées "prêtes à dessiner à la craie" des diagrammes complexes.

---

## 📐 3. Contextualisation Culturelle Marocaine (Zellige & Patrimoine)

Rendre les exercices et activités plus familiers pour stimuler l'engagement des élèves.

* **Problèmes Contextualisés** : En Mathématiques ou Informatique (Xlogo), générer des exercices basés sur la géométrie des zelliges, le calcul d'itinéraires de transport entre les villes marocaines, ou l'automatisation d'un système d'irrigation agricole (Khattara).
* **Projets Thématiques Nationaux** : Proposer des mini-projets de classe en lien avec les grandes orientations du pays (ex: la transition écologique, les énergies renouvelables à Ouarzazate, la gestion de l'eau).

---

## 📊 4. Différenciation Automatique & Groupes de Niveau
>
> [!TIP]
> L'hétérogénéité des classes de collège (souvent 40+ élèves par classe) rend la différenciation pédagogique indispensable mais extrêmement chronophage à préparer.

* **Générateur de Fiches de Remédiation Différenciées** : À partir des compétences d'une leçon, générer automatiquement 3 variantes d'une même fiche d'exercices :
  1. **Niveau Étoile (Soutien)** : Indices visuels et exercices guidés étape par étape.
  2. **Niveau Deux Étoiles (Standard)** : Conforme au programme classique.
  3. **Niveau Trois Étoiles (Dépassement)** : Défis logiques et problèmes ouverts pour les élèves rapides.
* **Intégration des Résultats de l'Évaluation Diagnostique** : Permettre à l'enseignant de téléverser un tableau de notes diagnostiques de début d'année pour que l'IA propose des stratégies de regroupement d'élèves sur-mesure.

---

## 📅 5. Synchronisation Calendaire AREF & Examens Officiels

* **Planificateur Intelligent de Devoirs Surveillés** : Aligner automatiquement la planification semestrielle avec le calendrier officiel du Ministère de l'Éducation Nationale (les vacances scolaires, la préparation de l'examen local de la 3AC, et les périodes réglementaires des devoirs surveillés).
* **Générateur d'Épreuves Blanches Standardisées** : Générer des examens types conformes au cadre de référence officiel (Cadre de référence de l'examen normalisé local/régional) avec leurs grilles de correction et barèmes officiels.

---

## 📶 6. Mode Hors-Ligne & PWA pour le Milieu Rural

De nombreuses écoles collégiales en milieu rural souffrent d'une connexion internet instable, voire inexistante dans les salles de classe.

* **Export Universel HTML Autonome (PWA)** : Permettre à l'enseignant de télécharger son cours complet sous forme d'une page web interactive unique contenant le cours, les images illustratives embarquées en base64, et des quiz en JavaScript, lisible sur n'importe quel smartphone ou vieux PC sans connexion.
* **Livrets d'Impression Économes en Encre** : Un style de mise en page spécifique optimisé pour les photocopieuses scolaires (noir et blanc pur, contrastes élevés, densité maxima pour limiter le nombre de pages).

---

## 💡 CREATIVE IDEAS

### 🔴 High Priority

#### UX & Interface

* [x] **Différenciation en 1-Clic (Note 118 AREF)** : Générer instantanément trois versions d'exercices (Soutien, Standard, Défi) adaptées aux groupes de niveau d'une classe hétérogène, directement depuis le formulaire de métadonnées.
* [ ] **Thème Sombre Zellige & Papier Parchment** : Ajouter un sélecteur de thèmes incluant un "Mode Nuit Zellige" (bleu nuit et néon teal) et un "Mode Lecture Parchment" (tons chauds sépia et or) pour réduire la fatigue oculaire lors des préparations tardives.
* [ ] **Résumé Automatique du Cours au Tableau** : En mode "light", générer directement le plan de tableau prêt à être reproduit (gauche/centre/droite).
* [x] **Mode Plein Écran pour le Tableau** : Afficher le plan de tableau en plein écran, navigable avec les touches fléchées, idéal pour projeter en classe.
* [x] **Barre d'Outils Flottante "Préparation Rapide"** : Un FAB (Floating Action Button) sur le dashboard donnant accès aux 3 actions les plus courantes (Nouveau cours, Dernier document, Reprendre génération).
* [x] **Aperçu Instantané du Document Word/PDF** : Dans la page de génération, afficher un rendu visuel du document final (pas seulement le markdown).
* [x] **Assistant de Première Connexion (Onboarding)** : Un guide interactif en 3-4 étapes présentant l'interface, les modes de génération, et le profil enseignant.

#### Fonctionnalités Métier

* [x] **Éditeur Split-Screen avec Rendu en Direct** : Proposer une interface de génération scindée en deux : à gauche la saisie de métadonnées/chat avec l'IA et à droite l'aperçu dynamique du document mis en page (Word ou PDF) mis à jour en temps réel.
* [x] **Export PWA Hors-ligne Universel** : Permettre le téléchargement des cours sous forme de fichier HTML unique interactif (auto-hébergé, images en base64, scripts légers) s'ouvrant instantanément hors-ligne.
* [ ] **Planificateur de Séquence Pédagogique** : Générer une progression annuelle complète alignée sur le programme officiel, avec répartition trimestrielle et pondération des évaluations.

#### Technique & Performance

* [ ] **Mode Hors-Ligne avec Service Worker** : Mettre en cache les pages essentielles (dashboard, génération rapide) pour fonctionner sans connexion.
* [ ] **Recherche Vectorielle pour les Références** : Indexer les fichiers PDF/DOCX téléversés et permettre une recherche sémantique par similarité de contenu.
* [ ] **Compression et Nettoyage Automatique** : Nettoyer les fichiers temporaires et images générées après 30 jours avec notification à l'utilisateur.

### 🟡 Medium Priority

#### UX & Interface

* [x] **Cartographie du Programme en Nodes Animés** : Afficher une carte conceptuelle interactive (Anime.js) illustrant la position de la leçon en cours par rapport aux prérequis et aux leçons futures.
* [ ] **Audio Guide de Prononciation Bilingue** : Bouton de lecture vocale pour les termes techniques français/arabe dans les glossaires.
* [ ] **Animations de Navigation entre Pages** : Transition animée (glissement/fondu) lors de la navigation entre les sections du dashboard.
* [ ] **Squelettes de Chargement (Loading Skeletons)** : Remplacer les spinners génériques par des squelettes animés adaptés à chaque page.
* [ ] **Barre de Progression d'Installation du Profil** : Indiquer visuellement le pourcentage de complétion du profil enseignant.
* [ ] **Mode "Focus" pour la Génération** : Masquer temporairement la sidebar et le topbar pendant la génération pour minimiser les distractions.
* [ ] **Étiquettes de Couleur par Matière** : Associer une couleur distinctive à chaque matière (ex: Maths = bleu, SVT = vert, Physique = orange) dans toute l'application.
* [x] **Système de Favoris** : Marquer des cours/documents comme favoris pour y accéder rapidement depuis le dashboard.
* [x] **Vue Calendrier des Générations** : Basculer la page d'historique en mode calendrier pour visualiser les préparations par date.

#### Fonctionnalités Métier

* [ ] **Mode Comparaison de Versions** : Comparer côte à côte deux versions d'un même cours (avant/après modification).
* [ ] **Statistiques Pédagogiques** : Afficher des métriques (nombre d'heures préparées, % de couverture du programme, matières les plus générées) avec graphiques.
* [ ] **Assistant de Rédaction de Sujets d'Examen** : Mode spécial pour générer des sujets d'examen avec grille de correction conforme au cadre de référence.
* [ ] **Générateur d'Exercices Interactifs** : Produire des exercices auto-corrigés en JavaScript embarqués dans l'export HTML.
* [ ] **Transcription de Notes Manuscrites** : Scanner/Téléverser une photo de notes manuscrites au tableau et les convertir en cours structuré.
* [ ] **Modèle de Fiche d'Activité Pratique** : Pour SVT et Physique, générer des fiches TP avec liste de matériel, protocole, et tableau de résultats.
* [ ] **Générateur de QCM Auto-Corrigé** : Produire des QCM avec correction automatique et statistiques de réponses.
* [ ] **Matrice de Progression par Compétence** : Visualiser l'avancement des compétences travaillées par élève ou par classe.
* [ ] **Assistant de Répartition des Heures** : Calculer automatiquement la répartition horaire par matière/séquence conformément au volume horaire officiel.

#### Technique & Performance

* [ ] **Export PDF avec Filigrane Personnalisé** : Ajouter le logo de l'établissement, nom du professeur, et date en filigrane.
* [ ] **Conversion PDF Modifiable** : Permettre d'exporter en DOCX ET en PDF modifiable (formulaire) pour les fiches pédagogiques.
* [ ] **Sauvegarde Automatique des Brouillons** : Enregistrer localement le formulaire de génération toutes les 30 secondes pour éviter la perte de données.
* [ ] **Synchronisation Multi-Appareils** : Connecter le compte à un service cloud pour retrouver ses documents sur n'importe quel poste.
* [ ] **Import de Planning CSV** : Permettre d'importer un fichier CSV de l'emploi du temps pour aligner les générations.
* [ ] **Raccourcis Clavier** : Ctrl+N (nouveau document), Ctrl+S (sauvegarder), Ctrl+P (exporter), / (recherche rapide).

### 🟢 Low Priority

#### UX & Interface

* [ ] **Concepteur de Tableau par Glisser-Déposer** : Mini-canevas interactif pour réorganiser visuellement les zones du tableau noir avant export.
* [ ] **Système de Badges "Enseignant Innovant"** : Ludifier la préparation avec des badges culturels (Ibn Battuta des Sciences, Scribe d'Al-Qarawiyyin).
* [ ] **Messages Motivants Personnalisés** : Afficher des citations de pédagogues marocains ou arabes (Ibn Khaldoun, Al-Farabi) sur le dashboard.
* [ ] **Mode Écran Projeté** : Interface simplifiée et à fort contraste pour afficher les cours directement en classe.
* [ ] **Palette de Couleurs pour les Diagrammes** : Outil de personnalisation des couleurs des schémas exportés pour correspondre aux craies disponibles.
* [ ] **Adaptation Daltonienne** : Mode spécial avec motifs et textures en plus des couleurs pour les enseignants daltoniens.
* [ ] **Générateur de Jeux Pédagogiques** : Mots croisés, mots mêlés, puzzles basés sur le vocabulaire du cours.
* [ ] **WebSocket pour Mises à Jour en Direct** : Notifications push quand une génération longue est terminée, même si l'onglet est en arrière-plan.
* [ ] **Barre de Recherche Globale** : Chercher dans tous les cours, fichiers, et références depuis la barre de recherche du dashboard.
* [ ] **Vue Grille/Liste pour les Fichiers** : Basculer entre l'affichage en liste et en grille (cartes) dans la page fichiers.

#### Fonctionnalités Métier

* [ ] **Banque Partagée Inter-AREF** : Espace communautaire sécurisé pour échanger des fiches pédagogiques validées entre Académies Régionales.
* [ ] **Générateur de Lettres aux Parents** : Produire des communications officielles (convocation, information sur les évaluations, demande de fournitures).
* [ ] **Calcul Automatique des Moyennes et des Notes** : Assistant de saisie des notes avec génération de bulletins simplifiés.
* [ ] **Carte Mentale Interactive Exportable** : Générer une mind map du cours au format image/SVG/HTML interactif.
* [ ] **Assistant de Gestion de Classe** : Générer des règles de classe, des fiches de suivi comportemental, des grilles d'observation.
* [ ] **Générateur de Support de Réunion Parents-Profs** : Fiche individuelle par élève avec points forts/axes d'amélioration à imprimer pour chaque rencontre.
* [ ] **Abécédaire Illustré par Matière** : Générer un livret A-Z des concepts clés d'une matière avec illustrations simples.
* [ ] **Script de Dictée pour la Langue Française** : Proposer des dictées préparées avec texte, difficultés orthographiques marquées, et grille de correction.
* [ ] **Assistant de Préparation aux Examens Oraux** : Scénarios d'oral, grille d'évaluation, et conseils pour l'élève.
* [ ] **Convertisseur de Notes en Graphiques** : Transformer un tableau de notes en graphique de progression par élève/classe.

#### Technique & Performance

* [ ] **Export en EPUB** : Pour lecture sur liseuse Kindle/Kobo.
* [ ] **Thème de Haute Lisibilité** : Police large, interlignage augmenté, contraste renforcé pour DYS et malvoyants.
* [ ] **Widget Météo Scolaire** : Petit widget dans le dashboard indiquant le temps qu'il fait dans la région (utile pour planifier les activités sportives/de plein air).
* [ ] **Intégration API Météo** : Adapter les activités proposées en fonction des conditions météorologiques (ex: activité sur les nuages s'il pleut).
* [ ] **Mode Lecture Inversée (Flipped Classroom)** : Générer un document élève à lire à la maison + un quiz de vérification + le plan de cours pour le lendemain.
* [ ] **Assistant de Correction de Copies** : Analyse grammaticale, orthographique et pédagogique des copies téléversées.
* [ ] **Générateur de Podcast Pédagogique** : Synthèse vocale du cours en français/arabe exportable en MP3 pour les élèves malvoyants ou auditifs.

---

## 🔧 Améliorations Techniques (Refactoring & Dette)

* [ ] **Centraliser les définitions dupliquées** : `DOCUMENT_TYPE_LABELS`, `MODE_DESCRIPTIONS`, `BEST_FORMATS` — définis à la fois dans `types/generation.ts` et `lib/validators/generation.ts`. Fusionner en un seul source de vérité.
* [ ] **Unifier la configuration LM Studio** : Paramètres dupliqués entre `/settings` (DB) et `/chatbot` (localStorage).
* [ ] **Extraire le rendu des cartes de mode** : Le pattern de carte (heavy/medium/light) est reproduit dans `dashboard/page.tsx`, `generate/page.tsx`, et `ModeSelector.tsx` (inutilisé). Créer un composant `ModeCard` partagé.
* [ ] **Supprimer les classes Tailwind inutilisées** : Les classes `btn-*`, `zellige-*`, `glass-*` ont été retirées de `globals.css` mais certaines références persistent.

---

## 📱 Améliorations Mobile & Accessibilité

* [ ] **Compléter la navigation mobile** : Le drawer mobile du TopBar cache 4 routes (Files, Chatbot, Settings, Profile). Ajouter la navigation complète.
* [ ] **Fixer la largeur du tableau d'historique** : Les colonnes fixes `grid-cols-[1fr_100px_80px_80px_70px]` débordent sur mobile. Utiliser un layout responsive ou un scroll horizontal.
* [ ] **Adapter le viewport du chatbot** : `h-[calc(100vh-8rem)]` ne tient pas compte des barres d'outils mobiles. Utiliser `dvh` (dynamic viewport height).
* [ ] **Ajouter le support `prefers-reduced-motion`** : Respecter les préférences d'accessibilité pour les animations.
* [ ] **Ajouter des étiquettes ARIA** : Navigation, formulaires, et contrôles interactifs.
* [ ] **Améliorer le contraste des textes** : Certains textes `text-muted` peuvent manquer de contraste sur fond clair.
* [ ] **Ajouter le support de la navigation clavier** : Tabulation logique, raccourcis, focus visible.
* [ ] **Mode Lecteur d'Écran** : Structure sémantique améliorée pour les enseignants malvoyants utilisant des lecteurs d'écran.
