---
theme: default
themeConfig:
  primary: '#0d9488'
title: Movie Picker, pilotage de projet (Bloc 3, RNCP 39583)
info: |
  Coordonner et piloter un projet de développement d'applications logicielles.
  Bloc 3, RNCP 39583, Adrien MORAND.
class: text-center
transition: slide-left
layout: cover
mdc: true
---

# Movie Picker

Coordonner et piloter un projet de développement logiciel

<div class="text-sm opacity-80 mt-2">
Bloc 3, Coordonner et piloter un projet de développement d'applications logicielles<br>
Expert en développement logiciel, RNCP 39583
</div>

<div class="mt-10 font-bold">Adrien MORAND, 16 septembre 2026</div>

<!--
DUREE 0:10.

Ne rien commenter ici. Enchainer immediatement sur la diapo 2.
-->

---

# Le produit et son état aujourd'hui

Une application web de décision collective : choisir à plusieurs quel film regarder.

<div class="grid grid-cols-2 gap-6 mt-6">
<div>

**Ce qui est livré**

| | |
|--|--|
| Versions en production | **8**, du 27/02 au 25/08/2026 |
| Rythme de livraison | une tous les 25 jours |
| Commits sur la branche principale | 799 |
| Coût de fonctionnement | moins de 200 € par an |

</div>
<div>

**Ce qui est mesuré en production**

| | |
|--|--|
| Comptes utilisateurs | 17 |
| Soirées créées | 19 |
| Soirées menées jusqu'au tirage | **74 %** |
| Latence de l'API au 95e centile | 207 ms |
| Taux d'erreur serveur | 0,026 % |

</div>
</div>

<div class="mt-4 text-sm opacity-75">
Usage mesuré du 8 avril au 21 juillet 2026. Le service est en ligne et utilisé.
</div>

<!--
DUREE 0:40.

Objectif unique de cette diapo : etablir qu'on parle d'un logiciel reellement
exploite, pas d'une maquette. Tout le reste de la presentation en depend, et la
demonstration de la fin se fera sur cette version.

Ne pas detailler les fonctionnalites : elles seront montrees en direct.

A PREPARER : inserer une capture de l'application en production a gauche du
tableau si le rendu le permet, sinon laisser les chiffres seuls.
-->

---

# Cadre de la présentation

<div class="grid grid-cols-2 gap-8 mt-4">
<div>

### Deux registres, jamais confondus

**Le réel, chiffré et vérifiable**<br>
Le projet a été **exécuté seul**. Les commits, les versions, les mesures de production et les retours utilisateurs sont ceux d'un projet à une personne.

**L'organisation cible, annoncée comme telle**<br>
Une équipe de **4 profils** sur laquelle sont construits la matrice RACI, l'affectation des missions, la grille de compétences et le plan de développement. C'est la projection d'industrialisation du projet, pas une équipe qui a existé.

</div>
<div>

### Les sept temps

1. Planifier l'exécution
2. Piloter l'avancement
3. Un cas d'arbitrage
4. Piloter l'équipe
5. Les besoins en compétences
6. Rendre compte au commanditaire
7. **Démonstration en production**

</div>
</div>

<!--
DUREE 0:40. DIAPO CRITIQUE POUR LES 15 MINUTES DE QUESTIONS.

Dire la phrase telle quelle : « Le projet a ete execute seul. Chaque fois que je
parlerai d'affectation de missions ou de montee en competences, je decrirai
l'organisation cible du projet, et je le signalerai. »

Un jury qui decouvre le caractere projete en fin de presentation le vit comme
une dissimulation. Un jury prevenu des le debut l'evalue comme un exercice de
conception d'organisation. C'est le meme contenu, ce n'est pas la meme note.

Ne pas s'excuser, ne pas justifier longuement. Annoncer, puis avancer.
-->

---

# 1. Planifier l'exécution : la méthodologie

Kanban léger à revues de version

<div class="grid grid-cols-2 gap-6 text-sm">
<div>

### Le choix

Un flux continu : une fiche est tirée dès qu'une capacité se libère, menée jusqu'à la production, puis consolidée dans une **revue de version** qui vaut point de validation.

Deux règles, pas plus :

- **Limite de travail en cours** : un seul sujet fonctionnel à la fois, hors correctif de production
- **Critère de sortie** : rien n'est terminé avant d'être déployé et vérifié en production

</div>
<div>

### Les bénéfices attendus, et leur résultat

| Bénéfice | Résultat |
|----------|----------|
| Priorisation permanente | Périmètre revu 8 fois sans replanification |
| Pas de cérémonie non soutenable | Le temps va à la production et à la revue |
| Délai de mise à disposition court | 8 livraisons en 6 mois |
| Réaction à un signal de production | Anomalies traitées hors du flux |

</div>
</div>

<div class="mt-3 p-2 border-l-4 border-teal-500 bg-teal-50 bg-opacity-40 text-sm">
<b>Écartés</b> : <b>Scrum</b>, cérémonies coûteuses sans bénéfice de synchronisation à une personne. <b>Cycle en V</b>, périmètre figé avant les mesures de production.
</div>

<!--
DUREE 1:10. ELEMENT IMPOSE 1 : presentation de la methodologie choisie.
CRITERE : le choix est justifie AVEC LES BENEFICES ATTENDUS.

Ne pas definir Kanban en theorie, le jury connait. Passer directement au
« pourquoi ici » et surtout aux benefices constates.

Insister sur la formule : « Kanban leger » n'est pas un Kanban degrade, c'est un
Kanban dont l'outillage a ete dimensionne a la taille reelle du projet. Ce qui a
ete ecarte du Kanban lui-meme, ce sont les metriques de flux (temps de cycle par
classe de service, diagramme de flux cumule), qui exigent un volume de fiches que
ce projet n'atteint pas.

Le motif d'ecartement de Scrum doit etre dit sans mepris : ce n'est pas Scrum qui
est mauvais, c'est son rapport cout / benefice a une personne.

SI ON QUESTIONNE : « pourquoi pas Scrum en solo, juste pour la discipline ? »
Reponse : la discipline vient de la limite de travail en cours et du critere de
sortie, qui sont conserves. Ce qui est ecarte, ce sont les rituels sans
interlocuteur.
-->

---

# Les outils de planification

Deux outils, deux échelles de temps

<div class="grid grid-cols-2 gap-6 text-sm">
<div>

### Rétroplanning, l'échelle des échéances

À rebours depuis les dates non négociables : Bloc 1 le 11 juin, Bloc 2 le 23 juillet, Bloc 4 le 21 août, Bloc 3 le 16 septembre.

**Bénéfice attendu** : transformer une date imposée en date de fin de lot. Une échéance qui ne bouge pas impose une capacité, donc un périmètre.

**Ce qu'il a produit** : le contenu de chaque version arrêté par la capacité restante, et non par une liste de souhaits.

### Gantt, l'échelle des phases

**Bénéfice attendu** : rendre visibles les deux choses qu'une liste de tâches masque, les **chevauchements** entre phases et la position des **jalons de version**.

</div>
<div>

### Compatibilité avec Kanban

Les deux outils n'opèrent pas au même horizon.

| Horizon | Outil | Question à laquelle il répond |
|---------|-------|-------------------------------|
| Le mois, le trimestre | Rétroplanning et Gantt | Où en est-on des phases et des échéances ? |
| La journée, la semaine | Tableau de flux | Que fait-on maintenant, et qu'est-ce qui bloque ? |

<div class="mt-4 p-3 border-l-4 border-teal-500 bg-teal-50 bg-opacity-40">
Le Gantt porte les phases et les jalons, jamais le contenu des fiches. <b>Aucune fiche du tableau ne porte de date de fin engagée. Seules les versions en portent.</b>
</div>

</div>
</div>

<!--
DUREE 0:50. ELEMENT IMPOSE 2 (premiere partie) : le planning detaille.
CRITERES : l'outil de planification est argumente avec ses benefices attendus,
ET il est compatible avec la methodologie choisie.

Le critere de compatibilite est celui que les candidats ratent : ils presentent
un Gantt sur une methode agile sans expliquer comment les deux coexistent. Le
tableau du bas est la reponse, et la derniere phrase en gras est la formulation
a dire mot pour mot.

La contradiction classique entre Gantt et Kanban nait quand on tente de planifier
des taches individuelles a date fixe dans un flux. Ce n'est pas ce qui est fait
ici : le Gantt porte les phases et les jalons, pas le contenu des fiches.
-->

---

# Le planning en cinq phases

<div class="gantt">

<div class="row axis">
<div class="lab"></div>
<div class="track">
<span style="grid-column:1/3">fév.</span>
<span style="grid-column:3/34">mars</span>
<span style="grid-column:34/64">avril</span>
<span style="grid-column:64/95">mai</span>
<span style="grid-column:95/125">juin</span>
<span style="grid-column:125/156">juil.</span>
<span style="grid-column:156/187">août</span>
<span style="grid-column:187/203">sept.</span>
</div>
</div>

<div class="sec">Étude</div>
<div class="row"><div class="lab">Analyse de la demande, parties prenantes</div><div class="track"><i style="grid-column:1/22"></i></div></div>
<div class="row"><div class="lab">Comparatif de stack, faisabilité, veille</div><div class="track"><i style="grid-column:3/48"></i></div></div>

<div class="sec">Mesure</div>
<div class="row"><div class="lab">Chiffrage 98 J/H, budget, risques</div><div class="track"><i style="grid-column:22/63"></i></div></div>
<div class="row"><div class="lab">Mesure de l'usage réel en production</div><div class="track"><i style="grid-column:41/145"></i></div></div>

<div class="sec">Conception</div>
<div class="row"><div class="lab">Modèle de données, contrat d'interface</div><div class="track"><i style="grid-column:3/43"></i></div></div>
<div class="row"><div class="lab">Architecture hexagonale de l'API</div><div class="track"><i style="grid-column:17/63"></i></div></div>
<div class="row"><div class="lab">Système de composants mobile-first</div><div class="track"><i style="grid-column:34/94"></i></div></div>

<div class="sec">Réalisation</div>
<div class="row"><div class="lab">Lot 1, MVP</div><div class="track"><i style="grid-column:1/18"></i></div></div>
<div class="row"><div class="lab">Lot 2, migration de l'API vers .NET</div><div class="track"><i style="grid-column:20/27"></i></div></div>
<div class="row"><div class="lab">Lot 3, V1 produit</div><div class="track"><i style="grid-column:27/82"></i></div></div>
<div class="row"><div class="lab">Lot 4, versions V1.1 à V1.4</div><div class="track"><i style="grid-column:83/180"></i></div></div>

<div class="sec">Restitution</div>
<div class="row"><div class="lab">Mises en production, v0.1.0 à v1.4.0</div><div class="track"><i style="grid-column:1/180"></i></div></div>
<div class="row"><div class="lab">Restitutions au commanditaire</div><div class="track"><b style="grid-column:105/106"></b><b style="grid-column:147/148"></b><b style="grid-column:176/177"></b><b style="grid-column:202/203"></b></div></div>

</div>

<div class="text-xs opacity-70 mt-1 ml-2">
Du 27 février au 16 septembre 2026. Restitutions au commanditaire : Bloc 1 le 11/06, Bloc 2 le 23/07, Bloc 4 le 21/08, <b>Bloc 3 le 16/09</b>.
</div>

<style>
.gantt { font-size: 0.66rem; line-height: 1.1; margin-top: 0.4rem; }
.gantt .row { display: flex; align-items: center; gap: 0.5rem; }
.gantt .lab { width: 15rem; flex: none; text-align: right; opacity: 0.9; }
.gantt .track {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(202, 1fr);
  align-items: center;
  height: 1.05rem;
  border-left: 1px solid currentColor;
  opacity: 0.95;
}
.gantt .track i { height: 0.6rem; border-radius: 3px; background: var(--slidev-theme-primary); }
.gantt .track b {
  width: 0.55rem; height: 0.55rem;
  transform: rotate(45deg);
  background: #f59e0b;
  justify-self: center;
}
.gantt .axis .track { border-left: none; height: 1.2rem; }
.gantt .axis .track span {
  font-weight: 600; opacity: 0.6; padding-left: 3px;
  border-left: 1px solid currentColor; align-self: stretch;
  overflow: hidden; white-space: nowrap;
}
.gantt .sec {
  font-weight: 700; color: var(--slidev-theme-primary);
  margin: 0.3rem 0 0.1rem; padding-left: 0.1rem;
}
</style>

<div class="text-sm p-2 border-l-4 border-teal-500 bg-teal-50 bg-opacity-40">
Les phases <b>se chevauchent</b>, elles ne se succèdent pas. La conception court jusqu'en mai alors que la réalisation a commencé en février, et la phase de mesure se rouvre en production. C'est ce qu'un cycle en V interdit.
</div>

<!--
DUREE 1:20, la plus longue diapo du chapitre. ELEMENT IMPOSE 2 (suite).
CRITERE : le planning permet de visualiser les phases d'ETUDE, de MESURE, de
CONCEPTION, de REALISATION, de RESTITUTION. Les cinq mots sont dans la grille,
les cinq sections sont a l'ecran. Les nommer a voix haute une par une.

Contenu de chaque phase, a dire en balayant le diagramme :
- ETUDE : analyse de la demande, parties prenantes, comparatif de stack,
  faisabilite, veille, hierarchisation MoSCoW.
- MESURE : deux temps, et c'est volontaire. En amont le chiffrage en jours-homme,
  le budget, la cartographie des risques. En production le releve de l'usage
  reel, qui a alimente les arbitrages de la V1.4.
- CONCEPTION : modele de donnees, architecture hexagonale, contrat d'interface,
  systeme de composants mobile-first.
- REALISATION : les 4 lots.
- RESTITUTION : deux registres, les 8 mises en production vers l'utilisateur, et
  les restitutions du titre vers le commanditaire.

LE POINT A NE PAS MANQUER : dire explicitement que les barres se recouvrent, et
pourquoi c'est la signature d'un pilotage en flux. Un Gantt dont les barres se
suivent sans se recouvrir decrirait un cycle en V.

SI ON QUESTIONNE : « vos documents de cadrage sont dates de juin, votre phase
d'etude de fevrier. » Reponse preparee : les DECISIONS d'etude ont ete prises en
fevrier et mars, tracees dans l'historique du depot et dans les choix techniques
eux-memes. Leur FORMALISATION documentaire est intervenue en juin pour la
restitution du Bloc 1. La decision precede le document. C'est une faiblesse de
tracabilite, assumee, et corrigee depuis : les arbitrages sont desormais
consignes au moment ou ils sont pris.
-->

---

# Le découpage en lots et la charge

<div class="grid grid-cols-2 gap-6 text-sm">
<div class="dense">

| Lot | Contenu | Charge |
|-----|---------|-------:|
| **1. MVP** | Socle, API des soirées, catalogue de films, vote, tirage, interface mobile-first, déploiement | 27 J/H |
| **2. Migration** | ASP.NET Core, architecture hexagonale, tests d'intégration, redéploiement | 13 J/H |
| **3. V1 produit** | Comptes, mot de passe oublié, historique, configuration hôte, déjà vu, partage, temps réel, thème, internationalisation, sécurité de la chaîne | 35 J/H |
| **4. Clôture** | Cadrage, pilotage, sécurité et accessibilité, recette, exploitation | 23 J/H |
| | **Total** | **98 J/H** |

</div>
<div>

### La méthode d'estimation

**Analogique**, par comparaison entre lots de complexité voisine. Aucune méthode paramétrique n'était applicable faute d'historique de projets comparables.

**Marge d'incertitude assumée : 20 %** sur les lots de développement.

<div class="mt-6 p-3 border-l-4 border-teal-500 bg-teal-50 bg-opacity-40 text-sm">
Ce chiffrage n'est pas rétrospectif : il est établi au cadrage et sert de base au budget prévisionnel. L'écart entre ces 98 J/H et la charge réellement consommée est traité au chapitre 2.
</div>

</div>
</div>

<!--
DUREE 0:50. CRITERE : le planning est decoupe en phases, en taches ou LOTS.

Ne pas lire le contenu des lots, il est a l'ecran. Dire les quatre intitules et
les quatre charges, puis passer a la methode d'estimation, qui est ce qu'un jury
de professionnels va reellement interroger.

Annoncer des maintenant que l'ecart previsionnel / reel sera traite au chapitre 2.
Cela evite la question « et ca a tenu ? » posee trop tot, et cela montre que le
chiffrage a servi de reference de pilotage et pas seulement de piece a produire.

SI ON QUESTIONNE : « 20 % de marge, c'est beaucoup ou peu ? » Reponse : c'est la
marge usuelle d'une estimation analogique sans historique. Sur les lots
documentaires, elle s'est revelee insuffisante, c'est le point de vigilance 2.
-->

---

# Les ressources nécessaires

<div class="grid grid-cols-3 gap-4 text-sm">
<div>

### Humaines

Les 4 profils de l'organisation cible.

| Profil | Charge | Part |
|--------|-------:|-----:|
| Lead dev, chef de projet | 19 J/H | 19 % |
| Développeur front | 25 J/H | 26 % |
| Développeur back | 35 J/H | 36 % |
| DevOps et QA, mi-temps | 19 J/H | 19 % |
| **Total** | **98 J/H** | |

Le back porte la charge la plus lourde, conséquence du lot de migration, absorbée par le décalage temporel des lots.

</div>
<div>

### Matérielles et techniques

- Un poste par profil, environnement local reproductible
- Dépôt unique en monorepo, outillage de test, d'analyse statique et de formatage
- Chaîne d'intégration et de déploiement continus, analyse de qualité et de sécurité, tests de bout en bout
- Exécution conteneurisée sans serveur, diffusion du front par réseau de contenu, base managée
- Services tiers : catalogue de films, e-mails, supervision, mesure d'usage, secrets

</div>
<div>

### Financières

| Poste | Montant |
|-------|--------:|
| Valeur de développement | 34 300 € HT |
| Infrastructure | 1 à 5 €/mois |
| Domaine | 10 €/an |
| Licences | **0 €** |
| **Trésorerie réelle** | **20 à 190 €/an** |

98 J/H au taux journalier junior simulé de 350 €. Coût de trésorerie nul en formation : ce montant matérialise la valeur de l'effort pour le commanditaire.

</div>
</div>

<!--
DUREE 0:50. ELEMENT IMPOSE 3 : les ressources necessaires.

Trois familles, une phrase forte par famille, pas de lecture de tableau.

HUMAINES : rappeler d'un mot qu'il s'agit de l'organisation cible. C'est le
deuxieme rappel apres la diapo 3, et il faut qu'il soit naturel, pas defensif.

MATERIELLES : ne pas enumerer, dire « poste de travail, outillage, chaine de
livraison, hebergement, services tiers » et laisser lire.

FINANCIERES : la phrase a dire est « moins de 200 euros par an de tresorerie
reelle, pour une valeur de developpement de 34 300 euros ». C'est le contraste qui
parle a un jury de professionnels. Et l'absence de licence payante est une
decision de conception prise sous contrainte de budget, ce qui conditionne la
soutenabilite du service au-dela du titre.
-->

---

# La matrice RACI

<div class="grid grid-cols-3 gap-4">
<div class="col-span-2 dense">

**R** réalise, **A** approuve et rend compte, **C** consulté, **I** informé

| Activité | Lead | Front | Back | DevOps QA | Commanditaire | Utilisateurs |
|----------|:----:|:-----:|:----:|:---------:|:-------------:|:------------:|
| Cadrage et périmètre de version | A R | C | C | C | C | I |
| Architecture applicative | A R | C | R | C | I | |
| Développement de l'interface | A | R | C | C | | I |
| Développement de l'API | A | C | R | C | | |
| Accessibilité du produit | A | R | C | C | C | C |
| Chaîne, supervision, sécurité | A | C | C | R | I | |
| Recette et tests de bout en bout | A | C | C | R | C | C |
| Arbitrage de périmètre ou de charge | A R | C | C | C | C | I |
| **Inclusion et adaptation des postes** | **A R** | C | C | C | I | |

<div class="text-xs opacity-70 mt-1">Extrait de 9 lignes. Matrice complète de 15 lignes en annexe.</div>

</div>
<div class="text-xs">

### Trois propriétés

**Une seule approbation par ligne.** Le rôle A n'est jamais partagé : c'est la condition pour qu'un arbitrage puisse être tranché.

**L'affectation suit la compétence, pas la disponibilité.**

**Les acteurs externes y figurent.** Un acteur absent de la matrice est un acteur qu'on oubliera de solliciter.

</div>
</div>

<div class="mt-2 p-2 border-l-4 border-teal-500 bg-teal-50 bg-opacity-40 text-xs">
<b>Prise en compte du handicap, trois niveaux.</b><br>
<b>Affectation</b> : aucune activité ne présuppose une capacité physique, une ligne dédiée porte un responsable identifié. <b>Poste et organisation</b> : poste adapté, outillage compatible lecteur d'écran et navigation clavier, horaires aménagés, temps supplémentaire en recette et en formation, comptes rendus écrits, sans justification à produire à l'équipe. <b>Produit</b> : accessibilité vérifiée automatiquement à chaque livraison, au niveau maximum sur tous les écrans.
</div>

<!--
DUREE 0:50. CRITERE : les taches sont assignees selon les competences (RACI) ET
tiennent compte des personnes en situation de handicap. Le second point est un
critere a part entiere, pas une remarque.

Ne pas lire la matrice. Dire les trois proprietes, puis consacrer la moitie du
temps au bandeau du bas.

Sur le handicap, la phrase a dire : « le sujet porte un responsable identifie
dans la matrice, des amenagements nommes, et une exigence d'accessibilite du
produit verifiee automatiquement. Une equipe qui livre un produit inaccessible ne
peut pas pretendre a une organisation inclusive. » C'est ce qui distingue une
prise en compte reelle d'une clause de style, et un jury de professionnels fait
la difference immediatement.

Rappel de posture : c'est l'organisation cible. Troisieme et dernier rappel avant
le chapitre 4.
-->

---

# Les points de vigilance

<div class="dense">

| # | Point de vigilance | Ce qu'il menace | Indicateur de contrôle | Parade |
|:-:|--------------------|-----------------|------------------------|--------|
| **1** | **Concentration des rôles sur une personne** | La continuité du projet | Nombre de personnes capables de mener une mise en production : **1** | Procédures écrites et versionnées, infrastructure décrite en code, décisions consignées |
| **2** | Sous-estimation des lots documentaires | Le calendrier du titre | Écart charge prévue / consommée sur le lot de clôture | Rétroplanning depuis les échéances, périmètre ajusté sur la capacité restante |
| **3** | Dépendance au catalogue de films externe | Le cœur du produit | Taux d'erreur des appels au catalogue | Cache des métadonnées, limitation du débit, repli de saisie manuelle |
| **4** | Transport des e-mails transactionnels | Mot de passe oublié, invitations | Volume quotidien rapporté au plafond du palier gratuit | Envoi limité à l'indispensable, fournisseur substituable derrière un port applicatif |
| **5** | Durcissement de la politique de sécurité du contenu | L'affichage, blocage silencieux de ressources légitimes | Sondes de disponibilité, vérification visuelle après modification | Inventaire des domaines externes tenu à jour, vérification obligatoire avant mise en production |
| **6** | Absence de déploiement progressif | La disponibilité lors d'une bascule | Test de fumée post-déploiement, taux d'erreur serveur | Arbitrage assumé et réversible, test de fumée bloquant, retour arrière par redéploiement |
| **7** | Instabilité de la chaîne de vérification | La cadence de livraison, la confiance dans la chaîne | Part des échecs sans cause réelle | Contrôle de performance rendu déterministe, seuils recalibrés, vérification en local avant remontée |

</div>

<div class="mt-3 p-2 border-l-4 border-teal-500 bg-teal-50 bg-opacity-40">
Les points 2 à 7 sont des risques de projet. Le point 1 est un risque d'organisation, et c'est lui qui justifie la conception de l'organisation cible présentée dans la suite.
</div>

<!--
DUREE 0:50. CRITERE : les points de vigilance sont soulignes. Dernier critere de
C3.1, competence ELIMINATOIRE : le chapitre ne peut pas se terminer sans lui.

Ne pas lire les sept lignes. Structurer en deux temps :

1. « Cinq de ces points sont techniques et chacun porte un indicateur de controle
et une parade. » Citer le point 5 comme exemple, parce qu'il s'est REALISE en
production : un durcissement de la politique de securite du contenu a bloque les
affiches de films et les avatars. L'incident et sa correction sont tracees. Un
point de vigilance qui s'est realise et qui a ete traite vaut mieux qu'une liste
theorique.

2. « Le point 1 est d'une autre nature. » C'est la transition du chapitre :
l'indicateur vaut 1, et cette valeur est le probleme. Enchainer sur le fait que
c'est ce risque qui rend l'organisation cible necessaire.

Le point 6, absence de deploiement progressif, est une faiblesse assumee et
tracee. La dire ici plutot que de la laisser decouvrir par le jury.
-->
