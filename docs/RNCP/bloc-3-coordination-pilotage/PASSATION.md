# Passation, reprendre le travail sur le Bloc 3

> Écrit le **5 septembre 2026** à l'attention de quiconque, humain ou agent, reprend ce dossier.
> Lire ce fichier **avant** de toucher au support ou aux chapitres.
>
> Ce qui reste à faire est dans [`RESTE-A-FAIRE.md`](RESTE-A-FAIRE.md). Ce fichier-ci dit **comment travailler ici sans casser ce qui existe**.

---

## 1. Où on en est, en une minute

| | |
|--|--|
| **Épreuve** | Oral de 45 min (30 de présentation + 15 de questions), le **16 septembre 2026** |
| **État** | ✅ Rédaction terminée et **support refondu** : 7 chapitres, 31 diapositives (23 présentées, 8 annexes), toutes vérifiées au rendu. Restructuré le 11/09 : la démonstration ouvre la présentation, 5 fusions, 9 tableaux devenus des schémas (§ 12). Épuré, schémas à la place des gros tableaux, sans répétition |
| **Branche** | `claude/rncp-03-title-crwwov`, head `a9c2859`, **10 commits** d'avance sur `master` |
| **Pull request** | [#83](https://github.com/Affy657/Movie-Picker/pull/83), ✅ **fusionnée sur `master` le 06/09/2026**. Tout travail ultérieur repart de `master` : une PR fusionnée ne se réutilise pas |
| **Reste** | Uniquement du **matériel** : répétitions minutées, jeu de données de démonstration, vidéo de repli, 2 captures, export PDF |

Les cases du Bloc 3 dans [`../suivi-rncp.md`](../suivi-rncp.md) sont **cochées** depuis la fusion, la convention du dossier veut qu'un livrable ne le soit qu'une fois mergé sur `master`. **C3.4.2 reste hors carte** : c'est un livrable oral, il ne se coche pas avant l'épreuve.

---

## 2. Les règles d'écriture du dossier, ne pas les enfreindre

Elles ne sont pas cosmétiques : c'est ce qui distingue ce dossier d'un devoir générique, et c'est sur elles que la note se joue.

### 2.1 La vérité sur le solo, sans équipe simulée

Le projet a été **exécuté seul**, et le support le dit dès la diapositive 2. Depuis le 11 septembre 2026, **aucune équipe n'est simulée** : l'organisation cible à 4 profils des versions précédentes a été retirée, sur décision du propriétaire du projet.

- **Le réel** : chiffré, daté, vérifiable dans le dépôt. Depuis le 11 septembre au soir, **aucune distinction entre l'auteur et ses outils d'assistance** : tout ce qui n'est pas exécuté par un prestataire est présenté comme le travail d'une personne, sans acteur intermédiaire, sur décision du propriétaire du projet (« moi et les agents IA, c'est la même personne »). L'affectation des missions se mesure dans le temps, sur les 833 commits classés par mission.
- **Là où le référentiel exige une équipe** : la matrice RACI est construite sur les acteurs réels (moi, commanditaire, utilisateurs, prestataires), la grille de compétences est une auto-évaluation avant / après étalonnée sur le dépôt, le plan de développement est personnel, et le besoin en recrutement est une note « si le projet passait en équipe ».

**Règle de rédaction** : on écrit *« à la main »*, *« confié à la chaîne »*, *« si le projet passait en équipe »*. Jamais *« l'organisation cible prévoit »*, jamais *« délégué aux agents »*, jamais un profil ou un acteur qui n'a pas existé.

### 2.2 Ancrer sur une mesure, et dire la limite avant qu'on la trouve

Chaque chapitre part d'un fait vérifiable, puis **énonce lui-même sa faiblesse**. C'est la signature du dossier, et elle a été appliquée partout :

| Chapitre | La limite assumée |
|:--------:|-------------------|
| 2 | La charge est *reconstituée*, pas mesurée. Faible sur les cinq premières semaines (commits groupés) |
| 2 | Le tableau de suivi est **postérieur** au travail qu'il représente |
| 3 | L'objectif « aucune modification du front » a été manqué de **87 lignes** |
| 3 | Le lot est chiffré 13 J/H **a posteriori**, non vérifiable au jour près |
| 4 | La posture critiquée du 17–26 août a **réussi**, c'est ce qui la rend dangereuse |
| 6 | Deux des trois fiches d'anomalie ont été ouvertes et closes à **dix secondes** d'intervalle |
| 6 | Le dispositif de satisfaction est **ponctuel**, il donne un point et pas une tendance |

**Ne jamais supprimer ces aveux pour « améliorer » le dossier.** Un jury de professionnels ne sanctionne pas une limite assumée ; il sanctionne une limite dissimulée qu'il découvre lui-même.

### 2.3 La numérotation du support est contractuelle

- **Aucune diapositive de séparation de chapitre.** La page `N` de Slidev correspond exactement à la diapositive `N` de [`00-plan-presentation-orale.md`](00-plan-presentation-orale.md), et donc au rattachement des **14 éléments imposés** par le règlement.
- Le titre de chapitre est porté par sa **première diapositive** (ex. diapo 9 : « 3. Piloter l'avancement : le suivi est dans GitHub »).
- **Toute insertion ou suppression de diapositive** oblige à mettre à jour, dans le même commit : le plan (§ 1 et § 4), la table `REFS` de `slides/global-bottom.vue`, et le tableau d'avancement de `slides/README.md`.

### 2.4 Le support est épuré, et doit le rester

Le jury **n'a que les diapositives** : il n'ouvrira pas le dépôt, et il ne lira pas un paragraphe affiché 30 secondes. Trois règles en découlent.

1. **Une idée par diapositive, énoncée dans le titre.** Le titre est une assertion (« L'écart n'est pas où on le cherche »), pas une étiquette de rubrique.
2. **La preuve est à l'écran, l'argumentation est en note.** Un chiffre qui compte se montre, histogramme, barre empilée, haltère, frise. Un raisonnement se dit.
3. **Pas de tableau de plus de 8 lignes sur une diapositive présentée.** Au-delà, c'est un schéma, ou c'est une annexe.

Les primitives graphiques et la palette validée sont dans `slides/global-bottom.vue`, documentées dans [`slides/README.md`](slides/README.md).

### 2.5 Le minutage est exact et doit le rester

Le support fait **30:00 pile**, exact chapitre par chapitre. Toute modification de contenu qui change une durée doit être compensée **dans le même chapitre**. Le script du § 5.3 le vérifie, et `verify:rendu` (§ 5.4) vérifie que le contenu tient.

---

## 3. Les sources de vérité des chiffres

**Ne jamais reprendre un chiffre depuis un autre document du dossier sans le recalculer.** Les valeurs du plan étaient périmées de plusieurs mois quand ce travail a commencé (8 versions au lieu de 9, 799 commits au lieu de 833, 4 fiches d'anomalie au lieu de 3).

| Donnée | Source | Comment la recalculer |
|--------|--------|----------------------|
| Commits, jours actifs, fusions | Historique Git | § 5.1 ci-dessous |
| Versions et dates | `CHANGELOG.md` + releases GitHub | `git log` sur le fichier, ou l'API |
| Pull requests | API GitHub | `search_pull_requests` avec `repo:Affy657/Movie-Picker is:pr` |
| Exécutions de CI | API GitHub | `actions_list` sur `ci-cd.yml`, filtré `branch: master` |
| Anomalies | GitHub Issues | `list_issues`, étiquette `bug` |
| Couverture, Quality Gate | Dossier Bloc 2 | `docs/RNCP/bloc-2-conception-developpement/dossier-bloc-2.md` |
| Mesures de production (17 comptes, 74 %, p95 207 ms) | Dossier Bloc 4 | `docs/RNCP/bloc-4-mco/`, **non recalculables depuis le dépôt** |
| Items de feuille de route | `docs/roadmap-product.md`, `roadmap-tech.md` | § 5.2 ci-dessous |
| Libellés de l'interface (script de démo) | `apps/web/src/shared/i18n/locales/fr.ts` | Toujours citer le libellé **exact** |

---

## 4. Les pièges rencontrés, ils coûteront du temps à qui les ignore

### 4.1 Le dépôt est cloné en superficiel

Un clone frais ne contient qu'une fraction de l'historique (108 commits sur 833 au démarrage de cette session). **Tout comptage sur `HEAD` sera faux.**

```bash
git fetch --unshallow origin master   # une fois, au début
git rev-list --count origin/master    # doit renvoyer 833 ou plus
```

Et toujours compter sur `origin/master`, pas sur `master` local.

### 4.2 `--since`/`--until` filtre sur la date du *committer*, pas de l'*auteur*

Écart constaté : **194 commits en juillet** avec `%ad` (date d'auteur) contre **181** avec `--since/--until`. Tout le dossier utilise la **date d'auteur**, de façon cohérente. Utiliser le regroupement par `%ad` :

```bash
git log origin/master --date=format:'%Y-%m' --pretty=format:'%ad' | sort | uniq -c
```

### 4.3 Le frontmatter par diapositive Slidev est un piège

Un bloc `---\nlayout: center\n---` mal interprété crée une **diapositive vide** et décale toute la numérotation, donc la table `REFS` et le rattachement des 14 éléments imposés. Il a été **retiré** de l'ancienne diapositive 30, aujourd'hui fusionnée dans la 2, au profit de classes utilitaires (`text-center`, `mx-auto`). **Ne pas le réintroduire** sans revérifier le compte de diapositives.

### 4.4 `npm install` échoue sur le téléchargement du navigateur

`playwright-chromium` est une dépendance du dossier `slides/`. Son post-install tente de télécharger Chromium, ce que le proxy bloque. Contournement systématique :

```bash
cd docs/RNCP/bloc-3-coordination-pilotage/slides
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install --no-audit --no-fund
npm run build   # doit afficher « ✓ built in … »
```

`npm run build` **n'a pas besoin de navigateur** ; seul `npm run export` (PDF) en a un.

### 4.5 La police du thème est chargée depuis Google Fonts, au rendu

Le thème demande **Nunito Sans** à `fonts.googleapis.com` au moment où la page s'affiche ; aucune police n'est embarquée dans le dépôt ni dans le build. Deux conséquences.

**Pour vérifier le rendu**, il faut la police, sinon le navigateur retombe sur une police plus large et signale des débordements qui n'existent pas. `npm run verify:rendu` la récupère tout seul, et **refuse de tourner** s'il n'y parvient pas plutôt que de rendre un verdict faux.

**Pour l'oral**, c'est une dépendance réseau non déclarée : présenter le support en ligne dans une salle sans réseau dégrade la mise en page de toutes les diapositives. **L'export PDF fige les polices**, c'est la raison la plus solide de présenter depuis le PDF.

### 4.6 Le pipeline bouge, revérifier avant de citer un nombre de jobs

L'annexe A5 énumère les jobs de `ci-cd.yml` et de `deploy.yml`. Ces fichiers évoluent : `test-api-mongo` a été ajouté le 5 septembre, et le 11 septembre le compte réel était de 18 (12 dans `ci-cd.yml`, 6 dans `deploy.yml`) alors que l'annexe en listait 15. **Avant toute relecture du dossier, recompter :**

```bash
for f in ci-cd deploy; do git show origin/master:.github/workflows/$f.yml | grep -cE '^  [a-z0-9-]+:$'; done   # retirer 1 sur ci-cd pour « push », qui est un déclencheur
```

Et vérifier le caractère bloquant : tout job de `ci-cd.yml` l'est, puisque `verifier-ci` exige un run vert sur le commit avant tout déploiement ; dans `deploy.yml`, `lighthouse` bloque `deploy-front` et le test de fumée de `deploy-api` bloque la bascule.

### 4.7 Prettier ne touche pas à ce dossier

`.prettierignore` exclut `*.md` et `docs/`, et `format:check` ne cible que `apps/`, `configs/` et `e2e/`. **Aucun formatage automatique à craindre ni à lancer** sur ce dossier. La CI ignore d'ailleurs entièrement une PR qui ne touche que `docs/`, seuls `changes` et `gitleaks` s'exécutent, tout le reste est *skipped* par le path-filtering. C'est normal, ce n'est pas un échec.

### 4.8 Penser à nettoyer avant de committer

`node_modules/` et `dist/` du dossier `slides/` sont ignorés par `.gitignore`, mais ils pèsent lourd sur l'allocation disque de la session :

```bash
rm -rf docs/RNCP/bloc-3-coordination-pilotage/slides/{node_modules,dist}
```

---

## 5. Vérifier son travail, scripts prêts à l'emploi

Tous à lancer depuis `docs/RNCP/bloc-3-coordination-pilotage/`.

### 5.1 Statistiques Git du projet

```bash
cd /home/user/Movie-Picker
python3 - <<'PY'
import subprocess, datetime, collections
out=subprocess.check_output(['git','log','origin/master','--no-merges','--date=short','--pretty=format:%ad']).decode()
days=sorted({datetime.date.fromisoformat(d) for d in out.split()})
print('jours actifs :', len(days), 'du', days[0], 'au', days[-1])
wk={d.isocalendar()[:2] for d in days}
allw=set(); d=days[0]
while d<=days[-1]: allw.add(d.isocalendar()[:2]); d+=datetime.timedelta(days=1)
print(f'semaines ISO : {len(allw)} couvertes, {len(wk)} actives, {len(allw)-len(wk)} a zero')
best=cur=1
for a,b in zip(days,days[1:]):
    cur = cur+1 if (b-a).days==1 else 1; best=max(best,cur)
print('plus longue serie :', best, 'jours consecutifs')
PY
```

### 5.2 Items de feuille de route livrés / restants

```bash
cd /home/user/Movie-Picker
python3 - <<'PY'
import re
W={'S':1,'M':2,'L':3,'XL':5}; d=t=dp=tp=0
for l in open('docs/roadmap-product.md',encoding='utf-8'):
    if l.startswith(('- ✅','- ⬜')):
        sz=re.search(r'`(S|M|L|XL)`',l); p=W.get(sz.group(1),0) if sz else 0
        if l.startswith('- ✅'): d+=1; dp+=p
        else: t+=1; tp+=p
print(f'livres {d} ({dp} pts) ; restants {t} ({tp} pts) ; total {d+t}')
PY
```

### 5.3 Intégrité du support, à lancer avant chaque commit

```bash
cd /home/user/Movie-Picker/docs/RNCP/bloc-3-coordination-pilotage
python3 - <<'PY'
import re
s=open('slides/slides.md',encoding='utf-8').read()
lines=s.split('\n'); idx=[i for i,l in enumerate(lines) if l.strip()=='---']
start=idx[1]+1; chunks=[]
for i in idx[2:]: chunks.append(lines[start:i]); start=i+1
chunks.append(lines[start:])
print('diapos :', len(chunks), '(attendu 31)')
bad=0
for n,c in enumerate(chunks,1):
    body=re.sub(r'<!--.*?-->','','\n'.join(c),flags=re.S)
    o,cl=len(re.findall(r'<div\b',body)),len(re.findall(r'</div>',body))
    if o!=cl: print(f'  !! diapo {n} : div {o}/{cl}'); bad+=1
    if not [l for l in c if l.startswith('# ')]: print(f'  !! diapo {n} sans titre H1')
d=re.findall(r'DUREE (\d+):(\d\d)', s); tot=sum(int(a)*60+int(b) for a,b in d)
print(f'durees : {len(d)} (attendu 23) ; total {(tot+290)//60}:{(tot+290)%60:02d} demo comprise (attendu 30:00)')
for c,(a,b) in {0:(1,2),1:(3,3),2:(4,8),3:(9,12),4:(13,13),5:(14,17),6:(18,19),7:(20,22),8:(23,23)}.items():
    t=sum(int(d[n-1][0])*60+int(d[n-1][1]) for n in range(a,b+1))+(290 if c==1 else 0)
    print(f'  ch.{c} : {t//60}:{t%60:02d}')
print('desequilibres div :', bad)
PY
```

**Cibles** : 31 diapositives ; 23 durées ; total 30:00 ; chapitres 0:50 / 5:40 (démonstration comprise) / 6:20 / 5:20 / 2:20 / 3:30 / 2:40 / 2:40 / 0:40. Les numéros de chapitre des titres de diapositives sont ceux du sommaire, la démonstration étant le chapitre 1.

### 5.4 Rendu du support, le contrôle que les autres ne font pas

Les contrôles du § 5.3 lisent le Markdown : ils restent **verts sur une diapositive dont le tiers inférieur est invisible**. C'est ce qui avait laissé passer 17 à 22 diapositives coupées.

```bash
cd docs/RNCP/bloc-3-coordination-pilotage/slides
npm run verify:rendu
```

Une seule commande : elle construit, sert, récupère la police du thème, rend toutes les pages et mesure. **Elle échoue** si une diapositive déborde, si `dist/` manque ou si une page n'a rien rendu, un vert signifie que les pages ont réellement été mesurées, pas seulement que rien n'a été trouvé.

**À relancer après toute retouche du support, et avant l'export PDF.** Un `npm run export` ne signale rien : il produit un PDF dont les pages sont coupées exactement comme l'écran.

### 5.5 Liens et tableaux

```bash
cd /home/user/Movie-Picker/docs/RNCP/bloc-3-coordination-pilotage
python3 - <<'PY'
import re, os, glob
bad=0
for f in glob.glob('**/*.md', recursive=True):
    d=os.path.dirname(f)
    for m in re.finditer(r'\[([^\]]+)\]\(([^)]+)\)', open(f,encoding='utf-8').read()):
        link=m.group(2)
        if link.startswith(('http','#','mailto')): continue
        t=link.split('#')[0]
        if t and not os.path.exists(os.path.normpath(os.path.join(d,t))):
            print(f'  lien casse : {f} -> {link}'); bad+=1
print('liens casses :', bad)
PY
```

---

## 6. La carte du dossier

| Fichier | Compétence | Alimente |
|---------|:----------:|----------|
| [`00-plan-presentation-orale.md`](00-plan-presentation-orale.md) | | **Le cadre** : minutage, déroulé des 23 diapositives présentées, rattachement des 14 éléments imposés, questions du jury |
| [`01-planification.md`](01-planification.md) | C3.1 **ÉLIM** | Diapos 4 à 10 |
| [`02-suivi-indicateurs.md`](02-suivi-indicateurs.md) | C3.2.1 **ÉLIM** | Diapos 11 à 15 |
| [`03-arbitrage.md`](03-arbitrage.md) | C3.2.2 | Diapos 16 à 18 |
| [`04-management-equipe.md`](04-management-equipe.md) | C3.3.1 | Diapos 19 à 23 |
| [`05-competences.md`](05-competences.md) | C3.3.2 | Diapos 24 à 26 |
| [`06-comptes-rendus.md`](06-comptes-rendus.md) | C3.4.1 | Diapos 27 à 29 |
| [`07-demonstration.md`](07-demonstration.md) | C3.4.2 **ÉLIM** | Diapos 30 et 31, et la démonstration en direct |
| [`slides/slides.md`](slides/slides.md) | | Le support, 31 diapositives |
| [`RESTE-A-FAIRE.md`](RESTE-A-FAIRE.md) | | Ce qui reste, priorisé |

**Le sens de la dépendance** : les fichiers de matière sont la **source de vérité**, le support en est dérivé. Modifier une diapositive sans mettre à jour le chapitre correspondant crée une divergence qui se paiera à la relecture suivante.

---

## 7. Décisions prises, leur défaire demande une raison

| Décision | Pourquoi | Si tu veux la défaire |
|----------|----------|-----------------------|
| **Le cas d'arbitrage est la migration .NET**, confirmée par le fait que la migration est absente de la feuille de route du MVP au moment où celui-ci est déclaré terminé (16/03 16:48), et ajoutée le 18/03 | C'est ce qui en fait un arbitrage et non l'exécution d'un plan | Deux cas de réserve documentés en § 7 de `03-arbitrage.md` |
| **Ne pas écrire « 13 J/H non prévus au chiffrage »** | Faux : le lot figure au chiffrage du Bloc 1 (8+3+2). La formulation serait démentie par le dossier lui-même | |
| **Le cas « environnement de test rejeté malgré 30 % de gain » a été retiré** | Aucune trace dans le dépôt. Remplacé par l'abandon de l'application mobile (16/05 → 26/05), lui documenté | Si le propriétaire du projet confirme que c'est réel mais non tracé, le réintégrer en annexe A3 |
| **Le chapitre 4 ne distingue pas l'auteur de ses outils d'assistance** : l'affectation des missions est mesurée dans le temps sur les 833 commits classés par mission, et entre ce qui reste à la main et ce qui est confié à la chaîne | Décision du propriétaire du projet le 11/09/2026 au soir : « moi et les agents IA, c'est la même personne, ne fais pas de différence ». La version précédente (délégation mesurée par les commits co-signés) est dans l'historique Git avant `5bd928e` | Recalculer la classification par mission (§ 14) plutôt que de réintroduire un acteur |
| **Pas de frontmatter par diapositive** | Risque de décalage de numérotation (§ 4.3) | |

---

## 8. Questions encore ouvertes pour le propriétaire du projet

1. ~~Garder ou retirer la partie A du chapitre 4~~ : tranché le 11/09/2026, elle est devenue le cœur du chapitre, et l'organisation cible a été retirée.
2. **Le cas d'arbitrage « environnement de test / 30 % »** correspond-il à une décision réelle non tracée ?
3. ~~Fusionner la PR #83~~, ✅ fait le 06/09/2026, les cases de `suivi-rncp.md` sont cochées.

---

## 9. Historique de la session du 5 septembre 2026

```
ab565a8  chapitre 2, pilotage de l'avancement (C3.2.1 ÉLIM)
6af1604  chapitre 3, le cas d'arbitrage (C3.2.2)
d757b5e  chapitre 4, piloter l'équipe (C3.3.1)
7f1b954  chapitre 5, les besoins en compétences (C3.3.2)
4349b7e  chapitre 6, rendre compte au commanditaire (C3.4.1)
ba00a51  chapitre 7, la démonstration (C3.4.2 ÉLIM)
1171d9e  conclusion et annexes, le support est complet
a4c5850  revue complète, corrections et suivi des restes
f9db920  traitement des 5 points de vigilance de la revue
a9c2859  référence la PR #83 dans le suivi des restes
```

**Point de départ de la session** : plan arrêté, chapitre 1 produit, chapitres 2 à 8 à produire.
**Point d'arrivée** : support complet, revu, PR ouverte et verte.

## 10. Seconde relecture du 5 septembre 2026

Relecture de vérification : chaque chiffre recoupé contre le dépôt, chaque libellé d'interface contre `fr.ts`, chaque fichier cité contre son contenu, et, pour la première fois, **le support rendu dans un navigateur**.

**Ce qui tient.** Les 25 libellés d'interface du script de démonstration existent tous, au mot près. Le dispositif de délégation du chapitre 4 est exact (7 étapes, 3 arrêts en majuscules, 6 contrôles de pull request). Les 944 lignes TypeScript, les 4 653 lignes C# sur 111 fichiers, les 87 lignes de front, la médiane de 17 jours, les 7 écarts à +2 de la grille, le budget de 20 J/H et 2 100 €, les 5 contrôles bloquants : tous vérifiés exacts.

**Ce qui a été corrigé** : 11 écarts, listés en § 4 bis de [`RESTE-A-FAIRE.md`](RESTE-A-FAIRE.md).

**Ce qui a été découvert** : le support n'avait jamais été rendu, et 17 diapositives sont coupées (§ 0 de `RESTE-A-FAIRE.md`). D'où le nouveau contrôle du § 5.4 ci-dessus.

**La leçon de méthode, pour la prochaine reprise** : les contrôles du § 5.3 vérifient la *structure* du support, nombre de diapositives, équilibre des balises, minutage. Aucun ne vérifiait qu'il **s'affiche**. Un contrôle qui lit la source ne remplace pas un contrôle qui regarde le résultat.

## 11. Refonte du support, 5 septembre 2026

Déclenchée par une remarque du propriétaire du projet, et elle change la règle de rédaction du support : **le jury n'a accès qu'aux diapositives**. Il n'ouvrira pas le dépôt, et il ne lira pas un paragraphe affiché trente secondes.

**Ce qui a changé.** Une idée par diapositive, énoncée dans le titre. La preuve à l'écran, l'argumentation en note de présentateur. Sept tableaux devenus des schémas (§ 0 de `RESTE-A-FAIRE.md`). Le mur de 25 indicateurs de la diapositive 12 remplacé par la méthode de sélection et les 5 axes, les valeurs restant sur les deux tableaux de bord. Trois répétitions littérales supprimées.

**Ce qui n'a pas changé, et ne doit pas changer** : les 40 diapositives, la numérotation, le rattachement des 14 éléments imposés, le minutage à 30:00 exact chapitre par chapitre, et l'ordre des chapitres, qui est celui du référentiel, ce qui permet au jury de cocher compétence par compétence sans chercher.

**Le piège de rédaction à connaître** : dans un bloc HTML, une ligne qui commence par une balise **inline** (`<b>`, `<span>`) après une ligne vide est enveloppée dans un `<p>` par markdown, ce qui casse la grille CSS. Commencer chaque ligne par `<div>`. C'est ce qui avait cassé la grille de compétences au premier essai.

## 12. Restructuration du 11 septembre 2026

Trois consignes du propriétaire du projet, appliquées ensemble : **moins de texte, moins de diapositives et de répétitions, le plus de schémas possible** ; et **la démonstration ouvre la présentation**, parce qu'un jury qui a vu le produit comprend mieux le pilotage qui a mené là. L'ordre des chapitres 1 à 6 reste celui du référentiel, qui est aussi l'ordre chronologique du projet ; la demande de validation, elle, ferme la présentation.

**Ce qui a changé.** 40 → 35 diapositives, 32 → 27 présentées, volume de texte des diapositives présentées en baisse de 16 % (35 200 → 29 400 caractères). La densité moyenne par diapositive reste proche de 1 100 caractères, les fusions concentrant ce qu'elles regroupent : les plus lourdes sont désormais la 16 (options + logigramme + décision), la 19 et la 23, à alléger encore si la relecture le demande. Cinq fusions : méthode + outils de planification (ancienne 4 + 5 → 4), logigramme + décision (17 + 18 → 16), animation + inclusion (21 + 22 → 19), annonce de la démonstration réduite à un mot et au lien du site (2 + 30 → 3), validation + bilan (31 + 32 → 27). Dix tableaux devenus des schémas : lots en barre empilée (6), ressources en indicateurs (7), RACI en grille colorée (8), vigilance en cartes (9), outil de suivi en indicateurs (10), dérive en frise (15), styles en quadrant (18), plan de développement en barres (23), compte rendu en pas et en barre (25), satisfaction en indicateurs et frise (26). Répétitions retirées : « une version tous les 17 jours » et les « 9 livraisons » de l'ancienne diapositive 4, les 98 J/H par profil ne sont plus qu'en 17.

**Correspondance ancienne → nouvelle numérotation**, pour lire les sections historiques de ce fichier et de `RESTE-A-FAIRE.md` : 1 → 1 ; 3 → 2 ; 2 + 30 → 3 ; 4 + 5 → 4 ; 6 → 5 ; 7 → 6 ; 8 → 7 ; 9 → 8 ; 10 → 9 ; 11 → 10 ; 12 → 11 ; 13 → 12 ; 14 → 13 ; 15 → 14 ; 16 → 15 ; 17 + 18 → 16 ; 19 → 17 ; 20 → 18 ; 21 + 22 → 19 ; 23 → 20 ; 24 → 21 ; 25 → 22 ; 26 → 23 ; 27 → 24 ; 28 → 25 ; 29 → 26 ; 31 + 32 → 27 ; annexes 33 à 40 → 28 à 35.

**Ce qui n'a pas changé** : le minutage à 30:00 exact chapitre par chapitre, les 14 éléments imposés tous rattachés (le plan § 1 porte la nouvelle table), les deux registres annoncés en diapositive 2, avant la démonstration, les limites assumées.

**Piège de rendu découvert** : les primitives `.kpi`, `.tl`, `.steps` et `.quad` stylent leur `<b>` de titre en bloc. Un `<b>` imbriqué dans le texte d'une de ces primitives cassait la ligne et changeait de taille : les sélecteurs sont désormais `> b` pour le titre, et `span b` / `i b` héritent. Toute nouvelle primitive doit suivre la même règle.

**Consignes d'épure du 11 septembre, à respecter dans toute retouche** : aucun tiret cadratin ni point médian dans le support, remplacés par deux-points, virgules ou barres obliques ; aucun texte d'aide qui renvoie à une autre diapositive, à un chapitre ou à une annexe (ces renvois vivent dans les notes de présentateur) ; aucune phrase de liaison qui n'apporte pas une information demandée par le barème. La diapositive 3 ne porte qu'un mot et le lien `web.movie-picker.fr`, qui est le domaine réellement servi (`www` ne répond pas, voir `DEBT-014`).

## 13. La vérité du solo, 11 septembre 2026

> Section historique : le contenu du chapitre 4 et de la diapositive 14 décrit ici a été remplacé le soir même, voir § 14. Les commandes de recalcul des commits co-signés ne servent plus.

Question du propriétaire du projet : *« Je suis obligé de simuler une équipe ? »* Réponse : non, rien ne l'impose ; le référentiel est écrit pour une équipe, et c'est à la présentation de montrer comment chaque critère est couvert. Décision : **dire la vérité, retirer l'organisation cible**, et présenter la vraie façon de travailler.

**Ce qui a changé.** Diapositive 2, le sommaire seul à l'écran (les trois blocs de texte sur le solo ont été retirés le 11 septembre, le message est dit à voix haute, il est en note), remplace les deux registres. Diapositive 7, une personne et les trois acteurs réels. Diapositive 8 et annexe A6, RACI sur les acteurs réels. Diapositive 17, ce qui est délégué et gardé, avec l'histogramme de la part des commits co-signés par mois. Diapositive 22, auto-évaluation février → septembre. Diapositive 23, plan personnel en 5 actions et note RH. Chapitres 1, 4 et 5 réécrits dans le même sens, plan § 2 réécrit.

**Le fait nouveau, mesuré** : 537 des 833 commits au 5 septembre (64 %) sont co-signés par un agent d'assistance, aucun avant le 13 mai 2026, 73 / 84 / 65 / 73 % de mai à août. Recalcul : `git log 5ce0a05f --format='%H%x00%ad%x00%b%x01' --date=format:%Y-%m`, puis compter les corps contenant `co-authored-by`.

**Les niveaux de la grille sont une auto-évaluation** posée à partir des preuves du dépôt (date d'introduction, ce qui a été livré, ce qui a échoué). Ils appartiennent au propriétaire du projet, qui peut les ajuster ; la seule contrainte est que les deux écarts non comblés restent ceux que les indicateurs désignent, arbitrage et revue, sans quoi la grille cesse d'être crédible.


---

## 14. Épure et une seule personne, 11 septembre 2026 au soir

Deux consignes du propriétaire du projet, dans l'ordre : **retirer tous les blocs de texte qui disent ce qui se dit à l'oral** (le jury ne les lit pas), réduire encore le nombre de diapositives et les répétitions ; puis **ne faire aucune différence entre lui et les agents d'assistance** : c'est la même personne.

**Ce qui a changé sur le support.** 35 → 31 diapositives, 27 → 23 présentées. Fusions : lots + ressources (6), outil de suivi + méthode des indicateurs (9), dérive + options + logigramme (13), compétences exigées + grille (18). Plus aucun `.lede`, `.note` ou `.alert` sur une diapositive présentée, sauf la demande de validation de la 23, qui est la phrase à prononcer. Chaque diapositive : un titre qui porte l'idée, un schéma ou des chiffres, des libellés courts ; l'argumentation est en note de présentateur, et les notes disent explicitement ce qui « se dit ».

**Ce qui a changé sur le fond.** Toute mention d'agents, de commits co-signés et de délégation a disparu du support et des chapitres. Le chapitre 4 et la diapositive 14 mesurent désormais **l'affectation des missions dans le temps** : les 833 commits classés en quatre missions (produit 24 %, fiabilité 51 %, chaîne et dépendances 13 %, documentation et pilotage 12 %), mois par mois, et la répartition entre ce qui reste à la main et ce qui est confié à la chaîne. Le style dominant devient le délégatif **à l'automatisation**. La RACI (diapositive 7, annexe A6, chapitre 1 § 5) n'a plus de colonne « Agents IA ».

**Recalcul de la classification par mission** : `git log 5ce0a05f --format='%ad%x09%s' --date=format:%Y-%m`, puis classer par le préfixe conventionnel du message (`feat`/`perf`/`ui` → produit ; `fix`/`test`/`refactor`/`style` → fiabilité ; `ci`/`chore`/`build`/`config`/`release` → chaîne ; `docs`/`backlog`/`roadmap` → documentation) et, pour les 184 messages sans préfixe (mars et avril surtout, plus les fusions), par mots-clés dans le message ou le nom de branche.

**Numérotation** : 1 titre, 2 sommaire, 3 démonstration, 4 à 8 planifier, 9 à 12 piloter, 13 arbitrage, 14 à 17 management, 18 et 19 compétences, 20 à 22 rendre compte, 23 bilan, 24 à 31 annexes A1 à A8. Correspondance avec la numérotation du matin : 4 → 4, 5 → 5, 6 + 7 → 6, 8 → 7, 9 → 8, 10 + 11 → 9, 12 → 10, 13 → 11, 14 → 12, 15 + 16 → 13, 17 → 14, 18 → 15, 19 → 16, 20 → 17, 21 + 22 → 18, 23 → 19, 24 → 20, 25 → 21, 26 → 22, 27 → 23, 28 à 35 → 24 à 31.
