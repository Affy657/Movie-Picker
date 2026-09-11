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

# Sommaire

<div class="chips mt-6" style="font-size:1.05rem;gap:0.55rem 0;max-width:44rem;margin-left:auto;margin-right:auto">
<div><span><b>1.</b> Démonstration en production</span><u>C3.4.2, éliminatoire</u></div>
<div><span><b>2.</b> Planifier l'exécution</span><u>C3.1, éliminatoire</u></div>
<div><span><b>3.</b> Piloter l'avancement</span><u>C3.2.1, éliminatoire</u></div>
<div><span><b>4.</b> Un cas d'arbitrage</span><u>C3.2.2</u></div>
<div><span><b>5.</b> Piloter le travail, seul</span><u>C3.3.1</u></div>
<div><span><b>6.</b> Les compétences, avant et après</span><u>C3.3.2</u></div>
<div><span><b>7.</b> Rendre compte au commanditaire</span><u>C3.4.1</u></div>
<div><span><b>8.</b> Bilan, et la validation du périmètre livré</span><u>C3.4.2, éliminatoire</u></div>
</div>

<!--
DUREE 0:40. AVANT LA DEMONSTRATION. RIEN D'AUTRE A L'ECRAN QUE LE SOMMAIRE :
TOUT CE QUI SUIT SE DIT. DIAPO CRITIQUE POUR LES 15 MINUTES DE QUESTIONS.

Dire la phrase telle quelle : « Le projet a ete mene seul, du 27 fevrier au
16 septembre : developpeur, architecte, exploitant et chef de projet. Je ne
vais pas vous presenter une equipe que je n'ai pas eue. Je vais vous montrer
comment j'ai travaille seul et, la ou le referentiel suppose une equipe, ce
que j'ai fait a la place et ce qui n'a pas d'equivalent. »

Puis le sommaire, une phrase par chapitre au plus, en signalant les trois
competences eliminatoires.

Ne pas s'excuser d'etre seul, ne pas justifier longuement. Annoncer, puis
avancer. Un jury previent des le debut evalue la methode ; un jury qui
decouvre en cours de route qu'une equipe etait fictive sanctionne.
-->

---

# 1. Démonstration

<div class="text-center" style="font-size:1.9rem"><a href="https://web.movie-picker.fr" target="_blank">web.movie-picker.fr</a></div>

<style>
h1 { text-align: center; font-size: 4.4rem !important; font-weight: 700; margin-top: 7rem !important; margin-bottom: 1.5rem !important; }
</style>


<!--
DUREE 0:50, PUIS LA DEMONSTRATION EN DIRECT, 4:50. LE LIEN EST CLIQUABLE. ELEMENT IMPOSE 14 : la
demonstration des fonctionnalites. COMPETENCE C3.4.2, ELIMINATOIRE.

La presentation OUVRE sur le produit : le jury voit le logiciel avant d'entendre
comment il a ete pilote. Dire la phrase de bascule : « je commence par vous
montrer le produit, comme je le montrerais a un client. Tout ce qui suivra,
planning, indicateurs, arbitrages, porte sur ce logiciel-la. »

A DIRE, rien n'est a l'ecran : 10 versions en production depuis fevrier,
17 comptes, 74 % des soirees menees jusqu'au tirage. Puis les six temps du
parcours en une phrase, et la demonstration. Au retour, diapo 4 : on parle au
jury.

Objectif unique : etablir qu'on parle d'un logiciel reellement exploite. Tout le
reste de la presentation en depend, et la demonstration se fera dessus.

Trois chiffres, pas plus. Le plus parlant est le 74 % : ce n'est pas un chiffre
d'inscription, c'est un chiffre d'USAGE ABOUTI. Les gens qui creent une soiree
vont au bout dans trois cas sur quatre.

Ne pas detailler les fonctionnalites, elles seront montrees en direct.

SI ON QUESTIONNE le volume : 17 comptes, c'est modeste et je ne le presente pas
autrement. C'est un usage reel et mesure, pas un usage de masse.

= = =

COMPETENCE C3.4.2, ELIMINATOIRE.

REGISTRE CLIENT, il doit s'entendre : pendant la demonstration on ne s'adresse
pas a un jury de professionnels mais a un client. Le vocabulaire change, le
debit ralentit. Le registre jury reprend a la diapo 4.

Ce qui compte pour le critere « le logiciel est utilisable » : c'est la version
en production, pas une maquette, et un second appareil est pret.

MOTS INTERDITS pendant toute la demonstration : API, base de donnees,
deploiement, cache, jeton. Si l'un sort, NE PAS se reprendre a voix haute, se
reprendre attire l'attention sur l'erreur. Continuer.

Si une question technique arrive en cours de demonstration : repondre dans le
registre client, puis « je peux le detailler apres la demonstration si vous le
souhaitez ». Ne pas basculer au milieu du parcours.

=== BASCULE DE REPLI, si le reseau lache ===
Niveau 1, reseau lent : partage de connexion du telephone, deja active.
Niveau 2, reseau indisponible : environnement local deja demarre. DIRE la
phrase preparee : « le reseau de la salle ne suit pas, je bascule sur la meme
version, installee sur mon poste. » Puis continuer sans commentaire.
Niveau 3, poste defaillant : video enregistree, commentee par-dessus.
Niveau 4 : captures imprimees.
Un incident annonce calmement se lit comme de la preparation ; un incident subi
en silence se lit comme une defaillance du logiciel.
-->

---

# 2. Planifier : Kanban léger, deux horizons de temps

<div class="grid grid-cols-5 gap-6 mt-6">
<div class="col-span-2">

<div class="chips" style="font-size:0.85rem;gap:0.5rem 0">
<div><span><b>Travail en cours</b></span><u>1 sujet, hors correctif</u></div>
<div><span><b>Terminé</b></span><u>déployé et vérifié en production</u></div>
<div><span><b>Cérémonies</b></span><u>aucune, les versions ont une date</u></div>
<div><span><b>Écartés</b></span><u>Scrum, cycle en V</u></div>
</div>

</div>
<div class="col-span-3">

<div class="horizons">
<div class="h"><b>Le mois, le trimestre</b><span>Rétroplanning et Gantt</span><i>Une date imposée devient une date de fin de lot : la capacité fixe le périmètre, jamais l'inverse</i></div>
<div class="h day"><b>La journée, la semaine</b><span>Tableau de flux</span><i>Que fait-on maintenant, qu'est-ce qui bloque ? Aucune fiche ne porte de date de fin, <b>seules les versions en portent une</b></i></div>
</div>

</div>
</div>

<!--
DUREE 1:30. ELEMENTS IMPOSES 1 ET 2 : la methodologie choisie, et l'outil de
planification. CRITERES : le choix est justifie AVEC LES BENEFICES ATTENDUS ;
l'outil est argumente avec ses benefices ET compatible avec la methodologie.

Deux temps : la colonne de gauche est la methode, la colonne de droite est
l'outillage. Le schema de droite EST la reponse au critere de compatibilite, la
phrase en gras est a dire mot pour mot.

CRITERE : le choix est justifie AVEC LES BENEFICES ATTENDUS.

Ne pas definir Kanban, le jury connait. Aller au « pourquoi ici » et aux
benefices constates, a dire : perimetre arrete 10 fois, une par version, sans
replanification, le
temps va a la production et a la revue, les anomalies traitees hors du flux.

La formule a dire : « Kanban leger » n'est pas un Kanban degrade, c'est un Kanban
dont l'outillage a ete dimensionne a la taille reelle du projet. Ce qui a ete
ecarte du Kanban lui-meme, ce sont les metriques de flux, temps de cycle par
classe de service, diagramme de flux cumule, qui exigent un volume de fiches que
ce projet n'atteint pas.

Le motif d'ecartement de Scrum doit etre dit sans mepris : ce n'est pas Scrum qui
est mauvais, c'est son rapport cout / benefice a une personne.

SI ON QUESTIONNE : « pourquoi pas Scrum en solo, juste pour la discipline ? »
La discipline vient de la limite de travail en cours et du critere de sortie, qui
sont conserves. Ce qui est ecarte, ce sont les rituels sans interlocuteur.

= = =

CRITERES : l'outil de planification est argumente avec ses benefices attendus,
ET il est compatible avec la methodologie choisie.

Le critere de compatibilite est celui que les candidats ratent : ils presentent
un Gantt sur une methode agile sans expliquer comment les deux coexistent. Le
schema de droite est la reponse, et la phrase en gras est a dire mot pour mot.

La contradiction classique entre Gantt et Kanban nait quand on tente de planifier
des taches individuelles a date fixe dans un flux. Ce n'est pas ce qui est fait
ici.

Ce que le retroplanning a produit concretement : le contenu de chaque version a
ete arrete par la capacite restante avant la prochaine echeance, pas par une
liste de souhaits.
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
<div class="row"><div class="lab">Demande, parties prenantes</div><div class="track"><i style="grid-column:1/22"></i></div></div>
<div class="row"><div class="lab">Comparatif de stack, faisabilité</div><div class="track"><i style="grid-column:3/48"></i></div></div>

<div class="sec">Mesure</div>
<div class="row"><div class="lab">Chiffrage 98 J/H, budget, risques</div><div class="track"><i style="grid-column:22/63"></i></div></div>
<div class="row"><div class="lab">Usage réel en production</div><div class="track"><i style="grid-column:41/145"></i></div></div>

<div class="sec">Conception</div>
<div class="row"><div class="lab">Modèle de données, contrat d'API</div><div class="track"><i style="grid-column:3/43"></i></div></div>
<div class="row"><div class="lab">Architecture hexagonale</div><div class="track"><i style="grid-column:17/63"></i></div></div>
<div class="row"><div class="lab">Composants mobile-first</div><div class="track"><i style="grid-column:34/94"></i></div></div>

<div class="sec">Réalisation</div>
<div class="row"><div class="lab">Lot 1, MVP</div><div class="track"><i style="grid-column:1/18"></i></div></div>
<div class="row"><div class="lab">Lot 2, migration de l'API</div><div class="track"><i style="grid-column:20/27"></i></div></div>
<div class="row"><div class="lab">Lot 3, V1 produit</div><div class="track"><i style="grid-column:27/82"></i></div></div>
<div class="row"><div class="lab">Lot 4, clôture du titre</div><div class="track"><i style="grid-column:83/180"></i></div></div>
<div class="row"><div class="lab">V1.1 à V1.5.0, <i>hors chiffrage</i></div><div class="track"><i class="off" style="grid-column:83/194"></i></div></div>

<div class="sec">Restitution</div>
<div class="row"><div class="lab">Mises en production, v0.1.0 → v1.5.0</div><div class="track"><i style="grid-column:1/194"></i></div></div>
<div class="row"><div class="lab">Restitutions au commanditaire</div><div class="track"><b style="grid-column:105/106"></b><b style="grid-column:147/148"></b><b style="grid-column:176/177"></b><b style="grid-column:202/203"></b></div></div>

</div>

<div class="text-xs opacity-70 mt-2 ml-2">
Du 27 février au 16 septembre 2026. Jalons ◆ : Bloc 1 le 11/06, Bloc 2 le 23/07, Bloc 4 le 21/08, <b>Bloc 3 le 16/09</b>.
</div>

<style>
.gantt { font-size: 0.68rem; line-height: 1.1; margin-top: 0.4rem; }
.gantt .row { display: flex; align-items: center; gap: 0.5rem; }
.gantt .lab { width: 14rem; flex: none; text-align: right; opacity: 0.9; }
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
.gantt .track i.off { background: #d97706; }
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
  margin: 0.28rem 0 0.08rem; padding-left: 0.1rem;
}
</style>

<!--
DUREE 1:10, la plus longue diapo du chapitre. ELEMENT IMPOSE 2 (suite).
CRITERE : le planning permet de visualiser les phases d'ETUDE, de MESURE, de
CONCEPTION, de REALISATION, de RESTITUTION. Les cinq mots sont dans la grille,
les cinq sections sont a l'ecran. Les nommer a voix haute une par une.

Contenu de chaque phase, en balayant le diagramme :
- ETUDE : demande, parties prenantes, comparatif de stack, faisabilite, veille,
  hierarchisation MoSCoW.
- MESURE : deux temps, et c'est volontaire. En amont le chiffrage en jours-homme,
  le budget, la cartographie des risques. En production le releve de l'usage
  reel, qui a alimente les arbitrages de la V1.4.
- CONCEPTION : modele de donnees, architecture hexagonale, contrat d'interface,
  systeme de composants mobile-first.
- REALISATION : les 4 lots. La barre ORANGE est celle qui compte : les versions
  V1.1 a V1.5.0 sont hors du chiffrage initial. On y revient en diapo 12.
- RESTITUTION : deux registres, les 10 mises en production vers l'utilisateur, et
  les 4 restitutions du titre vers le commanditaire.

LE POINT A NE PAS MANQUER : dire explicitement que les barres se recouvrent, et
pourquoi c'est la signature d'un pilotage en flux. Un Gantt dont les barres se
suivent sans se recouvrir decrirait un cycle en V.

SI ON QUESTIONNE : « vos documents de cadrage sont dates de juin, votre phase
d'etude de fevrier. » Les DECISIONS d'etude ont ete prises en fevrier et mars,
tracees dans l'historique du depot et dans les choix techniques eux-memes. Leur
FORMALISATION documentaire est intervenue en juin pour le Bloc 1. La decision
precede le document. Faiblesse de tracabilite assumee, corrigee depuis.
-->

---

# Quatre lots, 98 jours-homme, et les ressources

<div class="stack mt-4" style="height:2.3rem">
<i style="width:27.5%;background:var(--s1)">Lot 1, MVP, 27 J/H</i>
<i style="width:13.3%;background:var(--s3)">Lot 2, 13</i>
<i style="width:35.7%;background:var(--s2)">Lot 3, V1 produit, 35 J/H</i>
<i style="width:23.5%;background:var(--s4);color:#3b2f00">Lot 4, clôture, 23 J/H</i>
</div>

<div class="grid grid-cols-3 gap-5 text-sm mt-8">
<div>

### Humaines

<div class="chips">
<div><span><b>1 personne</b></span><u>dev, archi, exploitation, pilotage</u></div>
<div><span>Commanditaire</span><u>formateur et jury, 4 échéances</u></div>
<div><span>Utilisateurs</span><u>17 comptes, retours et recette</u></div>
<div><span>Prestataires</span><u>hébergement, catalogue, e-mails</u></div>
</div>

</div>
<div>

### Matérielles et techniques

<div class="chips">
<div><span>Un poste de développement</span><u>environnement reproductible</u></div>
<div><span>Monorepo outillé</span><u>tests, analyse, formatage</u></div>
<div><span>Chaîne CI/CD</span><u>intégration et déploiement</u></div>
<div><span>Hébergement</span><u>sans serveur, CDN, base managée</u></div>
<div><span>Services tiers</span><u>catalogue, e-mails, supervision</u></div>
</div>

</div>
<div>

### Financières

<div class="kpi grid-cols-1">
<div><b>34 300 €</b><span>de valeur de développement HT, au taux journalier junior</span></div>
<div><b>&lt; 200 €/an</b><span>de trésorerie réelle, 0 € de licence</span></div>
</div>

</div>
</div>

<!--
DUREE 1:40. CRITERES : le planning est decoupe en phases, en taches ou LOTS ;
les ressources necessaires sont identifiees (ELEMENT IMPOSE 3).

La barre du haut : dire les quatre intitules et les quatre charges, et en une
phrase le contenu de chacun (MVP ; migration de l'API en ASP.NET Core ;
comptes, historique, partage, temps reel, theme, i18n ; cadrage, pilotage,
securite, accessibilite, recette, exploitation). Puis la methode d'estimation,
qui est ce qu'un jury de professionnels va reellement interroger : analogique,
par comparaison entre lots de complexite voisine, marge de 20 %, aucune
methode parametrique applicable faute d'historique comparable.

Annoncer des maintenant que l'ecart previsionnel / reel sera traite au chapitre 3.
Cela evite la question « et ca a tenu ? » posee trop tot, et cela montre que le
chiffrage a servi de reference de pilotage et pas seulement de piece a produire.

Dire soi-meme que les lots 1 et 2 sont chiffres apres coup : le Gantt le montre,
et les diapos 13 et 18 le redisent. Decouvert par le jury, c'est une
dissimulation ; annonce, c'est une limite assumee.

SI ON QUESTIONNE : « 20 % de marge, c'est beaucoup ou peu ? » C'est la marge
usuelle d'une estimation analogique sans historique. Sur les lots documentaires
elle s'est revelee insuffisante, c'est le point de vigilance 2.

= = =

Les ressources : trois familles, une phrase forte par famille, aucune lecture
de liste.

HUMAINES : une personne, et le dire sans detour. Les 98 J/H sont le chiffrage
du cadrage, pas une repartition entre profils. Les trois autres acteurs sont
reels : le commanditaire (le formateur, puis le jury) sur quatre echeances,
les 17 utilisateurs qui remontent des retours et font la recette, et les
prestataires qui executent l'hebergement, le catalogue et les e-mails.

MATERIELLES : ne pas enumerer. Dire « poste de travail, outillage, chaine de
livraison, hebergement, services tiers » et laisser lire.

FINANCIERES : le contraste entre 200 euros et 34 300 euros. L'absence de
licence payante conditionne la soutenabilite du service au-dela du titre.

SI ON QUESTIONNE le « 0 euro/mois » : l'hebergement du front est dans ses douze
mois offerts. La ligne suivante du budget est donc datee, pas hypothetique.
-->

---

# La matrice RACI, avec les acteurs réels

<div class="grid grid-cols-5 gap-5">
<div class="col-span-3">

<div class="raci" style="grid-template-columns: 1fr 3.4rem 5.6rem 5.2rem 5.2rem">
<div class="h"></div><div class="h">Moi</div><div class="h">Commanditaire</div><div class="h">Utilisateurs</div><div class="h">Prestataires</div>
<div class="l">Cadrage et périmètre de version</div><div class="A">A R</div><div class="C">C</div><div class="C">C</div><div class="n"></div>
<div class="l">Architecture et contrat d'API</div><div class="A">A R</div><div class="I">I</div><div class="n"></div><div class="n"></div>
<div class="l">Développement, interface et API</div><div class="A">A R</div><div class="n"></div><div class="I">I</div><div class="n"></div>
<div class="l">Revue, tests, intégration</div><div class="A">A R</div><div class="n"></div><div class="n"></div><div class="n"></div>
<div class="l"><b>Accessibilité et inclusion</b></div><div class="A">A R</div><div class="n"></div><div class="C">C</div><div class="n"></div>
<div class="l">Chaîne, supervision, sécurité</div><div class="A">A R</div><div class="n"></div><div class="I">I</div><div class="R">R</div>
<div class="l">Arbitrage de périmètre ou de charge</div><div class="A">A R</div><div class="C">C</div><div class="C">C</div><div class="n"></div>
<div class="l">Versions, recette, retours</div><div class="A">A R</div><div class="C">C</div><div class="C">C</div><div class="n"></div>
</div>

<div class="legend mt-2">
<span style="--c:var(--s1)">A approuve et rend compte</span>
<span style="--c:rgb(13 148 136 / 40%)">R réalise</span>
<span style="--c:rgb(13 148 136 / 14%)">C consulté</span>
<span style="--c:rgb(0 0 0 / 9%)">I informé</span>
</div>

</div>
<div class="col-span-2 text-sm">

<div class="chips">
<div><span><b>A et R</b>, toujours les miens</span><u>rien ne se partage à une personne</u></div>
<div><span><b>Consultés</b> : périmètre, arbitrages, versions</span><u>commanditaire, utilisateurs</u></div>
<div><span><b>Réalisé par un prestataire</b></span><u>hébergement, supervision</u></div>
<div><span><b>Handicap</b> : aucune personne concernée</span><u>porte d'accessibilité bloquante</u></div>
</div>

</div>
</div>

<!--
DUREE 1:00. CRITERE : les taches sont assignees selon les competences (RACI) ET
tiennent compte des personnes en situation de handicap. Le second point est un
critere a part entiere, pas une remarque.

Ne pas lire la matrice. Dire ce qu'elle montre : a une personne, les colonnes
A et R ne bougent pas, et l'information est dans les autres colonnes. Les
acteurs externes y figurent : le commanditaire consulte sur le perimetre et
les arbitrages, les utilisateurs consultes sur l'accessibilite et sur chaque
version, les prestataires qui executent l'hebergement et la supervision.

Sur le handicap, dire la verite en une phrase : personne en situation de
handicap sur le projet. Puis ce qui est verifiable : la porte d'accessibilite
bloquante, le contexte en texte structure. La ligne existe et elle a un
responsable, ce n'est pas une clause de style.

SI ON QUESTIONNE « une RACI a une personne, a quoi ca sert ? » : a rendre
visible qui est consulte et informe, et ce qu'un tiers execute. Le jour ou une
personne rejoint le projet, la matrice est deja ecrite, et la ligne « revue,
tests, integration » est celle qui changerait en premier.
-->

---

# Sept points de vigilance, un seul d'organisation

<div class="chips mt-6" style="font-size:0.9rem;gap:0.55rem 0">
<div><span><b style="color:#b45309">1.</b> <b>Concentration des rôles sur une personne</b></span><u style="color:#b45309">facteur de bus 1, tout est écrit et versionné</u></div>
<div><span><b>2.</b> Sous-estimation des lots documentaires</span><u>rétroplanning depuis les échéances</u></div>
<div><span><b>3.</b> Dépendance au catalogue de films externe</span><u>cache, débit limité, saisie manuelle</u></div>
<div><span><b>4.</b> Transport des e-mails transactionnels</span><u>volume surveillé, fournisseur substituable</u></div>
<div><span><b>5.</b> Durcissement de la politique de sécurité du contenu</span><u>réalisé en production, traité</u></div>
<div><span><b>6.</b> Absence de déploiement progressif</span><u>assumé, test de fumée bloquant</u></div>
<div><span><b>7.</b> Instabilité de la chaîne de vérification</span><u>contrôle rendu déterministe</u></div>
</div>

<!--
DUREE 1:00. CRITERE : les points de vigilance sont soulignes. Dernier critere de
C3.1, competence ELIMINATOIRE : le chapitre ne peut pas se terminer sans lui.

Ne pas lire les sept lignes. Deux temps :

1. « Six de ces points sont des risques de projet, chacun porte un indicateur
et une parade. » Citer le point 5 comme exemple, parce qu'il s'est REALISE en
production : un durcissement de la politique de securite du contenu a bloque les
affiches de films et les avatars. L'incident et sa correction sont traces. Un
point de vigilance qui s'est realise et qui a ete traite vaut mieux qu'une liste
theorique.

Le point 6, absence de deploiement progressif, est une faiblesse assumee. La dire
ici plutot que de la laisser decouvrir.

2. « Le point 1 est d'une autre nature. » L'indicateur vaut 1, et cette valeur
EST le probleme. La parade ne le supprime pas, elle le rend survivable : tout ce
qu'un remplacant recevrait le premier jour est ecrit et versionne.
-->

---

# 3. Piloter l'avancement : le suivi est dans GitHub

<div class="grid grid-cols-2 gap-8 text-sm mt-4">
<div>

<div class="kpi grid-cols-2">
<div><b>5</b><span>issues : anomalies, demandes entrantes</span></div>
<div><b>26 / 77</b><span>pull requests fusionnées : revue, intégration</span></div>
<div><b>449</b><span>exécutions de la chaîne : vérification, déploiement</span></div>
<div><b>10</b><span>releases : points de livraison datés</span></div>
<div><b>106</b><span>items de feuille de route, versionnés</span></div>
<div><b>0</b><span>saisie déclarative : la trace naît du geste</span></div>
</div>

</div>
<div>

<div class="chips">
<div><span>Flux continu, pas d'itération fixe</span><u>aucun sprint, les versions ont une date</u></div>
<div><span>Travail en cours limité à 1</span><u>une branche fonctionnelle à la fois</u></div>
<div><span>Priorisation permanente</span><u>feuilles de route réordonnées par commit</u></div>
<div><span>Sortie = déployé et vérifié</span><u>fusion → déploiement → test de fumée</u></div>
<div><span>Correctif prioritaire</span><u>anomalies étiquetées, hors flux</u></div>
</div>

</div>
</div>

<!--
DUREE 1:30. ELEMENT IMPOSE 4 : l'outil de suivi de projet.
CRITERE : l'outil est en adequation avec le projet ET avec la methodologie.

La phrase d'ouverture, a dire telle quelle : « un outil de suivi exterieur au
depot impose une double saisie, et la double saisie est la premiere chose
abandonnee sous pression sur un projet a une personne. Un indicateur abandonne
sous pression est un indicateur qui ment exactement au moment ou on en a
besoin. »

Puis la liste de droite, qui est celle que la grille demande : ligne par ligne,
la propriete de la methode et ce que l'outil fournit. Insister sur la premiere :
un outil a sprints aurait impose une cadence que l'alternance ne permet pas de
tenir, et aurait produit des indicateurs faux.

DIRE AUSSI LA LIMITE, avant qu'on la trouve : le tableau de flux consolide est
POSTERIEUR au travail qu'il represente. La matiere, elle, est datee au geste
pres, 833 commits, 77 pull requests, 449 executions, 10 releases, toutes
horodatees au moment ou elles se sont produites. Le tableau change la lisibilite
de cette matiere, il ne la cree pas.

SI ON QUESTIONNE : « pourquoi pas Jira ou Trello ? » La saisie declarative. Pas
« c'etait plus simple ».

A PREPARER : capture du tableau de flux GitHub Projects, a inserer a gauche si le
tableau est structure avant l'oral.

= = =

CRITERE : les indicateurs sont mesurables et quantifiables, et permettent de
suivre les DELAIS, les COUTS et l'AVANCEMENT.

La methode de selection se dit, rien n'est a l'ecran : un indicateur entre au
tableau de bord s'il est mesurable sans saisie, quantifiable, rattache a une
decision, et reproductible par un tiers depuis le depot public. Les valeurs
sont sur les deux diapos qui suivent, ne pas les anticiper ici.

Dire les quatre conditions en appuyant sur la TROISIEME : « un indicateur sans
decision associee est un ornement ». C'est la condition qui a fait le tri.

Puis annoncer les cinq axes, qui sont exactement les cinq que la grille demande ,
avancement, couts, delais, risques, ressources humaines, et dire qu'ils
arrivent sur les deux diapos suivantes, l'une pour l'avancement et les delais,
l'autre pour les couts, les risques et les ressources.

LE GESTE QUI COMPTE : citer les trois indicateurs ECARTES et pourquoi. Un
candidat qui dit ce qu'il n'a pas su mesurer est plus credible qu'un candidat
dont tous les voyants sont au vert. C'est trente secondes bien depensees.
-->

---

# Tableau de bord : avancement et délais

<div class="grid grid-cols-5 gap-5">
<div class="col-span-3">

<div class="text-xs opacity-75 mb-1">Commits intégrés sur la branche principale : <b>833</b></div>
<div class="cols" style="height:4.6rem">
<div><i style="height:0.4%"></i></div>
<div><i style="height:12%"></i></div>
<div><i style="height:32%"></i></div>
<div><em>150</em><i style="height:66%"></i></div>
<div><em>227</em><i style="height:100%"></i></div>
<div><i style="height:85%"></i></div>
<div><i style="height:56%"></i></div>
<div><i style="height:15%"></i></div>
</div>

<div class="text-xs opacity-75 mt-3 mb-1">Fusions sur la branche principale : <b>122</b></div>
<div class="cols" style="height:4.6rem">
<div><i class="b" style="height:0%"></i></div>
<div><i class="b" style="height:0%"></i></div>
<div><i class="b" style="height:2%"></i></div>
<div><em>6</em><i class="b" style="height:12%"></i></div>
<div><em>39</em><i class="b" style="height:75%"></i></div>
<div><em>52</em><i class="b" style="height:100%"></i></div>
<div><i class="b" style="height:35%"></i></div>
<div><i class="b" style="height:12%"></i></div>
</div>

<div class="xlab">
<div>fév.</div><div>mars</div><div>avril</div><div>mai</div><div>juin</div><div>juil.</div><div>août</div><div>sept.</div>
</div>

</div>
<div class="col-span-2 text-sm">

### Cadence de livraison

<div class="kpi grid-cols-2 mb-3">
<div><b>17 j</b><span>écart médian entre deux versions</span></div>
<div><b>4 / 4</b><span>échéances de restitution tenues, écart 0</span></div>
</div>

| Version | Date | Écart |
|---------|------|------:|
| 0.1.0 → 1.0.0 | 27/02 → 19/05 | **81 j** |
| 1.0.0 → 1.3.2 | mai → juillet | 6 à 19 j |
| 1.3.2 → 1.4.0 | 25/07 → 25/08 | 31 j |
| 1.4.0 → 1.4.1 | 25/08 → 04/09 | 10 j |
| 1.4.1 → 1.5.0 | 04/09 → 07/09 | 3 j |

</div>
</div>

<!--
DUREE 1:10. CRITERE : le tableau de bord integre l'avancement et le suivi des
delais.

Ne PAS commenter les huit mois un par un. Deux lectures, pas plus :

1. Le pic de fusions de juin, 6 puis 39, alors que les commits ne passent que
de 150 a 227. Ce qui a change c'est la pratique de decoupage, pas la production.
Le dire AVANT que le jury le remarque : c'est ce qui prouve qu'on lit ses propres
indicateurs au lieu de les afficher.

2. Les 81 jours entre le prototype et la V1. Seul intervalle anormal, il contient
la migration de l'API, et c'est lui qui a rendu l'arbitrage visible. Annoncer le
chapitre 4 ici.

Sur les echeances : ecart zero sur les quatre, et deux d'entre elles sont
HORODATEES dans le depot, passe finale du dossier Bloc 2 le 23/07, export PDF du
Bloc 4 le 21/08. Ce n'est pas de la discipline, c'est de la methode : le
retroplanning traite ces dates comme des fins de lot, et c'est le PERIMETRE de la
version qui absorbe la variation, jamais la date. La preuve : quand la capacite
s'est reduite en aout, c'est l'intervalle entre versions qui s'est allonge.

SI ON QUESTIONNE la decroissance d'aout et septembre : elle est voulue, le
perimetre produit se referme au profit des livrables de restitution du titre.
-->

---

# Tableau de bord : coûts, risques, ressources

<div class="grid grid-cols-3 gap-5 text-sm">
<div>

### Coûts, prévu / réel

| Poste | Prévu | Réel |
|-------|------:|-----:|
| Infrastructure | 1 à 5 €/mois | **0 €** |
| Trésorerie | 20 à 190 €/an | **≈ 10 €** |
| Valeur de dév. | 34 300 € | ≈ 30 800 € |

</div>
<div>

### Risques

<div class="chips">
<div><span>Vulnérabilités HIGH/CRITICAL</span><u style="color:var(--ok)">0 ✓</u></div>
<div><span>Couverture de tests</span><u style="color:var(--ok)">86,6 % ✓</u></div>
<div><span>Quality Gate</span><u style="color:var(--ok)">A/A/A ✓</u></div>
<div><span>Disponibilité</span><u style="color:var(--ok)">100 % ✓</u></div>
<div><span>Erreurs serveur</span><u style="color:var(--ok)">0,026 % ✓</u></div>
<div><span>Anomalies ouvertes</span><u style="color:var(--ok)">0 / 3 ✓</u></div>
<div><span>Stabilité de la chaîne</span><u style="color:#b45309">78 % ⚠ alerte</u></div>
<div><span>Facteur de bus</span><u style="color:#b45309">1 ⚠ alerte</u></div>
</div>

<div class="text-xs opacity-75 mt-2">Seuil de décision de la chaîne : <b>80 %</b>. En dessous, analyse des causes.</div>

</div>
<div>

### Stabilité de la chaîne

<div class="cols" style="height:6.2rem;position:relative">
<div style="position:absolute;left:0;right:0;bottom:80%;top:auto;height:0;flex:none;border-top:1px dashed #94a3b8;z-index:1"></div>
<div><em>52 %</em><i style="height:52%;background:#d97706"></i></div>
<div><em>94 %</em><i style="height:94%"></i></div>
<div><em>78 %</em><i style="height:78%;background:#d97706"></i></div>
<div><em>38 %</em><i style="height:38%;background:#d97706"></i></div>
</div>
<div class="xlab">
<div>juin<br><span class="opacity-60">48 exéc.</span></div>
<div>juil.<br><span class="opacity-60">99</span></div>
<div>août<br><span class="opacity-60">36</span></div>
<div>sept.<br><span class="opacity-60">8</span></div>
</div>

</div>
</div>

<div class="text-xs opacity-75 mt-4 mb-1">Ressources humaines</div>
<div class="kpi grid-cols-5">
<div><b>88 / 191</b><span>jours actifs</span></div>
<div><b>3,1</b><span>jours par semaine</span></div>
<div><b>1 à 7</b><span>amplitude hebdomadaire</span></div>
<div><b>10</b><span>jours consécutifs, série maximale</span></div>
<div><b>5</b><span>semaines à zéro</span></div>
</div>

<!--
DUREE 1:10. CRITERE : le tableau de bord integre le suivi des COUTS, des RISQUES
et des RESSOURCES HUMAINES. Les trois axes restants du critere sont ici.

COUTS, une phrase : le budget tient parce qu'il a ete concu pour tenir, avec une
contrepartie technique assumee, le demarrage a froid de 3,8 s. Puis le point de
pilotage : deux echeances de cout suivies alors qu'elles valent zero aujourd'hui.

RISQUES : ne pas parcourir la colonne. Aller aux DEUX voyants oranges. Le
premier, la stabilite de la chaine, est celui qui prouve la boucle mesure ->
decision -> effet remesure : 52 %, correction, 94 %. C'est l'histogramme de
droite, et c'est la seule chose a commenter de ce cote.

RH : c'est la transition vers le chapitre 5. La phrase a dire : « une semaine a
sept jours travailles suivie d'une semaine a zero tient sur sept mois de projet
etudiant, elle ne tient pas sur une exploitation dans la duree. »

SI ON QUESTIONNE : « votre chaine echoue une fois sur cinq. » Sur la fenetre
complete oui, 78 %. La serie mensuelle est plus parlante, et la valeur de
septembre porte sur huit executions.
-->

---

# L'écart n'est pas où on le cherche

<div class="grid grid-cols-2 gap-6">
<div>

<div class="text-sm mb-1">Charge : <b>98 J/H prévus</b> → <b>≈ 88 reconstitués</b>, soit <b>−10 %</b>, dans la marge de 20 %.</div>

<div class="text-xs opacity-75 mb-1">Où sont passés les 88 jours actifs</div>
<div class="stack">
<i style="width:26%;background:var(--s1)">23 j, 26 %</i>
<i style="width:74%;background:#d97706">65 j, 74 %</i>
</div>

<div class="text-xs opacity-75 mt-4 mb-1">D'où viennent les 74 items de périmètre livrés</div>
<div class="stack">
<i style="width:31%;background:var(--s1)">23 items</i>
<i style="width:69%;background:#d97706">51 items, 69 %</i>
</div>

<div class="legend mt-2">
<span style="--c:var(--s1)">Lots 1 à 3, chiffrés au cadrage</span>
<span style="color:#d97706">Après la V1 : V1.1 → V1.5.0, hors chiffrage, et la clôture du titre</span>
</div>

</div>
<div class="text-sm">

### Trois décisions prises à partir d'une mesure

| Mesure | Décision | Effet remesuré |
|--------|----------|----------------|
| 81 jours entre le prototype et la V1 | Arbitrer la migration de l'API | Retour à **une version tous les 17 jours** |
| Chaîne à 52 %, échecs sans cause réelle | Portes de qualité bloquantes **et** déterministes | **94 %** le mois suivant |
| 59 PR de dépendances pour 9 fusionnées | Regroupement mensuel, audit à chaque commit | **0 vulnérabilité** ouverte, sans fusion non relue |

</div>
</div>

<!--
DUREE 1:30. C'est la diapo qui prouve que le suivi a servi a DECIDER et pas
seulement a mesurer. Elle amene le chapitre 4.

Trois temps, sans lire les tableaux :

1. Les deux barres de gauche. « L'ecart de charge est de moins 10 %, dans la
marge. Ce n'est pas la bonne lecture. » Puis designer les barres orange : 74 % des
jours actifs sont posterieurs a la V1, et 69 % du produit final est HORS du
chiffrage initial. La derive n'etait pas une derive de charge, c'etait un
glissement de perimetre que rien ne mesurait.

2. Les trois decisions. C'est le coeur de la competence : chaque ligne est une
mesure, une decision, et un effet REMESURE ensuite. Ne pas en developper plus
d'une, la troisieme est la plus parlante : cinquante pull requests ouvertes puis
fermees sans fusion ne sont pas un gaspillage, c'est le symptome qu'un
automatisme etait mal regle. L'indicateur a servi a regler la frequence de
l'automatisme, pas a juger le travail.

3. L'autocritique, sans support : aucun indicateur ne comparait le perimetre
courant au perimetre chiffre, le glissement de 51 items n'a ete visible qu'a
posteriori, et c'est le premier compteur que j'ajouterais. Ne pas l'escamoter,
c'est elle qui rend les deux premiers temps credibles.

SI ON QUESTIONNE : « comment reconstituez-vous 88 J/H sans releve de temps ? »
Par les jours distincts portant au moins un commit, 1 jour actif pour 1 J/H,
incertitude d'au moins 20 %. La reconstitution est FAIBLE sur les cinq premieres
semaines, ou les commits etaient groupes, le premier commit du projet porte
3 400 lignes a lui seul. La charge reelle est vraisemblablement SUPERIEURE a 88.
Un indicateur ne mesure que la pratique qui le produit.
-->

---

# 4. Un cas d'arbitrage : migrer l'API, quand et comment

<div class="grid grid-cols-5 gap-5 text-sm">
<div class="col-span-3">

<div class="tl">
<div><b>16/03, 16:48</b><span><b>MVP terminé</b>, 944 lignes, 12 routes ; aucune migration à la feuille de route</span></div>
<div><b>18/03, 11:57</b><span>Décision exécutée, document d'aide à la décision versionné</span></div>
<div><b>18/03, 12:12</b><span>Ancienne API retirée, <b>15 min</b> après</span></div>
<div><b>19/03, 16:52</b><span>Migration terminée</span></div>
</div>

<div class="chips mt-4">
<div><span><b>A</b> Ne rien changer</span><u>0 J/H, 4 écarts qui s'accumulent 6 mois</u></div>
<div><span><b>B</b> Migrer maintenant, bascule en une fois</span><u><b>13 J/H</b>, contrat du front à préserver</u></div>
<div><span><b>C</b> Migrer après la V1</span><u>périmètre multiplié, utilisateurs en production</u></div>
<div><span><b>D</b> Deux API en parallèle</span><u>double maintenance, à effectif 1</u></div>
</div>

<div class="kpi grid-cols-5 mt-4">
<div><b>1 → 47</b><span>944 lignes à réécrire le 18/03, 44 663 aujourd'hui</span></div>
<div><b>12</b><span>routes réécrites à l'identique</span></div>
<div><b>19/05</b><span>v1.0.0 à la date prévue</span></div>
<div><b>0</b><span>retour arrière, 9 versions depuis</span></div>
<div><b>87</b><span>lignes de front modifiées, objectif : 0</span></div>
</div>

</div>
<div class="col-span-2">

<div class="flow">
<div class="row"><div class="q">Contrat d'interface<br>intégralement préservable ?</div><div class="r no">REFUS</div></div>
<div class="arrow">↓ oui &nbsp;/&nbsp; non →</div>
<div class="row"><div class="q">Périmètre à réécrire<br>connu et figé <i>maintenant</i> ?</div><div class="r">DIFFÉRER</div></div>
<div class="arrow">↓ oui &nbsp;/&nbsp; non →</div>
<div class="row"><div class="q">Le coût de la décision<br>croît-il avec le temps ?</div><div class="r">DIFFÉRER</div></div>
<div class="arrow">↓ oui &nbsp;/&nbsp; non →</div>
<div class="row"><div class="q">Charge soutenable<br>par l'effectif <i>réel</i> ?</div><div class="r">RÉDUIRE</div></div>
<div class="arrow">↓ oui &nbsp;/&nbsp; non →</div>
<div class="row"><div class="q">Critère de bascule<br>mesurable définissable ?</div><div class="r no">REFUS</div></div>
<div class="arrow">↓ oui</div>
<div class="r go">DÉCIDER MAINTENANT, bascule en une fois</div>
<div class="arrow">↓</div>
<div class="row"><div class="q">Parité vérifiée<br>sur tout le contrat ?</div><div class="r">RETOUR<br>ARRIÈRE</div></div>
<div class="arrow">↓ oui</div>
<div class="r go">BASCULE, retrait de l'ancien socle</div>
</div>

</div>
</div>

<!--
DUREE 2:20. ELEMENT IMPOSE 5.
CRITERE : la problematique qui necessite un arbitrage est exposee AVEC SES
CONSEQUENCES.

Ouvrir par la phrase qui desamorce la question piege : « le MVP a ete livre sur
une pile que je ne voulais pas garder pour la suite. L'etude comparative du
Bloc 1 retient .NET, mais elle a ete formalisee en juin : elle consigne la
decision finale, pas la chronologie. La verite est celle de l'historique. »

Puis la premiere case de la frise : la migration est ABSENTE de la feuille de
route quand le MVP est declare termine, et ajoutee deux jours plus tard. C'est
ce qui fait de ce cas un arbitrage. Les quatre exigences que l'API du MVP ne
tenait pas se disent : typage arrete a la compilation, securite fournie par le
cadre, socle a support long terme, architecture en couches.

Designer le rapport de 1 a 47, que le jury retiendra. Preciser AUSSITOT que
ce chiffre est la justification A POSTERIORI, pas l'argument d'origine : le 18
mars on savait que le cout croitrait, pas de combien. C'est la nature meme d'un
arbitrage, decider avec l'information disponible pendant que la fenetre est
ouverte.

Sur la troisieme exigence, si on la conteste : la charge de veille de
l'ecosysteme npm s'est verifiee ensuite, 59 des 77 pull requests du projet sont
des montees de dependances, mais c'etait une ANTICIPATION en mars, pas une
mesure.

= = =

CRITERES : les options sont DETAILLEES,
la decision est argumentee ET permet de resoudre la problematique. La grille
nomme explicitement le LOGIGRAMME : il doit etre a l'ecran ET commente.

Trois temps : les quatre options en une phrase chacune, le logigramme parcouru
du doigt sur le chemin du 18 mars, puis les chiffres du resultat, dont les
87 lignes, qui distinguent un bilan d'un plaidoyer.

CRITERE : les differentes options possibles sont DETAILLEES. La grille nomme
explicitement le LOGIGRAMME comme outil d'aide a la decision : il doit etre a
l'ecran ET COMMENTE, pas seulement affiche.

Les quatre options, une phrase chacune, sans les lire. Le temps utile va a
l'option D, la plus contre-intuitive : elle parait la plus prudente et ne l'est
pas, a effectif 1 la double maintenance s'ajoute au lieu de se repartir, et la
question 4 du logigramme l'ecarte.

Puis PARCOURIR le logigramme a voix haute sur le chemin reellement suivi le 18
mars, en descendant du doigt : contrat preservable OUI, grace au contrat OpenAPI
de l'API Node, perimetre fige OUI, le MVP venait d'etre declare termine, cout
croissant OUI, charge soutenable OUI, 13 J/H pour un executant, critere de
bascule definissable OUI, la parite sur les 12 routes. Donc DECIDER MAINTENANT.

Insister sur la DERNIERE branche : parite non verifiee = retour arriere, l'ancien
socle restant deployable. C'est ce qui rendait la decision reversible, et c'est
ce qui distingue un arbitrage d'un pari.

Dire aussi qu'il est REUTILISABLE : aucune techno n'y figure. Un jury de
professionnels reconnait tout de suite un outil de decision d'un schema
decoratif.

= = =

CRITERE : la decision d'arbitrage est argumentee ET permet de resoudre la
problematique. Les deux moities comptent.

Deux arguments seulement pour la decision, ils sont a l'ecran : la fenetre qui
se referme, et le cout non nul de l'option A. Ne pas les relire.

Puis le resultat en un seul geste : « aucun retour arriere, neuf versions
livrees sur ce socle depuis, a la date prevue ». Le critere de succes avait ete
defini avant : le front ne change pas, parce que les URL et le format JSON ne
changent pas.

Le chiffre 87 est OBLIGATOIRE, ne pas le sauter par manque de temps : « aucune
modification du front » annoncee, 87 lignes sur 9 fichiers en realite, et le
lot chiffre 13 J/H a posteriori. C'est ce qui distingue un bilan d'un
plaidoyer, et l'aveu sur le chiffrage enchaine avec le chapitre 2.

CONCLUSION DU CHAPITRE, phrase a dire telle quelle : « le document d'aide a la
decision annoncait que C# serait plus verbeux. 944 lignes TypeScript sont
devenues 4 653 lignes C#, un facteur 4,9. L'inconvenient annonce s'est realise,
il avait ete accepte en connaissance de cause. Un arbitrage dont on peut verifier
apres coup que les inconvenients annonces etaient les bons est un arbitrage
instruit. »
-->

---

# 5. Une personne, toutes les missions

<div class="grid grid-cols-5 gap-6 text-sm">
<div class="col-span-3">

<div class="text-xs opacity-75 mb-1">Les 833 commits par mission, mois par mois</div>
<div class="cols stacked" style="height:7rem">
<div><em>1</em><i style="height:100%;background:var(--s1)"></i></div>
<div><em>28</em><i style="height:14%;background:var(--s4)"></i><i style="height:72%;background:var(--s3)"></i><i style="height:14%;background:var(--s1)"></i></div>
<div><em>72</em><i style="height:13%;background:var(--s2)"></i><i style="height:8%;background:var(--s4)"></i><i style="height:35%;background:var(--s3)"></i><i style="height:44%;background:var(--s1)"></i></div>
<div><em>150</em><i style="height:4%;background:var(--s2)"></i><i style="height:13%;background:var(--s4)"></i><i style="height:50%;background:var(--s3)"></i><i style="height:33%;background:var(--s1)"></i></div>
<div><em>227</em><i style="height:8%;background:var(--s2)"></i><i style="height:9%;background:var(--s4)"></i><i style="height:64%;background:var(--s3)"></i><i style="height:19%;background:var(--s1)"></i></div>
<div><em>194</em><i style="height:21%;background:var(--s2)"></i><i style="height:17%;background:var(--s4)"></i><i style="height:50%;background:var(--s3)"></i><i style="height:12%;background:var(--s1)"></i></div>
<div><em>127</em><i style="height:15%;background:var(--s2)"></i><i style="height:13%;background:var(--s4)"></i><i style="height:43%;background:var(--s3)"></i><i style="height:29%;background:var(--s1)"></i></div>
<div><em>34</em><i style="height:9%;background:var(--s2)"></i><i style="height:24%;background:var(--s4)"></i><i style="height:35%;background:var(--s3)"></i><i style="height:32%;background:var(--s1)"></i></div>
</div>
<div class="xlab">
<div>fév.</div><div>mars</div><div>avril</div><div>mai</div><div>juin</div><div>juil.</div><div>août</div><div>sept.</div>
</div>

<div class="legend mt-2">
<span style="--c:var(--s1)">Produit, 24 %</span>
<span style="--c:var(--s3)">Fiabilité : correctifs, tests, refactorisations, 51 %</span>
<span style="--c:var(--s4)">Chaîne, dépendances, exploitation, 13 %</span>
<span style="--c:var(--s2)">Documentation, pilotage, 12 %</span>
</div>

</div>
<div class="col-span-2">

<div class="text-xs opacity-75 mb-1">À la main</div>
<div class="chips">
<div><span>Cadrage et maquette</span><u>avant toute ligne de code</u></div>
<div><span>Arbitrages</span><u>périmètre, charge, socle</u></div>
<div><span>Revue avant intégration</span><u>gabarit à 6 contrôles</u></div>
<div><span>Mise en production, incidents</span><u>geste vérifié</u></div>
<div><span>Restitutions</span><u>commanditaire, utilisateurs</u></div>
</div>

<div class="text-xs opacity-75 mt-3 mb-1">Confié à la chaîne</div>
<div class="chips">
<div><span>Tests, analyse, scans</span><u>portes bloquantes</u></div>
<div><span>Déploiement et test de fumée</span><u>à chaque fusion</u></div>
<div><span>Montées de dépendances</span><u>Dependabot, regroupées</u></div>
<div><span>Alertes de supervision</span><u>5 politiques, 3 sondes</u></div>
</div>

</div>
</div>

<!--
DUREE 0:50. ELEMENT IMPOSE 6 : l'affectation des missions realisee au cours du
projet. CRITERE : la charge est repartie de maniere equilibree sur l'ensemble
de l'equipe.

Dire d'abord ce que le critere ne peut pas mesurer ici : il n'y a pas
d'equipe, donc pas de repartition entre personnes. Une personne porte toutes
les missions ; ce qui se mesure, c'est comment elles se sont reparties dans le
temps, et ce qui a ete confie a la chaine.

Le graphique se lit en trois points, sans le detailler : mars est presque
entierement de la fiabilisation, c'est la migration de l'API ; en juin, le mois
de la V1 consolidee, deux commits sur trois sont des correctifs et des tests ;
juillet est le seul mois ou la documentation depasse 20 %, autour des deux
remises de dossier. Sur le projet entier, un commit sur deux est de la
fiabilite : le produit se paie en correctifs et en tests, pas en
fonctionnalites.

La colonne de droite est la seule affectation reelle : ce qui reste a la main,
cadrer, arbitrer, relire, mettre en production, rendre compte ; et ce qui est
confie a la chaine, tout ce qu'une machine verifie mieux qu'un humain fatigue.

La reponse honnete au critere « charge repartie » : elle ne l'est pas entre
personnes, et elle ne l'a pas ete dans le temps non plus. Une semaine a sept
jours suivie d'une semaine a zero, c'est la derniere diapo du chapitre.

SI ON QUESTIONNE la classification : par le prefixe des messages de commit
(feat, fix, test, ci, docs...), et par mots-cles pour les 184 messages sans
prefixe, surtout ceux de mars et d'avril. Recalculable depuis le depot.
-->

---

# Les quatre styles managériaux, situés

<div class="grid grid-cols-5 gap-5 mt-8">
<div class="col-span-3">

<div class="quad">
<div class="ay">Soutien relationnel →</div>
<div class="cell"><b>Persuasif</b><i>Les conventions du dépôt : chaque règle est accompagnée de <b>son motif</b></i></div>
<div class="cell"><b>Participatif</b><i>Les utilisateurs : questionnaire, fiches ouvertes, retours intégrés à la feuille de route</i></div>
<div class="cell"><b>Directif</b><i>Juillet : portes de qualité rendues <b>bloquantes</b> sur une chaîne à 52 %, sans dérogation</i></div>
<div class="cell dom"><b>Délégatif, dominant</b><i>À l'automatisation : ce qu'une machine vérifie n'est jamais contrôlé à la main, <b>la décision reste humaine</b></i></div>
<div></div><div class="ax">← directivité forte</div><div class="ax">autonomie forte →</div>
</div>

</div>
<div class="col-span-2 text-sm">

<div class="kpi grid-cols-1">
<div><b>52 → 94 %</b><span>stabilité de la chaîne, le mois qui suit la décision directive</span></div>
<div><b>3</b><span>canaux entrants outillés : questionnaire, fiches, lien « signaler un problème »</span></div>
<div><b>14</b><span>contrôles automatisés bloquants avant qu'une version existe</span></div>
</div>

</div>
</div>

<!--
DUREE 0:55. ELEMENT IMPOSE 7 : le ou les styles manageriaux utilises.
CRITERE : le style est IDENTIFIE ET DECRIT.

Ne pas definir les quatre styles, le jury les connait. Les SITUER : une situation
du projet par style, et le motif du choix.

Le style a developper est le DIRECTIF, parce que c'est le seul ou la decision est
verifiable : juillet, chaine a 52 %, portes rendues bloquantes, 94 % le mois
suivant. Un style manageral qui produit un indicateur mesurable est plus
convaincant qu'une declaration d'intention.

Puis annoncer le dominant, le delegatif a l'automatisation : tout ce qu'une
machine verifie, tests, analyse, scans, deploiement, test de fumee, n'est
jamais controle a la main, et la decision reste humaine. Sa CONDITION DE
VALIDITE est la phrase qui compte : « un delegatif sans regle ecrite n'est pas
de la delegation, c'est de l'abandon. »

Sur les principes que la grille nomme, empathie, ecoute, bienveillance,
leadership, chacun est incarne dans un dispositif, pas dans une intention :
l'ecoute par trois canaux entrants outilles, la bienveillance par un gabarit
d'anomalie qui decrit un comportement et jamais une responsabilite, l'empathie
par le delai de reponse aux retours, 17 jours du questionnaire a la production, le leadership par la decision ecrite avec ses
inconvenients acceptes.

SI ON QUESTIONNE : « delegue a qui ? » A la chaine, pas a une personne : la
diapo 14 le montre, colonne de droite. A une personne, le management s'exerce
sur le processus et sur soi-meme, et c'est dit sans detour.
-->

---

# Animer, partager, inclure : écrit, versionné, asynchrone

<div class="grid grid-cols-2 gap-6 text-sm mt-2">
<div>

<div class="steps">
<div><b>Utilisateurs</b><span>fenêtre de nouveautés, questionnaire, lien « signaler un problème »</span></div>
<div><b>Commanditaire</b><span>quatre restitutions datées, comptes rendus d'arbitrage</span></div>
<div><b>Contributeur à venir</b><span>conventions écrites avec leur motif, gabarits, procédures</span></div>
</div>

<div class="text-xs opacity-75 mt-4 mb-1">Les outils, et ce que chacun partage</div>
<div class="chips">
<div><span>Monorepo unique</span><u>tout le contexte projet, versionné</u></div>
<div><span>Gabarits d'issue et de PR</span><u>les mêmes contrôles à chaque changement</u></div>
<div><span>Procédures exécutables</span><u>le flux, pas un savoir oral</u></div>
<div><span>Journal des versions, feuilles de route</span><u>l'état livré et le périmètre, datés</u></div>
</div>

</div>
<div>

<div class="chips">
<div><span><b>Handicap</b></span><u>texte structuré, lecteur d'écran, clavier</u></div>
<div><span><b>Fuseaux horaires</b></span><u>rien n'exige la simultanéité</u></div>
<div><span><b>Langue</b></span><u>lisible et traduisible, une réunion ne l'est pas</u></div>
</div>

<div class="kpi grid-cols-2 mt-4">
<div><b>FR / EN</b><span>produit bilingue</span></div>
<div><b>Bloquante</b><span>la porte d'accessibilité, à chaque livraison</span></div>
</div>

</div>
</div>

<!--
DUREE 0:50. ELEMENT IMPOSE 8 : les outils de communication et leurs objectifs.
CRITERES : les outils collaboratifs INTEGRENT LE PARTAGE DE RESSOURCES et les
choix sont pertinents ; les specificites du handicap et du contexte
multiculturel et international sont prises en compte.

Gauche : les trois publics et ce que chacun recoit, puis les outils et ce que
chacun partage. Droite : les trois contraintes servies par la MEME propriete,
l'ecrit asynchrone, puis les deux preuves sur le produit.

CRITERE : les outils collaboratifs INTEGRENT LE PARTAGE DE RESSOURCES, et les
choix sont pertinents au regard de l'objectif poursuivi.

Colonne de gauche : etre franc. Il n'y a pas d'equipe a animer ; il y a trois
publics a servir, les utilisateurs, le commanditaire, et la personne qui
reprendra le projet un jour. Tout ce qu'ils recoivent est ecrit et versionne,
et c'est ce qui rend le dispositif independant de ma presence : une regle non
ecrite n'est pas une regle.

Les quatre lignes « ce qu'il partage » SONT la reponse au critere, les designer
d'un geste. La vraie justification du choix d'outils : aucun n'exige la
simultaneite, c'est ce qui les rend compatibles avec la colonne de droite.

= = =

Colonne de droite, une seule idee : le meme dispositif, l'ecrit
asynchrone versionne, repond au handicap, aux fuseaux horaires et a la langue.

Puis la verite en une phrase, personne dans ces situations sur le projet, et
la preuve qui reste : l'accessibilite du produit est une porte BLOQUANTE, pas
une intention. Si on demande ce que je ferais pour une personne en situation
de handicap qui rejoindrait le projet : poste adapte, outillage compatible
lecteur d'ecran et clavier, horaires amenages, temps supplementaire en recette
et en formation, accordes a la demande et sans justification a produire.

Fermer sur le produit : bilingue, accessibilite en porte bloquante ; livrer un
produit inaccessible et se dire inclusif ne tient pas. Puis enchainer : la
diapo suivante est celle qui compte pour ce chapitre.
-->

---

# Analyse critique : une posture qui a réussi

<div class="grid grid-cols-2 gap-8 text-sm mt-2">
<div>

<div class="chips">
<div><span>Fait mesuré</span><u><b>10 jours travaillés consécutifs</b>, 17 au 26 août</u></div>
<div><span>Cause</span><u>Bloc 4 le <b>21/08</b>, v1.4.0 le <b>25/08</b></u></div>
<div><span>Posture</span><u><b>absorber</b>, sans arbitrer le périmètre</u></div>
<div><span>Résultat</span><u>les deux échéances tenues</u></div>
</div>

<div class="text-xs opacity-75 mt-4 mb-1">Ce que la chaîne a payé, le mois même et après</div>
<div class="chips">
<div><span>Stabilité de la chaîne, juillet → août → septembre</span><u>94 % → 78 % → 38 %</u></div>
<div><span>Commits par branche avant intégration, juillet → août</span><u>2,7 → 6,1</u></div>
</div>

</div>
<div>

### Trois recommandations

<div class="chips">
<div><span><b>1.</b> Un chevauchement d'échéances est un <b>arbitrage</b> : décaler, réduire ou absorber, et l'écrire</span><u>décisions écrites</u></div>
<div><span><b>2.</b> Une <b>limite de charge</b> : au-delà de <b>5 jours consécutifs</b>, la version décale</span><u>série maximale</u></div>
<div><span><b>3.</b> <b>Relecture par un tiers</b>, humain ou outillé, sur le structurant</span><u>part du structurant relu</u></div>
</div>

</div>
</div>

<!--
DUREE 0:55. LA DIAPO LA PLUS DISCRIMINANTE DU CHAPITRE.
CRITERES : une analyse critique d'une situation ou d'une posture manageriale est
presentee, ET les recommandations sont realistes et realisables.

Un jury de professionnels distingue immediatement une autocritique sincere d'une
autocritique de facade. Le marqueur de sincerite ici est que la posture critiquee
a REUSSI : les deux echeances ont ete tenues. Personne ne s'autocritique sur un
succes, donc c'est credible.

La these se dit, elle n'est pas a l'ecran : la posture a reussi, et c'est
exactement le probleme. Une posture qui produit le resultat attendu ne
s'auto-corrige pas, elle se repete. Transposee a une equipe, elle porterait un nom :
demander un effort exceptionnel plutot qu'arbitrer le perimetre. Elle
fonctionne une fois ; a la deuxieme, elle devient la norme.

Dans l'ordre :
1. Les faits. Dix jours d'affilee, deux echeances superposees, les deux tenues.
2. Le cout mesure, en designant la ligne 94, 78, 38. La chaine a paye le
mois meme, et la dette a ete deplacee, pas absorbee.
3. La phrase centrale : « l'arbitrage n'a pas ete perdu, il n'a pas ete pose. »
4. La transposition, si le projet passait en equipe : demander un effort
exceptionnel plutot qu'arbitrer
le perimetre. Ca marche une fois ; a la deuxieme c'est la norme, et le
responsable qui l'a instauree n'a plus d'argument pour la refuser.

NE PAS tomber dans la flagellation : les deux echeances etaient reelles et non
negociables, et le perimetre de la 1.4.0 avait une valeur produit verifiee. La
faute n'est pas d'avoir travaille dix jours, c'est de ne pas avoir INSTRUIT
l'option de decaler.

Terminer sur la recommandation 2 en disant qu'elle est la plus difficile a tenir.
-->

---

# 6. Les compétences : moi, avant et après le projet

<div class="text-xs opacity-80 mb-1">
<b>0</b> non acquis ; <b>1</b> lit et modifie accompagné ; <b>2</b> autonome sur une tâche courante ; <b>3</b> conçoit, arbitre, traite le cas non nominal ; <b>4</b> définit le standard et forme.
</div>

<div class="grid grid-cols-5 gap-5 mt-3">
<div class="col-span-3">

<div class="dumb">
<div class="lbl"></div><div class="scale"><span>0</span><span>1</span><span>2</span><span>3</span><span>4</span></div>
<div class="lbl">Architecture applicative</div><div class="track"><i class="bar" style="left:50%;width:25%"></i><u class="a" style="left:50%"></u><u class="c" style="left:75%"></u></div>
<div class="lbl">Arbitrage, chiffrage</div><div class="track"><u class="a" style="left:50%"></u><u class="c" style="left:50%"></u><u class="t" style="left:100%"></u></div>
<div class="lbl">Revue, transmission</div><div class="track"><i class="bar" style="left:25%;width:25%"></i><u class="a" style="left:25%"></u><u class="c" style="left:50%"></u><u class="t" style="left:100%"></u></div>
<div class="lbl">React, TypeScript</div><div class="track"><u class="a" style="left:75%"></u><u class="c" style="left:75%"></u></div>
<div class="lbl">Accessibilité</div><div class="track"><i class="bar big" style="left:25%;width:50%"></i><u class="a" style="left:25%"></u><u class="c" style="left:75%"></u></div>
<div class="lbl">App installable, i18n</div><div class="track"><i class="bar" style="left:25%;width:25%"></i><u class="a" style="left:25%"></u><u class="c" style="left:50%"></u></div>
<div class="lbl">C#, ASP.NET Core</div><div class="track"><i class="bar" style="left:50%;width:25%"></i><u class="a" style="left:50%"></u><u class="c" style="left:75%"></u></div>
<div class="lbl">Architecture hexagonale</div><div class="track"><i class="bar big" style="left:25%;width:50%"></i><u class="a" style="left:25%"></u><u class="c" style="left:75%"></u></div>
<div class="lbl">Sécurité, identité</div><div class="track"><i class="bar big" style="left:25%;width:50%"></i><u class="a" style="left:25%"></u><u class="c" style="left:75%"></u></div>
<div class="lbl">CI/CD, conteneurs</div><div class="track"><i class="bar" style="left:50%;width:25%"></i><u class="a" style="left:50%"></u><u class="c" style="left:75%"></u></div>
<div class="lbl">Supervision, exploitation</div><div class="track"><i class="bar big" style="left:25%;width:50%"></i><u class="a" style="left:25%"></u><u class="c" style="left:75%"></u></div>
<div class="lbl">Veille de vulnérabilités</div><div class="track"><i class="bar big" style="left:25%;width:50%"></i><u class="a" style="left:25%"></u><u class="c" style="left:75%"></u></div>
</div>

<div class="legend mt-1">
<span style="color:#a7b0ae">Février 2026</span>
<span style="--c:var(--s1)">Septembre 2026</span>
<span class="nokey" style="opacity:.8">cercle orange : niveau exigé, non atteint</span>
</div>

</div>
<div class="col-span-2 text-sm">

<div class="text-xs opacity-75 mb-1">Ordre d'apparition dans le dépôt</div>
<div class="tl">
<div><b>1. Produire</b><span>16 → 19 mars<br>C#, hexagonal, CI, OpenAPI</span></div>
<div><b>2. Fiabiliser</b><span>avril à mai<br>Performance, a11y, scans, i18n, push</span></div>
<div><b>3. Exploiter</b><span>juillet<br>Supervision, sondes, alertes</span></div>
<div><b>4. Enrichir</b><span>août<br>Identité fédérée, service tiers</span></div>
</div>

<div class="kpi grid-cols-2 mt-5">
<div><b>9</b><span>écarts comblés par autoformation, en production, sans plan ni budget</span></div>
<div><b>2</b><span>écarts restants, non techniques : arbitrage et chiffrage, revue et transmission</span></div>
</div>

</div>
</div>

<!--
DUREE 1:50. ELEMENT IMPOSE 9 : l'evaluation des besoins en competences via une
grille. CRITERE : la grille des competences actuelles et a acquerir est
COMMENTEE. Le mot est « commentee » : afficher ne suffit pas.

Convention a enoncer avant le graphique : c'est une auto-evaluation, et elle
est etalonnee sur des preuves. Chaque ligne correspond a une technologie
presente dans le depot, avec une date d'introduction et ce qui a ete livre
avec. Le point gris est fevrier 2026, le point vert septembre, le cercle
orange le niveau que le projet exige quand il n'est pas atteint.

Puis COMMENTER, en designant le graphique :
1. Les traits epais sont les competences de contexte : hexagonal,
accessibilite, securite, supervision, veille. Elles ont ete franchies par
autoformation, en production. La vague 1 a coute quatre jours (la frise
de droite).
2. Les deux lignes sans progression suffisante ne sont pas techniques :
arbitrage et chiffrage, revue et transmission. Ce sont exactement les
faiblesses montrees aux chapitres 3, 4 et 5. C'est ce qui rend la grille
credible plutot que flatteuse.
3. Le 3 est le seuil de responsabilite. Sur un projet a une personne, il
faut y etre partout ou l'on porte le R, et c'est le cas sur le technique.

SI ON QUESTIONNE l'auto-evaluation : elle est verifiable ligne par ligne dans
le depot, et elle avoue deux ecarts. Une grille flatteuse n'en avouerait
aucun.

= = =

CRITERE : les competences a mobiliser dans le cadre du projet sont
IDENTIFIEES. Ce sont les douze lignes de la grille.

Dire la METHODE, qui est ce qui distingue ce chapitre d'un catalogue : les
competences sont deduites des lots, et chacune correspond a une techno
reellement presente dans le depot, avec une date d'introduction verifiable.

Puis la frise de droite, dans l'ordre : produire, fiabiliser, exploiter, enrichir. Cet
ordre n'a rien d'aleatoire, c'est celui d'un produit qui va en production.

Le lien avec les chapitres 2 et 4, a dire : la vague 1 tient sur quatre jours
et n'est dans aucune ligne du chiffrage. C'est la justification meme de
l'existence d'un plan de developpement des competences.

SI ON QUESTIONNE : « quatre jours pour changer de socle, c'est peu. » Le
perimetre etait de 944 lignes et 12 routes, avec un contrat deja specifie. Et la
reconstitution de charge est faible sur mars, voir diapo 12.
-->

---

# Le plan de développement : ce qui reste à acquérir

<div class="grid grid-cols-5 gap-5">
<div class="col-span-3">

<div class="bars">
<div class="p1"><span>P1 Arbitrage, chiffrage</span><div class="t"><i style="width:27%">3 j</i><em>formation courte, puis pratique à chaque version. Chiffrage <b>avant</b>, arbitrage consigné <b>quand il est pris</b></em></div></div>
<div class="p1"><span>P1 Revue, transmission</span><div class="t"><i class="cont" style="width:14%">continu</i><em>revue par un tiers, humain ou outillé, obligatoire sur le structurant. 100 % du structurant relu</em></div></div>
<div><span>P2 Sécurité applicative</span><div class="t"><i style="width:36%">4 j</i><em>autoformation OWASP, revue outillée. Aucune vulnérabilité sur un trimestre</em></div></div>
<div><span>P2 Accessibilité</span><div class="t"><i style="width:27%">3 j</i><em>certification externe. Une livraison passe la porte <b>sans reprise</b></em></div></div>
<div class="p3"><span>P3 Management d'équipe</span><div class="t"><i style="width:18%">2 j</i><em>formation courte, utile le jour où le projet passe en équipe. Un contributeur opérationnel en une journée sur le cadre écrit</em></div></div>
</div>

<div class="legend mt-2">
<span style="--c:#d97706">P1, a déjà coûté au projet</span>
<span style="--c:var(--s1)">P2, consolide un acquis</span>
<span style="--c:var(--s3)">P3, prépare la suite</span>
</div>

<div class="text-xs opacity-75 mt-2">12 jours. Un seul poste payant, la certification d'accessibilité.</div>

</div>
<div class="col-span-2 text-sm">

<div class="text-xs opacity-75 mb-1">Recrutement, si le projet passait en équipe</div>
<div class="chips">
<div><span>Développeur front</span><u>niveau 3 en accessibilité</u></div>
<div><span>Profil DevOps</span><u>à mi-temps</u></div>
</div>

<div class="text-xs opacity-75 mt-4 mb-1">Modalités de formation, posées par défaut</div>
<div class="chips">
<div><span>Tiers-temps de droit</span><u>formation et évaluation</u></div>
<div><span>Support en texte structuré</span><u>lecteur d'écran</u></div>
<div><span>Matériel adapté</span><u>pendant la formation</u></div>
<div><span>Plateforme accessible</span><u>critère de choix du prestataire</u></div>
</div>

</div>
</div>

<!--
DUREE 0:50. ELEMENT IMPOSE 10 : le plan de developpement des competences.
CRITERES : le plan est etabli et DETAILLE, des FORMATIONS sont preconisees
selon les besoins du projet et le profil, et les MODALITES sont adaptees au
handicap. Et le besoin en recrutement est transmis aux RH.

Trois choses, une par bloc :

1. Le principe d'ordonnancement, par cout d'un ecart non comble. Les deux
priorites 1 ont deja coute : un chiffrage formalise apres coup, 87 lignes
integrees sans revue, dix jours d'aout sans arbitrage. Elles passent avant
tout ce qui est technique, parce que le technique a ete acquis sur le projet.

2. L'indicateur en fin de chaque ligne. C'est elle qui distingue un plan
d'une liste de voeux : chaque action se termine par un fait verifiable, pas
par une attestation de presence.

3. Le recrutement, colonne de droite : je ne recruterais pas aujourd'hui, mais la question est
instruite. Deux profils, et ce qu'ils recevraient le premier jour existe deja.

Sur le handicap, ne citer que les modalites qui ont un cout reel, donc
verifiables : le tiers-temps de droit, le support en texte structure,
l'accessibilite de la plateforme comme critere de choix du prestataire.
-->

---

# 7. Rendre compte : les points de validation

<div class="chips mb-4" style="font-size:0.8rem;max-width:44rem">
<div><span><b>Jury</b>, valide la conformité au référentiel</span><u>à chaque bloc du titre</u></div>
<div><span><b>Utilisateurs</b>, valident que ce qui est livré sert</span><u>à chaque version</u></div>
</div>

<div class="tl mt-3">
<div><b>0.1.0</b><span>27/02<br>Parcours minimal</span></div>
<div><b>1.0.0</b><span>19/05<br>Compte réel</span></div>
<div><b>1.1.0</b><span>25/05<br>Installe et notifie</span></div>
<div><b>1.2.0</b><span>11/06<br>Social, RGPD</span></div>
<div><b>1.3.0</b><span>19/06<br>Navigation</span></div>
<div><b>1.3.1</b><span>08/07<br>Chaîne, sécurité</span></div>
<div><b>1.3.2</b><span>25/07<br>Observable</span></div>
<div><b>1.4.0</b><span>25/08<br>Au-delà de la soirée</span></div>
<div><b>1.4.1</b><span>04/09<br>Sans compte</span></div>
<div><b>1.5.0</b><span>07/09<br>Explorer</span></div>
</div>

<div class="grid grid-cols-2 gap-6 mt-5 text-sm">
<div>

| | Contrôle bloquant |
|--|-------------------|
| Avant | Tests, lint, couverture minimale |
| Avant | Analyse statique, porte de qualité |
| Avant | E2E, performance, **accessibilité** |
| Avant | Scan de vulnérabilités et de secrets |
| Après | **Test de fumée** : joignabilité réelle de la base |

</div>
<div>

<div class="kpi grid-cols-2">
<div><b>1 rouge</b><span>annule la livraison : la chaîne refuse le déploiement</span></div>
<div><b>Diff daté</b><span>de la feuille de route : un item livré hors périmètre s'y voit</span></div>
</div>

</div>
</div>

<!--
DUREE 0:50. ELEMENT IMPOSE 12 : la planification des points de validation.
CRITERE : les points de validation sont organises de maniere a assurer le SUIVI
QUALITE (adequation developpement / fonctionnalites attendues, delais).

Ouvrir par les deux commanditaires. C'est la distinction qui structure tout le
chapitre, et elle est rarement faite : rendre compte a un jury et rendre compte a
un utilisateur ne se font pas avec le meme document. Le premier attend une
demonstration de conformite, le second attend de savoir ce qui a change pour lui.
Un projet qui n'a qu'un seul format de compte rendu en sert mal au moins un des
deux.

Ne PAS lire les dix versions. Balayer la frise d'un geste et dire que chaque
point est DATE et VERIFIABLE, adosse a une etiquette posee sur le commit exact
deploye.

Le temps utile va au tableau des controles, qui est la reponse au critere : une date de
livraison ne suffit pas a faire un point de validation qualite. Quatre controles
bloquants avant l'integration, puis un test de fumee apres deploiement, bloquant
lui aussi, qui verifie la joignabilite reelle de la base. Un controle rouge annule la livraison.

SI ON QUESTIONNE l'adequation avec les fonctionnalites attendues : elle se lit
dans le diff de la feuille de route, qui est versionnee. Un item livre hors
perimetre s'y voit, date.
-->

---

# Le compte rendu qui fait décider : trois blocs sur cinq

<div class="grid grid-cols-2 gap-6 text-sm">
<div>

### Le gabarit, sur un cas réel

<div class="stack" style="height:1.4rem">
<i style="width:40%;background:#a7b0ae">2 blocs d'information</i>
<i style="width:60%;background:var(--s1)">3 blocs de décision</i>
</div>

<div class="text-xs opacity-75 mt-3 mb-1">L'adoption des notifications, du constat à la décision</div>
<div class="chips">
<div><span>Constat, mesuré et sourcé</span><u>3 abonnements sur 17, 18 %</u></div>
<div><span>Analyse, ce que le code explique</span><u>une absence d'occasion, pas un refus</u></div>
<div><span><b>Proposition</b> exécutable</span><u>proposer l'activation une fois, au moment utile</u></div>
<div><span><b>Coût, délai, gain attendu</b></span><u>1 j, une itération, adoption visée &gt; 40 %</u></div>
<div><span><b>Priorité, et critère d'arrêt</b></span><u>P3 ; gel défendable sous 40 % à deux mois</u></div>
</div>

</div>
<div>

### Trois niveaux de compte rendu

<div class="steps">
<div><b>Fenêtre de nouveautés</b><span>in-app, automatique à chaque version. Savoir ce qui a changé sans rien demander. <b>Le seul compte rendu poussé</b></span></div>
<div><b>Journal des versions</b><span>note et étiquette à chaque version. Retrouver ce qui a été livré, sur quel commit</span></div>
<div><b>Compte rendu d'arbitrage</b><span>à chaque revue de cycle. <b>Prendre une décision</b></span></div>
</div>

</div>
</div>

<!--
DUREE 0:50. ELEMENT IMPOSE 11 : les comptes rendus sur les evolutions et
ameliorations. CRITERES : clairs et ordonnes, et surtout ils FACILITENT LA PRISE
DE DECISION DU CLIENT.

Le second critere est celui qui se rate. La barre de gauche le montre d'un coup :
trois blocs sur cinq ne sont pas de l'information. Dire la regle de redaction telle quelle : aucun constat sans
proposition, aucune proposition sans cout.

S'arreter sur DEUX choses de l'exemple :
1. « le taux ne mesure pas un refus, il mesure une absence d'occasion », c'est
l'analyse qui transforme un mauvais chiffre en question tranchable. Presente
seul, 18 % conduit a « la fonctionnalite ne marche pas, on l'abandonne ».
2. le critere d'arret enonce d'avance, 40 % sous deux mois.

Souligner le niveau 1, le seul compte rendu POUSSE : un journal des versions que
personne n'ouvre est une archive, pas un compte rendu. A DIRE HONNETEMENT : ce
canal n'existe que depuis la v1.4.0. Les sept versions precedentes n'ont ete
annoncees qu'au niveau 2. Le dispositif s'est corrige en cours de projet, il
n'etait pas complet des le depart.
-->

---

# Les indicateurs de satisfaction : trois familles

<div class="grid grid-cols-2 gap-6 text-sm mt-2">
<div>

<div class="kpi grid-cols-1">
<div><b>74 %</b><span><b>Comportemental</b> : 14 soirées sur 19 menées jusqu'au tirage ; notifications activées, 3 sur 17</span></div>
<div><b>9,6 / 10</b><span><b>Déclaratif</b> : recommandation, <b>7 réponses</b> sur 17 comptes, aucun détracteur</span></div>
<div><b>100 %</b><span><b>Opérationnel</b> : disponibilité, 207 ms en p95, 0,026 % d'erreurs</span></div>
</div>

</div>
<div>

<div class="text-xs opacity-75 mb-2"><b>17 jours</b> entre le retour d'un utilisateur et sa mise en production</div>
<div class="tl">
<div><b>18/08</b><span>questionnaire en ligne</span></div>
<div><b>19/08</b><span>fiche ouverte</span></div>
<div><b>26/08</b><span>fiche close</span></div>
<div><b>04/09</b><span>correctif en production, v1.4.1</span></div>
</div>

<div class="chips mt-4">
<div><span>Reconnexion depuis un navigateur intégré</span><u>déclenchée, livrée en v1.4.1</u></div>
<div><span>Suggestion d'une liste de films à voir</span><u>confirmée, déjà au périmètre</u></div>
<div><span>Voir quels films un utilisateur a proposés</span><u>instruite, 0,5 j, priorité 4</u></div>
</div>

</div>
</div>

<!--
DUREE 1:00. ELEMENT IMPOSE 13 : les indicateurs de satisfaction mis en place.
CRITERE : ils sont definis et COHERENTS AU REGARD DU PROJET.

La coherence est le mot du critere, et c'est la que se joue la note. Dire
d'emblee : a 17 comptes et 19 soirees, un NPS n'a aucune validite statistique.
D'ou trois familles, et c'est leur COMBINAISON qui fait la mesure.

Puis la limite, avant qu'on la trouve : sept reponses, echantillon oriente vers
les plus assidus, aucun detracteur. La phrase a dire : « je ne presente pas le
9,6 comme une mesure de satisfaction, mais comme l'absence de detracteur parmi
les utilisateurs engages. »

Les indicateurs COMPORTEMENTAUX pesent plus lourd dans les decisions, parce
qu'ils mesurent ce que les gens FONT et non ce qu'ils disent.

La colonne de droite prouve que les indicateurs SERVENT. Distinguer les trois
statuts a voix haute, declenchee, confirmee, instruite non livree, et dire
POURQUOI on les distingue : presenter une confirmation comme un declenchement
serait surevaluer la boucle.

Terminer sur les 17 jours, puis IMMEDIATEMENT sur ce qui manque. Enchainer sur le
bilan, derniere diapo presentee.
-->

---

# 8. Bilan, et la validation du périmètre livré

<div class="text-center mt-10" style="font-size:1.5rem">Organiser, inviter, proposer, voter, trancher, garder une trace</div>

<div class="chips mt-8" style="max-width:34rem;margin-left:auto;margin-right:auto;font-size:0.9rem">
<div><span>Rendre les notifications atteignables</span><u>1 j</u></div>
<div><span>Réconcilier le vote et son effet sur le tirage</span><u>2 à 3 j</u></div>
<div><span>Boucle de retour utilisateur continue</span><u>1 à 2 j</u></div>
</div>

<div class="note text-base mt-10" style="max-width:40rem;margin-left:auto;margin-right:auto">
<b>Sur cette base, je vous demande de valider le périmètre livré, pour engager le lot suivant.</b>
</div>

<!--
DUREE 0:40. DERNIERE DIAPO PRESENTEE. C'EST ELLE QUI SATISFAIT LE QUATRIEME
CRITERE DE C3.4.2 : « la demonstration permet d'aboutir a une VALIDATION du
projet ». La demonstration a ouvert la presentation ; la demande de validation
la ferme, une fois le pilotage demontre.

Trois enseignements en une phrase chacun, sans support, puis les trois
evolutions chiffrees, puis LA DEMANDE, prononcee telle qu'elle est ecrite, sans
l'adoucir. Puis SE TAIRE et laisser le silence.

Les trois enseignements, tous demontres dans les chapitres precedents :
1. Un indicateur ne mesure que la pratique qui le produit : la regularite du
commit est devenue la condition d'existence de l'indicateur d'avancement.
2. Quand le cout d'une decision croit avec le temps, decider tot a une valeur
propre : 944 lignes a migrer le 18 mars, 44 663 aujourd'hui.
3. L'arbitrage n'a pas ete perdu, il n'a pas ete pose, deux fois : 51 items
hors chiffrage que rien ne comparait au prevu, et dix jours consecutifs en
aout plutot que decider ce qui ne serait pas livre.

Le troisieme est celui qui compte. Ne pas l'edulcorer, ne pas l'enrober. Un jury
de professionnels a passe trente minutes a entendre un candidat qui mesure et qui
arbitre : entendre en cloture qu'il a rate deux arbitrages, avec les chiffres,
est ce qui rend credible tout ce qui precede.

Les deux echecs ont la MEME RACINE, et c'est la phrase qui les relie : une option
non instruite n'est pas un arbitrage, c'est une absence de decision.

Prononcer la phrase de cloture lentement, puis MARQUER UN TEMPS avant de
remercier. C'est la derniere chose que le jury entendra avant les questions.

Les sept annexes qui suivent ne sont JAMAIS presentees. Elles sont appelees
uniquement si une question les demande. Connaitre leur ordre :
A1 architecture 24, A2 arbitrages de reserve 25, A3 budget 26, A4 chaine
CI/CD 27, A5 RACI complete 28, A6 journal des versions 29, A7 retours
utilisateurs 30.

= = =

Ce critere n'est pas une consequence automatique d'une bonne demonstration. Une
demonstration qui se termine par « voila, c'est tout » ne laisse rien a valider.
Il faut DEMANDER la validation, et la derniere phrase est ecrite pour cela.

1. Ce qui est valide. Enumerer les six verbes du parcours, pas les
fonctionnalites. C'est la promesse produit qui est validee, pas une liste.

2. Ce qui vient ensuite. Trois evolutions CHIFFREES et PRIORISEES, issues des
mesures et des retours du chapitre 7. Montrer que la suite est instruite et non
improvisee.

3. LA DEMANDE, prononcee telle qu'elle est ecrite, sans l'adoucir : « sur cette
base, je vous demande de valider le perimetre livre, pour engager le lot
suivant. » Puis SE TAIRE et laisser le silence. C'est la fin de la presentation.

Cette formulation place la demonstration dans un cycle de projet, le sujet du
Bloc 3, au lieu d'en faire une presentation de produit isolee.
-->

---

# Annexe A1 : Architecture technique

<div class="grid grid-cols-2 gap-6 text-sm">
<div>

```mermaid
flowchart LR
  U["Navigateur / PWA"]
  U -->|assets| CF["CloudFront + S3<br/>AWS"]
  U -->|/api/v1| CR["ASP.NET Core<br/>Cloud Run, GCP"]
  CR --> M[("MongoDB Atlas")]
  CR --> TMDB["TMDB"]
  CR --> RS["Resend"]
```

<div class="text-xs opacity-75 mt-2">
Secrets injectés au déploiement par Secret Manager. Session par cookie, jamais par jeton en stockage local.
</div>

</div>
<div>

### L'API en architecture hexagonale

| Couche | Contenu |
|--------|---------|
| **Entrée** | Contrôleurs `/api/v1`, sécurité : CORS, limitation de débit, CSP, en-têtes, corrélation |
| **Application** | Cas d'usage et **ports** (interfaces) |
| **Domaine** | Règles métier : soirée, partage, vote, roue |
| **Infrastructure** | Adaptateurs : MongoDB, catalogue, e-mail, notifications |

| | |
|--|--|
| Volume | **44 663 lignes**, 544 fichiers |
| Couverture | **86,6 %** (lignes 91,2 %, branches 77,3 %) |
| Qualité | Quality Gate **Passed**, A / A / A, duplication 1,3 % |

</div>
</div>

---

# Annexe A2 : Les deux arbitrages de réserve

<div class="grid grid-cols-2 gap-6 text-sm">
<div>

### La porte de qualité instable

| | |
|--|--|
| **Écart** | Chaîne à **52 %** de succès en juin 2026, échecs sans cause réelle bloquant les fusions |
| **Conséquence** | Érosion de la confiance dans la chaîne, tentation de contourner la porte |
| **Options** | Désactiver, abaisser les seuils, **rendre la mesure déterministe**, changer d'outil |
| **Décision** | Médiane de trois exécutions et seuils recalibrés, **plutôt que baisser l'exigence** |
| **Résultat** | **52 % → 94 %** le mois suivant. Portes rendues bloquantes en v1.3.1 |

</div>
<div>

### L'abandon de l'application mobile

| | |
|--|--|
| **Écart** | Application mobile démarrée le **16/05/2026**, parcours complet livré en une journée |
| **Conséquence** | Deux surfaces produit à maintenir, pour un seul exécutant |
| **Options** | Poursuivre en parallèle, geler, **archiver** |
| **Décision** | Archivée le **26/05/2026** : le web porte la totalité des utilisateurs |
| **Résultat** | Code conservé dans `archive/`, **aucune dette de maintenance, aucun utilisateur impacté** |

</div>
</div>

<div class="note mt-4 text-sm">
Ces deux cas partagent le critère qui a tranché le cas principal : <b>la soutenabilité par l'effectif réel</b>. C'est le critère 5 du logigramme, et celui qui revient le plus souvent sur ce projet.
</div>

---

# Annexe A3 : Le budget prévisionnel détaillé

<div class="grid grid-cols-2 gap-6 dense">
<div>

### Valeur de développement

| Lot | Charge | TJM simulé | Coût HT |
|-----|-------:|-----------:|--------:|
| MVP | 27 J/H | 350 € | 9 450 € |
| Migration .NET | 13 J/H | 350 € | 4 550 € |
| V1 produit | 35 J/H | 350 € | 12 250 € |
| Clôture du titre | 23 J/H | 350 € | 8 050 € |
| **Total** | **98 J/H** | | **34 300 €** |

<div class="text-xs opacity-75 mt-1">
Coût de trésorerie nul dans le cadre de la formation. Ce montant matérialise la valeur de l'effort pour le commanditaire.
</div>

</div>
<div>

### Infrastructure récurrente

| Poste | Palier gratuit | Estimation |
|-------|----------------|-----------:|
| Hébergement API (Cloud Run) | 2 M req/mois | ~0 € |
| Registre, secrets, supervision | inclus | ~0 € |
| Hébergement front (S3 + CloudFront) | **12 mois** | ~1 à 5 €/mois **ensuite** |
| Base de données (Atlas M0) | 512 Mo | ~0 € |
| E-mail (Resend) | 3 000/mois | ~0 € |
| Supervision d'erreurs (Sentry) | 5 000 év./mois | ~0 € |
| Nom de domaine | | ~10 €/an |
| **Licences** | 100 % libre ou palier gratuit | **0 €** |
| **Trésorerie réelle** | | **20 à 190 €/an** |

<div class="text-xs opacity-75 mt-1">
Borne haute atteinte si la base passe au premier palier payant (~9 $/mois).
</div>

</div>
</div>

---

# Annexe A4 : La chaîne d'intégration et de déploiement

<div class="lede text-sm"><b>18 jobs</b> sur deux chaînes, dont <b>14 bloquants</b>. Un contrôle rouge refuse le déploiement, ce n'est pas une recommandation.</div>

<div class="grid grid-cols-2 gap-6 dense">
<div>

| Job | Rôle | Bloquant |
|-----|------|:--------:|
| `changes` | Path-filtering, lanes web / api | |
| `gitleaks` | Scan de secrets sur l'arbre | ✅ |
| `lint-workflows` | Lint des workflows eux-mêmes | ✅ |
| `lint-web` | TypeScript, ESLint, Prettier | ✅ |
| `lint-api` | Format, build `-warnaserror`, export OpenAPI | ✅ |
| `audit` | Trivy sur le lock, NuGet vulnérables | ✅ |
| `test-web` | Vitest + seuils de couverture | ✅ |
| `test-api` | xUnit unitaires et intégration, **≥ 80 %** | ✅ |
| `test-api-mongo` | Intégration sur **MongoDB réel** | ✅ |

</div>
<div>

| Job | Rôle | Bloquant |
|-----|------|:--------:|
| `e2e` | Playwright, parcours de bout en bout | ✅ |
| `e2e-mongo` | Parcours critique sur **MongoDB réel** | ✅ |
| `sonar` | Quality Gate sur le code nouveau | ✅ |
| `verifier-ci` | Exige une CI verte sur le commit visé | ✅ |
| `lighthouse` | Performance et accessibilité, médiane de 3 | ✅ |
| `docker-api` | Image conteneurisée → Artifact Registry | |
| `deploy-api` | Cloud Run, **avec test de fumée readiness** | ✅ |
| `deploy-front` | S3 et CloudFront | |
| `deploy-guard` | Garde-fou de déploiement sur `master` | |

</div>
</div>

<div class="note mt-3 text-xs">
Mesures anti-chaîne d'approvisionnement : actions épinglées par SHA, images par digest, <code>persist-credentials: false</code>, secrets passés par <code>env:</code>.
</div>

---

# Annexe A5 : La matrice RACI complète

<div class="dense">

**R** réalise, **A** approuve et rend compte, **C** consulté, **I** informé

| Activité | Moi | Commanditaire | Utilisateurs | Prestataires |
|----------|:---:|:-------------:|:------------:|:------------:|
| Cadrage et périmètre de version | A, R | C | C | |
| Architecture applicative | A, R | I | | |
| Modèle de données et contrat d'interface | A, R | | | |
| Développement de l'interface | A, R | | I | |
| Développement de l'API | A, R | | | |
| Revue, tests et intégration | A, R | | | |
| Intégration des services tiers | A, R | | | C |
| Accessibilité et inclusion | A, R | | C | |
| Chaîne d'intégration et de déploiement | A, R | | | |
| Supervision et exploitation | A, R | I | | R |
| Sécurité applicative | A, R | I | | |
| Recette et tests de bout en bout | A, R | C | C | |
| Arbitrage de périmètre ou de charge | A, R | C | C | |
| Mise en production | A, R | I | I | R |
| Restitution et compte rendu | A, R | C | I | |

</div>

<div class="note mt-2 text-xs">
<b>Le A et le R sont toujours les miens</b> : à une personne, la matrice ne répartit pas la responsabilité, elle rend visible qui est consulté et informé, et ce qu'un prestataire exécute. <b>Les acteurs externes y figurent</b> : le commanditaire consulté sur le périmètre et les arbitrages, les utilisateurs consultés sur l'accessibilité et sur chaque version, les prestataires qui exécutent l'hébergement et la supervision. Le jour où une personne rejoint le projet, la matrice est déjà écrite.
</div>

---

# Annexe A6 : Le journal des versions

<div class="grid grid-cols-2 gap-6 text-sm">
<div class="dense">

| Version | Date | Contenu principal |
|---------|------|-------------------|
| **1.5.0** | 07/09/2026 | Accueil d'exploration, sagas, sélections, landing refondue |
| 1.4.1 | 04/09/2026 | Navigation sans compte, landing bilingue |
| 1.4.0 | 25/08/2026 | Watchlist, Letterboxd, choix manuel, flamme, OAuth |
| 1.3.2 | 25/07/2026 | Supervision, sonde de readiness, canal de support |
| 1.3.1 | 08/07/2026 | Filtre de durée, échelle de notes, CSP, refonte CI/CD |
| 1.3.0 | 19/06/2026 | États vides, export calendrier, navigation |
| 1.2.0 | 11/06/2026 | Profil public, notifications in-app, RGPD |
| 1.1.0 | 25/05/2026 | Application installable, notifications push, séries |
| 1.0.0 | 19/05/2026 | Première version de production |
| 0.1.0 | 27/02/2026 | Prototype initial |

<div class="text-xs opacity-75 mt-1">
Format <b>Keep a Changelog</b>, versionnage sémantique. Un tag et une release par version. La version est en pied de page et exposée par la sonde de readiness.
</div>

</div>
<div>

### Détail d'une release, la v1.3.2

**Ajouté** : lien « Signaler un problème » avec contexte pré-rempli, sonde `GET /health/ready` vérifiant MongoDB et exposant la version déployée, 3 sondes sur 3 continents, 5 politiques d'alerte, contrôle de readiness dans le test de fumée.

**Modifié** : portes de qualité rendues **bloquantes** (Quality Gate, Lighthouse, E2E), réduction de la duplication.

<div class="note mt-4 text-xs">
<b>Traçabilité bidirectionnelle</b> : la fiche d'anomalie référence le commit correctif, le commit appartient à une étiquette, l'étiquette correspond à une entrée du journal. Et chaque événement d'erreur en production porte la version déployée.
</div>

</div>
</div>

---

# Annexe A7 : Les retours utilisateurs, question par question

<div class="text-sm mb-2">
<b>7 réponses pour 17 comptes.</b> Échantillon réduit et orienté : 5 des 7 répondants utilisent l'application à chaque soirée.
</div>

<div class="dense">

| Question | Réponses (n = 7) |
|----------|------------------|
| Usage des boutons de vote | 6/7 ont voté au moins une fois ; 1/7 jamais |
| Effet du vote sur le tirage | 4/7 « ça dépend d'un réglage de l'hôte » ; **1/7 identifie la réalité** : le réglage n'est jamais activé |
| Décision réelle du groupe | 5/7 « ça dépend des soirées » ; **1/7 relance la roue jusqu'à un résultat qui convient** |
| Attente vis-à-vis du vote | **3/7 veulent écarter du tirage les films rejetés**, un mécanisme d'élimination qui n'existe pas |
| Connaissance des notifications | **4/7 ignoraient que l'activation était possible** ; 3/7 les ont activées |
| Connaissance du réglage de la roue | 5/7 le connaissaient, repéré mais **jamais actionné** : 0 soirée sur 19 |
| Ce qui ferait revenir plus souvent | 5/7 « rien de particulier, je l'utilise quand j'en ai besoin » |
| Recommandation (0 à 10) | 10, 10, 10, 8, 9, 10, 10 → **moyenne 9,6**, aucun détracteur |

</div>

<div class="alert mt-3 text-xs">
<b>Ce que ces réponses ont produit</b> : une décision <b>déclenchée</b> et livrée (le bandeau des navigateurs intégrés, v1.4.1, 17 jours du retour à la production), une <b>confirmée</b> mais non déclenchée (la watchlist, déjà au périmètre), une <b>instruite</b> et non livrée (voir quels films un utilisateur a proposés).
</div>
