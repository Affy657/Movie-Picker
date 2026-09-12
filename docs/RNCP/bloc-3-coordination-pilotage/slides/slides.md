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

<div class="chips mt-4" style="font-size:0.98rem;gap:0.45rem 0;max-width:46rem;margin-left:auto;margin-right:auto">
<div><span><b>1.</b> Démonstration en production</span><u>C3.4.2, éliminatoire</u></div>
<div><span><b>2.</b> La méthode et les outils</span><u>C3.1, C3.2.1</u></div>
<div><span><b>3.</b> Les versions : planning et cadence</span><u>C3.1, C3.2.1</u></div>
<div><span><b>4.</b> Les lots et l'avancement</span><u>C3.1, C3.2.1</u></div>
<div><span><b>5.</b> Les ressources et les rôles</span><u>C3.1, C3.2.1</u></div>
<div><span><b>6.</b> Les moyens et les coûts</span><u>C3.1, C3.2.1</u></div>
<div><span><b>7.</b> Les risques</span><u>C3.1, C3.2.1</u></div>
<div><span><b>8.</b> Un cas d'arbitrage</span><u>C3.2.2</u></div>
<div><span><b>9.</b> Les compétences, avant et après</span><u>C3.3.2</u></div>
<div><span><b>10.</b> Piloter le travail, seul</span><u>C3.3.1</u></div>
<div><span><b>11.</b> Rendre compte, et la validation du périmètre livré</span><u>C3.4.1, C3.4.2</u></div>
</div>

<!--
DUREE 0:40. AVANT LA DEMONSTRATION. RIEN D'AUTRE A L'ECRAN QUE LE SOMMAIRE :
TOUT CE QUI SUIT SE DIT. DIAPO CRITIQUE POUR LES 15 MINUTES DE QUESTIONS.

Dire la phrase telle quelle : « Le projet a ete mene seul, du 27 fevrier au
16 septembre : developpeur, architecte, exploitant et chef de projet. Je ne
vais pas vous presenter une equipe que je n'ai pas eue. Je vais vous montrer
comment j'ai travaille seul et, la ou le referentiel suppose une equipe, ce
que j'ai fait a la place et ce qui n'a pas d'equivalent. »

Puis le sommaire, une phrase par theme au plus. Dire que le plan suit les
THEMES du pilotage et non l'ordre des competences, pour ne rien dire deux fois :
chaque diapo porte en pied de page les competences qu'elle sert, et les trois
competences eliminatoires, C3.1, C3.2.1 et C3.4.2, sont couvertes par les
themes 1 a 8 et 11.

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

# 2. Un V par version, un flux pour le run, un board

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

<div class="text-xs opacity-75 mb-1">Le board GitHub Projects, une colonne par phase</div>
<div class="board">
<div><b>Backlog</b><i></i><i></i><i></i></div>
<div><b>Cadrage</b><i></i><i></i></div>
<div><b>Maquette</b><i></i></div>
<div><b>Dev</b><i></i></div>
<div><b>Revue, tests</b><i></i></div>
<div><b>Recette</b><i></i></div>
<div class="done"><b>Livré</b><i></i><i></i><i></i><i></i></div>
</div>

<div class="text-xs opacity-75 mt-3 mb-1">Le suivi est dans GitHub, six surfaces, zéro saisie</div>
<div class="kpi grid-cols-3" style="gap:0.35rem 0.5rem;line-height:1.25">
<div><b style="font-size:1.2rem">160</b><span>tickets au board</span></div>
<div><b style="font-size:1.2rem">11</b><span>releases datées</span></div>
<div><b style="font-size:1.2rem">10</b><span>fiches, 5 anomalies</span></div>
<div><b style="font-size:1.2rem">35 / 86</b><span>pull requests fusionnées</span></div>
<div><b style="font-size:1.2rem">851</b><span>exécutions de la chaîne</span></div>
<div><b style="font-size:1.2rem">0</b><span>saisie déclarative</span></div>
</div>

<div class="chips mt-3">
<div><span><b>Périmètre figé</b> par version</span><u>livrable daté, notes de version</u></div>
<div><span><b>Correctif</b> sans attendre la version</span><u>bug corrigé en un jour</u></div>
<div><span><b>Écartés</b></span><u>Scrum, V intégral, outil de suivi séparé</u></div>
</div>

</div>
</div>

<!--
DUREE 2:20. ELEMENTS IMPOSES 1, 2 ET 4 : la methodologie, l'outil de
planification, l'outil de suivi. CRITERES : le choix est justifie AVEC LES
BENEFICES ATTENDUS ; l'outil de planification est argumente et compatible avec
la methodologie ; l'outil de suivi est en adequation avec le projet et la
methodologie. Une seule diapo pour les trois, pour ne le dire qu'une fois.

La methode se dit en une phrase : « un cycle en V pour chaque version, un flux
pour le run ». Le V a gauche : une version part de la roadmap avec un objectif,
des items et une taille par item, donc un poids par version ; chaque item passe
par un cadrage par questions, une maquette si l'ecran est nouveau, une
realisation ou le test est ecrit avant le code, puis remonte la branche droite :
verification par la chaine et la revue, validation par un test manuel avant la
fusion, livraison par une release datee. Le trait pointille entre les deux
branches EST le cycle en V : chaque niveau de gauche est verifie par son
vis-a-vis de droite.

Le run, en bas : un signal de production ou d'un utilisateur, une fiche
etiquetee avec sa severite, une branche de correctif fusionnee sur master, une
version corrective. Il ne passe pas par le V, et c'est voulu.

LES BENEFICES, avec les chiffres : le V par version fige un perimetre, donc
chaque version a une date et des notes, onze versions livrees ; le flux du run
corrige sans attendre la version suivante, une anomalie de production ouverte
et corrigee le meme jour en juillet, livree le lendemain.

ECARTES, sans mepris : Scrum, parce que ses ceremonies n'ont pas
d'interlocuteur a une personne, on garde le decoupage et la revue, pas les
rituels ; le cycle en V integral, parce qu'il aurait fige tout le perimetre
avant les mesures de production, alors que la 1.4 corrige des hypotheses que
l'usage reel a invalidees ; un outil de suivi separe du depot, parce qu'il
impose une double saisie.

= = =

L'OUTIL, a droite, sert a la fois a planifier et a suivre, et c'est le meme :
le board GitHub Projects, un ticket par item de roadmap avec sa version, sa
taille et sa phase. Les colonnes du board SONT les phases du V, c'est ce qui
fait la compatibilite avec la methode : un ticket ne saute pas de colonne, il
passe par la maquette quand l'ecran est nouveau, par la revue avant la recette.
Au-dessus du board, deux outils a l'echelle des versions : le retroplanning
depuis les quatre echeances du titre, qui transforme une date imposee en date
de fin de version, et le Gantt des versions, diapo suivante. Ils placent les
versions, le board porte l'etat des tickets : c'est cette difference d'echelle
qui les rend compatibles.

Le suivi tient dans la meme plateforme, six surfaces, releves le 12 septembre :
160 tickets, 11 releases, 10 fiches dont 5 anomalies toutes closes, 86 pull
requests dont 35 fusionnees, 26 humaines sur 27 et 9 de mise a jour de
dependances sur 59, 851 executions de la chaine dont 540 sur master. Et zero
saisie declarative : la phrase a dire telle quelle, « un outil de suivi
exterieur au depot impose une double saisie, et la double saisie est la
premiere chose abandonnee sous pression sur un projet a une personne. Un
indicateur abandonne sous pression est un indicateur qui ment exactement au
moment ou on en a besoin. »

LES INDICATEURS, regle de selection, rien n'est a l'ecran : un indicateur entre
au tableau de bord s'il est mesurable sans saisie, quantifiable, rattache a une
decision, et reproductible par un tiers depuis le depot public. Appuyer sur la
troisieme : « un indicateur sans decision associee est un ornement ». Les cinq
axes de la grille, avancement, delais, couts, risques, ressources humaines,
sont repartis sur les diapos qui suivent, chacun avec le theme qu'il mesure.
Citer les trois indicateurs ECARTES : la velocite par sprint, il n'y a pas de
sprint ; le temps de cycle d'une fiche, l'entree en flux n'est horodatee de
facon fiable que depuis aout ; la charge ressentie, non quantifiable.

SI ON QUESTIONNE la date du board : il consolide la roadmap, versionnee et
datee au commit. La matiere est datee au geste pres, 1 070 commits, 86 pull
requests, 851 executions, 11 releases. Le board change la lisibilite de cette
matiere, il ne la cree pas.

SI ON QUESTIONNE « pourquoi pas Jira ? » : la saisie declarative, et le board
vit la ou le code vit, la fiche, la branche, la PR et la release au meme
endroit, la trace nait du geste.
-->

---

# 3. Le planning : une ligne par version

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
.gantt .row { display: flex; align-items: center; gap: 0.6rem; margin-bottom: 0.28rem; }
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

<div class="kpi grid-cols-4 mt-2" style="gap:0.3rem 0.8rem;line-height:1.25">
<div><b style="font-size:1.25rem">11</b><span>versions publiées depuis le 27/02</span></div>
<div><b style="font-size:1.25rem">14 j</b><span>écart médian entre deux versions</span></div>
<div><b style="font-size:1.25rem">4 / 4</b><span>échéances du titre tenues, écart 0</span></div>
<div><b style="font-size:1.25rem">81 j</b><span>le seul écart anormal, 0.1 → 1.0</span></div>
</div>

<!--
DUREE 1:40. ELEMENT IMPOSE 2 (suite). CRITERES : le planning est decoupe en
phases et permet de visualiser l'ETUDE, la MESURE, la CONCEPTION, la
REALISATION, la RESTITUTION ; le tableau de bord integre le suivi des DELAIS.
Quatre phases sont dessinees ; l'etude, le cadrage de la version dans la
roadmap, se nomme a voix haute en ouvrant la diapo.

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
  et retours ; c'est ce qui alimente le cadrage de la suivante.

LE POINT A NE PAS MANQUER : les lignes se chevauchent, la conception de la
suivante pendant la mesure de la precedente, et c'est ce qui distingue un V par
version d'un cycle en V unique. Un seul V sur sept mois aurait fige en fevrier
ce que la production a corrige en aout.

Deux lignes n'ont pas de conception : les versions correctives, 1.3.1, 1.3.2
et 1.4.1, qui sont le run en flux de la diapo precedente.

LES DELAIS, les quatre chiffres du bas : onze versions, une mediane de 14 jours
entre deux versions ; les quatre echeances du titre tenues, ecart zero, et deux
d'entre elles sont HORODATEES dans le depot, passe finale du dossier Bloc 2 le
23/07, export PDF du Bloc 4 le 21/08. Ce n'est pas de la discipline, c'est de
la methode : le retroplanning traite ces dates comme des fins de lot, et c'est
le PERIMETRE de la version qui absorbe la variation, jamais la date. La preuve :
quand la capacite s'est reduite en aout, c'est l'intervalle entre versions qui
s'est allonge, 31 jours. Le seul ecart anormal, 81 jours entre le prototype et
la V1, contient la migration de l'API : c'est lui qui a rendu l'arbitrage
visible, theme 8.

Les echeances du titre ne sont pas dessinees, elles se disent : le Bloc 1 le
11 juin tombe le jour de la 1.2, le Bloc 4 le 21 aout quatre jours avant la
1.4.

SI ON QUESTIONNE : « vos documents de cadrage sont dates de juin, votre etude de
mars. » Les decisions ont ete prises en mars et avril, elles sont dans la
roadmap et dans le code ; leur formalisation en dossier est de juin pour le
Bloc 1. La decision precede le document.
-->

---

# 4. Huit lots, et l'avancement mois par mois

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

<div class="grid grid-cols-2 gap-6 mt-6">
<div>

<div class="text-xs opacity-75 mb-1">Commits intégrés sur la branche principale : <b>1 070</b></div>
<div class="cols" style="height:6.4rem">
<div><i style="height:0%"></i></div>
<div><i style="height:10%"></i></div>
<div><i style="height:26%"></i></div>
<div><em>150</em><i style="height:55%"></i></div>
<div><em>227</em><i style="height:83%"></i></div>
<div><i style="height:71%"></i></div>
<div><i style="height:47%"></i></div>
<div><em>272</em><i style="height:100%"></i></div>
</div>



</div>
<div>

<div class="text-xs opacity-75 mb-1">Fusions sur la branche principale : <b>187</b></div>
<div class="cols" style="height:6.4rem">
<div><i class="b" style="height:0%"></i></div>
<div><i class="b" style="height:0%"></i></div>
<div><i class="b" style="height:1%"></i></div>
<div><i class="b" style="height:8%"></i></div>
<div><em>39</em><i class="b" style="height:55%"></i></div>
<div><em>52</em><i class="b" style="height:73%"></i></div>
<div><i class="b" style="height:25%"></i></div>
<div><em>71</em><i class="b" style="height:100%"></i></div>
</div>


</div>
</div>
<div class="grid grid-cols-2 gap-6">
<div><div class="xlab">
<div>fév.</div><div>mars</div><div>avril</div><div>mai</div><div>juin</div><div>juil.</div><div>août</div><div>sept.</div>
</div></div>
<div><div class="xlab">
<div>fév.</div><div>mars</div><div>avril</div><div>mai</div><div>juin</div><div>juil.</div><div>août</div><div>sept.</div>
</div></div>
</div>

<div class="kpi grid-cols-4 mt-6" style="gap:0.3rem 0.8rem;line-height:1.25">
<div><b style="font-size:1.25rem">1 à 3 jours</b><span>une feature, de la maquette à la fusion</span></div>
<div><b style="font-size:1.25rem">1 à 3 semaines</b><span>une version, en réalisation</span></div>
<div><b style="font-size:1.25rem">6 puis 39</b><span>fusions en mai puis juin : le découpage change, pas la production</span></div>
<div><b style="font-size:1.25rem">58 / 81</b><span>items produit hors du chiffrage initial, 95 jours actifs pour 98 prévus</span></div>
</div>

<!--
DUREE 1:50. CRITERES : le planning est decoupe en phases, en taches ou LOTS ;
le tableau de bord integre l'AVANCEMENT du projet, et l'ecart au previsionnel.

La barre du haut : les lots sont les versions, et chaque version est un lot
ferme, avec ses items et leur taille, donc un poids, la somme des tailles,
S 1, M 3, L 8, XL 20. C'est ce poids qui sert a comparer deux versions et a
decider d'y ajouter ou d'en retirer un item. Dire les ordres de grandeur, pas
les huit chiffres : 106 items livres, produit et technique, 348 points, entre
26 et 68 par version ; une feature tient en un a trois jours, une version en
une a trois semaines de realisation. Le chiffrage du cadrage, 98 jours-homme
sur quatre lots, est celui du Bloc 1 ; il sert de reference a l'ecart du
theme 8, pas de decoupage ici.

L'AVANCEMENT, en bas : 1 070 commits et 187 fusions sur la branche principale,
mois par mois. Ne PAS commenter les huit mois un par un. Deux lectures :

1. Le pic de fusions de juin, 6 puis 39, alors que les commits ne passent que
de 150 a 227. Ce qui a change c'est la pratique de decoupage, pas la production.
Le dire AVANT que le jury le remarque : c'est ce qui prouve qu'on lit ses
propres indicateurs au lieu de les afficher. Septembre, 272 commits et 71
fusions en douze jours, c'est la meme pratique a plein regime : trois versions
livrees, 1.4.1, 1.5 et 1.6.

2. Le creux d'aout est voulu : le perimetre produit se referme au profit du
dossier du Bloc 4, remis le 21 ; 140 commits du projet sont de la
documentation, et la moitie tombe autour des deux remises de dossier.

L'ECART AU CHIFFRAGE, le dernier chiffre, une lecture en deux phrases : « la
charge est dans l'enveloppe, 95 jours actifs pour 98 prevus, moins 3 %. Ce
n'est pas la bonne lecture : 58 des 81 items produit livres sont HORS du
chiffrage initial, qui s'arretait a la V1. » La derive n'etait pas une derive
de charge, c'etait un glissement de perimetre que rien ne mesurait : aucun
indicateur ne comparait le perimetre courant au perimetre chiffre, et c'est le
premier compteur que j'ajouterais. Le dire soi-meme vaut mieux que de le
laisser trouver.

SI ON QUESTIONNE « comment reconstituez-vous 95 jours sans releve de temps ? »
Par les jours distincts portant au moins un commit, un jour actif pour un
jour-homme, incertitude d'au moins 20 %. La reconstitution est FAIBLE sur les
cinq premieres semaines, ou les commits etaient groupes, le premier commit du
projet porte 3 400 lignes a lui seul : la charge reelle est vraisemblablement
superieure. Un indicateur ne mesure que la pratique qui le produit.

SI ON QUESTIONNE le poids en points : l'echelle est celle de la roadmap,
calibree sur l'empreinte reelle des features livrees, S sous 800 lignes, M
jusqu'a 2 000, L jusqu'a 5 000. Elle compare, elle ne chiffre pas.
-->

---

# 5. La matrice RACI : quatre rôles, une personne

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

<div class="kpi grid-cols-5 mt-2" style="gap:0.3rem 0.6rem;line-height:1.25">
<div><b style="font-size:1.2rem">1 personne</b><span>temps libre, soirs et week-ends</span></div>
<div><b style="font-size:1.2rem">95 / 198</b><span>jours actifs, 3,3 par semaine</span></div>
<div><b style="font-size:1.2rem">0 à 7</b><span>jours par semaine, amplitude</span></div>
<div><b style="font-size:1.2rem">12</b><span>jours consécutifs au plus</span></div>
<div><b style="font-size:1.2rem">5</b><span>semaines à zéro, avant mai</span></div>
</div>

<div class="chips mt-2" style="max-width:44rem">
<div><span><b>Quatre rôles</b>, une personne : le A et le R changent de casquette, pas de personne</span><u>affectation par compétence</u></div>
<div><span><b>Handicap</b> : aucune personne concernée sur le projet</span><u>porte d'accessibilité bloquante</u></div>
</div>

<!--
DUREE 1:30. ELEMENT IMPOSE 3 : les ressources necessaires, ici les humaines.
CRITERES : les taches sont assignees selon les competences (RACI) ET tiennent
compte des personnes en situation de handicap ; le tableau de bord integre les
RESSOURCES HUMAINES.

Ne pas lire la matrice. Dire ce qu'elle montre : une personne, quatre roles, et
l'affectation suit la competence que chaque activite exige. Le product owner
approuve le cadrage et la recette parce qu'il porte le besoin ; le developpeur
realise et approuve l'architecture ; le DevOps approuve l'integration et
realise la mise en production ; le chef de projet arbitre et approuve la mise en
production. Quand une ligne a un A et un R differents, c'est que la meme
personne change de casquette entre la decision et le geste : c'est ce qui
rend la revue possible a une personne.

Les acteurs externes y figurent : le commanditaire, le formateur puis le jury,
consulte sur le perimetre et les arbitrages, informe des mises en production ;
les 21 utilisateurs, consultes sur l'accessibilite et sur chaque version, qui
font la recette et remontent des retours ; les prestataires qui executent
l'hebergement, le catalogue et les e-mails.

LA CHARGE, les cinq chiffres : une personne sur son temps libre, 95 jours
actifs sur 198, 3,3 par semaine, une amplitude de zero a sept, une serie
maximale de douze jours consecutifs qui se termine aujourd'hui, trois versions
et l'oral dans la meme quinzaine, cinq semaines a zero, toutes avant mai. Ce
ne sont pas des chiffres de productivite, ce sont des chiffres de
soutenabilite, et la phrase a dire : « une semaine a sept jours travailles
suivie d'une semaine a zero tient sur sept mois de projet etudiant, elle ne
tient pas sur une exploitation dans la duree. » C'est ce qui amene le theme 10.

Sur le handicap, dire la verite en une phrase : personne en situation de
handicap sur le projet. Puis ce qui est verifiable : la ligne accessibilite a
un A et un R, la porte d'accessibilite est bloquante a chaque livraison, et le
contexte du projet est en texte structure, lisible au lecteur d'ecran. La ligne
existe et elle a un responsable, ce n'est pas une clause de style.

SI ON QUESTIONNE « une RACI a une personne, a quoi ca sert ? » : a ecrire qui
decide et qui fait pour chaque activite, donc a savoir ce qu'on confierait en
premier le jour ou quelqu'un rejoint le projet : la colonne Dev, puis DevOps.
-->

---

# 6. Les moyens : ce projet n'a coûté que ses outils

<div class="grid grid-cols-2 gap-8 mt-4">
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

### Financières, prévu / réel

| Poste | Prévu | Réel |
|-------|------:|-----:|
| Salaire | 0 € | **0 €**, le temps est le mien |
| Infrastructure | 1 à 5 €/mois | **0 €**, paliers gratuits |
| Nom de domaine | ≈ 10 €/an | **≈ 10 €** |
| Assistant de code | non prévu | **100 €/mois**, 300 € |
| Licences | 0 € | **0 €** |

<div class="chips mt-3">
<div><span><b>≈ 310 €</b> engagés sur sept mois</span><u>le seul poste non prévu : l'assistant</u></div>
<div><span>Deux échéances suivies, à 0 € aujourd'hui</span><u>front après 12 mois, base au-delà de 512 Mo</u></div>
</div>

</div>
</div>

<!--
DUREE 1:00. ELEMENT IMPOSE 3 (suite) : les ressources materielles et
financieres. CRITERE : le tableau de bord integre le suivi des COUTS.

MATERIELLES : ne pas enumerer. Un poste, un telephone pour tester le mobile, un
assistant de code, un monorepo outille, une chaine, un hebergement sans
serveur. Dire que l'assistant de code est un outil, comme l'IDE : il ne decide
rien, la revue et la recette restent a la main.

FINANCIERES, et c'est la phrase a dire telle quelle : « ce projet n'a coute
que ses outils ». Aucun salaire, le temps est le mien ; un abonnement de 100
euros par mois depuis juin, 300 euros a ce jour ; une dizaine d'euros de nom de
domaine par an ; tout le reste est dans son palier gratuit, hebergement de l'API
et du front, base, e-mails, supervision. Soit environ 310 euros engages sur
sept mois. L'absence de licence payante est une decision de conception, prise
au cadrage : c'est ce qui rend le service soutenable au-dela du titre.

LE SUIVI, prevu contre reel : le budget tient parce qu'il a ete concu pour
tenir, avec une contrepartie technique assumee, le demarrage a froid de 3,8 s.
Le seul poste non prevu au cadrage est l'assistant de code, et il est dit
comme tel. Puis le point de pilotage : deux echeances de cout suivies alors
qu'elles valent zero aujourd'hui, la fin des douze mois gratuits du front, 1 a
5 euros par mois ensuite, et les 512 Mo de la base, 9 dollars par mois au-dela.
Suivre un cout qui vaut zero, c'est savoir quand il cessera de valoir zero.
-->

---

# 7. Sept points de vigilance, un seul d'organisation

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

<div class="chips" style="font-size:0.88rem;gap:0.55rem 0">
<div><span><b style="color:#b45309">1.</b> <b>Concentration des rôles sur une personne</b></span><u style="color:#b45309">facteur de bus 1 ⚠</u></div>
<div><span><b>2.</b> Sous-estimation des lots documentaires</span><u style="color:var(--ok)">4 / 4 échéances tenues ✓</u></div>
<div><span><b>3.</b> Dépendance au catalogue de films externe</span><u>cache, débit limité, repli manuel</u></div>
<div><span><b>4.</b> Perte de la base, aucun instantané</span><u style="color:var(--ok)">sauvegarde vérifiée chaque nuit ✓</u></div>
<div><span><b>5.</b> Durcissement de la sécurité du contenu</span><u style="color:var(--ok)">traité, disponibilité 100 % ✓</u></div>
<div><span><b>6.</b> Absence de déploiement progressif</span><u style="color:var(--ok)">erreurs serveur 0,026 % ✓</u></div>
<div><span><b>7.</b> Instabilité de la chaîne de vérification</span><u style="color:#b45309">64 %, 94 % en juillet ⚠</u></div>
</div>

<div class="kpi grid-cols-4 mt-4" style="gap:0.3rem 0.5rem;line-height:1.25">
<div><b style="font-size:1.15rem">0</b><span>vulnérabilité ouverte</span></div>
<div><b style="font-size:1.15rem">88,1 %</b><span>couverture de tests</span></div>
<div><b style="font-size:1.15rem">A/A/A</b><span>Quality Gate, vert</span></div>
<div><b style="font-size:1.15rem">0 / 5</b><span>anomalies ouvertes</span></div>
</div>

</div>
</div>

<!--
DUREE 1:30. CRITERES : les points de vigilance sont soulignes (C3.1) ; le
tableau de bord integre le suivi des RISQUES (C3.2.1). Une seule diapo : chaque
point de vigilance porte son indicateur, releve le 12 septembre.

Ne pas lire les sept lignes. La carte a gauche place chaque point par
probabilite et par impact ; la liste a droite donne l'indicateur qui le
surveille, ou la parade quand il n'a pas de valeur. Trois temps :

1. « Six de ces points sont des risques de projet, chacun porte un indicateur
et une parade. » Les pleins se sont realises et ont ete traites : le 5, un
durcissement de la politique de securite du contenu a bloque les affiches de
films et les avatars en production, l'incident et sa correction sont traces,
la disponibilite est a 100 % depuis ; le 2, l'ecart sur les lots documentaires,
absorbe par le retroplanning, quatre echeances sur quatre ; le 7, la chaine
instable, rendue deterministe. Un point qui s'est realise et qui a ete traite
vaut mieux qu'une liste theorique.

2. Les creux sont surveilles : le catalogue externe et la base, en haut a
gauche, ont un impact fort et une probabilite faible, d'ou une parade
preventive, cache et repli manuel pour l'un, sauvegarde nocturne relue et
restauree chaque nuit pour l'autre, le palier gratuit de la base n'offrant
aucun instantane. Le 6, absence de deploiement progressif, est une faiblesse
assumee : test de fumee bloquant, retour arriere par redeploiement de la
revision precedente, 0,026 % d'erreurs serveur sur trente jours. La dire ici
plutot que de la laisser decouvrir.

3. « Le point 1 est d'une autre nature. » Seul en haut a droite : probabilite
certaine, impact fort, et l'indicateur vaut 1, cette valeur EST le probleme. La
parade ne le supprime pas, elle le rend survivable : tout ce qu'un remplacant
recevrait le premier jour est ecrit et versionne. Le theme 10 y revient.

LES QUATRE VOYANTS du bas sont les risques sans point de vigilance dedie,
parce qu'ils sont tenus par la chaine elle-meme : zero vulnerabilite ouverte,
88,1 % de couverture, porte de qualite verte, les cinq anomalies closes.
Disponibilite et erreurs serveur sont les mesures de production du dossier
Bloc 4, trente jours au 5 septembre ; le reste est releve le 12.

SI ON QUESTIONNE : « votre chaine echoue une fois sur trois. » Sur la fenetre
complete oui, 64 % sur 529 executions conclusives depuis mars. La serie
mensuelle est plus parlante : 39 % en mars quand la chaine se construit, 54 %
en juin, 94 % en juillet apres la decision, theme suivant, 78 % en aout, 67 %
en septembre. Septembre est compte hors quinze executions qui n'ont jamais
demarre, sans rapport avec le code ; elles se reconnaissent a leur duree, deux
secondes.
-->

---

# 8. Un cas d'arbitrage : migrer l'API, quand et comment

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
<div><b>1 → 53</b><span>944 lignes à réécrire le 18/03, 50 000 aujourd'hui</span></div>
<div><b>12</b><span>routes réécrites à l'identique</span></div>
<div><b>19/05</b><span>v1.0.0 à la date prévue</span></div>
<div><b>0</b><span>retour arrière, 10 versions depuis</span></div>
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
DUREE 2:20. ELEMENT IMPOSE 5 : un cas d'arbitrage. CRITERES : la problematique
est exposee AVEC SES CONSEQUENCES ; les options sont DETAILLEES ; la decision
est argumentee ET resout la problematique. La grille nomme le LOGIGRAMME : il
est a l'ecran et il se parcourt du doigt.

LA PROBLEMATIQUE, phrase d'ouverture qui desamorce la question piege : « le MVP
a ete livre sur une pile que je ne voulais pas garder pour la suite. L'etude
comparative du Bloc 1 retient .NET, mais elle a ete formalisee en juin : elle
consigne la decision finale, pas la chronologie. La verite est celle de
l'historique. » Premiere case de la frise : la migration est ABSENTE de la
feuille de route quand le MVP est declare termine, et executee deux jours plus
tard. Les quatre exigences que l'API du MVP ne tenait pas : typage arrete a la
compilation, securite fournie par le cadre, socle a support long terme,
architecture en couches. LES CONSEQUENCES : quatre ecarts qui s'accumulent a
chaque version, et un cout de migration qui croit avec le code, rapport de 1 a
53 aujourd'hui. Preciser aussitot que ce rapport est la justification A
POSTERIORI : le 18 mars on savait que le cout croitrait, pas de combien. C'est
la nature d'un arbitrage, decider avec l'information disponible pendant que la
fenetre est ouverte.

LES OPTIONS, une phrase chacune, sans les lire. Le temps utile va a l'option
D, la plus contre-intuitive : elle parait la plus prudente et ne l'est pas, a
effectif 1 la double maintenance s'ajoute au lieu de se repartir, et la
question 4 du logigramme l'ecarte.

LE LOGIGRAMME, parcouru a voix haute sur le chemin du 18 mars : contrat
preservable OUI, grace au contrat OpenAPI de l'API Node ; perimetre fige OUI,
le MVP venait d'etre declare termine ; cout croissant OUI ; charge soutenable
OUI, 13 jours pour un executant ; critere de bascule definissable OUI, la
parite sur les 12 routes. Donc DECIDER MAINTENANT. Insister sur la derniere
branche : parite non verifiee = retour arriere, l'ancien socle restant
deployable. C'est ce qui rendait la decision reversible, et ce qui distingue
un arbitrage d'un pari. Aucune techno n'y figure : il est reutilisable.

LA DECISION ET SON RESULTAT, en un geste : « aucun retour arriere, dix
versions livrees sur ce socle depuis, la V1 a la date prevue ». Le critere de
succes avait ete defini avant : le front ne change pas, parce que les URL et
le format JSON ne changent pas. Le chiffre 87 est OBLIGATOIRE : « aucune
modification du front » annoncee, 87 lignes sur 9 fichiers en realite, et le
lot chiffre 13 jours a posteriori. C'est ce qui distingue un bilan d'un
plaidoyer.

PHRASE DE FIN : « le document d'aide a la decision annoncait que C# serait
plus verbeux. 944 lignes TypeScript sont devenues 4 653 lignes C#, un facteur
4,9. L'inconvenient annonce s'est realise, il avait ete accepte en
connaissance de cause. Un arbitrage dont on peut verifier apres coup que les
inconvenients annonces etaient les bons est un arbitrage instruit. »

SI ON QUESTIONNE « et les autres decisions prises a partir d'une mesure ? » :
trois, chacune avec un effet remesure. La chaine a 54 % en juin, portes
rendues bloquantes et deterministes, 94 % en juillet ; 59 pull requests de
dependances pour 9 fusionnees, regroupement mensuel, zero vulnerabilite
ouverte ; l'accueil a 4,2 s et la porte de performance rouge, le titre peint
dans le HTML initial en 1.6, 2,3 s, porte verte.
-->
