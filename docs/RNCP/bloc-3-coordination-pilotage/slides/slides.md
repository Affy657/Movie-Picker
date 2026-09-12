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

A DIRE, rien n'est a l'ecran : 11 versions en production depuis fevrier,
21 comptes, 74 % des soirees menees jusqu'au tirage. Puis les six temps du
parcours en une phrase, et la demonstration. Au retour, diapo 4 : on parle au
jury.

Objectif unique : etablir qu'on parle d'un logiciel reellement exploite. Tout le
reste de la presentation en depend, et la demonstration se fera dessus.

Trois chiffres, pas plus. Le plus parlant est le 74 % : ce n'est pas un chiffre
d'inscription, c'est un chiffre d'USAGE ABOUTI. Les gens qui creent une soiree
vont au bout dans trois cas sur quatre.

Ne pas detailler les fonctionnalites, elles seront montrees en direct.

SI ON QUESTIONNE le volume : 21 comptes, c'est modeste et je ne le presente pas
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

# 2. Planifier : un V par version, un flux pour le run

<div class="grid grid-cols-5 gap-6 mt-2">
<div class="col-span-3">

<div class="text-xs opacity-75 mb-1">Chaque version 1.x, de la roadmap à la release</div>
<div class="vee">
<div class="row"><div class="l"><b>Cadrage</b><span>objectif de version, items pesés S à XL</span></div><div class="link"></div><div class="r"><b>Livraison</b><span>release datée, notes, nouveautés in-app</span></div></div>
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
des items et une taille par item, donc un poids par version, chaque item
passe par un cadrage par
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
donc chaque version a une date et des notes, onze versions livrees ; le flux du
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

# Le planning : une ligne par version

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

<div class="row"><div class="lab">0.1, MVP</div><div class="track"><i class="c" style="grid-column:8/13"></i><i class="r" style="grid-column:13/30"></i><b style="grid-column:29/30"></b><i class="m" style="grid-column:30/32"></i></div></div>
<div class="row"><div class="lab">Socle .NET</div><div class="track"><i class="c" style="grid-column:31/32"></i><i class="r" style="grid-column:31/33"></i><b style="grid-column:32/33"></b><i class="m" style="grid-column:33/49"></i></div></div>
<div class="row"><div class="lab">V1 produit</div><div class="track"><i class="c" style="grid-column:48/53"></i><i class="r" style="grid-column:51/93"></i><b style="grid-column:93/94"></b><i class="m" style="grid-column:94/100"></i></div></div>
<div class="row"><div class="lab">1.1</div><div class="track"><i class="c" style="grid-column:92/94"></i><i class="r" style="grid-column:94/99"></i><b style="grid-column:99/100"></b><i class="m" style="grid-column:100/117"></i></div></div>
<div class="row"><div class="lab">1.2</div><div class="track"><i class="c" style="grid-column:100/103"></i><i class="r" style="grid-column:101/116"></i><b style="grid-column:116/117"></b><i class="m" style="grid-column:117/125"></i></div></div>
<div class="row"><div class="lab">1.3</div><div class="track"><i class="c" style="grid-column:114/117"></i><i class="r" style="grid-column:116/124"></i><b style="grid-column:124/125"></b><i class="m" style="grid-column:125/144"></i></div></div>
<div class="row"><div class="lab">1.3.1 et 1.3.2, run</div><div class="track"><i class="r" style="grid-column:130/143"></i><b style="grid-column:143/144"></b><i class="r" style="grid-column:144/160"></i><b style="grid-column:160/161"></b><i class="m" style="grid-column:161/192"></i></div></div>
<div class="row"><div class="lab">1.4</div><div class="track"><i class="c" style="grid-column:152/167"></i><i class="r" style="grid-column:171/191"></i><b style="grid-column:191/192"></b><i class="m" style="grid-column:192/202"></i></div></div>
<div class="row"><div class="lab">1.4.1, run</div><div class="track"><i class="r" style="grid-column:193/201"></i><b style="grid-column:201/202"></b></div></div>
<div class="row"><div class="lab">1.5</div><div class="track"><i class="c" style="grid-column:198/201"></i><i class="r" style="grid-column:201/204"></i><b style="grid-column:204/205"></b><i class="m" style="grid-column:205/214"></i></div></div>
<div class="row"><div class="lab">1.6</div><div class="track"><i class="c" style="grid-column:203/206"></i><i class="r" style="grid-column:206/209"></i><b style="grid-column:209/210"></b><i class="m" style="grid-column:210/214"></i></div></div>

</div>

<div class="legend mt-2 ml-2">
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
MESURE, de CONCEPTION, de REALISATION, de RESTITUTION. Quatre sont dessinees,
conception, realisation, restitution, mesure ; l'etude, le cadrage de la
version dans la roadmap, se nomme a voix haute en ouvrant la diapo, pour que
les cinq mots de la grille soient prononces.

Une ligne par version, du 16 fevrier au 16 septembre 2026. Se lit de gauche a
droite, une phrase par couleur. L'ETUDE se dit, elle n'est pas dessinee : la
version est cadree dans la roadmap, objectif, items, tailles, pendant que la
version precedente est encore en production ; le cadrage de la 1.4 court de
fin juin a mi-juillet, celui de la 1.5 fin aout, celui de la 1.6 debut
septembre. La 1.7 est cadree, sept items, 34 points, elle part apres l'oral.
- CONCEPTION, bleu : questions de cadrage, maquettes des ecrans nouveaux,
  contrat d'API. Court, parce qu'une version tient en quelques items.
- REALISATION, vert : la branche de version, une feature de un a trois jours.
- RESTITUTION, losange : la release, avec ses notes et la fenetre de
  nouveautes. Onze versions publiees, la 1.6 le 12 septembre, un losange
  chacune ; le socle .NET, mis en production sans numero, a le sien.
- MESURE, vert clair : la version vit en production, sondes, erreurs, usage
  et retours ; c'est ce qui alimente le cadrage de la suivante. Le
  questionnaire du 18 aout tombe dans la mesure de la 1.3.2 et nourrit la
  1.4.1.

LE POINT A NE PAS MANQUER : les lignes se chevauchent, la conception de la
suivante pendant la mesure de la precedente, et c'est ce qui distingue un V par
version d'un cycle en V unique. Un seul V sur sept mois aurait fige en fevrier
ce que la production a corrige en aout.

Deux lignes n'ont pas de conception : les versions correctives, 1.3.1, 1.3.2
et 1.4.1, qui sont le run en flux de la diapo precedente. Elles n'ont que la
realisation et la release.

Les echeances du titre ne sont pas dessinees, elles se disent : le Bloc 1 le
11 juin tombe le jour de la 1.2, le Bloc 4 le 21 aout quatre jours avant la
1.4. Les versions ont ete calees sur ces dates par le retroplanning.

SI ON QUESTIONNE : « vos documents de cadrage sont dates de juin, votre etude de
mars. » Les decisions ont ete prises en mars et avril, elles sont dans la
roadmap et dans le code ; leur formalisation en dossier est de juin pour le
Bloc 1. La decision precede le document.
-->

---

# Huit versions en lots, et les ressources réelles

<div class="text-xs opacity-75 mb-1">Le poids des huit versions livrées : 106 items, 348 points</div>
<div class="stack" style="height:2rem">
<i style="width:19.0%;background:var(--s1)">MVP, 66</i>
<i style="width:19.5%;background:var(--s3)">V1, 68</i>
<i style="width:7.5%;background:var(--s2)">1.1, 26</i>
<i style="width:8.6%;background:var(--s4);color:#3b2f00">1.2, 30</i>
<i style="width:9.2%;background:var(--s1)">1.3, 32</i>
<i style="width:15.8%;background:var(--s3)">1.4, 55</i>
<i style="width:9.5%;background:var(--s2)">1.5, 33</i>
<i style="width:10.9%;background:var(--s4);color:#3b2f00">1.6, 38</i>
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
<div><span>Commanditaire, utilisateurs</span><u>4 échéances, 21 comptes</u></div>
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
ferme, avec ses items et leur taille, donc un poids, la somme des tailles.
C'est ce poids qui sert a comparer deux versions et a decider d'y ajouter ou
d'en retirer un item. Dire les ordres de grandeur, pas les huit chiffres : 106
items livres, produit et technique, 348 points, entre 26 et 68 par version ;
une feature tient en un a trois jours, une version en une a trois semaines de
realisation. Le
chiffrage du cadrage, 98 jours-homme sur quatre lots, est celui du Bloc 1 ; il
sert de reference a l'ecart du chapitre 3, pas de decoupage ici.

Les ressources : trois familles, une phrase forte par famille, aucune lecture
de liste.

HUMAINES : une personne, sur son temps libre, et quatre roles qu'elle porte
tour a tour ; ce sont les colonnes de la RACI qui suit. Autour d'elle, deux
acteurs reels : le commanditaire, le formateur puis le jury, sur quatre
echeances ; les 21 utilisateurs, qui font la recette et remontent des retours.
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

<div class="grid grid-cols-5 gap-8 mt-5">
<div class="col-span-2">

<div class="risk">
<div class="ay">Impact →</div>
<div class="cell c2"><i>3</i><i>4</i></div><div class="cell c3"><i>6</i></div><div class="cell c4"><i class="org">1</i></div>
<div class="cell c1"></div><div class="cell c2"><i class="hit">5</i></div><div class="cell c3"><i class="hit">2</i></div>
<div class="cell"></div><div class="cell c1"></div><div class="cell c2"><i class="hit">7</i></div>
<div></div><div class="ax">faible</div><div class="ax">moyenne</div><div class="ax">forte</div>
<div></div><div class="axl">Probabilité →</div>
</div>

<div class="legend mt-3">
<span style="--c:var(--s1)">s'est réalisé, traité</span>
<span class="hollow" style="--c:#fff">surveillé</span>
<span style="--c:#d97706">organisation</span>
</div>

</div>
<div class="col-span-3">

<div class="chips" style="font-size:0.88rem;gap:0.7rem 0">
<div><span><b style="color:#b45309">1.</b> <b>Concentration des rôles sur une personne</b></span><u style="color:#b45309">tout est écrit et versionné</u></div>
<div><span><b>2.</b> Sous-estimation des lots documentaires</span><u>rétroplanning depuis les échéances</u></div>
<div><span><b>3.</b> Dépendance au catalogue de films externe</span><u>cache, débit limité, repli manuel</u></div>
<div><span><b>4.</b> Perte de la base, aucun instantané</span><u>sauvegarde nocturne vérifiée</u></div>
<div><span><b>5.</b> Durcissement de la sécurité du contenu</span><u>réalisé en production, traité</u></div>
<div><span><b>6.</b> Absence de déploiement progressif</span><u>test de fumée bloquant, retour arrière</u></div>
<div><span><b>7.</b> Instabilité de la chaîne de vérification</span><u>contrôle rendu déterministe</u></div>
</div>

</div>
</div>

<!--
DUREE 1:00. CRITERE : les points de vigilance sont soulignes. Dernier critere de
C3.1, competence ELIMINATOIRE : le chapitre ne peut pas se terminer sans lui.

Ne pas lire les sept lignes. La carte a gauche place chaque point par
probabilite et par impact ; la liste a droite donne la parade. Trois temps :

1. « Six de ces points sont des risques de projet, chacun porte un indicateur
et une parade. » Les pleins se sont realises et ont ete traites : le 5, un
durcissement de la politique de securite du contenu a bloque les affiches de
films et les avatars en production, l'incident et sa correction sont traces ;
le 2, l'ecart sur les lots documentaires, absorbe par le retroplanning ; le 7,
la chaine instable, rendue deterministe. Un point qui s'est realise et qui a
ete traite vaut mieux qu'une liste theorique.

2. Les creux sont surveilles : le catalogue externe et la base, en haut a
gauche, ont un impact fort et une probabilite faible, d'ou une parade
preventive, cache et saisie manuelle pour l'un, sauvegarde nocturne relue et
restauree chaque nuit pour l'autre, le palier gratuit de la base n'offrant
aucun instantane. Le 6, absence de deploiement progressif, est une faiblesse
assumee : test de fumee bloquant, retour arriere par redeploiement de la
revision precedente. La dire ici plutot que de la laisser decouvrir.

3. « Le point 1 est d'une autre nature. » Seul en haut a droite : probabilite
certaine, impact fort, et l'indicateur vaut 1, cette valeur EST le probleme. La
parade ne le supprime pas, elle le rend survivable : tout ce qu'un remplacant
recevrait le premier jour est ecrit et versionne.
-->

---

# 3. Piloter l'avancement : le suivi est dans GitHub

<div class="grid grid-cols-2 gap-8 text-sm mt-4">
<div>

<div class="kpi grid-cols-2">
<div><b>10</b><span>fiches : 5 anomalies, 5 retours d'utilisateurs</span></div>
<div><b>35 / 86</b><span>pull requests fusionnées : revue, intégration</span></div>
<div><b>851</b><span>exécutions de la chaîne, 540 sur master</span></div>
<div><b>11</b><span>releases : points de livraison datés</span></div>
<div><b>160</b><span>tickets au board, un par item de roadmap</span></div>
<div><b>0</b><span>saisie déclarative : la trace naît du geste</span></div>
</div>

</div>
<div>

<div class="chips">
<div><span>Une version = un lot fermé</span><u>branche de version, release étiquetée</u></div>
<div><span>Un item = un ticket, phase par phase</span><u>board, une branche par feature</u></div>
<div><span>Priorisation permanente</span><u>roadmap réordonnée par commit</u></div>
<div><span>Sortie = déployé et vérifié</span><u>fusion → déploiement → test de fumée</u></div>
<div><span>Le run en flux, hors version</span><u>fiche étiquetée, branche fix, version corrective</u></div>
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
la propriete de la methode du chapitre 2 et ce que l'outil fournit. Insister sur
la premiere : une version est un lot ferme, et l'outil le materialise par une
branche de version et une release etiquetee sur le commit deploye. Un outil a
sprints aurait impose une cadence que le temps libre ne permet pas de tenir, et
aurait produit des indicateurs faux.

Les six chiffres de gauche sont les six surfaces de GitHub, releves le 12
septembre : 10 fiches, dont 5 anomalies toutes closes ; 86 pull requests dont
35 fusionnees, 26 humaines sur 27 et 9 de mise a jour de dependances sur 59 ;
851 executions de la chaine dont 540 sur master ; 11 releases ; 160 tickets au
board ; et zero saisie declarative.

SI ON QUESTIONNE la date du board : il consolide la roadmap, qui est versionnee
et datee au commit. La matiere est datee au geste pres, 1 070 commits, 86 pull
requests, 851 executions, 11 releases, toutes horodatees au moment ou elles se
sont produites. Le board change la lisibilite de cette matiere, il ne la cree
pas.

SI ON QUESTIONNE : « pourquoi pas Jira ou Trello ? » La saisie declarative. Pas
« c'etait plus simple ».

= = =

CRITERE : les indicateurs sont mesurables et quantifiables, et permettent de
suivre les DELAIS, les COUTS et l'AVANCEMENT.

La methode de selection se dit, rien n'est a l'ecran : un indicateur entre au
tableau de bord s'il est mesurable sans saisie, quantifiable, rattache a une
decision, et reproductible par un tiers depuis le depot public. Les valeurs
sont sur les deux diapos qui suivent, ne pas les anticiper ici.

Dire les quatre conditions en appuyant sur la TROISIEME : « un indicateur sans
decision associee est un ornement ». C'est la condition qui a fait le tri.

Puis annoncer les cinq axes, qui sont exactement les cinq que la grille demande,
avancement, couts, delais, risques, ressources humaines, et dire qu'ils
arrivent sur les deux diapos suivantes, l'une pour l'avancement et les delais,
l'autre pour les couts, les risques et les ressources.

LE GESTE QUI COMPTE : citer les trois indicateurs ECARTES et pourquoi : la
velocite par sprint, parce qu'il n'y a pas de sprint ; le temps de cycle d'une
fiche, parce que l'entree en flux n'est horodatee de facon fiable que depuis
aout ; la charge ressentie, parce qu'elle n'est pas quantifiable. Un candidat
qui dit ce qu'il n'a pas su mesurer est plus credible qu'un candidat dont tous
les voyants sont au vert. C'est trente secondes bien depensees.
-->

---

# Tableau de bord : avancement et délais

<div class="grid grid-cols-5 gap-5">
<div class="col-span-3">

<div class="text-xs opacity-75 mb-1">Commits intégrés sur la branche principale : <b>1 070</b></div>
<div class="cols" style="height:4.6rem">
<div><i style="height:0%"></i></div>
<div><i style="height:10%"></i></div>
<div><i style="height:26%"></i></div>
<div><em>150</em><i style="height:55%"></i></div>
<div><em>227</em><i style="height:83%"></i></div>
<div><i style="height:71%"></i></div>
<div><i style="height:47%"></i></div>
<div><em>272</em><i style="height:100%"></i></div>
</div>

<div class="text-xs opacity-75 mt-3 mb-1">Fusions sur la branche principale : <b>187</b></div>
<div class="cols" style="height:4.6rem">
<div><i class="b" style="height:0%"></i></div>
<div><i class="b" style="height:0%"></i></div>
<div><i class="b" style="height:1%"></i></div>
<div><i class="b" style="height:8%"></i></div>
<div><em>39</em><i class="b" style="height:55%"></i></div>
<div><em>52</em><i class="b" style="height:73%"></i></div>
<div><i class="b" style="height:25%"></i></div>
<div><em>71</em><i class="b" style="height:100%"></i></div>
</div>
<div class="xlab">
<div>fév.</div><div>mars</div><div>avril</div><div>mai</div><div>juin</div><div>juil.</div><div>août</div><div>sept.</div>
</div>

</div>
<div class="col-span-2 text-sm">

### Cadence de livraison

<div class="kpi grid-cols-2 mb-3">
<div><b>14 j</b><span>écart médian entre deux versions</span></div>
<div><b>4 / 4</b><span>échéances de restitution tenues, écart 0</span></div>
</div>

| Version | Date | Écart |
|---------|------|------:|
| 0.1.0 → 1.0.0 | 27/02 → 19/05 | **81 j** |
| 1.0.0 → 1.3.2 | mai → juillet | 6 à 19 j |
| 1.3.2 → 1.4.0 | 25/07 → 25/08 | 31 j |
| 1.4.0 → 1.5.0 | 25/08 → 07/09 | 10 et 3 j |
| 1.5.0 → 1.6.0 | 07/09 → 12/09 | 5 j |

</div>
</div>

<!--
DUREE 1:10. CRITERE : le tableau de bord integre l'avancement et le suivi des
delais.

Ne PAS commenter les huit mois un par un. Deux lectures, pas plus :

1. Le pic de fusions de juin, 6 puis 39, alors que les commits ne passent que
de 150 a 227. Ce qui a change c'est la pratique de decoupage, pas la production.
Le dire AVANT que le jury le remarque : c'est ce qui prouve qu'on lit ses propres
indicateurs au lieu de les afficher. Septembre, 272 commits et 71 fusions en
douze jours, c'est la meme pratique a plein regime : trois versions livrees,
1.4.1, 1.5 et 1.6.

2. Les 81 jours entre le prototype et la V1. Seul intervalle anormal, il contient
la migration de l'API, et c'est lui qui a rendu l'arbitrage visible. Annoncer le
chapitre 4 ici. Depuis, onze versions en cent seize jours : mediane de 14 jours
entre deux versions.

Sur les echeances : ecart zero sur les quatre, et deux d'entre elles sont
HORODATEES dans le depot, passe finale du dossier Bloc 2 le 23/07, export PDF du
Bloc 4 le 21/08. Ce n'est pas de la discipline, c'est de la methode : le
retroplanning traite ces dates comme des fins de lot, et c'est le PERIMETRE de la
version qui absorbe la variation, jamais la date. La preuve : quand la capacite
s'est reduite en aout, c'est l'intervalle entre versions qui s'est allonge,
31 jours.

SI ON QUESTIONNE le creux d'aout : il est voulu, le perimetre produit se referme
au profit du dossier du Bloc 4, remis le 21 ; 140 commits du projet sont de la
documentation, et la moitie tombe autour des deux remises de dossier.
-->

---

# Tableau de bord : coûts, risques, ressources

<div class="grid grid-cols-3 gap-5 text-sm">
<div>

### Coûts, prévu / réel

| Poste | Prévu | Réel |
|-------|------:|-----:|
| Infrastructure | 1 à 5 €/mois | **0 €** |
| Nom de domaine | ≈ 10 €/an | **≈ 10 €** |
| Assistant de code | non prévu | **100 €/mois**, 300 € |

</div>
<div>

### Risques

<div class="chips">
<div><span>Vulnérabilités ouvertes</span><u style="color:var(--ok)">0 ✓</u></div>
<div><span>Couverture de tests</span><u style="color:var(--ok)">88,1 % ✓</u></div>
<div><span>Quality Gate</span><u style="color:var(--ok)">A/A/A ✓</u></div>
<div><span>Disponibilité</span><u style="color:var(--ok)">100 % ✓</u></div>
<div><span>Erreurs serveur</span><u style="color:var(--ok)">0,026 % ✓</u></div>
<div><span>Anomalies ouvertes</span><u style="color:var(--ok)">0 / 5 ✓</u></div>
<div><span>Stabilité de la chaîne</span><u style="color:#b45309">64 % ⚠ alerte</u></div>
<div><span>Facteur de bus</span><u style="color:#b45309">1 ⚠ alerte</u></div>
</div>

</div>
<div>

### Stabilité de la chaîne

<div class="cols" style="height:6.2rem;position:relative">
<div style="position:absolute;left:0;right:0;bottom:80%;top:auto;height:0;flex:none;border-top:1px dashed #94a3b8;z-index:1"></div>
<div><em>39 %</em><i style="height:39%;background:#d97706"></i></div>
<div><em>69 %</em><i style="height:69%;background:#d97706"></i></div>
<div><em>56 %</em><i style="height:56%;background:#d97706"></i></div>
<div><em>54 %</em><i style="height:54%;background:#d97706"></i></div>
<div><em>94 %</em><i style="height:94%"></i></div>
<div><em>78 %</em><i style="height:78%;background:#d97706"></i></div>
<div><em>67 %</em><i style="height:67%;background:#d97706"></i></div>
</div>
<div class="xlab">
<div>mars<br><span class="opacity-60">28</span></div><div>avril<br><span class="opacity-60">40</span></div><div>mai<br><span class="opacity-60">80</span></div><div>juin<br><span class="opacity-60">153</span></div><div>juil.<br><span class="opacity-60">100</span></div><div>août<br><span class="opacity-60">38</span></div><div>sept.<br><span class="opacity-60">86</span></div>
</div>

</div>
</div>

<div class="text-xs opacity-75 mt-4 mb-1">Ressources humaines</div>
<div class="kpi grid-cols-5">
<div><b>95 / 198</b><span>jours actifs</span></div>
<div><b>3,3</b><span>jours par semaine</span></div>
<div><b>0 à 7</b><span>amplitude hebdomadaire</span></div>
<div><b>12</b><span>jours consécutifs, série maximale</span></div>
<div><b>5</b><span>semaines à zéro</span></div>
</div>

<!--
DUREE 1:10. CRITERE : le tableau de bord integre le suivi des COUTS, des RISQUES
et des RESSOURCES HUMAINES. Les trois axes restants du critere sont ici.

COUTS, une phrase : le budget tient parce qu'il a ete concu pour tenir, avec une
contrepartie technique assumee, le demarrage a froid de 3,8 s. Le seul poste
non prevu au cadrage est l'assistant de code, 100 euros par mois depuis juin :
c'est aussi la seule depense reelle du projet, et elle est dite comme telle.
Puis le point de pilotage : deux echeances de cout suivies alors qu'elles
valent zero aujourd'hui, la fin des douze mois gratuits du front et les 512 Mo
de la base.

RISQUES : ne pas parcourir la colonne. Aller aux DEUX voyants oranges. Le
premier, la stabilite de la chaine, est celui qui prouve la boucle mesure ->
decision -> effet remesure : 54 % en juin, correction, 94 % en juillet. C'est
l'histogramme de droite, et c'est la seule chose a commenter de ce cote. Les
autres voyants sont releves le 12 septembre : Sonar a 88,1 % de couverture et
porte verte, zero vulnerabilite et zero alerte d'analyse de code ouvertes, les
cinq anomalies closes ; disponibilite et erreurs serveur sont les mesures de
production du dossier Bloc 4, trente jours au 5 septembre.

RH : c'est la transition vers le chapitre 5. La phrase a dire : « une semaine a
sept jours travailles suivie d'une semaine a zero tient sur sept mois de projet
etudiant, elle ne tient pas sur une exploitation dans la duree. » La serie
maximale, douze jours, est celle qui se termine aujourd'hui : trois versions
et l'oral dans la meme quinzaine.

SI ON QUESTIONNE : « votre chaine echoue une fois sur trois. » Sur la fenetre
complete oui, 64 % sur 529 executions conclusives. La serie mensuelle est plus
parlante : 39 % en mars quand la chaine se construit, 94 % en juillet apres la
decision, 78 % en aout, 67 % en septembre. Septembre est compte hors quinze
executions qui n'ont jamais demarre, sans rapport avec le code ; elles se
reconnaissent a leur duree, deux secondes.
-->

---

# L'écart n'est pas où on le cherche

<div class="grid grid-cols-2 gap-6">
<div>

<div class="text-sm mb-1">Charge : <b>98 J/H prévus</b> → <b>95 jours actifs</b> reconstitués, soit <b>−3 %</b>, dans la marge de 20 %.</div>

<div class="text-xs opacity-75 mb-1">Où sont passés les 95 jours actifs</div>
<div class="stack">
<i style="width:24%;background:var(--s1)">23 j, 24 %</i>
<i style="width:76%;background:#d97706">72 j, 76 %</i>
</div>

<div class="text-xs opacity-75 mt-4 mb-1">D'où viennent les 81 items produit livrés</div>
<div class="stack">
<i style="width:28.4%;background:var(--s1)">23 items</i>
<i style="width:71.6%;background:#d97706">58 items, 72 %</i>
</div>

<div class="legend mt-2">
<span style="--c:var(--s1)">Lots 1 à 3, chiffrés au cadrage</span>
<span style="color:#d97706">Après la V1 : V1.1 à V1.6, hors chiffrage, et la clôture du titre</span>
</div>

</div>
<div class="text-sm">

### Trois décisions, effet remesuré

| Mesure | Décision | Effet remesuré |
|--------|----------|----------------|
| Chaîne à 54 %, échecs sans cause réelle | Portes de qualité bloquantes **et** déterministes | **94 %** le mois suivant |
| 59 PR de dépendances pour 9 fusionnées | Regroupement mensuel, audit à chaque commit | **0 vulnérabilité** ouverte, sans fusion non relue |
| Accueil affiché en 4,2 s, porte de performance rouge | Coquille de démarrage dans le HTML initial | **2,3 s**, porte verte |

</div>
</div>

<!--
DUREE 1:30. C'est la diapo qui prouve que le suivi a servi a DECIDER et pas
seulement a mesurer. Elle amene le chapitre 4.

Trois temps, sans lire les tableaux :

1. Les deux barres de gauche. « L'ecart de charge est de moins 3 %, dans la
marge. Ce n'est pas la bonne lecture. » Puis designer les barres orange : 76 %
des jours actifs sont posterieurs a la V1, et 72 % du produit final est HORS du
chiffrage initial, 58 items sur 81. La derive n'etait pas une derive de charge,
c'etait un glissement de perimetre que rien ne mesurait.

2. Les trois decisions. C'est le coeur de la competence : chaque ligne est une
mesure, une decision, et un effet REMESURE ensuite. Ne pas en developper plus
d'une. La deuxieme est la plus parlante : cinquante pull requests ouvertes puis
fermees sans fusion ne sont pas un gaspillage, c'est le symptome qu'un
automatisme etait mal regle. L'indicateur a servi a regler la frequence de
l'automatisme, pas a juger le travail. La troisieme est la plus recente : la
porte de performance passait au rouge sur l'accueil, 4,2 s pour peindre le plus
grand element ; le titre est peint dans le HTML initial depuis la 1.6, 2,3 s,
porte verte.

3. L'autocritique, sans support : aucun indicateur ne comparait le perimetre
courant au perimetre chiffre, le glissement de 58 items n'a ete visible qu'a
posteriori, et c'est le premier compteur que j'ajouterais. Ne pas l'escamoter,
c'est elle qui rend les deux premiers temps credibles.

SI ON QUESTIONNE : « comment reconstituez-vous 95 J/H sans releve de temps ? »
Par les jours distincts portant au moins un commit, 1 jour actif pour 1 J/H,
incertitude d'au moins 20 %. La reconstitution est FAIBLE sur les cinq premieres
semaines, ou les commits etaient groupes, le premier commit du projet porte
3 400 lignes a lui seul. La charge reelle est vraisemblablement SUPERIEURE a 95.
Un indicateur ne mesure que la pratique qui le produit.
-->
