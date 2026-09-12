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

Ne rien commenter ici. Enchainer immediatement sur la diapo suivante.
-->

---

# 2. Planifier : un V par version, un flux pour le run

<div class="grid grid-cols-5 gap-6 mt-2">
<div class="col-span-3">

<div class="text-xs opacity-75 mb-1">Chaque version 1.x, de la roadmap à la release</div>
<div class="vee">
<div class="row"><div class="l"><b>Cadrage</b><span>objectif de version, items, tailles S à XL</span></div><div class="link"></div><div class="r"><b>Livraison</b><span>release datée, notes, nouveautés in-app</span></div></div>
<div class="row r2"><div class="l"><b>Conception</b><span>questions de cadrage, maquette, contrat d'API</span></div><div class="link"></div><div class="r"><b>Validation</b><span>test manuel, go avant la fusion</span></div></div>
<div class="row r3"><div class="l"><b>Réalisation</b><span>test écrit avant le code, branche de feature</span></div><div class="link"></div><div class="r"><b>Vérification</b><span>revue, 14 contrôles bloquants</span></div></div>
<div class="base">une branche par version, une branche par feature</div>
</div>

<div class="text-xs opacity-75 mt-3 mb-1">Le run, en flux, hors version</div>
<div class="run">
<div>Signal<i>Sentry, sonde, utilisateur</i></div><span>→</span>
<div>Fiche<i>issue étiquetée, sévérité</i></div><span>→</span>
<div>Correctif<i>branche fix, sur master</i></div><span>→</span>
<div>Livré<i>version corrective</i></div>
</div>

</div>
<div class="col-span-2">

<div class="text-xs opacity-75 mb-1">L'outil : le board GitHub Projects, une colonne par phase</div>
<div class="board">
<div><b>Backlog</b><i></i><i></i><i></i></div>
<div><b>Cadrage</b><i></i><i></i></div>
<div><b>Maquette</b><i></i></div>
<div><b>Dev</b><i></i></div>
<div><b>Revue, tests</b><i></i></div>
<div><b>Recette</b><i></i></div>
<div class="done"><b>Livré</b><i></i><i></i><i></i><i></i></div>
</div>

<div class="chips mt-3">
<div><span>Un ticket par item de roadmap</span><u>version, taille, phase</u></div>
<div><span>Au-dessus du board</span><u>rétroplanning, Gantt des versions</u></div>
</div>

<div class="chips mt-4">
<div><span><b>Périmètre figé</b> par version</span><u>livrable daté, notes de version</u></div>
<div><span><b>Correctif</b> sans attendre la version</span><u>bug corrigé en un jour</u></div>
<div><span><b>Écartés</b></span><u>Scrum, cycle en V intégral</u></div>
</div>

</div>
</div>

<!--
DUREE 1:30. ELEMENTS IMPOSES 1 ET 2 : la methodologie choisie, et l'outil de
planification. CRITERES : le choix est justifie AVEC LES BENEFICES ATTENDUS ;
l'outil est argumente avec ses benefices ET compatible avec la methodologie.

La methode se dit en une phrase : « un cycle en V pour chaque version, un flux
pour le run ». Le V a gauche : une version part de la roadmap avec un objectif,
des items et une taille par item, chaque item passe par un cadrage par
questions, une maquette si l'ecran est nouveau, une realisation ou le test est
ecrit avant le code, puis remonte la branche droite : verification par la chaine
et la revue, validation par un test manuel avant la fusion, livraison par une
release datee, avec ses notes et la fenetre de nouveautes. Le trait pointille
entre les deux branches EST le cycle en V : chaque niveau de gauche est verifie
par son vis-a-vis de droite, la livraison contre le cadrage, la validation
contre la conception, la verification contre la realisation.

Le run, en bas : un signal de production ou d'un utilisateur, une fiche
etiquetee avec sa severite, une branche de correctif fusionnee sur master, une
version corrective. Il ne passe pas par le V, et c'est voulu.

LES BENEFICES, a dire avec les chiffres : le V par version fige un perimetre,
donc chaque version a une date et des notes, dix versions livrees ; le flux du
run corrige sans attendre la version suivante, une anomalie de production
ouverte et corrigee le meme jour en juillet, livree le lendemain.

ECARTES, sans mepris : Scrum, parce que ses ceremonies n'ont pas
d'interlocuteur a une personne, on garde le decoupage et la revue, pas les
rituels ; le cycle en V integral, parce qu'il aurait fige tout le perimetre
avant les mesures de production, alors que la V1.4 corrige des hypotheses que
l'usage reel a invalidees.

= = =

CRITERES : l'outil de planification est argumente avec ses benefices attendus,
ET il est compatible avec la methodologie choisie.

L'outil est le board GitHub Projects : un ticket par item de roadmap, avec sa
version, sa taille et sa phase ; les colonnes du board SONT les phases du V,
c'est ce qui fait la compatibilite. Un ticket ne saute pas de colonne : il
passe par la maquette quand l'ecran est nouveau, par la revue avant la recette.
Benefice attendu : voir en un ecran ce qui est cadre, ce qui est en cours et ce
qui est livre, sans double saisie, dans la plateforme ou le code vit.

Au-dessus du board, deux outils a l'echelle des versions : le retroplanning
depuis les quatre echeances du titre, qui transforme une date imposee en date de
fin de version, et le Gantt des versions, diapo suivante. Ils ne planifient pas
les tickets, ils placent les versions ; le board ne porte pas de date, il porte
l'etat. C'est cette difference d'echelle qui les rend compatibles.

SI ON QUESTIONNE : « pourquoi pas Jira ? » Parce que le board vit la ou le code
vit : la fiche, la branche, la PR et la release sont au meme endroit, la trace
nait du geste. Le choix est developpe au chapitre 3.
-->

---

# Le planning : chaque version parcourt les cinq phases

<div class="gantt">

<div class="row axis">
<div class="lab"></div>
<div class="track">
<span style="grid-column:1/14">fév.</span>
<span style="grid-column:14/45">mars</span>
<span style="grid-column:45/75">avril</span>
<span style="grid-column:75/106">mai</span>
<span style="grid-column:106/136">juin</span>
<span style="grid-column:136/167">juil.</span>
<span style="grid-column:167/198">août</span>
<span style="grid-column:198/214">sept.</span>
</div>
</div>

<div class="row"><div class="lab">0.1, MVP</div><div class="track"><i class="e" style="grid-column:1/8"></i><i class="c" style="grid-column:8/13"></i><i class="r" style="grid-column:13/30"></i><b style="grid-column:29/30"></b><i class="m" style="grid-column:30/32"></i></div></div>
<div class="row"><div class="lab">1.0, socle .NET</div><div class="track"><i class="e" style="grid-column:29/31"></i><i class="c" style="grid-column:31/32"></i><i class="r" style="grid-column:31/33"></i><b style="grid-column:32/33"></b><i class="m" style="grid-column:33/49"></i></div></div>
<div class="row"><div class="lab">1.0, V1 produit</div><div class="track"><i class="e" style="grid-column:33/50"></i><i class="c" style="grid-column:48/53"></i><i class="r" style="grid-column:51/93"></i><b style="grid-column:93/94"></b><i class="m" style="grid-column:94/100"></i></div></div>
<div class="row"><div class="lab">1.1</div><div class="track"><i class="e" style="grid-column:89/92"></i><i class="c" style="grid-column:92/94"></i><i class="r" style="grid-column:94/99"></i><b style="grid-column:99/100"></b><i class="m" style="grid-column:100/117"></i></div></div>
<div class="row"><div class="lab">1.2</div><div class="track"><i class="e" style="grid-column:94/100"></i><i class="c" style="grid-column:100/103"></i><i class="r" style="grid-column:101/116"></i><b style="grid-column:116/117"></b><i class="m" style="grid-column:117/125"></i></div></div>
<div class="row"><div class="lab">1.3</div><div class="track"><i class="e" style="grid-column:109/114"></i><i class="c" style="grid-column:114/117"></i><i class="r" style="grid-column:116/124"></i><b style="grid-column:124/125"></b><i class="m" style="grid-column:125/144"></i></div></div>
<div class="row"><div class="lab">1.3.1 et 1.3.2, run</div><div class="track"><i class="r" style="grid-column:130/143"></i><b style="grid-column:143/144"></b><i class="r" style="grid-column:144/160"></i><b style="grid-column:160/161"></b><i class="m" style="grid-column:161/192"></i></div></div>
<div class="row"><div class="lab">1.4</div><div class="track"><i class="e" style="grid-column:135/152"></i><i class="c" style="grid-column:152/167"></i><i class="r" style="grid-column:171/191"></i><b style="grid-column:191/192"></b><i class="m" style="grid-column:192/202"></i></div></div>
<div class="row"><div class="lab">1.4.1, run</div><div class="track"><i class="r" style="grid-column:193/201"></i><b style="grid-column:201/202"></b></div></div>
<div class="row"><div class="lab">1.5</div><div class="track"><i class="e" style="grid-column:187/195"></i><i class="c" style="grid-column:198/201"></i><i class="r" style="grid-column:201/204"></i><b style="grid-column:204/205"></b><i class="m" style="grid-column:205/214"></i></div></div>
<div class="row"><div class="lab">1.6, en cours</div><div class="track"><i class="e" style="grid-column:195/202"></i><i class="c" style="grid-column:205/206"></i><i class="r open" style="grid-column:206/214"></i></div></div>
<div class="row"><div class="lab">Restitutions du titre</div><div class="track"><b style="grid-column:116/117"></b><b style="grid-column:158/159"></b><b style="grid-column:187/188"></b><b style="grid-column:213/214"></b></div></div>

</div>

<div class="legend mt-2 ml-2">
<span style="--c:#cbd5e1">Étude</span>
<span style="--c:var(--s3)">Conception</span>
<span style="--c:var(--s1)">Réalisation</span>
<span style="--c:#f59e0b">Restitution, release</span>
<span style="--c:#99f6e4">Mesure en production</span>
</div>

<style>
.gantt { font-size: 0.78rem; line-height: 1.1; margin-top: 0.5rem; }
.gantt .row { display: flex; align-items: center; gap: 0.6rem; margin-bottom: 0.34rem; }
.gantt .lab { width: 11.5rem; flex: none; text-align: right; opacity: 0.9; }
.gantt .track {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(213, 1fr);
  align-items: center;
  height: 1.35rem;
  border-left: 1px solid currentColor;
  opacity: 0.95;
}
.gantt .track i { height: 0.82rem; border-radius: 3px; grid-row: 1; }
.gantt .track i.e { background: #cbd5e1; }
.gantt .track i.c { background: var(--s3); }
.gantt .track i.r { background: var(--s1); }
.gantt .track i.m { background: #99f6e4; }
.gantt .track i.open { background: repeating-linear-gradient(135deg, var(--s1) 0 4px, #99f6e4 4px 8px); }
.gantt .track b {
  width: 0.78rem; height: 0.78rem; grid-row: 1;
  transform: rotate(45deg);
  background: #f59e0b;
  justify-self: center;
  z-index: 1;
}
.gantt .axis .track { border-left: none; height: 1.3rem; }
.gantt .axis .track span {
  font-weight: 600; opacity: 0.6; padding-left: 3px;
  border-left: 1px solid currentColor; align-self: stretch;
  overflow: hidden; white-space: nowrap;
}
</style>

<!--
DUREE 1:10. ELEMENT IMPOSE 2 (suite). CRITERE : le planning est decoupe en
phases, en taches ou lots, et permet de visualiser les phases d'ETUDE, de
MESURE, de CONCEPTION, de REALISATION, de RESTITUTION. Les cinq mots sont dans
la legende, et chaque ligne de version les porte dans l'ordre du V.

Une ligne par version, du 16 fevrier au 16 septembre 2026. Se lit de gauche a
droite, une phrase par couleur :
- ETUDE, gris : la version est cadree dans la roadmap, objectif, items,
  tailles. Elle commence pendant que la version precedente est encore en
  production : le cadrage de la 1.4 court de fin juin a mi-juillet, celui de
  la 1.5 fin aout.
- CONCEPTION, bleu : questions de cadrage, maquettes des ecrans nouveaux,
  contrat d'API. Court, parce qu'une version tient en quelques items.
- REALISATION, vert : la branche de version, une feature de un a trois jours.
- RESTITUTION, losange : la release, avec ses notes et la fenetre de
  nouveautes. Dix losanges, dix versions.
- MESURE, vert clair : la version vit en production, sondes, erreurs, usage
  et retours ; c'est ce qui alimente le cadrage de la suivante. Le
  questionnaire du 18 aout tombe dans la mesure de la 1.3.2 et nourrit la
  1.4.1.

LE POINT A NE PAS MANQUER : les lignes se chevauchent, l'etude de la suivante
pendant la mesure de la precedente, et c'est ce qui distingue un V par version
d'un cycle en V unique. Un seul V sur sept mois aurait fige en fevrier ce que
la production a corrige en aout.

Deux lignes n'ont pas d'etude : les versions correctives, 1.3.1, 1.3.2 et
1.4.1, qui sont le run en flux de la diapo precedente. Elles n'ont que la
realisation et la release.

La derniere ligne : les quatre echeances du titre, qui sont les points fixes du
retroplanning. Le Bloc 1 le 11 juin tombe le jour de la 1.2, le Bloc 4 le
21 aout quatre jours avant la 1.4 : les versions ont ete calees sur ces dates.

SI ON QUESTIONNE : « vos documents de cadrage sont dates de juin, votre etude de
mars. » Les decisions ont ete prises en mars et avril, elles sont dans la
roadmap et dans le code ; leur formalisation en dossier est de juin pour le
Bloc 1. La decision precede le document.
-->

---

# Sept versions en lots, et les ressources réelles

<div class="text-xs opacity-75 mb-1">Les 75 items livrés, par version</div>
<div class="stack" style="height:2rem">
<i style="width:9.3%;background:var(--s1)">MVP, 7</i>
<i style="width:21.3%;background:var(--s3)">V1, 16</i>
<i style="width:10.7%;background:var(--s2)">1.1, 8</i>
<i style="width:10.7%;background:var(--s4);color:#3b2f00">1.2, 8</i>
<i style="width:14.7%;background:var(--s1)">1.3, 11</i>
<i style="width:14.7%;background:var(--s3)">1.4, 11</i>
<i style="width:18.6%;background:var(--s2)">1.5, 14</i>
</div>

<div class="grid grid-cols-3 gap-5 text-sm mt-5">
<div>

### Humaines

<div class="chips">
<div><span><b>1 personne</b>, temps libre</span><u>soirs et week-ends</u></div>
<div><span>Chef de projet</span><u>versions, arbitrages, restitutions</u></div>
<div><span>Product owner</span><u>cadrage, recette, retours</u></div>
<div><span>Développeur front et back</span><u>conception, code, tests</u></div>
<div><span>DevOps</span><u>chaîne, déploiement, supervision</u></div>
<div><span>Commanditaire, utilisateurs</span><u>4 échéances, 17 comptes</u></div>
</div>

</div>
<div>

### Matérielles et techniques

<div class="chips">
<div><span>Poste de développement</span><u>plus un téléphone de test</u></div>
<div><span>Assistant de code</span><u>Claude Code, abonnement Max</u></div>
<div><span>Monorepo outillé</span><u>tests, analyse, formatage</u></div>
<div><span>Chaîne CI/CD</span><u>18 jobs, 14 bloquants</u></div>
<div><span>Hébergement, services tiers</span><u>sans serveur, paliers gratuits</u></div>
</div>

</div>
<div>

### Financières, réelles

<div class="kpi grid-cols-1" style="gap:0.4rem">
<div><b>0 €</b><span>de salaire : le temps est le mien</span></div>
<div><b>100 €/mois</b><span>l'assistant de code, depuis juin 2026 : 300 € à ce jour</span></div>
<div><b>≈ 10 €/an</b><span>le nom de domaine ; hébergement, base, e-mails, supervision à 0 €</span></div>
</div>

</div>
</div>

<!--
DUREE 1:40. CRITERES : le planning est decoupe en phases, en taches ou LOTS ;
les ressources necessaires sont identifiees (ELEMENT IMPOSE 3).

La barre du haut : les lots sont les versions, et chaque version est un lot
ferme, avec ses items et leur taille. Dire les ordres de grandeur, pas les
sept chiffres : 75 items livres, entre 7 et 16 par version, une feature tient
en un a trois jours, une version en une a trois semaines de realisation. Le
chiffrage du cadrage, 98 jours-homme sur quatre lots, est celui du Bloc 1 ; il
sert de reference a l'ecart du chapitre 3, pas de decoupage ici.

Les ressources : trois familles, une phrase forte par famille, aucune lecture
de liste.

HUMAINES : une personne, sur son temps libre, et quatre roles qu'elle porte
tour a tour ; ce sont les colonnes de la RACI qui suit. Autour d'elle, deux
acteurs reels : le commanditaire, le formateur puis le jury, sur quatre
echeances ; les 17 utilisateurs, qui font la recette et remontent des retours.
Les prestataires executent l'hebergement, le catalogue et les e-mails.

MATERIELLES : ne pas enumerer. Un poste, un telephone pour tester le mobile, un
assistant de code, un monorepo outille, une chaine, un hebergement sans
serveur. Dire que l'assistant de code est un outil, comme l'IDE : il ne
decide rien, la revue et la recette restent a la main.

FINANCIERES, et c'est la phrase a dire telle quelle : « ce projet n'a coute
que ses outils ». Aucun salaire, le temps est le mien ; un abonnement de 100
euros par mois depuis juin, 300 euros a ce jour ; une dizaine d'euros de nom de
domaine par an ; tout le reste est dans son palier gratuit, hebergement de l'API
et du front, base, e-mails, supervision. Soit environ 310 euros engages sur
sept mois. L'absence de licence payante est une decision de conception, prise au
cadrage : c'est ce qui rend le service soutenable au-dela du titre.

SI ON QUESTIONNE le « 0 euro » d'hebergement : le front est dans ses douze mois
offerts, il passera a 1 a 5 euros par mois ensuite ; la base passerait a 9
dollars par mois au-dela de 512 Mo. Les deux echeances sont suivies au tableau
de bord, diapo 11.
-->

---

# La matrice RACI : quatre rôles, une personne

<div class="raci mt-2" style="grid-template-columns: 1fr 4.6rem 4.6rem 4.6rem 4rem 5.6rem 5rem 5rem">
<div class="h"></div><div class="h">Chef de projet</div><div class="h">Product owner</div><div class="h">Développeur</div><div class="h">DevOps</div><div class="h">Commanditaire</div><div class="h">Utilisateurs</div><div class="h">Prestataires</div>
<div class="l">Cadrage et périmètre de version</div><div class="C">C</div><div class="A">A R</div><div class="n"></div><div class="n"></div><div class="C">C</div><div class="C">C</div><div class="n"></div>
<div class="l">Architecture et contrat d'API</div><div class="I">I</div><div class="n"></div><div class="A">A R</div><div class="C">C</div><div class="I">I</div><div class="n"></div><div class="n"></div>
<div class="l">Développement, interface et API</div><div class="n"></div><div class="A">A</div><div class="R">R</div><div class="n"></div><div class="n"></div><div class="I">I</div><div class="n"></div>
<div class="l">Revue, tests, intégration</div><div class="n"></div><div class="n"></div><div class="R">R</div><div class="A">A</div><div class="n"></div><div class="n"></div><div class="n"></div>
<div class="l"><b>Accessibilité et inclusion</b></div><div class="n"></div><div class="A">A</div><div class="R">R</div><div class="n"></div><div class="n"></div><div class="C">C</div><div class="n"></div>
<div class="l">Chaîne, supervision, sécurité</div><div class="I">I</div><div class="n"></div><div class="I">I</div><div class="A">A R</div><div class="n"></div><div class="n"></div><div class="R">R</div>
<div class="l">Arbitrage de périmètre ou de charge</div><div class="A">A R</div><div class="C">C</div><div class="C">C</div><div class="n"></div><div class="C">C</div><div class="C">C</div><div class="n"></div>
<div class="l">Recette, release, retours</div><div class="C">C</div><div class="A">A R</div><div class="R">R</div><div class="n"></div><div class="C">C</div><div class="C">C</div><div class="n"></div>
<div class="l">Mise en production</div><div class="A">A</div><div class="n"></div><div class="n"></div><div class="R">R</div><div class="I">I</div><div class="I">I</div><div class="R">R</div>
</div>

<div class="legend mt-2">
<span style="--c:var(--s1)">A approuve et rend compte</span>
<span style="--c:rgb(13 148 136 / 40%)">R réalise</span>
<span style="--c:rgb(13 148 136 / 14%)">C consulté</span>
<span style="--c:rgb(0 0 0 / 9%)">I informé</span>
</div>

<div class="chips mt-4" style="max-width:44rem">
<div><span><b>Quatre rôles</b>, une personne : le A et le R changent de casquette, pas de personne</span><u>affectation par compétence</u></div>
<div><span><b>Handicap</b> : aucune personne concernée sur le projet</span><u>porte d'accessibilité bloquante</u></div>
</div>

<!--
DUREE 1:00. CRITERE : les taches sont assignees selon les competences (RACI) ET
tiennent compte des personnes en situation de handicap. Le second point est un
critere a part entiere, pas une remarque.

Ne pas lire la matrice. Dire ce qu'elle montre : une personne, quatre roles, et
l'affectation suit la competence que chaque activite exige. Le product owner
approuve le cadrage et la recette parce qu'il porte le besoin ; le developpeur
realise et approuve l'architecture ; le DevOps approuve l'integration et
realise la mise en production ; le chef de projet arbitre et approuve la mise en
production. Quand une ligne a un A et un R differents, c'est que la meme
personne change de casquette entre la decision et le geste : c'est ce qui
rend la revue possible a une personne.

Les acteurs externes y figurent : le commanditaire consulte sur le perimetre et
les arbitrages, informe des mises en production ; les utilisateurs consultes
sur l'accessibilite et sur chaque version ; les prestataires qui executent
l'hebergement et la supervision.

Sur le handicap, dire la verite en une phrase : personne en situation de
handicap sur le projet. Puis ce qui est verifiable : la ligne accessibilite a
un A et un R, la porte d'accessibilite est bloquante a chaque livraison, et le
contexte du projet est en texte structure, lisible au lecteur d'ecran. La ligne
existe et elle a un responsable, ce n'est pas une clause de style.

SI ON QUESTIONNE « une RACI a une personne, a quoi ca sert ? » : a ecrire qui
decide et qui fait pour chaque activite, donc a savoir ce qu'on confierait en
premier le jour ou quelqu'un rejoint le projet : la colonne Dev, puis DevOps.
Le jour ou une personne rejoint le projet, la matrice est deja ecrite.
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
