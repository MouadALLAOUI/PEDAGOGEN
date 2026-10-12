export interface Matiere {
  id: string;
  nom: string;
  nomArabe: string;
  niveaux: ('1AC' | '2AC' | '3AC')[];
}

export interface Unite {
  id: string;
  nom: string;
  matiereId: string;
  niveau: '1AC' | '2AC' | '3AC';
  semestre: 1 | 2;
}

export interface LessonItem {
  id: string;
  titre: string;
  titreArabe?: string;
  dureeDefaut?: number;
}

export interface ChapterUnit {
  id: string;
  titre: string;
  titreArabe?: string;
  semestre: 1 | 2;
  lecons: LessonItem[];
}

export const BLOOM_ACTION_VERBS: Record<string, string[]> = {
  Mémoriser: [
    'Définir', 'Identifier', 'Citer', 'Énumérer', 'Nommer', 'Reconnaître', 'Rappeler', 'Désigner'
  ],
  Comprendre: [
    'Expliquer', 'Décrire', 'Distinguer', 'Classer', 'Résumer', 'Interpréter', 'Illustrer', 'Reformuler'
  ],
  Appliquer: [
    'Utiliser', 'Calculer', 'Réaliser', 'Résoudre', 'Appliquer', 'Manipuler', 'Exécuter', 'Mettre en œuvre'
  ],
  Analyser: [
    'Comparer', 'Différencier', 'Décomposer', 'Analyser', 'Examiner', 'Schématiser', 'Démontrer'
  ],
  Évaluer: [
    'Justifier', 'Critiquer', 'Juger', 'Vérifier', 'Valider', 'Estimer', 'Argumenter', 'Hiérarchiser'
  ],
  Créer: [
    'Concevoir', 'Élaborer', 'Formuler', 'Produire', 'Structurer', 'Programmer', 'Organiser', 'Rédiger'
  ],
};

export interface PassiveVerbInfo {
  verb: string;
  alternatives: string[];
  explanation: string;
}

export const PASSIVE_DISCOURAGED_VERBS: Record<string, PassiveVerbInfo> = {
  comprendre: {
    verb: 'comprendre',
    alternatives: ['Expliquer', 'Distinguer', 'Interpréter', 'Illustrer', 'Classer'],
    explanation: "Le verbe 'comprendre' désigne un état interne non mesurable directement lors d'une observation de classe.",
  },
  savoir: {
    verb: 'savoir',
    alternatives: ['Définir', 'Identifier', 'Citer', 'Énoncer', 'Reconnaître'],
    explanation: "Le verbe 'savoir' est trop général ; préférez un verbe d'action précisant ce que l'élève démontre concrètement.",
  },
  apprendre: {
    verb: 'apprendre',
    alternatives: ['Acquérir', 'Pratiquer', 'Mettre en œuvre', 'Retenir'],
    explanation: "'Apprendre' est le processus général et non l'indicateur d'évaluation de la performance attendue.",
  },
  connaître: {
    verb: 'connaître',
    alternatives: ['Nommer', 'Désigner', 'Énumérer', 'Identifier'],
    explanation: "'Connaître' est imprécis ; spécifiez l'action observable (nommer, identifier, citer).",
  },
  connaitre: {
    verb: 'connaitre',
    alternatives: ['Nommer', 'Désigner', 'Énumérer', 'Identifier'],
    explanation: "'Connaître' est imprécis ; spécifiez l'action observable (nommer, identifier, citer).",
  },
  assimiler: {
    verb: 'assimiler',
    alternatives: ['Appliquer', 'Résoudre', 'Déduire', 'Intégrer'],
    explanation: "'Assimiler' relève du processus cognitif interne non vérifiable par un indicateur direct.",
  },
  découvrir: {
    verb: 'découvrir',
    alternatives: ['Identifier', 'Explorer', 'Observer', 'Relever'],
    explanation: "'Découvrir' est vague pour un objectif d'apprentissage évaluable ; préférez 'Identifier' ou 'Relever'.",
  },
  decouvrir: {
    verb: 'decouvrir',
    alternatives: ['Identifier', 'Explorer', 'Observer', 'Relever'],
    explanation: "'Découvrir' est vague pour un objectif d'apprentissage évaluable ; préférez 'Identifier' ou 'Relever'.",
  },
  étudier: {
    verb: 'étudier',
    alternatives: ['Analyser', 'Examiner', 'Comparer', 'Décomposer'],
    explanation: "'Étudier' décrit une tâche globale plutôt qu'une compétence mesurable acquise par l'élève.",
  },
  etudier: {
    verb: 'etudier',
    alternatives: ['Analyser', 'Examiner', 'Comparer', 'Décomposer'],
    explanation: "'Étudier' décrit une tâche globale plutôt qu'une compétence mesurable acquise par l'élève.",
  },
  voir: {
    verb: 'voir',
    alternatives: ['Observer', 'Constater', 'Repérer', 'Distinguer'],
    explanation: "'Voir' est passif ; utilisez un verbe d'investigation active.",
  },
  sensibiliser: {
    verb: 'sensibiliser',
    alternatives: ['Respecter', 'Adopter', 'Appliquer les règles', 'Argumenter'],
    explanation: "'Sensibiliser' est une intention de l'enseignant, pas un objectif mesurable chez l'élève.",
  },
};

// Curriculum database for Moroccan Middle School (MEN Collège)
export const CURRICULUM_DATA: Record<string, Record<'1AC' | '2AC' | '3AC', ChapterUnit[]>> = {
  Informatique: {
    '1AC': [
      {
        id: '1ac-info-u1',
        titre: "Notions de base de l'informatique & Système d'exploitation",
        titreArabe: "مفاهيم أساسية في المعلوميات ونظام التشغيل",
        semestre: 1,
        lecons: [
          { id: '1ac-info-l1', titre: "Définition de l'informatique et notion d'information", dureeDefaut: 50 },
          { id: '1ac-info-l2', titre: "Système informatique (Matériel et Logiciel)", dureeDefaut: 50 },
          { id: '1ac-info-l3', titre: "L'unité centrale et les périphériques", dureeDefaut: 50 },
          { id: '1ac-info-l4', titre: "Le bureau de travail et la souris/clavier", dureeDefaut: 50 },
          { id: '1ac-info-l5', titre: "Gestion des fichiers et dossiers (Création, renommage, déplacement)", dureeDefaut: 50 },
        ],
      },
      {
        id: '1ac-info-u2',
        titre: "Traitement de texte (Word / LibreOffice Writer)",
        titreArabe: "معالجة النصوص",
        semestre: 1,
        lecons: [
          { id: '1ac-info-l6', titre: "Présentation de l'environnement de traitement de texte", dureeDefaut: 50 },
          { id: '1ac-info-l7', titre: "Saisie et correction d'un texte simple", dureeDefaut: 50 },
          { id: '1ac-info-l8', titre: "Mise en forme des caractères et des paragraphes", dureeDefaut: 50 },
          { id: '1ac-info-l9', titre: "Insertion d'images et de formes géométriques", dureeDefaut: 50 },
          { id: '1ac-info-l10', titre: "Création et mise en forme d'un tableau", dureeDefaut: 50 },
        ],
      },
      {
        id: '1ac-info-u3',
        titre: "Initiation aux réseaux et à Internet",
        titreArabe: "مقدمة في الشبكات والإنترنت",
        semestre: 2,
        lecons: [
          { id: '1ac-info-l11', titre: "Notion de réseau informatique et types de réseaux (LAN/WAN)", dureeDefaut: 50 },
          { id: '1ac-info-l12', titre: "Internet et ses services (Web, messagerie)", dureeDefaut: 50 },
          { id: '1ac-info-l13', titre: "Recherche d'informations documentaires et sécurité en ligne", dureeDefaut: 50 },
        ],
      },
      {
        id: '1ac-info-u4',
        titre: "Algorithmique et Programmation par blocs (Scratch)",
        titreArabe: "الخوارزميات والبرمجة بالكتل",
        semestre: 2,
        lecons: [
          { id: '1ac-info-l14', titre: "Notion d'algorithme et instructions de base", dureeDefaut: 50 },
          { id: '1ac-info-l15', titre: "Découverte de l'interface Scratch (Scène, Lutins)", dureeDefaut: 50 },
          { id: '1ac-info-l16', titre: "Mouvement, orientation et dessin de formes géométriques", dureeDefaut: 50 },
          { id: '1ac-info-l17', titre: "Les structures répétitives (Boucles simples)", dureeDefaut: 50 },
        ],
      },
    ],
    '2AC': [
      {
        id: '2ac-info-u1',
        titre: "Tableur (Excel / LibreOffice Calc)",
        titreArabe: "المجدول الحسابي",
        semestre: 1,
        lecons: [
          { id: '2ac-info-l1', titre: "Introduction au tableur : feuille, cellules et données", dureeDefaut: 50 },
          { id: '2ac-info-l2', titre: "Formules arithmétiques de base (+, -, *, /)", dureeDefaut: 50 },
          { id: '2ac-info-l3', titre: "Fonctions prédéfinies simples (SOMME, MOYENNE, MAX, MIN)", dureeDefaut: 50 },
          { id: '2ac-info-l4', titre: "Mise en forme des tableaux et formats de cellules", dureeDefaut: 50 },
          { id: '2ac-info-l5', titre: "Représentation graphique des données (Histogrammes, Secteurs)", dureeDefaut: 50 },
        ],
      },
      {
        id: '2ac-info-u2',
        titre: "Présentation assistée par ordinateur (PowerPoint)",
        titreArabe: "العروض التقديمية",
        semestre: 1,
        lecons: [
          { id: '2ac-info-l6', titre: "Conception et structure d'un diaporama", dureeDefaut: 50 },
          { id: '2ac-info-l7', titre: "Insertion de textes, images et formes", dureeDefaut: 50 },
          { id: '2ac-info-l8', titre: "Animations et transitions de diapositives", dureeDefaut: 50 },
        ],
      },
      {
        id: '2ac-info-u3',
        titre: "Algorithmique et structures de contrôle (Scratch)",
        titreArabe: "الخوارزميات وهياكل التحكم",
        semestre: 2,
        lecons: [
          { id: '2ac-info-l9', titre: "Variables et saisie de valeurs par l'utilisateur", dureeDefaut: 50 },
          { id: '2ac-info-l10', titre: "Conditions simples : Structure conditionnelle Si ... Alors", dureeDefaut: 50 },
          { id: '2ac-info-l11', titre: "Alternative : Structure conditionnelle Si ... Alors ... Sinon", dureeDefaut: 50 },
          { id: '2ac-info-l12', titre: "Création d'un mini-jeu interactif ou quiz animé", dureeDefaut: 50 },
        ],
      },
    ],
    '3AC': [
      {
        id: '3ac-info-u1',
        titre: "Bases de données et traitement de l'information",
        titreArabe: "قواعد البيانات ومعالجة المعلومات",
        semestre: 1,
        lecons: [
          { id: '3ac-info-l1', titre: "Notion de base de données relationnelle (Tables, Champs, Enregistrements)", dureeDefaut: 50 },
          { id: '3ac-info-l2', titre: "Création de tables et définition des clés primaires", dureeDefaut: 50 },
          { id: '3ac-info-l3', titre: "Formulaires de saisie et consultation", dureeDefaut: 50 },
          { id: '3ac-info-l4', titre: "Interrogation des données (Requêtes simples de sélection)", dureeDefaut: 50 },
        ],
      },
      {
        id: '3ac-info-u2',
        titre: "Programmation textuelle (Python) ou Scratch avancé",
        titreArabe: "البرمجة بلغة بايثون أو سكراتش المتقدم",
        semestre: 2,
        lecons: [
          { id: '3ac-info-l5', titre: "Variables, types de données et affectation", dureeDefaut: 50 },
          { id: '3ac-info-l6', titre: "Instructions d'entrée/sortie (print / input)", dureeDefaut: 50 },
          { id: '3ac-info-l7', titre: "Conditions et opérateurs logiques (if, elif, else)", dureeDefaut: 50 },
          { id: '3ac-info-l8', titre: "Boucles bornées et non-bornées (for, while)", dureeDefaut: 50 },
          { id: '3ac-info-l9', titre: "Mini-projet de programmation (Calculatrice, Devinette)", dureeDefaut: 50 },
        ],
      },
    ],
  },
  'Mathématiques': {
    '1AC': [
      {
        id: '1ac-math-u1',
        titre: "Opérations sur les nombres entiers et décimaux positifs",
        titreArabe: "العمليات على الأعداد الصحيحة والعشرية الموجبة",
        semestre: 1,
        lecons: [
          { id: '1ac-math-l1', titre: "Enchaînement d'opérations sans parenthèses et avec parenthèses", dureeDefaut: 50 },
          { id: '1ac-math-l2', titre: "Distributivité de la multiplication par rapport à l'addition et la soustraction", dureeDefaut: 50 },
          { id: '1ac-math-l3', titre: "Écritures fractionnaires et comparaison de fractions", dureeDefaut: 50 },
          { id: '1ac-math-l4', titre: "Addition et soustraction de nombres en écriture fractionnaire", dureeDefaut: 50 },
          { id: '1ac-math-l5', titre: "Multiplication et division de nombres en écriture fractionnaire", dureeDefaut: 50 },
        ],
      },
      {
        id: '1ac-math-u2',
        titre: "Notions de géométrie plane",
        titreArabe: "مفاهيم الهندسة المستوية",
        semestre: 1,
        lecons: [
          { id: '1ac-math-l6', titre: "Droite, demi-droite et segment de droite", dureeDefaut: 50 },
          { id: '1ac-math-l7', titre: "Positions relatives de deux droites (sécantes, perpendiculaires, parallèles)", dureeDefaut: 50 },
          { id: '1ac-math-l8', titre: "Médiatrice d'un segment et cercle circonscrit", dureeDefaut: 50 },
          { id: '1ac-math-l9', titre: "Les angles (adjacents, complémentaires, supplémentaires)", dureeDefaut: 50 },
        ],
      },
      {
        id: '1ac-math-u3',
        titre: "Nombres relatifs et Calcul littéral",
        titreArabe: "الأعداد النسبية والحساب الحرفي",
        semestre: 2,
        lecons: [
          { id: '1ac-math-l10', titre: "Introduction aux nombres relatifs et repérage sur une droite", dureeDefaut: 50 },
          { id: '1ac-math-l11', titre: "Addition et soustraction des nombres relatifs", dureeDefaut: 50 },
          { id: '1ac-math-l12', titre: "Multiplication et division des nombres relatifs", dureeDefaut: 50 },
          { id: '1ac-math-l13', titre: "Développement et réduction d'expressions littérales", dureeDefaut: 50 },
          { id: '1ac-math-l14', titre: "Équations du premier degré à une inconnue", dureeDefaut: 50 },
        ],
      },
    ],
    '2AC': [
      {
        id: '2ac-math-u1',
        titre: "Nombres rationnels et puissances",
        titreArabe: "الأعداد الجذرية والقوى",
        semestre: 1,
        lecons: [
          { id: '2ac-math-l1', titre: "Introduction aux nombres rationnels et simplification", dureeDefaut: 50 },
          { id: '2ac-math-l2', titre: "Opérations sur les nombres rationnels", dureeDefaut: 50 },
          { id: '2ac-math-l3', titre: "Puissances d'un nombre rationnel et règles de calcul", dureeDefaut: 50 },
          { id: '2ac-math-l4', titre: "Écriture scientifique d'un nombre décimal", dureeDefaut: 50 },
        ],
      },
      {
        id: '2ac-math-u2',
        titre: "Triangle rectangle et théorème de Pythagore",
        titreArabe: "المثلث القائم الزاوية ومبرهنة فيتاغورس",
        semestre: 1,
        lecons: [
          { id: '2ac-math-l5', titre: "Théorème direct de Pythagore", dureeDefaut: 50 },
          { id: '2ac-math-l6', titre: "Théorème réciproque de Pythagore", dureeDefaut: 50 },
          { id: '2ac-math-l7', titre: "Cosinus d'un angle aigu dans un triangle rectangle", dureeDefaut: 50 },
        ],
      },
      {
        id: '2ac-math-u3',
        titre: "Calcul littéral et factorisation",
        titreArabe: "الحساب الحرفي والتعميل",
        semestre: 2,
        lecons: [
          { id: '2ac-math-l8', titre: "Les trois identités remarquables", dureeDefaut: 50 },
          { id: '2ac-math-l9', titre: "Factorisation d'expressions algébriques", dureeDefaut: 50 },
          { id: '2ac-math-l10', titre: "Équations et résolution de problèmes", dureeDefaut: 50 },
          { id: '2ac-math-l11', titre: "Ordre et opérations, inéquations", dureeDefaut: 50 },
        ],
      },
    ],
    '3AC': [
      {
        id: '3ac-math-u1',
        titre: "Racines carrées et identités remarquables",
        titreArabe: "الجذور المربعة والمتطابقات الهامة",
        semestre: 1,
        lecons: [
          { id: '3ac-math-l1', titre: "Définition et propriétés des racines carrées", dureeDefaut: 50 },
          { id: '3ac-math-l2', titre: "Simplification d'expressions contenant des radicaux", dureeDefaut: 50 },
          { id: '3ac-math-l3', titre: "Rendre rationnel le dénominateur d'une fraction", dureeDefaut: 50 },
          { id: '3ac-math-l4', titre: "Théorème de Thalès direct et réciproque", dureeDefaut: 50 },
          { id: '3ac-math-l5', titre: "Trigonométrie dans le triangle rectangle (sin, cos, tan)", dureeDefaut: 50 },
        ],
      },
      {
        id: '3ac-math-u2',
        titre: "Systèmes d'équations, Fonctions et Statistiques",
        titreArabe: "نظم المعادلات والدوال والإحصاء",
        semestre: 2,
        lecons: [
          { id: '3ac-math-l6', titre: "Systèmes de deux équations à deux inconnues (Substitution, Combinaison)", dureeDefaut: 50 },
          { id: '3ac-math-l7', titre: "Fonctions linéaires : définition, coefficient et représentation", dureeDefaut: 50 },
          { id: '3ac-math-l8', titre: "Fonctions affines : définition et représentation graphique", dureeDefaut: 50 },
          { id: '3ac-math-l9', titre: "Équation d'une droite et parallélisme/orthogonalité", dureeDefaut: 50 },
          { id: '3ac-math-l10', titre: "Statistiques : moyenne pondérée, médiane et dispersion", dureeDefaut: 50 },
        ],
      },
    ],
  },
  'Physique-Chimie': {
    '1AC': [
      {
        id: '1ac-pc-u1',
        titre: "L'eau dans notre environnement et les états de la matière",
        titreArabe: "الماء في بيئتنا وحالات المادة",
        semestre: 1,
        lecons: [
          { id: '1ac-pc-l1', titre: "L'eau autour de nous (cycle de l'eau, réservoirs naturels)", dureeDefaut: 50 },
          { id: '1ac-pc-l2', titre: "Les trois états de la matière et leurs propriétés physiques", dureeDefaut: 50 },
          { id: '1ac-pc-l3', titre: "Mesure du volume des liquides et des solides", dureeDefaut: 50 },
          { id: '1ac-pc-l4', titre: "Mesure de la masse des liquides et des solides", dureeDefaut: 50 },
          { id: '1ac-pc-l5', titre: "Masse volumique d'un corps pur", dureeDefaut: 50 },
        ],
      },
      {
        id: '1ac-pc-u2',
        titre: "Électricité : Le circuit électrique simple",
        titreArabe: "الكهرباء: الدارة الكهربائية البسيطة",
        semestre: 2,
        lecons: [
          { id: '1ac-pc-l6', titre: "Éléments d'un circuit électrique simple et schématisation", dureeDefaut: 50 },
          { id: '1ac-pc-l7', titre: "Conducteurs et isolants électriques", dureeDefaut: 50 },
          { id: '1ac-pc-l8', titre: "Montage en série et montage en dérivation", dureeDefaut: 50 },
          { id: '1ac-pc-l9', titre: "Le courant électrique continu (sens conventionnel, intensité, tension)", dureeDefaut: 50 },
        ],
      },
    ],
    '2AC': [
      {
        id: '2ac-pc-u1',
        titre: "L'atmosphère et les molécules / atomes",
        titreArabe: "الغلاف الجوي والجزيئات والذرات",
        semestre: 1,
        lecons: [
          { id: '2ac-pc-l1', titre: "L'air qui nous entoure et composition de l'atmosphère", dureeDefaut: 50 },
          { id: '2ac-pc-l2', titre: "Molécules et atomes (modèle moléculaire, formules chimiques)", dureeDefaut: 50 },
          { id: '2ac-pc-l3', titre: "Combustions complètes et incomplètes (carbone, butane)", dureeDefaut: 50 },
          { id: '2ac-pc-l4', titre: "La réaction chimique et la loi de conservation de la masse", dureeDefaut: 50 },
        ],
      },
      {
        id: '2ac-pc-u2',
        titre: "Optique et propagation de la lumière",
        titreArabe: "البصريات وانتشار الضوء",
        semestre: 2,
        lecons: [
          { id: '2ac-pc-l5', titre: "Sources et récepteurs de lumière", dureeDefaut: 50 },
          { id: '2ac-pc-l6', titre: "Propagation rectiligne de la lumière et faisceaux lumineux", dureeDefaut: 50 },
          { id: '2ac-pc-l7', titre: "Ombres, éclipses et chambre noire", dureeDefaut: 50 },
        ],
      },
    ],
    '3AC': [
      {
        id: '3ac-pc-u1',
        titre: "Matériaux, Atomes et Ions - Oxydation et Solutions",
        titreArabe: "المواد، الذرات والأيونات - الأكسدة والمحاليل",
        semestre: 1,
        lecons: [
          { id: '3ac-pc-l1', titre: "Exemples de matériaux utilisés dans la vie quotidienne", dureeDefaut: 50 },
          { id: '3ac-pc-l2', titre: "Structure de l'atome et notion d'ions (anions et cations)", dureeDefaut: 50 },
          { id: '3ac-pc-l3', titre: "Oxydation des métaux dans l'air (fer, aluminium)", dureeDefaut: 50 },
          { id: '3ac-pc-l4', titre: "Solutions acides et basiques, mesure du pH", dureeDefaut: 50 },
        ],
      },
      {
        id: '3ac-pc-u2',
        titre: "Mécanique : Mouvement, Vitesse et Forces",
        titreArabe: "الميكانيك: الحركة، السرعة والقوى",
        semestre: 2,
        lecons: [
          { id: '3ac-pc-l5', titre: "Mouvement et repos, référentiel et trajectoire", dureeDefaut: 50 },
          { id: '3ac-pc-l6', titre: "Vitesse moyenne et types de mouvements (uniforme, accéléré, ralenti)", dureeDefaut: 50 },
          { id: '3ac-pc-l7', titre: "Actions mécaniques et notion de force", dureeDefaut: 50 },
          { id: '3ac-pc-l8', titre: "Équilibre d'un corps solide soumis à deux forces", dureeDefaut: 50 },
          { id: '3ac-pc-l9', titre: "Poids et masse (relation P = m x g)", dureeDefaut: 50 },
        ],
      },
    ],
  },
  'Sciences de la Vie et de la Terre': {
    '1AC': [
      {
        id: '1ac-svt-u1',
        titre: "Unité 1 : Les relations entre les êtres vivants et leurs interactions avec le milieu",
        titreArabe: "الوحدة 1: العلاقات بين الكائنات الحية وتفاعلها مع الوسط",
        semestre: 1,
        lecons: [
          { id: '1ac-svt-l1', titre: "Observation et découverte d'un milieu naturel", dureeDefaut: 50 },
          { id: '1ac-svt-l2', titre: "La cellule : unité structurale des êtres vivants", dureeDefaut: 50 },
          { id: '1ac-svt-l3', titre: "La respiration dans différents milieux (aérien, aquatique)", dureeDefaut: 50 },
          { id: '1ac-svt-l4', titre: "L'alimentation chez les êtres vivants (régimes omnivore, herbivore, carnivore)", dureeDefaut: 50 },
          { id: '1ac-svt-l5', titre: "Les chaînes et réseaux trophiques", dureeDefaut: 50 },
        ],
      },
      {
        id: '1ac-svt-u2',
        titre: "Unité 2 : Les phénomènes géologiques externes",
        titreArabe: "الوحدة 2: الظواهر الجيولوجية الخارجية",
        semestre: 2,
        lecons: [
          { id: '1ac-svt-l6', titre: "L'érosion et la dégradation des roches", dureeDefaut: 50 },
          { id: '1ac-svt-l7', titre: "Le transport des sédiments par l'eau et le vent", dureeDefaut: 50 },
          { id: '1ac-svt-l8', titre: "La sédimentation et les milieux de dépôt", dureeDefaut: 50 },
          { id: '1ac-svt-l9', titre: "La diagenèse : transformation des sédiments en roches sédimentaires", dureeDefaut: 50 },
        ],
      },
    ],
    '2AC': [
      {
        id: '2ac-svt-u1',
        titre: "Les phénomènes géologiques internes",
        titreArabe: "الظواهر الجيولوجية الباطنية",
        semestre: 1,
        lecons: [
          { id: '2ac-svt-l1', titre: "Théorie de la dérive des continents et tectonique des plaques", dureeDefaut: 50 },
          { id: '2ac-svt-l2', titre: "Les séismes et leur relation avec la tectonique des plaques", dureeDefaut: 50 },
          { id: '2ac-svt-l3', titre: "Le volcanisme effusif et explosif", dureeDefaut: 50 },
          { id: '2ac-svt-l4', titre: "Formation des chaînes de montagnes (subduction et collision)", dureeDefaut: 50 },
        ],
      },
      {
        id: '2ac-svt-u2',
        titre: "La reproduction chez les êtres vivants",
        titreArabe: "التوالد عند الكائنات الحية",
        semestre: 2,
        lecons: [
          { id: '2ac-svt-l5', titre: "La reproduction sexuée chez les animaux", dureeDefaut: 50 },
          { id: '2ac-svt-l6', titre: "La reproduction chez les plantes à fleurs et sans fleurs", dureeDefaut: 50 },
          { id: '2ac-svt-l7', titre: "La reproduction chez l'Homme", dureeDefaut: 50 },
        ],
      },
    ],
    '3AC': [
      {
        id: '3ac-svt-u1',
        titre: "Fonctions de nutrition et éducation nutritionnelle",
        titreArabe: "وظائف التغذية والتربية الغذائية",
        semestre: 1,
        lecons: [
          { id: '3ac-svt-l1', titre: "Les aliments, la digestion et l'absorption intestinale", dureeDefaut: 50 },
          { id: '3ac-svt-l2', titre: "L'éducation nutritionnelle et les carences alimentaires", dureeDefaut: 50 },
          { id: '3ac-svt-l3', titre: "La respiration et les échanges gazeux chez l'Homme", dureeDefaut: 50 },
          { id: '3ac-svt-l4', titre: "Le sang et la circulation sanguine", dureeDefaut: 50 },
          { id: '3ac-svt-l5', titre: "L'excrétion urinaire", dureeDefaut: 50 },
        ],
      },
      {
        id: '3ac-svt-u2',
        titre: "Système nerveux, système musculaire et immunité",
        titreArabe: "الجهاز العصبي، الجهاز العضلي والمناعة",
        semestre: 2,
        lecons: [
          { id: '3ac-svt-l6', titre: "Le système nerveux : motricité volontaire, involontaire et sensibilité consciente", dureeDefaut: 50 },
          { id: '3ac-svt-l7', titre: "Le système musculaire : propriétés du muscle squelettique", dureeDefaut: 50 },
          { id: '3ac-svt-l8', titre: "Les microbes et le système immunitaire", dureeDefaut: 50 },
          { id: '3ac-svt-l9', titre: "L'immunité naturelle et l'immunité spécifique", dureeDefaut: 50 },
        ],
      },
    ],
  },
};

export function getUnitsFor(
  matiereNom: string,
  niveau: '1AC' | '2AC' | '3AC',
  semestre?: 1 | 2
): ChapterUnit[] {
  const subjectUnits = CURRICULUM_DATA[matiereNom]?.[niveau] || [];
  if (!semestre) return subjectUnits;
  return subjectUnits.filter(u => u.semestre === semestre);
}

export function getLessonsFor(
  matiereNom: string,
  niveau: '1AC' | '2AC' | '3AC',
  semestre?: 1 | 2,
  unitTitleOrId?: string
): LessonItem[] {
  const units = getUnitsFor(matiereNom, niveau, semestre);
  if (!unitTitleOrId || !unitTitleOrId.trim()) {
    return units.flatMap(u => u.lecons);
  }
  const needle = unitTitleOrId.trim().toLowerCase();
  const found = units.find(u => u.id.toLowerCase() === needle || u.titre.toLowerCase() === needle);
  return found ? found.lecons : units.flatMap(u => u.lecons);
}

export const MATIERES: Matiere[] = [
  { id: 'math', nom: 'Mathématiques', nomArabe: 'الرياضيات', niveaux: ['1AC', '2AC', '3AC'] },
  { id: 'svt', nom: 'Sciences de la Vie et de la Terre', nomArabe: 'علوم الحياة والأرض', niveaux: ['1AC', '2AC', '3AC'] },
  { id: 'physique', nom: 'Physique-Chimie', nomArabe: 'الفيزياء والكيمياء', niveaux: ['1AC', '2AC', '3AC'] },
  { id: 'francais', nom: 'Français', nomArabe: 'الفرنسية', niveaux: ['1AC', '2AC', '3AC'] },
  { id: 'arabe', nom: 'Arabe', nomArabe: 'العربية', niveaux: ['1AC', '2AC', '3AC'] },
  { id: 'anglais', nom: 'Anglais', nomArabe: 'الإنجليزية', niveaux: ['1AC', '2AC', '3AC'] },
  { id: 'histoire', nom: 'Histoire-Géographie', nomArabe: 'التاريخ والجغرافيا', niveaux: ['1AC', '2AC', '3AC'] },
  { id: 'education', nom: 'Éducation Islamique', nomArabe: 'التربية الإسلامية', niveaux: ['1AC', '2AC', '3AC'] },
  { id: 'tamazight', nom: 'Tamazight', nomArabe: 'تامازيغت', niveaux: ['1AC', '2AC', '3AC'] },
  { id: 'eps', nom: 'Éducation Physique', nomArabe: 'التربية البدنية', niveaux: ['1AC', '2AC', '3AC'] },
  { id: 'tech', nom: 'Technologies', nomArabe: 'التكنولوجيا', niveaux: ['1AC', '2AC', '3AC'] },
  { id: 'arts', nom: 'Arts Plastiques', nomArabe: 'التربية التشكيلية', niveaux: ['1AC', '2AC', '3AC'] },
  { id: 'musique', nom: 'Musique', nomArabe: 'التربية الموسيقية', niveaux: ['1AC', '2AC', '3AC'] },
  { id: 'info', nom: 'Informatique', nomArabe: 'المعلوماتية', niveaux: ['1AC', '2AC', '3AC'] },
];

export const NIVEAUX = ['1AC', '2AC', '3AC'] as const;

export const LANGUES = [
  { value: 'fr', label: 'Français' },
  { value: 'ar', label: 'Arabe' },
  { value: 'fr+ar', label: 'Bilingue (FR+AR)' },
] as const;


