export const TOOL_SCHEMAS: Record<string, string> = {
  fiche_pedagogique: `output_schema:
  titre_seance: string
  timing_consistency_check: string (Explication de la cohérence de la durée globale de la séance de duree min entre tous les documents)
  liens_avec_autres_disciplines: string[] (Maths, Français, Sciences, etc.)
  modalités_évaluation_formative: string[] (ex: observation, ardoise, quiz)
  préparation_antérieure: string (ex: L'enseignant doit préparer un poste démonté)
  competences_visees: string[]
  objectifs:
    - "Au moins un objectif TICE concret (ex: L'élève sait allumer/éteindre et utiliser un logiciel de traitement de texte)"
    - "1 descriptif objectif (taxonomie de Bloom)"
    - string
  prerequis: string[]
  savoir_faire: string[]
  savoir_etre:
    - "Savoir-être incluant des consignes de sécurité numérique (ex: Ne pas partager ses mots de passe, Éteindre correctement l'ordinateur)"
    - string
  deroulement:
    Mise_en_situation:
      rappel:
        duree: "5 min"
        enseignant: "Questionnement (Q1, Q2...)"
        apprenent: "Reponse (R1, R2...)"
      situation_probleme:
        duree: "10 min"
        enseignant: string
        apprenent: "Ecoute et assimile le contexte"
      outils_didactiques: string[]
    Analyse:
      Analyse_SP:
        duree: "8 min"
        enseignant: "Questionnement sur SP (Q1, Q2...)"
        apprenent: "Hypothese (H1, H2...)"
      Investigation:
        duree: "10 min"
        enseignant: "Filtrer et valider les hypotheses"
        apprenent: "Discuter les hypotheses"
      Generalisation:
        duree: "5 min"
        enseignant: "Presenter les notions, deduire les definitions"
        apprenent: "Comprendre les notions"
        savoir: "Notions et definitions (cours)"
      ENTRAINEMENT:
        duree: "7 min"
        enseignant: "Exercices d'application, correction, trace ecrite"
        apprenent: "Faire les exercices, corriger, noter le cours"
      outils_didactiques: string[]
    Synthese:
      Quiz:
        duree: "10 min"
        enseignant: "Donner le quiz"
        apprenent: "Repondre au quiz"
      outils_didactiques_materiel: string[]
`,
  planification: `output_schema:
  titre_seance: string
  timing_consistency_check: string (Explication de la cohérence de la durée globale de la séance de duree min entre tous les documents)
  competences_visees: string[]
  objectifs:
    - "Au moins un objectif TICE concret (ex: L'élève sait allumer/éteindre et utiliser un logiciel de traitement de texte)"
    - "1 descriptif objectif (taxonomie de Bloom)"
    - string
  prerequis: string[]
  savoir_faire: string[]
  savoir_etre:
    - "Savoir-être incluant des consignes de sécurité numérique (ex: Ne pas partager ses mots de passe, Éteindre correctement l'ordinateur)"
    - string
  deroulement:
    Mise_en_situation:
      rappel:
        duration: "temps en minutes"
        ACTION: "action de l'enseignant (marcher, montrer, ecrire...)"
        PAROLE: "parole de l'enseignant (questions, explications...)"
        INTERACTION: "interaction avec les eleves"
        indicateurs_reussite: "Indicateur de réussite (ex: 80% des élèves classent correctement matériel/logiciel)"
        interactions_attendues: "Interactions orales ou écrites attendues (ex: au moins 5 élèves participent à l'oral)"
      situation_probleme:
        duration: "temps en minutes"
        ACTION: "action de l'enseignant"
        PAROLE: "parole de l'enseignant, contexte SP"
        INTERACTION: "interaction avec les eleves"
        indicateurs_reussite: "Indicateur de réussite pour la SP"
        interactions_attendues: "Interactions orales ou écrites attendues"
    Analyse:
      Analyse_SP:
        duration: "temps en minutes"
        ACTION: "action de l'enseignant"
        PAROLE: "parole de l'enseignant, questionnement"
        INTERACTION: "interaction avec les eleves"
        indicateurs_reussite: "Indicateur de réussite"
        interactions_attendues: "Interactions attendues"
      Investigation:
        duration: "temps en minutes"
        ACTION: "action de l'enseignant"
        PAROLE: "parole de l'enseignant, explication"
        INTERACTION: "interaction avec les eleves"
        indicateurs_reussite: "Indicateur de réussite"
        interactions_attendues: "Interactions attendues"
      Generalisation:
        duration: "temps en minutes"
        ACTION: "action de l'enseignant"
        PAROLE: "parole de l'enseignant, notions"
        INTERACTION: "interaction avec les eleves"
        indicateurs_reussite: "Indicateur de réussite"
        interactions_attendues: "Interactions attendues"
        savoir: "Notions et definitions completes a noter"
      ENTRAINEMENT:
        duration: "temps en minutes"
        ACTION: "action de l'enseignant"
        PAROLE: "parole de l'enseignant, exercices"
        INTERACTION: "interaction avec les eleves"
        indicateurs_reussite: "Indicateur de réussite"
        interactions_attendues: "Interactions attendues"
    Synthese:
      Quiz:
        ACTION: "action de l'enseignant"
        PAROLE: "parole de l'enseignant, questions"
        INTERACTION: "interaction avec les eleves"
        indicateurs_reussite: "Indicateur de réussite"
        interactions_attendues: "Interactions attendues"
`,
  cours_complet: `output_schema:
  titre_seance: string
  timing_consistency_check: string (Explication de la cohérence de la durée globale de la séance de duree min entre tous les documents)
  variantes_pedagogiques: string (variantes d'explications si blocage de la classe)
  gestion_erreurs_frequentes: string (explications et relances face aux erreurs communes)
  conseils_surlignage: string (mots-clés sur lesquels insister)
  script_enseignant:
    Mise_en_situation:
      rappel: "Texte du script (questions a poser, transitions verbales)"
      situation_probleme: "Texte narratif du probleme a presenter"
    Analyse:
      Analyse_SP: "Script de questionnement sur la SP"
      Investigation: "Script de discussion et filtrage des hypotheses"
      Generalisation: "Script d'explication des notions + definitions a dicter"
      ENTRAINEMENT: "Script de consignes pour les exercices + correction orale"
    Synthese:
      Quiz: "Script des questions du quiz oral/ecrit"
  savoir:
    definitions:
      - terme: "Mot cle (eviter les termes complexes comme binaire, CPU, RAM sauf si definis tres simplement)"
        definition: "Definition tres simple et illustree du terme"
    schema_reseau: "Description textuelle ou ASCII du schema a dessiner au tableau"
    exemples_concrets:
      - "Exemple culturellement adapte au contexte marocain (ex: Imprimer une photo pour le projet de l'ecole, Wi-Fi du dar chabab, facture d'eau REDAL/LYDEC)"
      - string
  plan_tableau:
    zone_titre: string
    zone_probleme: string
    zone_cours: "string (notions, definitions, schemas)"
    zone_exercices: string
  activites_eleves:
    - etape: "Etape de l'activite"
      consigne: "Consigne donnee aux eleves"
      production_attendue: "Ce que les eleves doivent produire"
  annotations: "string (conseils pedagogiques, points de vigilance)"
`,
  plan_gestion_classe: `output_schema:
  titre_seance: string
  gestion_retard: string (procédure pour élève arrivant en retard)
  gestion_fin_de_seance: string (ranger, bilan, annonce prochaine séance)
  alternatives_sans_materiel: string (si panne d'ordinateur ou coupure d'électricité)
  strategie_entree:
    accueil: string
    mise_en_route: string
    captation_attention: string
  organisation_espace:
    disposition_tables: string
    zones_activite: string[]
    acces_materiel: string
  gestion_temps:
    Mise_en_situation: string (X min)
    Analyse: string (X min)
    Synthese: string (X min)
    marge_imprevus: string (X min)
    signaux_transition: string
  gestion_comportement:
    regles_rappelees: string[]
    gestion_bavardages: string
    gestion_eleve_bloqué: string
  differenciation:
    eleves_rapides: string
    eleves_en_difficulte: string
  remédiation:
    erreurs_frequentes_prevues: string[]
    priorisation_erreurs_frequentes:
      - erreur: "Description de l'erreur critique rencontrée"
        remediation_ciblee: "Action ciblée de remédiation pour surmonter l'erreur (exactement 3 erreurs prioritaires)"
    strategie_correction: string
`,
  evaluation: `output_schema:
  titre: string
  niveau: string
  duree: string
  evaluation_automatique: boolean (true pour activer le scoring dynamique et l'auto-correction dans le HTML)
  consigne_generale: string
  partie_restitution:
    titre: string ("Première Partie : Restitution des connaissances / استرداد المعارف")
    points_total: number (6 à 8 points impérativement)
    consigne: string
    questions:
      - numero: number
        type: "qcm" | "vrai_faux" | "appariement" | "definition" | "texte_a_trous"
        competence_evaluee: string
        niveau_bloom: "Mémoriser" | "Comprendre"
        enonce: string
        options?: string[]
        points: number
        correction: string
        feedback_personnalise: string
  partie_raisonnement_apc:
    titre: string ("Deuxième Partie : Raisonnement scientifique et résolution de problème (APC) / الاستدلال العلمي وحل المشكلات")
    points_total: number (12 à 14 points impérativement)
    situation_probleme: string (Contexte ancré dans la vie marocaine et adapté au collège)
    documents_supports?: string[] (Données, textes, tableaux ou descriptions de schémas)
    questions:
      - numero: number
        type: "exercice" | "ouvert" | "analyse_donnees" | "deduction"
        competence_evaluee: string
        niveau_bloom: "Appliquer" | "Analyser" | "Créer"
        enonce: string
        points: number
        correction: string
        feedback_personnalise: string
  questions:
    - numero: number
      type: "qcm" | "vrai_faux" | "ouvert" | "appariement" | "exercice"
      competence_evaluee: string (lien direct avec objectifs de la fiche_pedagogique)
      niveau_bloom: "Mémoriser" | "Comprendre" | "Appliquer"
      enonce: string
      options?: string[]
      points: number
      correction: string
      feedback_personnalise: string
  elements_reponse:
    - question_ref: string (ex: "Partie 1 - Question 1" ou "Partie 2 - Question 2.a")
      reponse_modele: string (Réponse attendue complète et détaillée)
      bareme_detaille: string (Fractionnement des points ex: 0.5 pt pour formule + 0.5 pt pour calcul)
      criteres_acceptation: string (Tolérances et réponses alternatives valides)
  bareme:
    total_points: number (EXACTEMENT 20 points au total)
    repartition_par_competence:
      - competence: string
        points: number
    criteres: string[]
  grille_criteriee_apc:
    - critere_code: "C1" | "C2" | "C3" | "CP"
      critere_nom: string (ex: "C1: Pertinence / الملائمة", "C2: Utilisation correcte des outils de la discipline", "C3: Cohérence du raisonnement", "CP: Perfectionnement & Soin de la copie")
      description: string
      indicateurs: string[]
      points_max: number
      niveaux_maitrise:
        maitrise_maximale: string (100% des points)
        maitrise_minimale: string (50% à 75% des points)
        non_maitrise: string (0% à 25% des points)
  grille_evaluation:
    - critere: string
      indicateurs: string[]
      points_max: number
`,
  resume_eleve: `output_schema:
  titre: string
  qrcode_externe: string (ex: lien Kahoot ou vidéo courte)
  illustration_ascii: string (dessin ASCII représentatif simple)
  auto_evaluation: string[] (ex: ["Je sais allumer un ordinateur", "Je connais la différence entre matériel et logiciel"])
  introduction: "1-2 phrases d'accroche tres simples et accessibles sans aide pour 1AC (Lisibilité Flesch > 60)"
  resume: "Paragraphe synthetique redige dans un vocabulaire simple (lisible en autonomie par un eleve de 1AC)"
  notions_cles:
    - terme: string
      definition_simple: "Definition simplifiee sans jargon (pas de CPU/RAM/binaire brut)"
      exemple: "Exemple de la vie quotidienne marocaine (ex: Wi-Fi du dar chabab, imprimer pour l'ecole)"
  schema_simplifie: string
  points_cles: string[]
  a_retenir: string
  exercices:
    - numero: number
      type: "qcm" | "vrai_faux" | "relie" | "trou"
      enonce: string
      options: string[]
      correction: string
  lexique_bilingue:
    - terme_fr: string (Terme technique ou conceptuel en français)
      terme_ar: string (Traduction officielle et exacte en arabe)
      contexte: string (Exemple court ou contexte d'utilisation)
`,
  presentation_pptx: `output_schema:
  titre_presentation: string
  timing_consistency_check: string (Explication de la cohérence de la durée globale de la séance de duree min entre tous les documents)
  slides:
    - numero: number
      phase_pedagogique: "Mise_en_situation" | "Analyse" | "Synthese"
      layout: "titre" | "contenu" | "deux_colonnes" | "image_texte" | "quiz" | "recapitulatif"
      title: string
      slide_duration_minutes: number (durée de cette diapositive)
      transition_animation: string (ex: apparition progressive des puces)
      questions_audience: string[] (questions posées à l'oral avant d'afficher la réponse)
      bullets: string[]
      visuel: string (description du schéma/image à insérer)
      notes: string (ce que dit l'enseignant sur cette diapo)
  ordre_slides: string[]
`,
  images_illustratives: `output: text/plain
  separator: "---"
  style_consigne: "SVG ou PNG vectoriel, style dessin animé moderne, fond blanc, pas de texte long, lisible à distance, adapté à 1AC (12-13 ans)"
  taille_minimale_texte: "police 20px ou plus"
  interdiction_texte_anglais: "uniquement du français (sauf WiFi)"
  prompt_format:
    - id: number
      filename: string (ex: lan_schema.png)
      description: string (usage pédagogique de l'image)
      purpose: "mise_en_situation" | "cours" | "exercice" | "synthese" | "resume_eleve" | "pptx"
      prompt: string (detailed prompt for image generator)
  count: 5-7
  output_file: "images_prompts.txt"
`,
};
