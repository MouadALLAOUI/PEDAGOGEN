# Fiche Technique & Scénario Pédagogique

## 1. Informations Générales (Fiche Technique)

**Royaume du Maroc** **Ministère de l'Éducation Nationale, de du Préscolaire et des Sports** * **Enseignant :** Mohamed Allawi  

* **Niveau :** 1ère Année Collège  
* **Unité :** Unité 2 : Les algorithmes et la programmation (Exemple : Initiation à Scratch)  
* **Séquence :** Résolution de problèmes par les algorithmes  
* **Séance :** Introduction aux structures de contrôle conditionnelles  
* **Durée :** 1 heure (60 minutes)  

---

### Les Compétences Visées

* **C1 :** Résoudre un problème simple en le décomposant en une suite d'instructions logiques (Instructions Officielles).
* **C2 :** S'approprier une démarche algorithmique pour automatiser une tâche de la vie courante.

### Objectif Spécifique (O.S.)

*En respectant la Taxonomie de Bloom (Niveau : Application / Analyse) :*

* **O.S. :** **Identifier** et **appliquer** une structure de contrôle conditionnelle (*Si ... Alors ... Sinon*) pour résoudre un problème algorithmique simple basé sur une situation réelle.

### Prérequis

* **Concepts fondamentaux :** Notion d'algorithme, variables, types de données simples (entiers, chaînes) et les instructions de base (Saisir/Afficher).

### Savoir-Être & Savoir-Faire

* **Savoir-Faire :** Traduire un choix logique humain en une condition formelle utilisable par une machine.
* **Savoir-Être :** Rigueur dans le raisonnement logique, esprit d'analyse collaborative et écoute active.

---

## 2. Déroulement de la Séance

| Phase / Durée | Activités de l'Enseignant | Activités de l'Apprenant | Savoir à Apporter | Outils Didactiques |
| :--- | :--- | :--- | :--- | :--- |
| **Rappel** *(5 min)*<br><br>**Mise en situation** | **Questionnement :**<br>Poser des questions sur les prérequis : Qu'est-ce qu'une variable ? Comment modifier sa valeur ?<br><br>Introduire le contexte d'un choix logique quotidien. | Répond aux questions posées.<br><br>Écoute, se concentre et assimile le contexte de la situation de départ. | Rappel des structures séquentielles simples. | Tableau noir/blanc, Vidéoprojecteur. |
| **Situation-Problème** *(10 min)* | **Présentation de la S.P. :**<br>Exposer le problème (ex: Système d'accès automatique basé sur l'âge ou calcul d'une mention selon la note).<br>Guider les élèves à l'analyse de la S.P. | Observe la situation, lit l'énoncé et commence à réfléchir individuellement ou en binômes. | Notion de rupture de séquence (choix). | Fiche de situation distribuée, Diapositive. |
| **Construction du savoir** *(25 min)* | **Analyse S.P. & Questionnement :**<br>Inciter les élèves à formuler des hypothèses.<br><br>**Investigation / Mise en commun :**<br>Ouvrir le débat sur les solutions proposées.<br><br>**Filtrer et valider :**<br>Sélectionner la bonne logique et écrire le squelette au tableau. | **Hypothèses :**<br>Propose des approches (ex: "Il faut regarder si la note est >= 10").<br><br>Discute les hypothèses avec ses pairs.<br><br>Valide la structure logique commune. | Concept de condition alternative (*Si / Sinon*). | Tableau, Cahier de recherche. |
| **Analyse & Généralisation** *(10 min)* | **Institutionnalisation :**<br>Présenter formellement les notions du cours, définir la syntaxe de la structure alternative et donner la trace écrite structurée. | Comprend les notions clés, déduit les règles et formalise les définitions.<br><br>**Trace écrite :** Note le cours sur son cahier. | Définitions formelles de la structure conditionnelle. | Cahier de cours, Tableau. |
| **Entraînement & Réinvestissement** *(10 min)* | **Exercice d'application :**<br>Proposer un mini-exercice pratique d'application directe.<br><br>**QUIZ & Synthèse :**<br>Lancer un petit questionnaire rapide interactif pour évaluer la compréhension immédiate. | Effectue l'exercice individuellement.<br><br>Participe activement au Quiz de fin et collabore à la correction collective au tableau. | Assimilation pratique du concept étudié. | Mini-Ardoises ou Quiz interactif (ex: Scratch / Papiers). |

---

## 3. Scénario Pédagogique (Détails de l'Animation)

### MISE EN SITUATION (5 MIN)

#### LE RAPPEL

* **ACTION :** L'enseignant se déplace au centre de la classe pour capter l'attention de tous les élèves et demande d'éteindre momentanément les écrans (si en salle multimédia).
* **PAROLE :** *"Bonjour à tous. Imaginez la scène : vous êtes en train de créer un jeu ou une application sous Scratch, et vous voulez que votre personnage dise 'Bravo !' uniquement si le joueur obtient 10 points ou plus. Que se passe-t-il si le score est inférieur ? Est-ce que le programme actuel sait faire un choix tout seul ?"*
* **INTERACTION :** Noter deux mots clés au centre du tableau : **"Choix"** et **"Condition"**.

#### LA SITUATION-PROBLEME

* **ACTION :** Afficher au vidéoprojecteur une situation visuelle claire (**Fig 1** : Un algorithme linéaire qui affiche "Admis" à tout le monde sans vérifier la note).
* **PAROLE :** *"Regardez cet écran. C'est un défi : imaginez un système d'affichage des résultats d'examen automatique qui écrit 'Admis' même à quelqu'un qui a obtenu une note de 5/20. C'est impossible et injuste, n'est-ce pas ? Pourquoi la machine se comporte-t-elle ainsi ?"*
* **EFFET :** Attendre le silence et observer la réaction de surprise ou de réflexion des élèves.
* **DITES :** *"Le programme actuel ne sait pas réfléchir car son cerveau est bloqué sur une seule trajectoire linéaire. Il lui manque la capacité de prendre une décision selon le contexte !"*

---

### ANALYSE : CONSTRUCTION DU SAVOIR (25 MIN)

#### ANALYSE DE LA SITUATION-PROBLÈME

* **ACTION :** Présenter la formule humaine courante : *"Si tu as la moyenne alors tu passes, sinon tu redoubles."* Demander à un élève de venir découper cette phrase logique au tableau.
* **PAROLE :** *"Comment pouvons-nous traduire ce raisonnement humain pour que l'ordinateur comprenne qu'il y a deux chemins possibles ?"*
* **INTERACTION :** Recueillir les propositions au brouillon, éliminer les syntaxes trop complexes pour ne garder que la structure standardisée : **Si (Condition) Alors (Actions 1) Sinon (Actions 2) FinSi**.

---

### SYNTHÈSE & EVALUATION (10 MIN)

#### QUIZ RAPIDE

* **ACTION :** Afficher un mini-bloc Scratch avec une condition vide (Exemple : `Si < ___ > alors`) et demander aux élèves de compléter oralement ou sur ardoise pour des cas précis (ex: température de l'eau, feu de signalisation).
* **Trace Écrite (Fig 2) :** Schéma fonctionnel propre de l'alternative (Organigramme simple avec un losange de décision) recopié par les élèves.

---

## 4. Supports Didactiques (Annexes)

* **FIG 1 :** Capture d'un script Scratch erroné ou d'un pseudo-code linéaire sans structure conditionnelle entraînant un bug logique.
* **FIG 2 :** Schéma de la structure conditionnelle alternative (Organigramme avec le Losange de test menant vers deux branches distinctes : Vrai / Faux).
