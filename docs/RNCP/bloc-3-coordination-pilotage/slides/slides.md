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
<div><span><b>1.</b> Démonstration en production</span><u>C3.4.2</u></div>
<div><span><b>2.</b> La méthode et les outils</span><u>C3.1, C3.2.1</u></div>
<div><span><b>3.</b> Les versions : planning et cadence</span><u>C3.1, C3.2.1</u></div>
<div><span><b>4.</b> Les lots et l'avancement</span><u>C3.1, C3.2.1</u></div>
<div><span><b>5.</b> Les ressources et les rôles</span><u>C3.1, C3.2.1</u></div>
<div><span><b>6.</b> Les moyens et les coûts</span><u>C3.1, C3.2.1</u></div>
<div><span><b>7.</b> Les risques</span><u>C3.1, C3.2.1</u></div>
<div><span><b>8.</b> Un cas d'arbitrage</span><u>C3.2.2</u></div>
<div><span><b>9.</b> Les compétences : apprises, et à acquérir</span><u>C3.3.2</u></div>
<div><span><b>10.</b> Piloter le travail, seul</span><u>C3.3.1</u></div>
<div><span><b>11.</b> Rendre compte, et le bilan</span><u>C3.4.1, C3.4.2</u></div>
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
themes 1 a 7 et 11.

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
21 comptes, 74 % des soirees menees jusqu'au tirage, mesure du 5 septembre. Puis les six temps du
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

<div class="text-xs opacity-75 mt-3 mb-1">Le suivi est dans GitHub, zéro saisie</div>
<div class="kpi grid-cols-2" style="gap:0.35rem 0.5rem;line-height:1.25">
<div><b style="font-size:1.2rem">160</b><span>tickets au board</span></div>
<div><b style="font-size:1.2rem">11</b><span>releases datées</span></div>
<div><b style="font-size:1.2rem">10</b><span>fiches, dont 5 anomalies</span></div>
<div><b style="font-size:1.2rem">0</b><span>saisie déclarative</span></div>
</div>

<div class="chips mt-3">
<div><span><b>Périmètre figé</b> par version</span><u>livrable daté, notes de version</u></div>
<div><span><b>Correctif</b> sans attendre la version</span><u>0 à 7 jours, cinq anomalies closes</u></div>
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
Au-dessus du board, un outil a l'echelle des versions : le Gantt, diapo
suivante. Il place les versions, le board porte l'etat des tickets : c'est
cette difference d'echelle qui les rend compatibles.

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
<span style="--c:#f59e0b">Release</span>
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

<div class="kpi grid-cols-3 mt-2" style="gap:0.3rem 0.8rem;line-height:1.25">
<div><b style="font-size:1.25rem">11</b><span>versions publiées depuis le 27/02</span></div>
<div><b style="font-size:1.25rem">14 j</b><span>écart médian entre deux versions</span></div>
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

LES DELAIS, les trois chiffres du bas : onze versions, une mediane de 14
jours entre deux versions ; le seul ecart anormal, 81 jours entre le prototype et la V1,
contient la migration de l'API, c'est lui qui a rendu l'arbitrage visible,
theme 8. La date d'une version est posee a la fin de sa conception, et c'est
le PERIMETRE qui absorbe la variation, jamais la date : quand la capacite
s'est reduite en aout, l'intervalle s'est allonge, 31 jours, et le perimetre
de la 1.4 a ete tenu.

SI ON QUESTIONNE le calendrier : aucune date n'est imposee de l'exterieur, il
n'y a pas de commanditaire. Les dates sont les miennes, et elles sont tenues
par la methode, pas par la discipline.
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

<div class="text-xs opacity-75 mt-6 mb-1">Commits intégrés sur la branche principale, mois par mois : <b>1 070</b></div>
<div class="cols" style="height:6.4rem">
<div><i style="height:0%"></i></div>
<div><em>28</em><i style="height:10%"></i></div>
<div><em>72</em><i style="height:26%"></i></div>
<div><em>150</em><i style="height:55%"></i></div>
<div><em>227</em><i style="height:83%"></i></div>
<div><em>194</em><i style="height:71%"></i></div>
<div><em>127</em><i style="height:47%"></i></div>
<div><em>272</em><i style="height:100%"></i></div>
</div>
<div class="xlab">
<div>fév.</div><div>mars</div><div>avril</div><div>mai</div><div>juin</div><div>juil.</div><div>août</div><div>sept.</div>
</div>

<div class="kpi grid-cols-3 mt-6" style="gap:0.3rem 0.8rem;line-height:1.25">
<div><b style="font-size:1.25rem">1 à 3 jours</b><span>une feature, de la maquette à la fusion</span></div>
<div><b style="font-size:1.25rem">1 à 3 semaines</b><span>une version, en réalisation</span></div>
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

<div class="raci mt-2" style="grid-template-columns: 1fr 5rem 5rem 5rem 4.6rem 5.4rem 5.4rem">
<div class="h"></div><div class="h">Chef de projet</div><div class="h">Product owner</div><div class="h">Développeur</div><div class="h">DevOps</div><div class="h">Utilisateurs</div><div class="h">Prestataires</div>
<div class="l">Cadrage et périmètre de version</div><div class="C">C</div><div class="A">A R</div><div class="n"></div><div class="n"></div><div class="C">C</div><div class="n"></div>
<div class="l">Architecture et contrat d'API</div><div class="I">I</div><div class="n"></div><div class="A">A R</div><div class="C">C</div><div class="n"></div><div class="n"></div>
<div class="l">Développement, interface et API</div><div class="n"></div><div class="A">A</div><div class="R">R</div><div class="n"></div><div class="I">I</div><div class="n"></div>
<div class="l">Revue, tests, intégration</div><div class="n"></div><div class="n"></div><div class="R">R</div><div class="A">A</div><div class="n"></div><div class="n"></div>
<div class="l"><b>Accessibilité et inclusion</b></div><div class="n"></div><div class="A">A</div><div class="R">R</div><div class="n"></div><div class="C">C</div><div class="n"></div>
<div class="l">Chaîne, supervision, sécurité</div><div class="I">I</div><div class="n"></div><div class="R">R</div><div class="A">A R</div><div class="n"></div><div class="R">R</div>
<div class="l">Arbitrage de périmètre ou de charge</div><div class="A">A R</div><div class="C">C</div><div class="C">C</div><div class="n"></div><div class="C">C</div><div class="n"></div>
<div class="l">Recette, release, retours</div><div class="C">C</div><div class="A">A R</div><div class="R">R</div><div class="n"></div><div class="C">C</div><div class="n"></div>
<div class="l">Mise en production</div><div class="A">A</div><div class="n"></div><div class="n"></div><div class="R">R</div><div class="I">I</div><div class="R">R</div>
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
<div><b style="font-size:1.2rem">5</b><span>semaines à zéro, toutes avant la V1</span></div>
</div>

<div class="chips mt-2" style="max-width:44rem">
<div><span><b>Quatre rôles</b>, une personne : le A et le R changent de casquette, pas de personne</span><u>affectation par compétence</u></div>
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

Les acteurs externes y figurent : les 21 utilisateurs, consultes sur
l'accessibilite et sur chaque version, qui font la recette et remontent des
retours ; les prestataires qui executent l'hebergement, le catalogue et les
e-mails. Pas de commanditaire : projet personnel, les dates et le perimetre
sont les miens.

LA CHARGE, les cinq chiffres : une personne sur son temps libre, 95 jours
actifs sur 198, 3,3 par semaine, une amplitude de zero a sept, une serie
maximale de douze jours consecutifs, du 1er au 12 septembre, trois versions
et l'oral dans la meme quinzaine, cinq semaines a zero, toutes avant la V1. Ce
ne sont pas des chiffres de productivite, ce sont des chiffres de
soutenabilite, et la phrase a dire : « une semaine a sept jours travailles
suivie d'une semaine a zero tient sur sept mois de projet etudiant, elle ne
tient pas sur une exploitation dans la duree. » C'est ce qui amene le theme 10.

SI ON DEMANDE le handicap : personne en situation de handicap sur le projet,
donc rien a en dire. Ce qui est verifiable est sur le produit : la ligne
accessibilite a un A et un R, et la porte d'accessibilite est bloquante a
chaque livraison.

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
<span style="--c:var(--s1)">s'est réalisé</span>
<span class="hollow" style="--c:#fff">surveillé</span>
<span style="--c:#d97706">organisation</span>
</div>

</div>
<div class="col-span-3">

<div class="chips" style="font-size:0.88rem;gap:0.55rem 0">
<div><span><b style="color:#b45309">1.</b> <b>Concentration des rôles sur une personne</b></span><u style="color:#b45309">facteur de bus 1 ⚠</u></div>
<div><span><b>2.</b> Périmètre livré hors du chiffrage initial</span><u style="color:#b45309">58 items sur 81, 72 % ⚠</u></div>
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
la disponibilite est a 100 % depuis ; le 7, la chaine instable, rendue
deterministe ; le 2, le perimetre hors chiffrage, 58 items produit sur 81,
realise et pas traite : aucun indicateur ne comparait le perimetre courant au
perimetre chiffre, theme 4, c'est le premier compteur a ajouter. Un point qui
s'est realise et qu'on nomme vaut mieux qu'une liste theorique.

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

<div class="kpi grid-cols-4 mt-4">
<div><b>1 → 53</b><span>944 lignes à réécrire le 18/03, 50 000 aujourd'hui</span></div>
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

---

# 9. Les compétences : ce qu'il a fallu apprendre

<div class="skills mt-2">
<div class="h"></div><div class="h">Février, déjà acquis</div><div class="h a">Appris sur le projet, et la version qui le prouve</div><div class="h r">Reste à acquérir</div>

<div class="l">Back</div><div class="b">C#, ASP.NET Core, architecture hexagonale, driver MongoDB et transactions, contrat OpenAPI généré ; Node, Express, Mongoose</div><div class="a">Web Push VAPID <u>1.1</u> ; OAuth Google et GitHub, synchronisation Letterboxd <u>1.4</u> ; passe planifiée Cloud Scheduler <u>1.6</u></div><div class="r">Temps réel, SignalR ou WebSocket ; TOTP <u>1.7</u></div>

<div class="l">Front</div><div class="b">React, TypeScript, Vite, React Router</div><div class="a">TanStack Query, cache de données distantes ; i18n FR et EN <u>V1</u> ; PWA Workbox <u>1.1</u> ; design system à jetons, SEO JSON-LD et sitemap <u>1.5</u> ; pré-rendu, coquille de démarrage LCP <u>1.6</u></div><div class="r">Consultation hors-ligne en lecture seule <u>1.8</u></div>

<div class="l">Tests, qualité</div><div class="b">xUnit, Playwright, SonarCloud</div><div class="a">Vitest, Testing Library, MSW ; Moq, WebApplicationFactory ; tests sur MongoDB réel en replica set ; Stryker, tests de mutation ; seuils de couverture bloquants <u>V1 à 1.6</u></div><div class="r">Revue de code par un tiers</div>

<div class="l">Accessibilité, performance</div><div class="b"></div><div class="a">axe automatisé sur 9 vues, critères RGAA clavier, focus et contraste <u>1.2</u> ; Lighthouse au déploiement <u>V1</u>, bloquant <u>1.3.2</u> ; mesure et correction du LCP <u>1.6</u></div><div class="r">Formation RGAA certifiante</div>

<div class="l">Livraison, infrastructure</div><div class="b">GitHub Actions, Dependabot regroupé, Docker, Git</div><div class="a">Artifact Registry et Cloud Run, déploiement par digest, rollback de trafic ; S3 et CloudFront, politique d'en-têtes ; Secret Manager ; sauvegarde Atlas vérifiée par restauration <u>1.6</u></div><div class="r">Terraform ; fédération d'identité pour la CI ; environnement de recette</div>

<div class="l">Sécurité, exploitation</div><div class="b">Gitleaks ; cookie de session</div><div class="a">Data Protection, CSP ; Trivy, zizmor ; export et suppression RGPD, PostHog sous consentement <u>1.2</u> ; Sentry front et API <u>1.3</u> ; 3 sondes de disponibilité, 5 politiques d'alerte, journal de versions</div><div class="r">Double authentification <u>1.7</u> ; OWASP</div>

<div class="l">Méthode</div><div class="b"></div><div class="a">Cycle en V par version, feuille de route chiffrée en points, board ; AGENTS.md et conduite d'assistants de code ; document d'aide à la décision, gabarit de PR</div><div class="r">Chiffrage avant réalisation, arbitrage consigné ; management d'équipe</div>
</div>

<!--
DUREE 1:50. ELEMENT IMPOSE 9 : l'evaluation des besoins en competences via une
grille. CRITERES : les competences a mobiliser sont IDENTIFIEES ; la grille des
competences actuelles et a acquerir est COMMENTEE, afficher ne suffit pas.

Convention, a dire avant de lire : pas de note. Une competence est ici une
technologie ou une methode nommee, et son etat se lit dans le depot. Colonne
grise : ce que je savais en fevrier. Colonne verte : ce que le projet m'a
oblige a apprendre, avec la version qui le prouve. Colonne orange : ce que la
suite du projet demande et que je n'ai pas encore.

COMMENTER, trois lectures :
1. La colonne de fevrier, c'est un profil back et DevOps : C#, hexagonal,
Mongo, OpenAPI, xUnit, Playwright, GitHub Actions, SonarCloud, Gitleaks.
C'est ce qui a rendu la migration de mars possible en quatre jours, theme 8 :
on ne migre pas vers une pile qu'on ne connait pas. Deux cases vides :
l'accessibilite, et la methode de pilotage.
2. Le vert, c'est ce qu'un produit en production impose et que le socle
n'apprend pas : push, OAuth, PWA, i18n, accessibilite, supervision, RGPD,
sauvegarde verifiee, et la methode elle-meme. Appris seul, en production,
sans plan ni budget : c'est la justification du plan de la diapo suivante,
rendre ce cout visible avant de le payer.
3. La colonne orange a deux natures. Les lignes techniques viennent de la
feuille de route, 1.7, 1.8 et le backlog Terraform : ce sont des besoins
dates. La ligne methode vient des indicateurs : chiffrage apres coup, theme 4,
migration chiffree a posteriori, theme 8, facteur de bus, theme 7. La grille
designe les memes faiblesses que les indicateurs, c'est ce qui la rend
credible.

SI ON QUESTIONNE « c'est une auto-evaluation » : oui, et chaque case est
verifiable, une dependance dans package.json ou un csproj, un job dans un
workflow, une version taguee. Une grille flatteuse n'aurait pas de colonne
orange.

SI ON QUESTIONNE « pourquoi un MVP en Node alors que C# etait acquis » :
reponse a fixer par toi ; la diapo 10 dit seulement que la pile du MVP
n'etait pas celle voulue pour la suite.
-->

---

# Le plan de développement : ce qui reste à acquérir

<div class="skills plan mt-2">
<div class="h">D'où vient le besoin</div><div class="h r">Compétence à acquérir</div><div class="h">Moyen</div><div class="h a">Preuve attendue</div>

<div class="b">Chiffrage formalisé après coup, thème 4 ; migration chiffrée a posteriori, thème 8</div><div class="r">Chiffrage avant réalisation, arbitrage consigné quand il est pris</div><div class="m">Pratique à chaque version, dès la 1.7</div><div class="a">1.7 chiffrée avant le premier commit, écart mesuré à la livraison</div>

<div class="b">Facteur de bus 1, thème 7 ; 87 lignes intégrées sans revue, thème 8</div><div class="r">Revue de code par un tiers</div><div class="m">Un pair humain sur le structurant, revue outillée ailleurs</div><div class="a">100 % des pull requests structurantes relues avant fusion</div>

<div class="b">1.7 : temps réel, double authentification ; 1.8 : hors-ligne</div><div class="r">SignalR sur ASP.NET Core, TOTP RFC 6238, stratégies hors-ligne Workbox</div><div class="m">Documentation Microsoft et Google, prototype hors produit avant le lot</div><div class="a">Une soirée qui se met à jour sans polling ; le code à six chiffres activable dans les paramètres</div>

<div class="b">Backlog tech : 8 lots Terraform</div><div class="r">Terraform, fédération d'identité pour la CI</div><div class="m">Tutoriels HashiCorp, lot 1 puis import de la prod existante</div><div class="a">terraform plan vide sur la prod en service ; plus de clé JSON longue durée</div>

<div class="b">Porte d'accessibilité : reprises avant chaque livraison</div><div class="r">RGAA, au-delà des tests automatisés</div><div class="m">Formation certifiante</div><div class="a">Une livraison passe la porte sans reprise</div>

</div>

<div class="mt-4" style="max-width:34rem">
<div class="text-xs opacity-75 mb-1">Recrutement, pour compléter un profil back et DevOps</div>
<div class="chips">
<div><span>Développeur front, designer</span><u>interface, accessibilité</u></div>
<div><span>Product owner, chargé de marketing</span><u>21 comptes en sept mois</u></div>
</div>
</div>

<!--
DUREE 0:50. ELEMENT IMPOSE 10 : le plan de developpement des competences.
CRITERES : le plan est etabli et DETAILLE ; des FORMATIONS sont preconisees
selon les besoins du projet et le profil ; les MODALITES sont adaptees au
handicap ; le besoin en recrutement est transmis aux RH.

Le plan, c'est la colonne orange de la diapo precedente, ligne par ligne,
avec trois choses par ligne : d'ou vient le besoin, comment on l'acquiert, et
a quoi on verra que c'est acquis.

1. L'ordre est celui du cout d'un ecart non comble. Les deux premieres
lignes ont deja coute : un chiffrage apres coup, 87 lignes sans revue, dix
jours d'aout sans arbitrage. Elles passent avant le technique parce que le
technique, lui, s'est appris sur le projet.
2. Les lignes techniques sont datees par la feuille de route : SignalR et
TOTP pour la 1.7, le hors-ligne pour la 1.8, Terraform en huit lots au
backlog. Le moyen est l'autoformation sur la documentation editeur, avec un
prototype hors produit avant le lot, parce que c'est ainsi que le C# a ete
absorbe en mars. Un seul poste est une formation payante : le RGAA, parce que
les tests automatises ne couvrent qu'une partie des criteres.
3. La preuve attendue est un fait, jamais une attestation de presence : un
plan Terraform vide, une soiree sans polling, une livraison sans reprise.

Le recrutement : je ne recruterais pas aujourd'hui, mais la question est
instruite a partir de mon profil, back et DevOps. Ce qui manque est en face :
un developpeur front et designer, et un product owner ou charge de marketing,
parce que 21 comptes en sept mois disent que l'acquisition n'a pas ete faite.
Ce qu'ils recevraient le premier jour existe deja, la RACI et le contexte
ecrit.

Les modalites de formation adaptees au handicap ne sont pas sur la diapo :
personne concernee, rien a en dire. SI ON DEMANDE : tiers-temps de droit sur
la formation et l'evaluation, support en texte structure lisible au lecteur
d'ecran, accessibilite de la plateforme comme critere de choix du
prestataire.
-->

---

# 10. Piloter seul : les missions et le style

<div class="grid grid-cols-5 gap-6 mt-4">
<div class="col-span-3">

<div class="quad">
<div class="ay">Soutien relationnel →</div>
<div class="cell"><b>Persuasif</b><i>Les conventions du dépôt : chaque règle est accompagnée de <b>son motif</b></i></div>
<div class="cell"><b>Participatif</b><i>Les utilisateurs : questionnaire, fiches ouvertes, retours intégrés à la feuille de route</i></div>
<div class="cell"><b>Directif</b><i>Juillet : portes de qualité rendues <b>bloquantes</b> sur une chaîne à 54 %, sans dérogation</i></div>
<div class="cell dom"><b>Délégatif, dominant</b><i>À l'automatisation : ce qu'une machine vérifie n'est jamais contrôlé à la main, <b>la décision reste humaine</b></i></div>
<div></div><div class="ax">← directivité forte</div><div class="ax">autonomie forte →</div>
</div>

<div class="text-xs opacity-75 mt-4 mb-1">Les outils, et ce que chacun partage</div>
<div class="chips" style="font-size:0.7rem">
<div><span>Monorepo unique</span><u>tout le contexte projet, versionné</u></div>
<div><span>Gabarits d'issue et de PR</span><u>les mêmes contrôles à chaque changement</u></div>
<div><span>Procédures exécutables</span><u>le flux, pas un savoir oral</u></div>
<div><span>Journal des versions, feuille de route</span><u>l'état livré et le périmètre, datés</u></div>
</div>

</div>
<div class="col-span-2">

<div class="text-xs opacity-75 mb-1">À la main</div>
<div class="chips">
<div><span>Cadrage et maquette</span><u>avant toute ligne de code</u></div>
<div><span>Arbitrages</span><u>périmètre, charge, socle</u></div>
<div><span>Revue avant intégration</span><u>gabarit à 6 contrôles</u></div>
<div><span>Mise en production, incidents</span><u>geste vérifié</u></div>
</div>

<div class="text-xs opacity-75 mt-3 mb-1">Confié à la chaîne</div>
<div class="chips">
<div><span>Tests, analyse, scans</span><u>portes bloquantes</u></div>
<div><span>Déploiement et test de fumée</span><u>déclenchés à la main</u></div>
<div><span>Montées de dépendances</span><u>Dependabot, regroupées</u></div>
<div><span>Alertes de supervision</span><u>5 politiques, 3 sondes</u></div>
</div>

</div>
</div>

<!--
DUREE 1:10. ELEMENTS IMPOSES 6, 7 et 8 : l'affectation des missions realisee
au cours du projet, le ou les styles manageriaux utilises, les outils de
communication et leurs objectifs. CRITERES : la charge
est repartie de maniere equilibree ; le style est IDENTIFIE ET DECRIT.

Dire d'abord ce que le critere ne peut pas mesurer ici : pas d'equipe, donc
pas de repartition entre personnes. La charge dans le temps est au theme 5,
et elle n'a pas ete equilibree non plus : l'analyse critique, plus bas, se
donne en reponse a une question.

La seule affectation reelle est la colonne de droite : ce qui reste a la main,
cadrer, arbitrer, relire, mettre en production ; et ce qui est confie a la
chaine, tout ce qu'une machine verifie mieux qu'un humain fatigue.

Les styles : ne pas les definir, le jury les connait. Les SITUER, une
situation du projet par style. Developper le DIRECTIF, le seul ou la decision
est verifiable : juin, chaine a 54 %, portes rendues bloquantes en juillet,
94 % le mois suivant. Puis le dominant, le delegatif a l'automatisation, qui
est exactement la colonne « confie a la chaine ». Sa condition de validite :
« un delegatif sans regle ecrite ni porte bloquante n'est pas de la
delegation, c'est de l'abandon. »

Les outils, en bas : les quatre lignes « ce qu'il partage » repondent au
critere du partage de ressources. Aucun n'est une messagerie, c'est delibere :
aucun n'exige la simultaneite, et c'est ce qui rend le dispositif independant
de ma presence. Une regle non ecrite n'est pas une regle.

SI ON QUESTIONNE « delegue a qui ? » : a la chaine, pas a une personne. A une
personne, le management s'exerce sur le processus et sur soi-meme.

SI ON DEMANDE une analyse critique de ma posture : du 17 au 26 aout, dix
jours travailles d'affilee pour tenir un dossier le 21 et la v1.4.0 le 25,
sans arbitrer le perimetre. Les deux ont ete tenus, et c'est le probleme :
une posture qui reussit se repete, douze jours d'affilee du 1er au 12
septembre pour la 1.6 et cet oral. La chaine a paye, 94 % en juillet, 78 en
aout, 67 en septembre. L'arbitrage n'a pas ete perdu, il n'a pas ete pose.
Deux regles depuis : un chevauchement d'echeances est un arbitrage ecrit,
decaler, reduire ou absorber ; et au-dela de cinq jours consecutifs, c'est la
version qui decale. La seconde n'a pas encore ete tenue, septembre le
prouve.

SI ON DEMANDE le handicap ou le contexte international : personne dans ces
situations sur le projet, rien a en dire. Ce qui est verifiable est sur le
produit, bilingue FR / EN, porte d'accessibilite bloquante ; et le dispositif
ecrit et asynchrone n'exige de personne d'etre present au bon moment.

SI ON QUESTIONNE ecoute, bienveillance, empathie, leadership : chacun est un
dispositif, pas une intention. L'ecoute par trois canaux entrants outilles,
questionnaire, fiches, lien « signaler un probleme » ; la bienveillance par un
gabarit d'anomalie qui decrit un comportement, jamais une responsabilite ;
l'empathie par le delai de reponse, 17 jours du questionnaire du 18 aout a la
production ; le leadership par la decision ecrite avec ses inconvenients
acceptes, theme 8.
-->

---

# 11. Rendre compte aux utilisateurs, et mesurer

<div class="grid grid-cols-2 gap-8 text-sm mt-2">
<div>

<div class="text-xs opacity-75 mb-1">Deux comptes rendus, à chaque version</div>
<div class="steps">
<div><b>Fenêtre de nouveautés</b><span>dans l'application, poussée une fois par version. <b>Savoir ce qui a changé sans rien demander</b></span></div>
<div><b>Journal des versions</b><span>note et étiquette sur le commit déployé : ce qui est livré, quand</span></div>
</div>

<div class="chips mt-5">
<div><span>Points de validation</span><u>11 versions datées ; un contrôle rouge annule la livraison</u></div>
</div>

</div>
<div>

<div class="kpi grid-cols-1" style="line-height:1.25">
<div><b>74 %</b><span><b>Comportemental</b> : 14 soirées sur 19 menées jusqu'au tirage, au 5 septembre</span></div>
<div><b>9,6 / 10</b><span><b>Déclaratif</b> : recommandation, <b>7 réponses</b> sur 17 comptes, aucun détracteur</span></div>
<div><b>100 %</b><span><b>Opérationnel</b> : disponibilité, 207 ms en p95, 0,026 % d'erreurs, 30 jours au 5 septembre</span></div>
</div>

<div class="text-xs opacity-75 mt-4 mb-2"><b>17 jours</b> entre le retour d'un utilisateur et sa mise en production</div>
<div class="tl">
<div><b>18/08</b><span>questionnaire</span></div>
<div><b>19/08</b><span>fiche ouverte</span></div>
<div><b>26/08</b><span>fiche close</span></div>
<div><b>04/09</b><span>en production, v1.4.1</span></div>
</div>

</div>
</div>

<!--
DUREE 1:10. ELEMENTS IMPOSES 11, 12 et 13 : les comptes rendus, les points de
validation, les indicateurs de satisfaction. CRITERES : comptes rendus clairs
et ordonnes ; points de validation qui assurent le SUIVI QUALITE ; indicateurs
COHERENTS au regard du projet.

Dire d'abord a qui on rend compte : il n'y a pas de commanditaire, c'est un
projet personnel. Les seuls destinataires sont les utilisateurs, 21 comptes,
et ce qu'ils valident, c'est que ce qui est livre sert. Le critere « faciliter
la prise de decision du client » ne s'applique pas : les decisions sont les
miennes, elles sont instruites dans la feuille de route et les documents de
decision, theme 8.

Gauche : deux comptes rendus, a chaque version. Souligner le premier, le seul
POUSSE : un journal des versions que personne n'ouvre est une archive, pas un
compte rendu. A DIRE HONNETEMENT : ce canal n'existe que depuis la v1.4.0,
les sept versions precedentes n'ont ete annoncees qu'au niveau du journal.
Puis les points de validation : une version n'existe que si les portes de la
chaine sont vertes, theme 2, et le perimetre livre se lit dans le diff date
de la feuille de route.

Droite, les indicateurs. Dire d'emblee : a une vingtaine de comptes et de
soirees, un NPS n'a aucune validite statistique. D'ou trois familles, et
c'est leur COMBINAISON qui fait la mesure. Les mesures sont celles du 5
septembre, date du releve. Puis la limite, avant qu'on la trouve : sept
reponses, echantillon oriente vers les plus assidus, aucun detracteur. La
phrase a dire : « je ne presente pas le 9,6 comme une mesure de satisfaction,
mais comme l'absence de detracteur parmi les utilisateurs engages. » Les
indicateurs COMPORTEMENTAUX pesent plus lourd, ils mesurent ce que les gens
FONT.

La frise prouve que les indicateurs SERVENT : un retour du questionnaire, la
reconnexion depuis un navigateur integre, est en production dix-sept jours
plus tard. SI ON DEMANDE les autres retours : une suggestion confirmee, deja
au perimetre de la 1.4 ; une demande instruite et non livree, 0,5 jour,
priorite 4. Ce qui manque, dit avant qu'on le demande : le dispositif est
ponctuel, pas continu ; la boucle continue est instruite, 1 a 2 jours,
priorite 3.
-->

---

# Bilan

<div class="text-xs opacity-75 mt-2 mb-1">Livré, du 27 février au 12 septembre</div>
<div class="kpi grid-cols-4" style="line-height:1.25">
<div><b>11</b><span>versions en 198 jours, écart médian 14 j, <b>0 retour arrière</b></span></div>
<div><b>348</b><span>points livrés, 106 items : 81 produit, 25 techniques</span></div>
<div><b>21</b><span>comptes, <b>27 soirées</b>, 125 films, en production</span></div>
<div><b>100 %</b><span>de disponibilité, 0 vulnérabilité, 0 anomalie ouverte</span></div>
</div>

<div class="text-xs opacity-75 mt-6 mb-1">Retenu</div>
<div class="lessons">
<div><b>1</b><span>Un indicateur ne mesure que la pratique qui le produit</span></div>
<div><b>2</b><span>Quand le coût d'une décision croît avec le temps, décider tôt a une valeur propre</span></div>
<div><b>3</b><span>Un arbitrage non posé n'est pas un arbitrage</span></div>
</div>

<div class="note mt-6">
<b>Suite : 1.7</b>, cadrée, 7 items pour 34 points. Temps réel, co-hôte, double authentification.
</div>

<!--
DUREE 0:50. DERNIERE DIAPO PRESENTEE. C'EST ELLE QUI SATISFAIT LE QUATRIEME
CRITERE DE C3.4.2 : « la demonstration permet d'aboutir a une VALIDATION du
projet ». La demonstration a ouvert la presentation ; le bilan la
ferme, une fois le pilotage demontre.

En haut, ce qui est livre, quatre chiffres, sans les relire : onze versions,
aucun retour arriere ; le perimetre, produit et technique ; l'usage reel ;
l'etat de la production.

En bas, ce que je retiens, une phrase chacun :
1. Un indicateur ne mesure que la pratique qui le produit : la regularite du
commit est devenue la condition d'existence de l'indicateur d'avancement.
2. Decider tot quand le cout croit : 944 lignes a migrer le 18 mars, 50 000
aujourd'hui, theme 8.
3. L'arbitrage n'a pas ete perdu, il n'a pas ete pose, deux fois : 58 items
hors chiffrage que rien ne comparait au prevu, et dix jours d'affilee en
aout, douze en septembre, plutot que decider ce qui ne serait pas livre.

Le troisieme est celui qui compte. Ne pas l'edulcorer. Un jury de
professionnels a passe trente minutes a entendre un candidat qui mesure et
qui arbitre : entendre en cloture qu'il a rate deux arbitrages, avec les
chiffres, est ce qui rend credible tout ce qui precede. Les deux echecs ont
la MEME RACINE : une option non instruite n'est pas un arbitrage, c'est une
absence de decision.

La suite est decidee, pas soumise : la 1.7 part apres l'oral. Fermer sur
« voila ce qui est livre, et ce que j'en retiens », puis remercier et
laisser le silence. Pas de demande de validation formulee : la validation
est le jugement du jury sur ce qui a ete demontre, elle ne se demande pas.
C'est la fin de la presentation.

Les annexes qui suivent ne sont JAMAIS presentees, seulement appelees par une
question.
-->

---

# Annexe A1 : L'architecture technique

<div class="grid grid-cols-2 gap-6 text-sm mt-2">
<div>

```mermaid
flowchart LR
  U["Navigateur, PWA"]
  U -->|assets| CF["CloudFront + S3<br/>AWS"]
  U -->|/api/v1| CR["ASP.NET Core<br/>Cloud Run, GCP"]
  CR --> M[("MongoDB Atlas")]
  CR --> TMDB["TMDB"]
  CR --> RS["Resend"]
  M -.->|chaque nuit| GCS[("Cloud Storage<br/>sauvegarde")]
```

<div class="text-xs opacity-75 mt-2">
Secrets injectés au déploiement par Secret Manager. Session par cookie, jamais par jeton en stockage local. Chaque révision de l'API est déployée sans trafic, puis promue une fois sa sonde de readiness verte.
</div>

</div>
<div>

### L'API en architecture hexagonale

| Couche | Contenu |
|--------|---------|
| **Entrée** | Contrôleurs `/api/v1`, CORS, limitation de débit, CSP, en-têtes, corrélation |
| **Application** | Cas d'usage et **ports**, les interfaces |
| **Domaine** | Règles métier : soirée, partage, vote, roue |
| **Infrastructure** | Adaptateurs : MongoDB, catalogue, e-mail, notifications |

<div class="kpi grid-cols-3 mt-4" style="gap:0.3rem 0.6rem;line-height:1.25">
<div><b style="font-size:1.2rem">50 277</b><span>lignes C# non vides, 652 fichiers, tests compris</span></div>
<div><b style="font-size:1.2rem">88,1 %</b><span>de couverture, front et API</span></div>
<div><b style="font-size:1.2rem">A / A / A</b><span>duplication 0,7 %, 0 vulnérabilité</span></div>
</div>

</div>
</div>

<!--
ANNEXE, appelee sur question « comment c'est fait ? », « ou tourne le
service ? », « et les sauvegardes ? ». Deux hebergeurs, un cloud par
surface : le front statique sur AWS, l'API conteneurisee sur GCP, la base
chez Atlas, le catalogue TMDB et l'e-mail Resend en services tiers. La
sauvegarde nocturne date de la 1.6 : le palier gratuit d'Atlas ne fournit
aucun instantane, un dump part chaque nuit vers un bucket versionne et n'est
publie qu'apres une restauration d'essai. Les chiffres sont ceux du 12
septembre, SonarCloud du 11.
-->

---

# Annexe A2 : Les deux arbitrages de réserve

<div class="grid grid-cols-2 gap-6 text-sm mt-2">
<div>

### La porte de qualité instable

| | |
|--|--|
| **Écart** | Chaîne à **54 %** de succès en juin, échecs sans cause réelle sur le contrôle de performance |
| **Conséquence** | Une porte qu'on apprend à contourner ne garde plus rien |
| **Options** | Désactiver, abaisser les seuils, **rendre la mesure déterministe**, changer d'outil |
| **Décision** | Médiane de trois exécutions et seuils recalibrés, plutôt que baisser l'exigence |
| **Résultat** | **54 % → 94 %** le mois suivant. Portes rendues bloquantes en v1.3.2 |

</div>
<div>

### L'abandon de l'application mobile

| | |
|--|--|
| **Écart** | Application mobile démarrée le **16/05**, parcours complet en une journée |
| **Conséquence** | Deux surfaces produit à maintenir, pour un seul exécutant |
| **Options** | Poursuivre en parallèle, geler, **archiver** |
| **Décision** | Archivée le **26/05** : le web porte la totalité des utilisateurs |
| **Résultat** | Code conservé dans `archive/`, aucune dette, aucun utilisateur impacté |

</div>
</div>

<div class="note mt-4 text-sm">
Le critère qui a tranché les deux cas est celui du cas principal : <b>la soutenabilité par l'effectif réel</b>.
</div>

<!--
ANNEXE, appelee sur « un autre arbitrage ? ». Deux cas, meme critere que la
migration du theme 8 : ce qu'une personne seule peut tenir dans la duree. La
porte instable, c'est mesure, decision, effet remesure, 54 puis 94. Le mobile,
c'est dix jours entre le premier commit et l'archivage, avant qu'un
utilisateur ne depende de la seconde surface.
-->

---

# Annexe A3 : La chaîne CI/CD

<div class="lede text-sm"><b>18 jobs</b> sur deux chaînes, dont <b>14 bloquants</b>. Un contrôle rouge refuse le déploiement. La mise en production se déclenche à la main, cible tout, front ou API.</div>

<div class="grid grid-cols-2 gap-6 dense jobs">
<div>

| Job | Rôle | Bloquant |
|-----|------|:--------:|
| `changes` | Filtrage par chemins, lanes web et API | |
| `gitleaks` | Scan de secrets sur l'arbre | ✅ |
| `lint-workflows` | Lint des workflows eux-mêmes | ✅ |
| `lint-web` | TypeScript, ESLint, Prettier | ✅ |
| `lint-api` | Format, build `-warnaserror`, export OpenAPI | ✅ |
| `audit` | Trivy sur le lock, NuGet vulnérables | ✅ |
| `test-web` | Vitest, seuils de couverture | ✅ |
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
| `docker-api` | Image conteneurisée, Artifact Registry | |
| `deploy-api` | Cloud Run, révision **sans trafic**, promue si readiness verte | ✅ |
| `deploy-front` | S3 et CloudFront, build archivé 30 jours | |
| `deploy-guard` | Vérifie que chaque cible demandée est en ligne | |

</div>
</div>

<div class="note mt-3 text-xs">
Actions épinglées par empreinte, image déployée par digest, <code>persist-credentials: false</code>, secrets passés par <code>env:</code>.
</div>

<!--
ANNEXE, appelee sur « qu'est-ce qui est confie a la chaine ? » ou sur la
securite de la chaine. Douze jobs a chaque push, six au deploiement, qui est
un geste manuel depuis la 1.6 : la production est en retard sur master entre
deux declenchements, contrepartie assumee. Le bloquant est ce qui refuse la
livraison, pas ce qui la commente.
-->

---

# Annexe A4 : Le journal des versions

<div class="grid grid-cols-2 gap-6 text-sm mt-2">
<div class="dense">

| Version | Date | Contenu principal |
|---------|------|-------------------|
| **1.6.0** | 12/09 | Soirées récurrentes, modèles, plusieurs gagnants, sauvegarde nocturne |
| 1.5.0 | 07/09 | Accueil d'exploration, sagas, sélections, landing refondue |
| 1.4.1 | 04/09 | Navigation sans compte, landing bilingue |
| 1.4.0 | 25/08 | Watchlist, Letterboxd, choix manuel, flamme, OAuth |
| 1.3.2 | 25/07 | Supervision, sonde de readiness, canal de support |
| 1.3.1 | 08/07 | CSP, refonte CI/CD, scans de sécurité, cartes film |
| 1.3.0 | 19/06 | États vides, export calendrier, navigation |
| 1.2.0 | 11/06 | Profil public, notifications in-app, RGPD |
| 1.1.0 | 25/05 | Application installable, notifications push, séries |
| 1.0.0 | 19/05 | Première version de production |
| 0.1.0 | 27/02 | Prototype initial |

<div class="text-xs opacity-75 mt-1">
Format Keep a Changelog, versionnage sémantique. Un tag et une release par version. La version est en pied de page et exposée par la sonde de readiness.
</div>

</div>
<div>

### Une release en détail, la 1.3.2

**Ajouté** : lien « Signaler un problème » avec contexte pré-rempli, sonde `GET /health/ready` vérifiant MongoDB et exposant la version déployée, trois sondes depuis trois continents, cinq politiques d'alerte, readiness contrôlée par le test de fumée.

**Modifié** : portes de qualité rendues **bloquantes**, Quality Gate, Lighthouse, E2E.

<div class="note mt-4 text-xs">
<b>Traçabilité</b> : la fiche d'anomalie référence le commit correctif, le commit appartient à une étiquette, l'étiquette correspond à une entrée du journal. Chaque événement d'erreur en production porte la version déployée.
</div>

</div>
</div>

<!--
ANNEXE, appelee sur « comment on sait ce qui est parti quand ? ». Onze
versions, onze entrees, onze tags. La 1.3.2 est prise en exemple parce
qu'elle est la version du run : supervision, readiness, canal de support, et
les portes qui deviennent bloquantes.
-->

---

# Annexe A5 : Les retours utilisateurs

<div class="text-sm mb-2 mt-2">
<b>7 réponses pour 17 comptes</b>, questionnaire en ligne du 18 août, lu le 5 septembre. Échantillon réduit et orienté : 5 des 7 répondants utilisent l'application à chaque soirée.
</div>

<div class="dense">

| Question | Réponses, n = 7 |
|----------|-----------------|
| Usage des boutons de vote | 6 ont voté au moins une fois ; 1 jamais |
| Effet du vote sur le tirage | 4 « ça dépend d'un réglage de l'hôte » ; **1 seul identifie la réalité** : le réglage n'est jamais activé |
| Décision réelle du groupe | 5 « ça dépend des soirées » ; 1 **relance la roue jusqu'à un résultat qui convient** |
| Attente vis-à-vis du vote | **3 veulent écarter du tirage les films rejetés**, mécanisme qui n'existe pas ; 1 veut une pondération |
| Connaissance des notifications | **4 ignoraient que l'activation était possible** ; 3 les ont activées |
| Connaissance du réglage de la roue | 5 le connaissaient, **jamais actionné** : 0 soirée sur 19 en mode pondéré |
| Ce qui ferait revenir plus souvent | 5 « rien de particulier, je l'utilise quand j'en ai besoin » |
| Recommandation, 0 à 10 | 10, 10, 10, 8, 9, 10, 10, soit **9,6**, aucun détracteur |

</div>

<div class="alert mt-3 text-xs">
<b>Ce que ces réponses ont produit</b> : une décision <b>déclenchée</b> et livrée, le bandeau des navigateurs intégrés, v1.4.1, 17 jours du retour à la production ; une <b>confirmée</b> mais déjà au périmètre, la watchlist ; une <b>instruite</b> et non livrée, voir quels films un utilisateur a proposés.
</div>

<!--
ANNEXE, appelee sur « qu'ont dit les utilisateurs ? » ou « sept reponses,
c'est un echantillon ? ». Non, et c'est dit tel quel : le 9,6 n'est pas une
mesure de satisfaction, c'est l'absence de detracteur parmi les plus
engages. Ce qui pese, c'est ce que les gens font : 0 soiree sur 19 en mode
pondere, la roue relancee a la main. Et la boucle se juge a ce qu'elle a
produit : une decision declenchee, une confirmee, une instruite, distinguees.
-->

---

# Annexe A6 : La matrice RACI complète

<div class="raci mt-2" style="grid-template-columns: 1fr 5rem 5rem 5rem 4.6rem 5.4rem 5.4rem">
<div class="h"></div><div class="h">Chef de projet</div><div class="h">Product owner</div><div class="h">Développeur</div><div class="h">DevOps</div><div class="h">Utilisateurs</div><div class="h">Prestataires</div>
<div class="l">Cadrage et périmètre de version</div><div class="C">C</div><div class="A">A R</div><div class="n"></div><div class="n"></div><div class="C">C</div><div class="n"></div>
<div class="l">Architecture applicative</div><div class="I">I</div><div class="n"></div><div class="A">A R</div><div class="C">C</div><div class="n"></div><div class="n"></div>
<div class="l">Modèle de données et contrat d'interface</div><div class="n"></div><div class="C">C</div><div class="A">A R</div><div class="n"></div><div class="n"></div><div class="n"></div>
<div class="l">Développement de l'interface</div><div class="n"></div><div class="A">A</div><div class="R">R</div><div class="n"></div><div class="I">I</div><div class="n"></div>
<div class="l">Développement de l'API</div><div class="n"></div><div class="A">A</div><div class="R">R</div><div class="n"></div><div class="n"></div><div class="n"></div>
<div class="l">Revue, tests et intégration</div><div class="n"></div><div class="n"></div><div class="R">R</div><div class="A">A</div><div class="n"></div><div class="n"></div>
<div class="l">Intégration des services tiers</div><div class="n"></div><div class="n"></div><div class="A">A R</div><div class="C">C</div><div class="n"></div><div class="C">C</div>
<div class="l">Accessibilité et inclusion</div><div class="n"></div><div class="A">A</div><div class="R">R</div><div class="n"></div><div class="C">C</div><div class="n"></div>
<div class="l">Chaîne d'intégration et de déploiement</div><div class="n"></div><div class="n"></div><div class="I">I</div><div class="A">A R</div><div class="n"></div><div class="n"></div>
<div class="l">Supervision et exploitation</div><div class="I">I</div><div class="n"></div><div class="n"></div><div class="A">A R</div><div class="n"></div><div class="R">R</div>
<div class="l">Sécurité applicative</div><div class="n"></div><div class="n"></div><div class="R">R</div><div class="A">A</div><div class="n"></div><div class="n"></div>
<div class="l">Recette et tests de bout en bout</div><div class="n"></div><div class="A">A</div><div class="R">R</div><div class="n"></div><div class="C">C</div><div class="n"></div>
<div class="l">Arbitrage de périmètre ou de charge</div><div class="A">A R</div><div class="C">C</div><div class="C">C</div><div class="n"></div><div class="C">C</div><div class="n"></div>
<div class="l">Mise en production</div><div class="A">A</div><div class="n"></div><div class="n"></div><div class="R">R</div><div class="I">I</div><div class="R">R</div>
<div class="l">Restitution et compte rendu</div><div class="A">A R</div><div class="C">C</div><div class="n"></div><div class="n"></div><div class="I">I</div><div class="n"></div>
</div>

<div class="legend mt-2">
<span style="--c:var(--s1)">A approuve et rend compte</span>
<span style="--c:rgb(13 148 136 / 40%)">R réalise</span>
<span style="--c:rgb(13 148 136 / 14%)">C consulté</span>
<span style="--c:rgb(0 0 0 / 9%)">I informé</span>
</div>

<!--
ANNEXE, appelee sur une ligne absente de la matrice du theme 5, qui regroupe
les quinze activites en neuf. Les quatre premieres colonnes sont les
casquettes d'une meme personne ; les deux autres, les acteurs reels du
projet. Le jour ou quelqu'un rejoint le projet, la colonne Developpeur est
celle qu'on lui confie en premier.
-->

---

# Annexe A7 : L'infrastructure, palier par palier

<div class="dense mt-2" style="max-width:44rem">

| Poste | Palier gratuit | Aujourd'hui | Ensuite |
|-------|----------------|------------:|--------:|
| API, Cloud Run | 2 M requêtes par mois | 0 € | |
| Registre, secrets, supervision, GCP | inclus | 0 € | |
| Front, S3 et CloudFront | **12 mois** | 0 € | 1 à 5 € par mois |
| Base, Atlas M0 | **512 Mo** | 0 € | ≈ 9 $ par mois au premier palier |
| E-mail, Resend | 3 000 par mois | 0 € | |
| Erreurs, Sentry | 5 000 événements par mois | 0 € | |
| Nom de domaine | | ≈ 10 € par an | |
| Licences | 100 % libre ou palier gratuit | 0 € | |

</div>

<div class="kpi grid-cols-2 mt-4" style="gap:0.3rem 0.8rem;line-height:1.25;max-width:44rem">
<div><b style="font-size:1.2rem">20 à 190 €</b><span>par an, infrastructure et domaine, une fois les paliers passés</span></div>
<div><b style="font-size:1.2rem">2</b><span>échéances suivies : la fin des 12 mois du front, les 512 Mo de la base</span></div>
</div>

<!--
ANNEXE, appelee sur « et si ca grossit ? ». Tout est dans son palier gratuit,
par conception, et les deux echeances qui feront sortir du zero sont suivies.
La borne haute, 190 euros par an, suppose la base au premier palier payant.
L'assistant de code, 100 euros par mois, est un cout de developpement, pas
d'exploitation : il est au theme 6.
-->
