import type { CourseMetadata } from '@/types/generation';
import { estimateTokens } from '@/lib/utils/tokenEstimator';
import { assembleSystemPrompt } from '@/lib/agents/prompts';

const HF_API_URL = 'https://router.huggingface.co/v1/chat/completions';
const HF_MODEL = 'openai/gpt-oss-120b:fastest';

export const pedagogicalTools = [
  {
    type: 'function' as const,
    function: {
      name: 'generate_fiche_pedagogique',
      description: 'Generate a complete fiche pédagogique following the Moroccan Ministry of Education APC format with dialogue-based phased deroulement.',
      parameters: {
        type: 'object',
        properties: {
          titre_seance: { type: 'string', description: 'Title of the lesson session' },
          timing_consistency_check: { type: 'string', description: 'Explication de la cohérence de la durée globale de la séance de duree min entre tous les documents' },
          liens_avec_autres_disciplines: { type: 'array', items: { type: 'string' }, description: 'Interdisciplinary links (Maths, Français, Sciences...)' },
          modalités_évaluation_formative: { type: 'array', items: { type: 'string' }, description: 'Formative evaluation modalities (observation, slate, quiz...)' },
          préparation_antérieure: { type: 'string', description: 'Prior preparation required by teacher (e.g. set up a disassembled PC)' },
          objectifs: { type: 'array', items: { type: 'string' }, description: 'Learning objectives using Bloom taxonomy, including at least one concrete TICE objective' },
          competences_visees: { type: 'array', items: { type: 'string' } },
          prerequis: { type: 'array', items: { type: 'string' } },
          savoir_faire: { type: 'array', items: { type: 'string' } },
          savoir_etre: { type: 'array', items: { type: 'string' }, description: 'Savoir-être à développer (inclure obligatoirement des consignes de sécurité numérique)' },
          deroulement: {
            type: 'object',
            properties: {
              Mise_en_situation: {
                type: 'object',
                properties: {
                  rappel: {
                    type: 'object',
                    properties: {
                      enseignant: { type: 'string', description: "Questionnement (Q1, Q2...)" },
                      apprenent: { type: 'string', description: "Reponse (R1, R2...)" },
                    },
                    required: ['enseignant', 'apprenent'],
                  },
                  situation_probleme: {
                    type: 'object',
                    properties: {
                      enseignant: { type: 'string', description: "Presentation du probleme" },
                      apprenent: { type: 'string', description: "Ecoute et assimile le contexte" },
                    },
                    required: ['enseignant', 'apprenent'],
                  },
                  outils_didactiques: { type: 'array', items: { type: 'string' } },
                },
                required: ['rappel', 'situation_probleme'],
              },
              Analyse: {
                type: 'object',
                properties: {
                  Analyse_SP: {
                    type: 'object',
                    properties: {
                      enseignant: { type: 'string', description: "Questionnement sur SP (Q1, Q2...)" },
                      apprenent: { type: 'string', description: "Hypothese (H1, H2...)" },
                    },
                    required: ['enseignant', 'apprenent'],
                  },
                  Investigation: {
                    type: 'object',
                    properties: {
                      enseignant: { type: 'string', description: "Filtrer et valider les hypotheses" },
                      apprenent: { type: 'string', description: "Discuter les hypotheses" },
                    },
                    required: ['enseignant', 'apprenent'],
                  },
                  Generalisation: {
                    type: 'object',
                    properties: {
                      enseignant: { type: 'string', description: "Presenter les notions, deduire les definitions" },
                      apprenent: { type: 'string', description: "Comprendre les notions" },
                      savoir: { type: 'string', description: "Notions et definitions (cours a noter)" },
                    },
                    required: ['enseignant', 'apprenent'],
                  },
                  ENTRAINEMENT: {
                    type: 'object',
                    properties: {
                      enseignant: { type: 'string', description: "Exercices d'application, correction, trace ecrite" },
                      apprenent: { type: 'string', description: "Faire les exercices, corriger, noter le cours" },
                    },
                    required: ['enseignant', 'apprenent'],
                  },
                  outils_didactiques: { type: 'array', items: { type: 'string' } },
                },
                required: ['Analyse_SP', 'Investigation', 'Generalisation', 'ENTRAINEMENT'],
              },
              Synthese: {
                type: 'object',
                properties: {
                  Quiz: {
                    type: 'object',
                    properties: {
                      enseignant: { type: 'string', description: "Donner le quiz" },
                      apprenent: { type: 'string', description: "Repondre au quiz" },
                    },
                    required: ['enseignant', 'apprenent'],
                  },
                  outils_didactiques_materiel: { type: 'array', items: { type: 'string' } },
                },
                required: ['Quiz'],
              },
            },
            required: ['Mise_en_situation', 'Analyse', 'Synthese'],
          },
          evaluation_type: { type: 'string', enum: ['formative', 'sommative', 'diagnostique'] },
          materiel: { type: 'array', items: { type: 'string' } },
        },
        required: ['titre_seance', 'timing_consistency_check', 'objectifs', 'deroulement'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'generate_planification',
      description: 'Generate a detailed planification de séance with ACTION/PAROLE/INTERACTION teaching script.',
      parameters: {
        type: 'object',
        properties: {
          titre_seance: { type: 'string', description: 'Title of the lesson session' },
          timing_consistency_check: { type: 'string', description: 'Explication de la cohérence de la durée globale de la séance de duree min entre tous les documents' },
          competences_visees: { type: 'array', items: { type: 'string' } },
          objectifs: { type: 'array', items: { type: 'string' }, description: 'Learning objectives using Bloom taxonomy, including at least one concrete TICE objective' },
          prerequis: { type: 'array', items: { type: 'string' } },
          savoir_faire: { type: 'array', items: { type: 'string' } },
          savoir_etre: { type: 'array', items: { type: 'string' }, description: 'Savoir-être à développer (inclure obligatoirement des consignes de sécurité numérique)' },
          deroulement: {
            type: 'object',
            properties: {
              Mise_en_situation: {
                type: 'object',
                properties: {
                  rappel: {
                    type: 'object',
                    properties: {
                      duration: { type: 'string', description: 'temps en minutes' },
                      ACTION: { type: 'string', description: "action de l'enseignant" },
                      PAROLE: { type: 'string', description: "parole de l'enseignant" },
                      INTERACTION: { type: 'string', description: "interaction avec les eleves" },
                      indicateurs_reussite: { type: 'string', description: "Indicateur de réussite (ex: 80% des élèves classent correctement matériel/logiciel)" },
                      interactions_attendues: { type: 'string', description: "Interactions orales ou écrites attendues de la part des élèves (ex: au moins 5 élèves participent à l'oral)" },
                    },
                    required: ['ACTION', 'PAROLE', 'INTERACTION', 'indicateurs_reussite', 'interactions_attendues'],
                  },
                  situation_probleme: {
                    type: 'object',
                    properties: {
                      duration: { type: 'string', description: 'temps en minutes' },
                      ACTION: { type: 'string', description: "action de l'enseignant" },
                      PAROLE: { type: 'string', description: "parole de l'enseignant, contexte SP" },
                      INTERACTION: { type: 'string', description: "interaction avec les eleves" },
                      indicateurs_reussite: { type: 'string', description: "Indicateur de réussite pour la SP" },
                      interactions_attendues: { type: 'string', description: "Interactions orales ou écrites attendues" },
                    },
                    required: ['ACTION', 'PAROLE', 'INTERACTION', 'indicateurs_reussite', 'interactions_attendues'],
                  },
                },
                required: ['rappel', 'situation_probleme'],
              },
              Analyse: {
                type: 'object',
                properties: {
                  Analyse_SP: {
                    type: 'object',
                    properties: {
                      duration: { type: 'string', description: 'temps en minutes' },
                      ACTION: { type: 'string', description: "action de l'enseignant" },
                      PAROLE: { type: 'string', description: "parole de l'enseignant, questionnement" },
                      INTERACTION: { type: 'string', description: "interaction avec les eleves" },
                      indicateurs_reussite: { type: 'string', description: "Indicateur de réussite" },
                      interactions_attendues: { type: 'string', description: "Interactions orales ou écrites attendues" },
                    },
                    required: ['ACTION', 'PAROLE', 'INTERACTION', 'indicateurs_reussite', 'interactions_attendues'],
                  },
                  Investigation: {
                    type: 'object',
                    properties: {
                      duration: { type: 'string', description: 'temps en minutes' },
                      ACTION: { type: 'string', description: "action de l'enseignant" },
                      PAROLE: { type: 'string', description: "parole de l'enseignant, explication" },
                      INTERACTION: { type: 'string', description: "interaction avec les eleves" },
                      indicateurs_reussite: { type: 'string', description: "Indicateur de réussite" },
                      interactions_attendues: { type: 'string', description: "Interactions orales ou écrites attendues" },
                    },
                    required: ['ACTION', 'PAROLE', 'INTERACTION', 'indicateurs_reussite', 'interactions_attendues'],
                  },
                  Generalisation: {
                    type: 'object',
                    properties: {
                      duration: { type: 'string', description: 'temps en minutes' },
                      ACTION: { type: 'string', description: "action de l'enseignant" },
                      PAROLE: { type: 'string', description: "parole de l'enseignant, notions" },
                      INTERACTION: { type: 'string', description: "interaction avec les eleves" },
                      indicateurs_reussite: { type: 'string', description: "Indicateur de réussite" },
                      interactions_attendues: { type: 'string', description: "Interactions orales ou écrites attendues" },
                      savoir: { type: 'string', description: "Notions et definitions completes a noter" },
                    },
                    required: ['ACTION', 'PAROLE', 'INTERACTION', 'indicateurs_reussite', 'interactions_attendues'],
                  },
                  ENTRAINEMENT: {
                    type: 'object',
                    properties: {
                      duration: { type: 'string', description: 'temps en minutes' },
                      ACTION: { type: 'string', description: "action de l'enseignant" },
                      PAROLE: { type: 'string', description: "parole de l'enseignant, exercices" },
                      INTERACTION: { type: 'string', description: "interaction avec les eleves" },
                      indicateurs_reussite: { type: 'string', description: "Indicateur de réussite" },
                      interactions_attendues: { type: 'string', description: "Interactions orales ou écrites attendues" },
                    },
                    required: ['ACTION', 'PAROLE', 'INTERACTION', 'indicateurs_reussite', 'interactions_attendues'],
                  },
                },
                required: ['Analyse_SP', 'Investigation', 'Generalisation', 'ENTRAINEMENT'],
              },
              Synthese: {
                type: 'object',
                properties: {
                  Quiz: {
                    type: 'object',
                    properties: {
                      ACTION: { type: 'string', description: "action de l'enseignant" },
                      PAROLE: { type: 'string', description: "parole de l'enseignant, questions" },
                      INTERACTION: { type: 'string', description: "interaction avec les eleves" },
                      indicateurs_reussite: { type: 'string', description: "Indicateur de réussite" },
                      interactions_attendues: { type: 'string', description: "Interactions orales ou écrites attendues" },
                    },
                    required: ['ACTION', 'PAROLE', 'INTERACTION', 'indicateurs_reussite', 'interactions_attendues'],
                  },
                },
                required: ['Quiz'],
              },
            },
            required: ['Mise_en_situation', 'Analyse', 'Synthese'],
          },
        },
        required: ['titre_seance', 'timing_consistency_check', 'competences_visees', 'objectifs', 'deroulement'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'generate_cours_complet',
      description: 'Generate the full lesson content including phased teacher script, savoir definitions, blackboard layout zones, and structured student activities.',
      parameters: {
        type: 'object',
        properties: {
          titre_seance: { type: 'string', description: 'Title of the lesson session' },
          timing_consistency_check: { type: 'string', description: 'Explication de la cohérence de la durée globale de la séance de duree min entre tous les documents' },
          variantes_pedagogiques: { type: 'string', description: 'Variantes d\'explications si les élèves bloquent sur une notion' },
          gestion_erreurs_frequentes: { type: 'string', description: 'Comment réagir face aux erreurs classiques dans le script' },
          conseils_surlignage: { type: 'string', description: 'Mots-clés ou passages à surligner/mettre en valeur' },
          script_enseignant: {
            type: 'object',
            properties: {
              Mise_en_situation: {
                type: 'object',
                properties: {
                  rappel: { type: 'string', description: 'Script: questions, verbal transitions' },
                  situation_probleme: { type: 'string', description: 'Narrative of the problem to present' },
                },
                required: ['rappel', 'situation_probleme'],
              },
              Analyse: {
                type: 'object',
                properties: {
                  Analyse_SP: { type: 'string', description: 'Questioning script on the problem situation' },
                  Investigation: { type: 'string', description: 'Discussion and hypothesis filtering script' },
                  Generalisation: { type: 'string', description: 'Explanation + definitions to dictate' },
                  ENTRAINEMENT: { type: 'string', description: 'Exercise instructions + oral correction script' },
                },
                required: ['Analyse_SP', 'Investigation', 'Generalisation', 'ENTRAINEMENT'],
              },
              Synthese: {
                type: 'object',
                properties: {
                  Quiz: { type: 'string', description: 'Oral/written quiz questions script' },
                },
                required: ['Quiz'],
              },
            },
            required: ['Mise_en_situation', 'Analyse', 'Synthese'],
          },
          savoir: {
            type: 'object',
            properties: {
              definitions: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    terme: { type: 'string', description: 'Key term (simple terms, avoid CPU/RAM/binaire unless defined simply)' },
                    definition: { type: 'string', description: 'Simple definition of the term' },
                  },
                  required: ['terme', 'definition'],
                },
              },
              schema_reseau: { type: 'string', description: 'Textual/ASCII description of the diagram to draw on board' },
              exemples_concrets: { type: 'array', items: { type: 'string' }, description: 'Concrete everyday Moroccan examples (e.g. Wi-Fi du dar chabab, imprimer pour l\'ecole)' },
            },
            required: ['definitions'],
          },
          plan_tableau: {
            type: 'object',
            properties: {
              zone_titre: { type: 'string' },
              zone_probleme: { type: 'string' },
              zone_cours: { type: 'string', description: 'Notions, definitions, diagrams' },
              zone_exercices: { type: 'string' },
            },
            required: ['zone_titre', 'zone_cours'],
          },
          activites_eleves: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                etape: { type: 'string', description: 'Activity step' },
                consigne: { type: 'string', description: 'Instructions given to students' },
                production_attendue: { type: 'string', description: 'Expected student output' },
              },
              required: ['etape', 'consigne'],
            },
          },
          annotations: { type: 'string', description: 'Pedagogical tips and watchpoints' },
        },
        required: ['titre_seance', 'timing_consistency_check', 'variantes_pedagogiques', 'gestion_erreurs_frequentes', 'conseils_surlignage', 'script_enseignant', 'savoir', 'plan_tableau', 'activites_eleves'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'generate_gestion_classe',
      description: 'Generate a classroom management plan tailored to Moroccan collège context.',
      parameters: {
        type: 'object',
        properties: {
          titre_seance: { type: 'string', description: 'Session title' },
          gestion_retard: { type: 'string', description: 'Procédure pour élève arrivant en retard' },
          gestion_fin_de_seance: { type: 'string', description: 'Ranger, bilan, annonce de la prochaine séance' },
          alternatives_sans_materiel: { type: 'string', description: 'Alternatives si panne d\'ordinateur ou coupure d\'électricité' },
          strategie_entree: {
            type: 'object',
            properties: {
              accueil: { type: 'string', description: 'Accueil des élèves' },
              mise_en_route: { type: 'string', description: 'Mise en route de la séance' },
              captation_attention: { type: 'string', description: 'Captation de l\'attention des élèves' },
            },
            required: ['accueil', 'mise_en_route', 'captation_attention'],
          },
          organisation_espace: {
            type: 'object',
            properties: {
              disposition_tables: { type: 'string', description: 'Disposition des tables' },
              zones_activite: { type: 'array', items: { type: 'string' }, description: 'Zones d\'activité' },
              acces_materiel: { type: 'string', description: 'Accès au matériel' },
            },
            required: ['disposition_tables', 'zones_activite', 'acces_materiel'],
          },
          gestion_temps: {
            type: 'object',
            properties: {
              Mise_en_situation: { type: 'string', description: 'Durée phase mise en situation' },
              Analyse: { type: 'string', description: 'Durée phase analyse' },
              Synthese: { type: 'string', description: 'Durée phase synthèse' },
              marge_imprevus: { type: 'string', description: 'Marge pour imprévus' },
              signaux_transition: { type: 'string', description: 'Signal de transition entre phases' },
            },
            required: ['Mise_en_situation', 'Analyse', 'Synthese', 'marge_imprevus', 'signaux_transition'],
          },
          gestion_comportement: {
            type: 'object',
            properties: {
              regles_rappelees: { type: 'array', items: { type: 'string' }, description: 'Règles rappelées' },
              gestion_bavardages: { type: 'string', description: 'Gestion des bavardages' },
              gestion_eleve_bloqué: { type: 'string', description: 'Gestion des élèves bloqués' },
            },
            required: ['regles_rappelees', 'gestion_bavardages', 'gestion_eleve_bloqué'],
          },
          differenciation: {
            type: 'object',
            properties: {
              eleves_rapides: { type: 'string', description: 'Activité d\'extension pour élèves rapides' },
              eleves_en_difficulte: { type: 'string', description: 'Étayage pour élèves en difficulté' },
            },
            required: ['eleves_rapides', 'eleves_en_difficulte'],
          },
          remédiation: {
            type: 'object',
            properties: {
              erreurs_frequentes_prevues: { type: 'array', items: { type: 'string' }, description: 'Erreurs fréquentes anticipées' },
              priorisation_erreurs_frequentes: {
                type: 'array',
                maxItems: 3,
                minItems: 3,
                items: {
                  type: 'object',
                  properties: {
                    erreur: { type: 'string', description: 'Description de l\'erreur critique rencontrée' },
                    remediation_ciblee: { type: 'string', description: 'Action ciblée de remédiation spécifique pour surmonter l\'erreur' }
                  },
                  required: ['erreur', 'remediation_ciblee']
                },
                description: 'Cibler exactement les 3 erreurs les plus critiques rencontrées par les élèves'
              },
              strategie_correction: { type: 'string', description: 'Stratégie de correction' },
            },
            required: ['erreurs_frequentes_prevues', 'priorisation_erreurs_frequentes', 'strategie_correction'],
          },
        },
        required: ['titre_seance', 'gestion_retard', 'gestion_fin_de_seance', 'alternatives_sans_materiel', 'strategie_entree', 'organisation_espace', 'gestion_temps', 'gestion_comportement', 'differenciation', 'remédiation'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'generate_resume_eleve',
      description: 'Generate a student-facing lesson summary in simplified French suitable for 1AC level.',
      parameters: {
        type: 'object',
        properties: {
          titre: { type: 'string', description: 'Title of the summary' },
          qrcode_externe: { type: 'string', description: 'Lien QR code externe vers une ressource additionnelle (vidéo courte, Kahoot...)' },
          illustration_ascii: { type: 'string', description: 'Dessin ou schéma ASCII simple représentatif imprimable' },
          auto_evaluation: { type: 'array', items: { type: 'string' }, description: 'Checklist d\'auto-évaluation pour l\'élève' },
          introduction: { type: 'string', description: '1-2 sentence hook accessible at 1AC level (Flesch readability index > 60, readable without teacher assistance)' },
          resume: { type: 'string', description: 'Synthetic paragraph with simple vocabulary' },
          notions_cles: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                terme: { type: 'string', description: 'Key term' },
                definition_simple: { type: 'string', description: 'Simple definition (no CPU/RAM/binaire jargon)' },
                exemple: { type: 'string', description: 'Concrete Moroccan everyday example (e.g. Wi-Fi du dar chabab)' },
              },
              required: ['terme', 'definition_simple', 'exemple'],
            },
            description: 'Key concepts with simple definitions and examples',
          },
          schema_simplifie: { type: 'string', description: 'ASCII or text description of a simplified diagram to copy' },
          points_cles: { type: 'array', items: { type: 'string' }, description: 'Key takeaways in bullet form' },
          a_retenir: { type: 'string', description: 'Short memorable phrase' },
          exercices: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                numero: { type: 'number', description: 'Exercise number' },
                type: { type: 'string', enum: ['qcm', 'vrai_faux', 'relie', 'trou'], description: 'Exercise type' },
                enonce: { type: 'string', description: 'Question text' },
                options: { type: 'array', items: { type: 'string' }, description: 'Answer options for QCM/relie types' },
                correction: { type: 'string', description: 'Correct answer' },
              },
              required: ['numero', 'type', 'enonce', 'correction'],
            },
            description: 'Practice exercises',
          },
          lexique_bilingue: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                terme_fr: { type: 'string', description: 'Terme en français' },
                terme_ar: { type: 'string', description: 'Traduction officielle en arabe' },
                contexte: { type: 'string', description: 'Exemple court ou contexte' },
              },
              required: ['terme_fr', 'terme_ar'],
            },
            description: 'Lexique bilingue français-arabe des termes clés',
          },
        },
        required: ['titre', 'qrcode_externe', 'illustration_ascii', 'auto_evaluation', 'introduction', 'resume', 'notions_cles', 'points_cles', 'a_retenir', 'exercices'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'generate_evaluation',
      description: 'Generate an evaluation/quiz for the lesson.',
      parameters: {
        type: 'object',
        properties: {
          titre: { type: 'string', description: 'Title of the evaluation' },
          niveau: { type: 'string', description: 'Level (1AC, 2AC, 3AC)' },
          duree: { type: 'string', description: 'Duration (e.g. 45 min)' },
          evaluation_automatique: { type: 'boolean', description: 'True to enable dynamic HTML scoring and self-correction for QCM and Vrai/Faux' },
          consigne_generale: { type: 'string', description: 'General instructions for students' },
          questions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                numero: { type: 'number' },
                type: { type: 'string', enum: ['qcm', 'vrai_faux', 'ouvert', 'appariement', 'exercice'] },
                competence_evaluee: { type: 'string', description: 'Competence being assessed, linked to fiche_pedagogique objectives' },
                niveau_bloom: { type: 'string', enum: ['Mémoriser', 'Comprendre', 'Appliquer'] },
                enonce: { type: 'string', description: 'Question text' },
                options: { type: 'array', items: { type: 'string' }, description: 'Answer choices for QCM' },
                points: { type: 'number' },
                correction: { type: 'string', description: 'Expected answer or correction key' },
                feedback_personnalise: { type: 'string', description: 'Feedback personnalisé pour chaque réponse (pas juste vrai/faux)' },
              },
              required: ['numero', 'type', 'enonce', 'points', 'correction'],
            },
          },
          bareme: {
            type: 'object',
            properties: {
              total_points: { type: 'number' },
              repartition_par_competence: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    competence: { type: 'string' },
                    points: { type: 'number' },
                  },
                },
              },
              criteres: { type: 'array', items: { type: 'string' } },
            },
          },
          grille_evaluation: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                critere: { type: 'string' },
                indicateurs: { type: 'array', items: { type: 'string' } },
                points_max: { type: 'number' },
              },
            },
          },
        },
        required: ['titre', 'niveau', 'duree', 'evaluation_automatique', 'questions'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'generate_pptx_outline',
      description: 'Generate a structured PPTX slide outline with pedagogical phases and layouts.',
      parameters: {
        type: 'object',
        properties: {
          titre_presentation: { type: 'string', description: 'Presentation title' },
          timing_consistency_check: { type: 'string', description: 'Explication de la cohérence de la durée globale de la séance de duree min entre tous les documents' },
          slides: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                numero: { type: 'number' },
                phase_pedagogique: {
                  type: 'string',
                  enum: ['Mise_en_situation', 'Analyse', 'Synthese'],
                  description: 'Pedagogical phase this slide belongs to',
                },
                layout: {
                  type: 'string',
                  enum: ['titre', 'contenu', 'deux_colonnes', 'image_texte', 'quiz', 'recapitulatif'],
                  description: 'Slide layout type',
                },
                title: { type: 'string' },
                slide_duration_minutes: { type: 'number', description: 'Durée de cette diapositive en minutes' },
                transition_animation: { type: 'string', description: 'Description de la transition ou de l\'animation (ex: apparition progressive des puces)' },
                questions_audience: { type: 'array', items: { type: 'string' }, description: 'Questions intégrées à poser à l\'audience avant d\'afficher la réponse' },
                bullets: { type: 'array', items: { type: 'string' } },
                visuel: { type: 'string', description: 'Description of diagram/image to insert' },
                notes: { type: 'string', description: 'What the teacher says on this slide' },
              },
              required: ['numero', 'phase_pedagogique', 'layout', 'title', 'bullets'],
            },
          },
          ordre_slides: {
            type: 'array',
            items: { type: 'string' },
            description: 'Ordered list of slide titles as they should appear',
          },
        },
        required: ['titre_presentation', 'timing_consistency_check', 'slides', 'ordre_slides'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'generate_images_illustratives',
      description: 'Generate detailed image prompts for educational illustrations related to the lesson.',
      parameters: {
        type: 'object',
        properties: {
          prompt_format: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'number' },
                filename: { type: 'string', description: 'e.g. lan_schema.png' },
                description: { type: 'string', description: 'Usage pédagogique de l\'image' },
                purpose: {
                  type: 'string',
                  enum: ['mise_en_situation', 'cours', 'exercice', 'synthese', 'resume_eleve', 'pptx'],
                },
                prompt: { type: 'string', description: 'Detailed prompt for an AI image generator' },
              },
              required: ['id', 'filename', 'description', 'purpose', 'prompt'],
            },
          },
        },
        required: ['prompt_format'],
      },
    },
  },
];

function generateMockDebugResponse(systemPrompt: string | any[], userMessage?: string, tools?: typeof pedagogicalTools) {
  const toolResults: Record<string, unknown> = {};
  const contentBlocks: unknown[] = [];

  const sysStr = Array.isArray(systemPrompt) ? JSON.stringify(systemPrompt) : systemPrompt;
  const userStr = userMessage || '';
  const textContent = `# MODE DÉBOGAGE\n\n### SYSTEM PROMPT\n${sysStr}\n\n### USER MESSAGE\n${userStr}`;
  contentBlocks.push({ type: 'text', text: textContent });

  const requestedToolName = tools?.[0]?.function.name || 'generate_fiche_pedagogique';

  let mockArgs: Record<string, any> = {};
  if (requestedToolName === 'generate_fiche_pedagogique') {
    mockArgs = {
      titre_seance: `DEBUG MODE: Fiche Pédagogique`,
      objectifs: [`System Prompt:\n${systemPrompt}`, `User Message:\n${userMessage}`],
      competences_visees: ['Debug Mode'],
      prerequis: ['Debug Mode'],
      deroulement: {
        Mise_en_situation: {
          rappel: { enseignant: systemPrompt, apprenent: 'Debug Mode' },
          situation_probleme: { enseignant: userMessage, apprenent: 'Debug Mode' },
        },
        Analyse: {
          Analyse_SP: { enseignant: systemPrompt, apprenent: 'Debug Mode' },
          Investigation: { enseignant: userMessage, apprenent: 'Debug Mode' },
          Generalisation: { enseignant: systemPrompt, apprenent: 'Debug Mode', savoir: 'Debug Mode' },
          ENTRAINEMENT: { enseignant: userMessage, apprenent: 'Debug Mode' },
        },
        Synthese: {
          Quiz: { enseignant: systemPrompt, apprenent: 'Debug Mode' },
        },
      },
      evaluation_type: 'formative',
      materiel: ['Debug Mode']
    };
  } else if (requestedToolName === 'generate_planification') {
    mockArgs = {
      titre_seance: 'DEBUG MODE: Planification de Séance',
      competences_visees: ['Compétence debug'],
      objectifs: [`System Prompt:\n${systemPrompt}`, `User Message:\n${userMessage}`],
      prerequis: ['Debug Mode'],
      savoir_faire: ['Debug Mode'],
      savoir_etre: ['Debug Mode'],
      deroulement: {
        Mise_en_situation: {
          rappel: { duration: '3 min', ACTION: 'Debug Mode', PAROLE: 'Debug Mode', INTERACTION: 'Debug Mode' },
          situation_probleme: { duration: '5 min', ACTION: 'Debug Mode', PAROLE: 'Debug Mode', INTERACTION: 'Debug Mode' },
        },
        Analyse: {
          Analyse_SP: { duration: '5 min', ACTION: 'Debug Mode', PAROLE: 'Debug Mode', INTERACTION: 'Debug Mode' },
          Investigation: { duration: '5 min', ACTION: 'Debug Mode', PAROLE: 'Debug Mode', INTERACTION: 'Debug Mode' },
          Generalisation: { duration: '10 min', ACTION: 'Debug Mode', PAROLE: 'Debug Mode', INTERACTION: 'Debug Mode', savoir: 'Debug Mode' },
          ENTRAINEMENT: { duration: '10 min', ACTION: 'Debug Mode', PAROLE: 'Debug Mode', INTERACTION: 'Debug Mode' },
        },
        Synthese: {
          Quiz: { ACTION: 'Debug Mode', PAROLE: 'Debug Mode', INTERACTION: 'Debug Mode' },
        },
      },
    };
  } else if (requestedToolName === 'generate_cours_complet') {
    mockArgs = {
      titre_seance: 'DEBUG MODE: Cours Complet',
      script_enseignant: {
        Mise_en_situation: {
          rappel: `System Prompt:\n${systemPrompt}`,
          situation_probleme: `User Message:\n${userMessage}`,
        },
        Analyse: {
          Analyse_SP: 'Debug questionnement',
          Investigation: 'Debug filtrage',
          Generalisation: 'Debug notions',
          ENTRAINEMENT: 'Debug exercices',
        },
        Synthese: {
          Quiz: 'Debug quiz',
        },
      },
      savoir: {
        definitions: [
          { terme: 'Debug Terme', definition: `System Prompt:\n${systemPrompt}` },
        ],
        schema_reseau: 'Debug schema',
        exemples_concrets: ['Debug exemple 1', 'Debug exemple 2'],
      },
      plan_tableau: {
        zone_titre: 'Debug titre',
        zone_probleme: 'Debug probleme',
        zone_cours: 'Debug cours',
        zone_exercices: 'Debug exercices',
      },
      activites_eleves: [
        { etape: 'Debug etape', consigne: 'Debug consigne', production_attendue: 'Debug production' },
      ],
      annotations: 'Debug annotations',
    };
  } else if (requestedToolName === 'generate_gestion_classe') {
    mockArgs = {
      titre_seance: 'Debug titre séance',
      strategie_entree: {
        accueil: `System Prompt:\n${systemPrompt}`,
        mise_en_route: `User Message:\n${userMessage}`,
        captation_attention: 'Debug captation',
      },
      organisation_espace: {
        disposition_tables: 'Debug disposition',
        zones_activite: ['Debug zone 1'],
        acces_materiel: 'Debug accès matériel',
      },
      gestion_temps: {
        Mise_en_situation: '5 min',
        Analyse: '15 min',
        Synthese: '10 min',
        marge_imprevus: '5 min',
        signaux_transition: 'Debug signal',
      },
      gestion_comportement: {
        regles_rappelees: ['Debug règle'],
        gestion_bavardages: 'Debug bavardages',
        gestion_eleve_bloqué: 'Debug élève bloqué',
      },
      differenciation: {
        eleves_rapides: 'Debug rapides',
        eleves_en_difficulte: 'Debug difficulté',
      },
      remédiation: {
        erreurs_frequentes_prevues: ['Debug erreur'],
        strategie_correction: 'Debug correction',
      },
    };
  } else if (requestedToolName === 'generate_resume_eleve') {
    mockArgs = {
      titre: 'Debug titre',
      introduction: `System Prompt:\n${systemPrompt}`,
      resume: `User Message:\n${userMessage}`,
      notions_cles: [{ terme: 'Debug terme', definition_simple: 'Debug définition', exemple: 'Debug exemple' }],
      schema_simplifie: 'Debug schéma',
      points_cles: ['Debug point clé'],
      a_retenir: 'Debug à retenir',
      exercices: [{ numero: 1, type: 'qcm', enonce: 'Debug énoncé ?', options: ['Option A', 'Option B'], correction: 'Debug correction' }],
    };
  } else if (requestedToolName === 'generate_pptx_outline') {
    mockArgs = {
      titre_presentation: 'Debug Présentation',
      slides: [
        { numero: 1, phase_pedagogique: 'Mise_en_situation', layout: 'titre', title: 'Titre & Objectifs', slide_duration_minutes: 5, transition_animation: 'Apparition progressive', questions_audience: [], bullets: ['Objectif 1', 'Objectif 2'], visuel: '', notes: sysStr.substring(0, 100) },
        { numero: 2, phase_pedagogique: 'Analyse', layout: 'contenu', title: 'Contenu', slide_duration_minutes: 10, transition_animation: 'Aucune', questions_audience: ['Que voyez-vous ?'], bullets: [`User: ${(userMessage || '').substring(0, 100)}`], visuel: '', notes: '' },
      ],
      ordre_slides: ['Titre & Objectifs', 'Contenu'],
    };
  } else if (requestedToolName === 'generate_evaluation') {
    mockArgs = {
      titre: 'Évaluation — Leçon Test',
      niveau: '1AC',
      duree: '45 min',
      consigne_generale: 'Lisez attentivement chaque question et répondez sur votre feuille.',
      questions: [
        { numero: 1, type: 'qcm', competence_evaluee: 'Identifier les composants', niveau_bloom: 'Mémoriser', enonce: 'Quel est le composant principal ?', points: 2, options: ['Option A', 'Option B', 'Option C'], correction: 'Option B', feedback_personnalise: 'Le composant principal est l\'unité centrale car elle traite les données.' },
        { numero: 2, type: 'vrai_faux', competence_evaluee: 'Comprendre le fonctionnement', niveau_bloom: 'Comprendre', enonce: 'Vrai ou faux ?', points: 1, correction: 'Vrai', feedback_personnalise: 'C\'est vrai car l\'ordinateur ne peut pas fonctionner sans système d\'exploitation.' },
        { numero: 3, type: 'ouvert', competence_evaluee: 'Appliquer les concepts', niveau_bloom: 'Appliquer', enonce: 'Expliquez en quelques phrases.', points: 4, correction: 'Réponse attendue...', feedback_personnalise: 'Une explication claire est attendue ici.' },
      ],
      bareme: { total_points: 7, repartition_par_competence: [{ competence: 'Identifier', points: 2 }, { competence: 'Comprendre', points: 1 }, { competence: 'Appliquer', points: 4 }], criteres: ['Clarté de la réponse', 'Utilisation des concepts clés'] },
      grille_evaluation: [{ critere: 'Connaissances', indicateurs: ['Définit correctement', 'Cite des exemples'], points_max: 4 }, { critere: 'Raisonnement', indicateurs: ['Structure logique', 'Justifie'], points_max: 3 }],
    };
  } else if (requestedToolName === 'generate_images_illustratives') {
    mockArgs = {
      prompt_format: [
        { id: 1, filename: 'lan_schema.png', description: `Illustration du réseau LAN pour ${userStr}`, purpose: 'cours', prompt: `Educational illustration showing a LAN network with computers and a switch for the lesson: ${userStr}` },
        { id: 2, filename: 'concept_diagram.png', description: `Diagramme des concepts clés de ${userStr}`, purpose: 'synthese', prompt: `Clean pedagogical diagram explaining key concepts of: ${userStr}` },
        { id: 3, filename: 'situation_probleme.png', description: `Mise en situation pour ${userStr}`, purpose: 'mise_en_situation', prompt: `Classroom scene illustrating a problem situation for: ${userStr}` },
      ],
    };
  } else {
    mockArgs = {
      content: textContent
    };
  }

  if (tools && tools.length > 0) {
    toolResults[requestedToolName] = mockArgs;
    contentBlocks.push({ type: 'tool_use', name: requestedToolName, input: mockArgs });
  }

  return {
    content: contentBlocks,
    toolResults,
    usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
  };
}

export async function callLocalModel(
  systemPrompt: string | any[],
  userMessage?: string,
  tools?: typeof pedagogicalTools,
  maxTokens: number = 4096,
  modelName?: string,
  localModelUrl?: string,
  localApiType?: 'openai' | 'custom',
  signal?: AbortSignal,
  debugMode?: boolean
): Promise<{
  content: unknown[];
  toolResults: Record<string, unknown>;
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}> {
  if (debugMode) {
    return generateMockDebugResponse(systemPrompt, userMessage, tools);
  }

  const model = modelName || 'google/gemma-4-e2b';
  const apiType = localApiType || 'openai';
  const url = localModelUrl || (apiType === 'openai' ? 'http://localhost:1234/v1/chat/completions' : 'http://localhost:1234/api/v1/chat');

  if (apiType === 'openai') {
    const messages = Array.isArray(systemPrompt)
      ? systemPrompt
      : [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage || '' },
      ];

    const body: Record<string, unknown> = {
      model,
      messages,
      max_tokens: maxTokens || 4096,
      temperature: 0.7,
      stream: false,
    };

    if (tools && tools.length > 0) {
      body.tools = tools;
      body.tool_choice = 'auto';
    }

    if (debugMode) {
      console.log('=== SENDING PROMPT TO LOCAL AI (STREAMING) ===', {
        timestamp: new Date().toISOString(),
        apiUrl: url,
        apiType,
        model,
        maxTokens,
      });
    }

    const timeoutMs = 1200000; // 20 minutes
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const onAbort = () => {
      clearTimeout(timeoutId);
      controller.abort();
    };

    if (signal) {
      signal.addEventListener('abort', onAbort, { once: true });
    }

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
      if (signal) {
        signal.removeEventListener('abort', onAbort);
      }
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Local model OpenAI API error ${response.status}: ${errorText}`);
    }

    if (!response.body) {
      throw new Error('No response body from Local Model API');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let contentText = '';
    let toolCallsBuffer: any[] = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: false });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const cleanLine = line.trim();
        if (!cleanLine) continue;
        if (cleanLine === 'data: [DONE]') continue;

        if (cleanLine.startsWith('data: ')) {
          try {
            const dataStr = cleanLine.slice(6);
            const parsed = JSON.parse(dataStr);
            const choice = parsed.choices?.[0];

            if (choice?.delta?.content) {
              contentText += choice.delta.content;
            }

            if (choice?.delta?.tool_calls) {
              for (const tc of choice.delta.tool_calls) {
                const index = tc.index ?? 0;
                if (!toolCallsBuffer[index]) {
                  toolCallsBuffer[index] = {
                    id: tc.id || '',
                    type: tc.type || 'function',
                    function: {
                      name: tc.function?.name || '',
                      arguments: tc.function?.arguments || ''
                    }
                  };
                } else {
                  if (tc.function?.name) {
                    toolCallsBuffer[index].function.name += tc.function.name;
                  }
                  if (tc.function?.arguments) {
                    toolCallsBuffer[index].function.arguments += tc.function.arguments;
                  }
                }
              }
            }
          } catch {
            // Ignore parse errors for streaming chunks
          }
        }
      }
    }

    const message = {
      role: 'assistant',
      content: contentText,
      tool_calls: toolCallsBuffer.filter(Boolean)
    };

    const toolResults: Record<string, unknown> = {};
    const contentBlocks: unknown[] = [];

    if (message.tool_calls && Array.isArray(message.tool_calls)) {
      for (const toolCall of message.tool_calls) {
        const fnName = toolCall.function?.name;
        let fnArgs = toolCall.function?.arguments;
        if (typeof fnArgs === 'string') {
          try {
            fnArgs = JSON.parse(fnArgs);
          } catch {
            const match = fnArgs.match(/\{[\s\S]*\}/);
            if (match) {
              try { fnArgs = JSON.parse(match[0]); } catch { fnArgs = null; }
            } else {
              fnArgs = null;
            }
          }
        }
        if (fnName && fnArgs) {
          toolResults[fnName] = fnArgs;
          contentBlocks.push({ type: 'tool_use', name: fnName, input: fnArgs });
        }
      }
    }

    if (message.content) {
      contentBlocks.push({ type: 'text', text: message.content });
    }

    if (tools && tools.length > 0 && Object.keys(toolResults).length === 0) {
      const contentText = message.content || '';
      try {
        let jsonStr = contentText.trim();
        const jsonRegex = /\{[\s\S]*\}/;
        const match = jsonStr.match(jsonRegex);
        if (match) {
          jsonStr = match[0];
        }
        const parsed = JSON.parse(jsonStr);

        if (parsed.tool_calls && Array.isArray(parsed.tool_calls)) {
          for (const tc of parsed.tool_calls) {
            const fnName = tc.name;
            const fnArgs = tc.arguments;
            if (fnName) {
              toolResults[fnName] = fnArgs;
              contentBlocks.push({ type: 'tool_use', name: fnName, input: fnArgs });
            }
          }
        } else {
          // Check if the parsed JSON is a wrapper containing keys for multiple tools
          let foundKeys = false;
          for (const t of tools) {
            const toolName = t.function.name;
            const docType = toolName.replace('generate_', '');
            const possibleKeys = [
              toolName,
              docType,
              `generate_${docType}`,
              `plan_${docType}`,
              docType.replace('plan_', ''),
              docType.replace('generate_', '')
            ];

            const matchedKey = possibleKeys.find(k => parsed[k] !== undefined);
            if (matchedKey) {
              toolResults[toolName] = parsed[matchedKey];
              contentBlocks.push({ type: 'tool_use', name: toolName, input: parsed[matchedKey] });
              foundKeys = true;
            }
          }

          if (!foundKeys) {
            const requestedToolName = tools[0]?.function.name;
            if (requestedToolName) {
              toolResults[requestedToolName] = parsed;
              contentBlocks.push({ type: 'tool_use', name: requestedToolName, input: parsed });
            }
          }
        }
      } catch (e) {
        console.error('Failed to parse OpenAI-compatible tool calling fallback response:', e);
        const requestedToolName = tools[0]?.function.name;
        if (requestedToolName) {
          toolResults[requestedToolName] = {
            titre_seance: 'Cours local',
            objectifs: ['Objectif 1'],
            deroulement: {
              Mise_en_situation: {
                rappel: { enseignant: contentText, apprenent: contentText },
                situation_probleme: { enseignant: contentText, apprenent: contentText },
              },
              Analyse: {
                Analyse_SP: { enseignant: contentText, apprenent: contentText },
                Investigation: { enseignant: contentText, apprenent: contentText },
                Generalisation: { enseignant: contentText, apprenent: contentText, savoir: contentText },
                ENTRAINEMENT: { enseignant: contentText, apprenent: contentText },
              },
              Synthese: {
                Quiz: { enseignant: contentText, apprenent: contentText },
              },
            },
            planification_deroulement: {
              Mise_en_situation: {
                rappel: { duration: '3 min', ACTION: contentText, PAROLE: contentText, INTERACTION: 'Échanges' },
                situation_probleme: { duration: '5 min', ACTION: contentText, PAROLE: contentText, INTERACTION: 'Lecture' },
              },
              Analyse: {
                Analyse_SP: { duration: '5 min', ACTION: contentText, PAROLE: contentText, INTERACTION: 'Hypothèses' },
                Investigation: { duration: '5 min', ACTION: contentText, PAROLE: contentText, INTERACTION: 'Discussion' },
                Generalisation: { duration: '10 min', ACTION: contentText, PAROLE: contentText, INTERACTION: 'Notation', savoir: contentText },
                ENTRAINEMENT: { duration: '10 min', ACTION: contentText, PAROLE: contentText, INTERACTION: 'Exercices' },
              },
              Synthese: {
                Quiz: { ACTION: contentText, PAROLE: contentText, INTERACTION: 'Réponses' },
              },
            },
            script_enseignant: contentText,
            activites_eleves: ['Participation'],
            strategie_entree: { accueil: contentText, mise_en_route: contentText, captation_attention: contentText },
            organisation_espace: { disposition_tables: contentText, zones_activite: [contentText], acces_materiel: contentText },
            gestion_temps: { Mise_en_situation: '5 min', Analyse: '15 min', Synthese: '10 min', marge_imprevus: '5 min', signaux_transition: contentText },
            gestion_comportement: { regles_rappelees: ['Règles'], gestion_bavardages: contentText, gestion_eleve_bloqué: contentText },
            differenciation: { eleves_rapides: contentText, eleves_en_difficulte: contentText },
            remédiation: { erreurs_frequentes_prevues: [contentText], strategie_correction: contentText },
            resume: contentText,
            notions_cles: [{ terme: contentText, definition_simple: contentText, exemple: contentText }],
            schema_simplifie: contentText,
            points_cles: ['Points clés'],
            a_retenir: contentText,
            exercices: [{ numero: 1, type: 'qcm', enonce: contentText, options: ['Option'], correction: contentText }],
            titre_presentation: 'Présentation',
            slides: [{ numero: 1, phase_pedagogique: 'Mise_en_situation', layout: 'titre', title: 'Slide 1', bullets: [contentText], visuel: '', notes: '' }],
            ordre_slides: ['Slide 1'],
            prompt_format: [
              { id: 1, filename: 'illustration_1.png', description: contentText, purpose: 'cours' as const, prompt: contentText },
              { id: 2, filename: 'illustration_2.png', description: contentText, purpose: 'synthese' as const, prompt: contentText },
            ]
          };
          contentBlocks.push({ type: 'tool_use', name: requestedToolName, input: toolResults[requestedToolName] });
        }
      }
    }

    const sysPromptStr = Array.isArray(systemPrompt) ? JSON.stringify(systemPrompt) : systemPrompt;
    const userMsgStr = Array.isArray(userMessage) ? JSON.stringify(userMessage) : (userMessage || '');
    const promptTokens = estimateTokens(sysPromptStr) + estimateTokens(userMsgStr);
    const completionTokens = estimateTokens(contentText);
    const usage = {
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: promptTokens + completionTokens,
    };
    return {
      content: contentBlocks,
      toolResults,
      usage,
    };
  } else {
    let localSystemPrompt = systemPrompt;
    let localUserMessage = userMessage;

    if (tools && tools.length > 0) {
      const toolsDescription = tools.map(t => {
        return `Tool Name: "${t.function.name}"
Description: ${t.function.description}
Parameters schema: ${JSON.stringify(t.function.parameters)}`;
      }).join('\n\n');

      localSystemPrompt += `\n\n[SYSTEM INSTRUCTION: TOOL CALLING EMULATION]
You have access to the following tool functions:
${toolsDescription}

You MUST choose one or more appropriate tools and respond ONLY with a JSON object containing the arguments for the tool call(s).
Your response must be a JSON object with this exact structure:
{
  "tool_calls": [
    {
      "name": "name_of_the_tool_you_want_to_use",
      "arguments": {
        // key-value pairs matching the parameters schema of the tool
      }
    }
  ]
}
Return ONLY valid JSON matching this schema. Do not write any other conversational text or introduction.`;
    }

    const customTimeoutMs = 1200000;
    const customController = new AbortController();
    const customTimeoutId = setTimeout(() => customController.abort(), customTimeoutMs);

    const onCustomAbort = () => {
      clearTimeout(customTimeoutId);
      customController.abort();
    };

    if (signal) {
      signal.addEventListener('abort', onCustomAbort, { once: true });
    }

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model,
          system_prompt: localSystemPrompt,
          input: localUserMessage,
        }),
        signal: customController.signal,
      });
    } finally {
      clearTimeout(customTimeoutId);
      if (signal) {
        signal.removeEventListener('abort', onCustomAbort);
      }
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Local model API error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const contentText = data.choices?.[0]?.message?.content ||
      data.choices?.[0]?.text ||
      data.content ||
      data.text ||
      data.response ||
      '';

    const toolResults: Record<string, unknown> = {};
    const contentBlocks: unknown[] = [];

    if (tools && tools.length > 0) {
      try {
        let jsonStr = contentText.trim();
        const jsonRegex = /\{[\s\S]*\}/;
        const match = jsonStr.match(jsonRegex);
        if (match) {
          jsonStr = match[0];
        }

        const parsed = JSON.parse(jsonStr);

        if (parsed.tool_calls && Array.isArray(parsed.tool_calls)) {
          for (const tc of parsed.tool_calls) {
            const fnName = tc.name;
            const fnArgs = tc.arguments;
            if (fnName) {
              toolResults[fnName] = fnArgs;
              contentBlocks.push({ type: 'tool_use', name: fnName, input: fnArgs });
            }
          }
        } else {
          const requestedToolName = tools[0]?.function.name;
          if (requestedToolName) {
            toolResults[requestedToolName] = parsed;
            contentBlocks.push({ type: 'tool_use', name: requestedToolName, input: parsed });
          }
        }
      } catch (e) {
        console.error('Failed to parse local model tool calling response:', e, 'Raw content was:', contentText);
        const requestedToolName = tools[0]?.function.name;
        if (requestedToolName) {
          toolResults[requestedToolName] = {
            titre_seance: 'Cours local',
            objectifs: ['Objectif 1'],
            deroulement: {
              Mise_en_situation: {
                rappel: { enseignant: contentText, apprenent: contentText },
                situation_probleme: { enseignant: contentText, apprenent: contentText },
              },
              Analyse: {
                Analyse_SP: { enseignant: contentText, apprenent: contentText },
                Investigation: { enseignant: contentText, apprenent: contentText },
                Generalisation: { enseignant: contentText, apprenent: contentText, savoir: contentText },
                ENTRAINEMENT: { enseignant: contentText, apprenent: contentText },
              },
              Synthese: {
                Quiz: { enseignant: contentText, apprenent: contentText },
              },
            },
            planification_deroulement: {
              Mise_en_situation: {
                rappel: { duration: '3 min', ACTION: contentText, PAROLE: contentText, INTERACTION: 'Échanges' },
                situation_probleme: { duration: '5 min', ACTION: contentText, PAROLE: contentText, INTERACTION: 'Lecture' },
              },
              Analyse: {
                Analyse_SP: { duration: '5 min', ACTION: contentText, PAROLE: contentText, INTERACTION: 'Hypothèses' },
                Investigation: { duration: '5 min', ACTION: contentText, PAROLE: contentText, INTERACTION: 'Discussion' },
                Generalisation: { duration: '10 min', ACTION: contentText, PAROLE: contentText, INTERACTION: 'Notation', savoir: contentText },
                ENTRAINEMENT: { duration: '10 min', ACTION: contentText, PAROLE: contentText, INTERACTION: 'Exercices' },
              },
              Synthese: {
                Quiz: { ACTION: contentText, PAROLE: contentText, INTERACTION: 'Réponses' },
              },
            },
            script_enseignant: contentText,
            activites_eleves: ['Participation'],
            strategie_entree: { accueil: contentText, mise_en_route: contentText, captation_attention: contentText },
            organisation_espace: { disposition_tables: contentText, zones_activite: [contentText], acces_materiel: contentText },
            gestion_temps: { Mise_en_situation: '5 min', Analyse: '15 min', Synthese: '10 min', marge_imprevus: '5 min', signaux_transition: contentText },
            gestion_comportement: { regles_rappelees: ['Règles'], gestion_bavardages: contentText, gestion_eleve_bloqué: contentText },
            differenciation: { eleves_rapides: contentText, eleves_en_difficulte: contentText },
            remédiation: { erreurs_frequentes_prevues: [contentText], strategie_correction: contentText },
            resume: contentText,
            notions_cles: [{ terme: contentText, definition_simple: contentText, exemple: contentText }],
            schema_simplifie: contentText,
            points_cles: ['Points clés'],
            a_retenir: contentText,
            exercices: [{ numero: 1, type: 'qcm', enonce: contentText, options: ['Option'], correction: contentText }],
            titre_presentation: 'Présentation',
            slides: [{ numero: 1, phase_pedagogique: 'Mise_en_situation', layout: 'titre', title: 'Slide 1', bullets: [contentText], visuel: '', notes: '' }],
            ordre_slides: ['Slide 1']
          };
          contentBlocks.push({ type: 'tool_use', name: requestedToolName, input: toolResults[requestedToolName] });
        }
      }
    }

    if (contentText) {
      contentBlocks.push({ type: 'text', text: contentText });
    }

    const sysPromptStr = Array.isArray(localSystemPrompt) ? JSON.stringify(localSystemPrompt) : localSystemPrompt;
    const userMsgStr = Array.isArray(localUserMessage) ? JSON.stringify(localUserMessage) : (localUserMessage || '');
    const promptTokens = estimateTokens(sysPromptStr) + estimateTokens(userMsgStr);
    const completionTokens = estimateTokens(contentText);

    return {
      content: contentBlocks,
      toolResults,
      usage: {
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: promptTokens + completionTokens,
      },
    };
  }
}

const HF_RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

/**
 * Fetch with retry on transient failures (429/5xx/network errors).
 * Aborts (user cancel or per-attempt timeout) are never retried.
 */
async function fetchWithRetry(
  url: string,
  init: RequestInit,
  controller: AbortController,
  timeoutMs: number,
  maxRetries = 2,
): Promise<Response> {
  let lastError: unknown = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { ...init, signal: controller.signal });
      if (!response.ok && HF_RETRYABLE_STATUS.has(response.status) && attempt < maxRetries) {
        await response.text().catch(() => '');
        lastError = new Error(`HuggingFace API error ${response.status}`);
        await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
        continue;
      }
      return response;
    } catch (err) {
      if (controller.signal.aborted) throw err;
      lastError = err;
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
        continue;
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  }
  throw lastError instanceof Error ? lastError : new Error('HuggingFace request failed');
}

export async function callHuggingFace(
  systemPrompt: string | any[],
  userMessage?: string,
  tools?: typeof pedagogicalTools,
  maxTokens: number = 4096,
  model: string = HF_MODEL,
  options?: {
    useLocalModel?: boolean;
    localModelName?: string;
    localModelUrl?: string;
    localApiType?: 'openai' | 'custom';
    signal?: AbortSignal;
    debugMode?: boolean;
    apiKey?: string;
  }
): Promise<{
  content: unknown[];
  toolResults: Record<string, unknown>;
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}> {
  if (options?.debugMode) {
    return generateMockDebugResponse(systemPrompt, userMessage, tools);
  }
  if (options?.useLocalModel) {
    return callLocalModel(systemPrompt, userMessage, tools, maxTokens, options.localModelName, options.localModelUrl, options.localApiType, options.signal, options.debugMode);
  }
  const messages = Array.isArray(systemPrompt)
    ? systemPrompt
    : [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage || '' },
    ];

  const body: Record<string, unknown> = {
    model: model,
    messages,
    max_tokens: maxTokens,
    temperature: 0.7,
  };

  if (tools && tools.length > 0) {
    body.tools = tools;
    body.tool_choice = 'auto';
  }

  if (options?.debugMode) {
    console.log('=== SENDING PROMPT TO HUGGINGFACE AI ===', {
      timestamp: new Date().toISOString(),
      apiUrl: HF_API_URL,
      model: model,
      maxTokens,
    });
  }

  const timeoutMs = 1200000; // 20 minutes
  const controller = new AbortController();

  const onAbort = () => controller.abort();

  if (options?.signal) {
    options.signal.addEventListener('abort', onAbort, { once: true });
  }

  const tokenToUse = options?.apiKey || process.env.HF_TOKEN;

  let response: Response;
  try {
    response = await fetchWithRetry(HF_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenToUse}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }, controller, timeoutMs);
  } finally {
    if (options?.signal) {
      options.signal.removeEventListener('abort', onAbort);
    }
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HuggingFace API error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const choice = data.choices?.[0];
  const message = choice?.message;

  if (!message) {
    throw new Error('No message in HuggingFace response');
  }

  // Extract tool calls if present
  const toolResults: Record<string, unknown> = {};
  const contentBlocks: unknown[] = [];

  if (message.tool_calls && Array.isArray(message.tool_calls)) {
    for (const toolCall of message.tool_calls) {
      const fnName = toolCall.function?.name;
      let fnArgs = toolCall.function?.arguments;
      if (typeof fnArgs === 'string') {
        try {
          fnArgs = JSON.parse(fnArgs);
        } catch {
          const match = fnArgs.match(/\{[\s\S]*\}/);
          if (match) {
            try { fnArgs = JSON.parse(match[0]); } catch { fnArgs = null; }
          } else {
            fnArgs = null;
          }
        }
      }
      if (fnName && fnArgs) {
        toolResults[fnName] = fnArgs;
        contentBlocks.push({ type: 'tool_use', name: fnName, input: fnArgs });
      }
    }
  }

  if (tools && tools.length > 0 && Object.keys(toolResults).length === 0) {
    const contentText = message.content || '';
    try {
      let jsonStr = contentText.trim();
      const jsonRegex = /\{[\s\S]*\}/;
      const match = jsonStr.match(jsonRegex);
      if (match) {
        jsonStr = match[0];
      }
      const parsed = JSON.parse(jsonStr);

      if (parsed.tool_calls && Array.isArray(parsed.tool_calls)) {
        for (const tc of parsed.tool_calls) {
          const fnName = tc.name;
          const fnArgs = tc.arguments;
          if (fnName) {
            toolResults[fnName] = fnArgs;
            contentBlocks.push({ type: 'tool_use', name: fnName, input: fnArgs });
          }
        }
      } else {
        // Check if the parsed JSON is a wrapper containing keys for multiple tools
        let foundKeys = false;
        for (const t of tools) {
          const toolName = t.function.name;
          const docType = toolName.replace('generate_', '');
          const possibleKeys = [
            toolName,
            docType,
            `generate_${docType}`,
            `plan_${docType}`,
            docType.replace('plan_', ''),
            docType.replace('generate_', '')
          ];

          const matchedKey = possibleKeys.find(k => parsed[k] !== undefined);
          if (matchedKey) {
            toolResults[toolName] = parsed[matchedKey];
            contentBlocks.push({ type: 'tool_use', name: toolName, input: parsed[matchedKey] });
            foundKeys = true;
          }
        }

        if (!foundKeys) {
          const requestedToolName = tools[0]?.function.name;
          if (requestedToolName) {
            toolResults[requestedToolName] = parsed;
            contentBlocks.push({ type: 'tool_use', name: requestedToolName, input: parsed });
          }
        }
      }
    } catch (e) {
      console.error('Failed to parse HuggingFace tool calling fallback response:', e);
      const requestedToolName = tools[0]?.function.name;
      if (requestedToolName) {
        toolResults[requestedToolName] = {
          titre_seance: 'Cours local',
          objectifs: ['Objectif 1'],
          deroulement: {
            Mise_en_situation: {
              rappel: { enseignant: contentText, apprenent: contentText },
              situation_probleme: { enseignant: contentText, apprenent: contentText },
            },
            Analyse: {
              Analyse_SP: { enseignant: contentText, apprenent: contentText },
              Investigation: { enseignant: contentText, apprenent: contentText },
              Generalisation: { enseignant: contentText, apprenent: contentText, savoir: contentText },
              ENTRAINEMENT: { enseignant: contentText, apprenent: contentText },
            },
            Synthese: {
              Quiz: { enseignant: contentText, apprenent: contentText },
            },
          },
          planification_deroulement: {
            Mise_en_situation: {
              rappel: { duration: '3 min', ACTION: contentText, PAROLE: contentText, INTERACTION: 'Échanges' },
              situation_probleme: { duration: '5 min', ACTION: contentText, PAROLE: contentText, INTERACTION: 'Lecture' },
            },
            Analyse: {
              Analyse_SP: { duration: '5 min', ACTION: contentText, PAROLE: contentText, INTERACTION: 'Hypothèses' },
              Investigation: { duration: '5 min', ACTION: contentText, PAROLE: contentText, INTERACTION: 'Discussion' },
              Generalisation: { duration: '10 min', ACTION: contentText, PAROLE: contentText, INTERACTION: 'Notation', savoir: contentText },
              ENTRAINEMENT: { duration: '10 min', ACTION: contentText, PAROLE: contentText, INTERACTION: 'Exercices' },
            },
            Synthese: {
              Quiz: { ACTION: contentText, PAROLE: contentText, INTERACTION: 'Réponses' },
            },
          },
          script_enseignant: {
            Mise_en_situation: {
              rappel: contentText,
              situation_probleme: contentText,
            },
            Analyse: {
              Analyse_SP: contentText,
              Investigation: contentText,
              Generalisation: contentText,
              ENTRAINEMENT: contentText,
            },
            Synthese: {
              Quiz: contentText,
            },
          },
          savoir: {
            definitions: [{ terme: contentText, definition: contentText }],
            schema_reseau: contentText,
            exemples_concrets: [contentText],
          },
          plan_tableau: {
            zone_titre: contentText,
            zone_probleme: contentText,
            zone_cours: contentText,
            zone_exercices: contentText,
          },
          activites_eleves: [
            { etape: contentText, consigne: contentText, production_attendue: contentText },
          ],
          strategie_entree: { accueil: contentText, mise_en_route: contentText, captation_attention: contentText },
          organisation_espace: { disposition_tables: contentText, zones_activite: [contentText], acces_materiel: contentText },
          gestion_temps: { Mise_en_situation: '5 min', Analyse: '15 min', Synthese: '10 min', marge_imprevus: '5 min', signaux_transition: contentText },
          gestion_comportement: { regles_rappelees: ['Règles'], gestion_bavardages: contentText, gestion_eleve_bloqué: contentText },
          differenciation: { eleves_rapides: contentText, eleves_en_difficulte: contentText },
          remédiation: { erreurs_frequentes_prevues: [contentText], strategie_correction: contentText },
          resume: contentText,
          points_cles: ['Points clés'],
          titre_presentation: 'Présentation',
          slides: [{ numero: 1, phase_pedagogique: 'Mise_en_situation', layout: 'titre', title: 'Slide 1', bullets: [contentText], visuel: '', notes: '' }],
          ordre_slides: ['Slide 1'],
          prompt_format: [
            { id: 1, filename: 'illustration_1.png', description: contentText, purpose: 'cours' as const, prompt: contentText },
            { id: 2, filename: 'illustration_2.png', description: contentText, purpose: 'synthese' as const, prompt: contentText },
          ]
        };
        contentBlocks.push({ type: 'tool_use', name: requestedToolName, input: toolResults[requestedToolName] });
      }
    }
  }

  if (message.content) {
    contentBlocks.push({ type: 'text', text: message.content });
  }

  // Use API usage if available, otherwise estimate
  let usage = data.usage;
  if (!usage || (!usage.prompt_tokens && !usage.total_tokens)) {
    const allText = JSON.stringify(toolResults) + (message.content || '');
    const sysPromptStr = Array.isArray(systemPrompt) ? JSON.stringify(systemPrompt) : systemPrompt;
    const userMsgStr = Array.isArray(userMessage) ? JSON.stringify(userMessage) : (userMessage || '');
    const estimatedPrompt = estimateTokens(sysPromptStr) + estimateTokens(userMsgStr);
    const estimatedCompletion = estimateTokens(allText);
    usage = {
      prompt_tokens: estimatedPrompt,
      completion_tokens: estimatedCompletion,
      total_tokens: estimatedPrompt + estimatedCompletion,
    };
  }

  return {
    content: contentBlocks,
    toolResults,
    usage: usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
  };
}

import type { Skill } from '@/types/skills';

export function buildSystemPrompt(
  metadata: CourseMetadata,
  _langue: string,
  _useReferences: boolean,
  referenceContents?: string,
  includePrompt?: string,
  excludePrompt?: string,
  customPrompts?: Record<string, string>,
  activeSkills?: Skill[]
): string {
  return assembleSystemPrompt({
    metadata,
    includePrompt,
    excludePrompt,
    customGlobal: customPrompts?.global,
    customContext: customPrompts?.context,
    referenceContents,
    activeSkills,
  });
}

export { HF_MODEL, HF_API_URL };
