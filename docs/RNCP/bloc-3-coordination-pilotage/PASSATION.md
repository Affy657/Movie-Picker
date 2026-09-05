# Passation — reprendre le travail sur le Bloc 3

> Écrit le **5 septembre 2026** à l'attention de quiconque, humain ou agent, reprend ce dossier.
> Lire ce fichier **avant** de toucher au support ou aux chapitres.
>
> Ce qui reste à faire est dans [`RESTE-A-FAIRE.md`](RESTE-A-FAIRE.md). Ce fichier-ci dit **comment travailler ici sans casser ce qui existe**.

---

## 1. Où on en est, en une minute

| | |
|--|--|
| **Épreuve** | Oral de 45 min (30 de présentation + 15 de questions), le **16 septembre 2026** |
| **État** | Rédaction terminée (7 chapitres, 40 diapositives). ⚠️ **Mais 17 diapositives sont coupées à l'écran** — le support n'avait jamais été rendu. Voir [`RESTE-A-FAIRE.md`](RESTE-A-FAIRE.md) § 0 |
| **Branche** | `claude/rncp-03-title-crwwov`, head `a9c2859`, **10 commits** d'avance sur `master` |
| **Pull request** | [#83](https://github.com/Affy657/Movie-Picker/pull/83) — ouverte, CI verte, `mergeable_state: clean`, aucune revue |
| **Reste** | **Reprendre la mise en page de 17 diapositives** (§ 0 de `RESTE-A-FAIRE.md`), puis du matériel : répétitions, jeu de données de démonstration, vidéo de repli, 2 captures |

**Tant que la PR n'est pas fusionnée**, les cases du Bloc 3 dans [`../suivi-rncp.md`](../suivi-rncp.md) restent décochées : la convention du dossier veut qu'un livrable ne soit coché qu'une fois mergé sur `master`.

---

## 2. Les règles d'écriture du dossier — ne pas les enfreindre

Elles ne sont pas cosmétiques : c'est ce qui distingue ce dossier d'un devoir générique, et c'est sur elles que la note se joue.

### 2.1 Les deux registres, jamais confondus

Le projet a été **exécuté seul**. Mais le Bloc 3 évalue le pilotage d'une équipe. Le dossier tient donc deux registres, annoncés à voix haute dès la diapositive 3 :

- **Le réel** : chiffré, daté, vérifiable dans le dépôt.
- **L'organisation cible** : 4 profils, sur lesquels sont construits la matrice RACI, l'affectation des missions, la grille de compétences et le plan de développement. **Annoncée comme projection, jamais présentée comme une équipe qui a existé.**

**Règle de rédaction** : on écrit *« l'organisation cible prévoit »*, *« la mission serait affectée à »*. Jamais *« mon développeur front a livré »*.

### 2.2 Ancrer sur une mesure, et dire la limite avant qu'on la trouve

Chaque chapitre part d'un fait vérifiable, puis **énonce lui-même sa faiblesse**. C'est la signature du dossier, et elle a été appliquée partout :

| Chapitre | La limite assumée |
|:--------:|-------------------|
| 2 | La charge est *reconstituée*, pas mesurée. Faible sur les cinq premières semaines (commits groupés) |
| 2 | Le tableau de suivi est **postérieur** au travail qu'il représente |
| 3 | L'objectif « aucune modification du front » a été manqué de **87 lignes** |
| 3 | Le lot est chiffré 13 J/H **a posteriori**, non vérifiable au jour près |
| 4 | La posture critiquée du 17–26 août a **réussi** — c'est ce qui la rend dangereuse |
| 6 | Deux des trois fiches d'anomalie ont été ouvertes et closes à **dix secondes** d'intervalle |
| 6 | Le dispositif de satisfaction est **ponctuel**, il donne un point et pas une tendance |

**Ne jamais supprimer ces aveux pour « améliorer » le dossier.** Un jury de professionnels ne sanctionne pas une limite assumée ; il sanctionne une limite dissimulée qu'il découvre lui-même.

### 2.3 La numérotation du support est contractuelle

- **Aucune diapositive de séparation de chapitre.** La page `N` de Slidev correspond exactement à la diapositive `N` de [`00-plan-presentation-orale.md`](00-plan-presentation-orale.md), et donc au rattachement des **14 éléments imposés** par le règlement.
- Le titre de chapitre est porté par sa **première diapositive** (ex. diapo 11 : « 2. Piloter l'avancement : l'outil de suivi »).
- **Toute insertion ou suppression de diapositive** oblige à mettre à jour, dans le même commit : le plan (§ 1 et § 4), la table `REFS` de `slides/global-bottom.vue`, et le tableau d'avancement de `slides/README.md`.

### 2.4 Le minutage est exact et doit le rester

Le support fait **30:00 pile**, exact chapitre par chapitre. Toute modification de contenu qui change une durée doit être compensée **dans le même chapitre**. Le script du § 5.3 le vérifie.

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
| Mesures de production (17 comptes, 74 %, p95 207 ms) | Dossier Bloc 4 | `docs/RNCP/bloc-4-mco/` — **non recalculables depuis le dépôt** |
| Items de feuille de route | `docs/roadmap-product.md`, `roadmap-tech.md` | § 5.2 ci-dessous |
| Libellés de l'interface (script de démo) | `apps/web/src/shared/i18n/locales/fr.ts` | Toujours citer le libellé **exact** |

---

## 4. Les pièges rencontrés — ils coûteront du temps à qui les ignore

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

Un bloc `---\nlayout: center\n---` mal interprété crée une **diapositive vide** et décale toute la numérotation — donc la table `REFS` et le rattachement des 14 éléments imposés. Il a été **retiré** de la diapositive 30 au profit de classes utilitaires (`text-center`, `mx-auto`). **Ne pas le réintroduire** sans revérifier le compte de diapositives.

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

**Pour vérifier le rendu**, il faut la police, sinon le navigateur retombe sur une police plus large et signale des débordements qui n'existent pas. La placer à côté du build :

```bash
cd docs/RNCP/bloc-3-coordination-pilotage/slides
curl -sS "https://fonts.googleapis.com/css2?family=Nunito+Sans:wght@200;400;600" \
  -A "Mozilla/5.0 Chrome/120" | grep -o 'https://[^)]*woff2' | head -1 \
  | xargs curl -sS -o dist/nunitosans.woff2
```

**Pour l'oral**, c'est une dépendance réseau non déclarée : présenter le support en ligne dans une salle sans réseau dégrade la mise en page de toutes les diapositives. **L'export PDF fige les polices** — c'est la raison la plus solide de présenter depuis le PDF.

### 4.6 Penser à nettoyer avant de committer

`node_modules/` et `dist/` du dossier `slides/` sont ignorés par `.gitignore`, mais ils pèsent lourd sur l'allocation disque de la session :

```bash
rm -rf docs/RNCP/bloc-3-coordination-pilotage/slides/{node_modules,dist}
```

### 4.6 Le pipeline bouge — revérifier avant de citer un nombre de jobs

L'annexe A5 énumère les jobs de `ci-cd.yml`. Ce fichier évolue : un job `test-api-mongo` a été ajouté sur `master` le 5 septembre, faisant passer le total de 14 à 15 pendant que cette PR était ouverte. **Avant toute relecture du dossier, recompter :**

```bash
git show origin/master:.github/workflows/ci-cd.yml | grep -cE '^  [a-z0-9-]+:$'   # retirer 1 pour « push », qui est un déclencheur
```

Et vérifier le caractère bloquant d'un job par sa présence dans les `needs` de `docker-api`, `deploy-api` ou `deploy-front`.

### 4.7 Prettier ne touche pas à ce dossier

`.prettierignore` exclut `*.md` et `docs/`, et `format:check` ne cible que `apps/`, `configs/` et `e2e/`. **Aucun formatage automatique à craindre ni à lancer** sur ce dossier. La CI ignore d'ailleurs entièrement une PR qui ne touche que `docs/` — seuls `changes` et `gitleaks` s'exécutent, tout le reste est *skipped* par le path-filtering. C'est normal, ce n'est pas un échec.

---

## 5. Vérifier son travail — scripts prêts à l'emploi

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
print(f'livres {d} ({dp} pts) · restants {t} ({tp} pts) · total {d+t}')
PY
```

### 5.3 Intégrité du support — à lancer avant chaque commit

```bash
cd /home/user/Movie-Picker/docs/RNCP/bloc-3-coordination-pilotage
python3 - <<'PY'
import re
s=open('slides/slides.md',encoding='utf-8').read()
lines=s.split('\n'); idx=[i for i,l in enumerate(lines) if l.strip()=='---']
start=idx[1]+1; chunks=[]
for i in idx[2:]: chunks.append(lines[start:i]); start=i+1
chunks.append(lines[start:])
print('diapos :', len(chunks), '(attendu 40)')
bad=0
for n,c in enumerate(chunks,1):
    body=re.sub(r'<!--.*?-->','','\n'.join(c),flags=re.S)
    o,cl=len(re.findall(r'<div\b',body)),len(re.findall(r'</div>',body))
    if o!=cl: print(f'  !! diapo {n} : div {o}/{cl}'); bad+=1
    if not [l for l in c if l.startswith('# ')]: print(f'  !! diapo {n} sans titre H1')
d=re.findall(r'DUREE (\d+):(\d\d)', s); tot=sum(int(a)*60+int(b) for a,b in d)
print(f'durees : {len(d)} (attendu 32) · total {(tot+290)//60}:{(tot+290)%60:02d} demo comprise (attendu 30:00)')
for c,(a,b) in {0:(1,3),1:(4,10),2:(11,15),3:(16,18),4:(19,23),5:(24,26),6:(27,29),7:(30,31),8:(32,32)}.items():
    t=sum(int(d[n-1][0])*60+int(d[n-1][1]) for n in range(a,b+1))+(290 if c==7 else 0)
    print(f'  ch.{c} : {t//60}:{t%60:02d}')
print('desequilibres div :', bad)
PY
```

**Cibles** : 40 diapositives · 32 durées · total 30:00 · chapitres 1:30 / 6:30 / 5:00 / 2:30 / 3:30 / 2:30 / 2:30 / 5:30 / 0:30.

### 5.4 Rendu du support — le contrôle que les autres ne font pas

Les contrôles du § 5.3 lisent le Markdown : ils restent **verts sur une diapositive dont le tiers inférieur est invisible**. C'est ce qui a laissé passer 17 diapositives coupées. Le contrôle de rendu est dans [`slides/verifier-rendu.mjs`](slides/verifier-rendu.mjs).

```bash
cd docs/RNCP/bloc-3-coordination-pilotage/slides
npm run build
# puis récupérer la police, cf. § 4.5
npx http-server dist -p 8099 --silent &
node verifier-rendu.mjs      # code de sortie 1 s'il reste un débordement
```

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
| [`00-plan-presentation-orale.md`](00-plan-presentation-orale.md) | — | **Le cadre** : minutage, déroulé des 32 diapositives, rattachement des 14 éléments imposés, questions du jury |
| [`01-planification.md`](01-planification.md) | C3.1 **ÉLIM** | Diapos 4 à 10 |
| [`02-suivi-indicateurs.md`](02-suivi-indicateurs.md) | C3.2.1 **ÉLIM** | Diapos 11 à 15 |
| [`03-arbitrage.md`](03-arbitrage.md) | C3.2.2 | Diapos 16 à 18 |
| [`04-management-equipe.md`](04-management-equipe.md) | C3.3.1 | Diapos 19 à 23 |
| [`05-competences.md`](05-competences.md) | C3.3.2 | Diapos 24 à 26 |
| [`06-comptes-rendus.md`](06-comptes-rendus.md) | C3.4.1 | Diapos 27 à 29 |
| [`07-demonstration.md`](07-demonstration.md) | C3.4.2 **ÉLIM** | Diapos 30 et 31, et la démonstration en direct |
| [`slides/slides.md`](slides/slides.md) | — | Le support, 40 diapositives |
| [`RESTE-A-FAIRE.md`](RESTE-A-FAIRE.md) | — | Ce qui reste, priorisé |

**Le sens de la dépendance** : les fichiers de matière sont la **source de vérité**, le support en est dérivé. Modifier une diapositive sans mettre à jour le chapitre correspondant crée une divergence qui se paiera à la relecture suivante.

---

## 7. Décisions prises — leur défaire demande une raison

| Décision | Pourquoi | Si tu veux la défaire |
|----------|----------|-----------------------|
| **Le cas d'arbitrage est la migration .NET**, confirmée par le fait que la migration est absente de la feuille de route du MVP au moment où celui-ci est déclaré terminé (16/03 16:48), et ajoutée le 18/03 | C'est ce qui en fait un arbitrage et non l'exécution d'un plan | Deux cas de réserve documentés en § 7 de `03-arbitrage.md` |
| **Ne pas écrire « 13 J/H non prévus au chiffrage »** | Faux : le lot figure au chiffrage du Bloc 1 (8+3+2). La formulation serait démentie par le dossier lui-même | — |
| **Le cas « environnement de test rejeté malgré 30 % de gain » a été retiré** | Aucune trace dans le dépôt. Remplacé par l'abandon de l'application mobile (16/05 → 26/05), lui documenté | Si le propriétaire du projet confirme que c'est réel mais non tracé, le réintégrer en annexe A3 |
| **Le chapitre 4 s'appuie sur la délégation à des agents d'assistance** comme ancrage réel du management | Sans elle, le chapitre est 100 % théorique. Le texte dit explicitement que ce n'est pas du management humain | **Décision ouverte** : le propriétaire peut demander son retrait. Le chapitre tient sans, il perd son volet réel |
| **Pas de frontmatter par diapositive** | Risque de décalage de numérotation (§ 4.3) | — |

---

## 8. Questions encore ouvertes pour le propriétaire du projet

1. **Garder ou retirer la partie A du chapitre 4** (délégation aux agents).
2. **Le cas d'arbitrage « environnement de test / 30 % »** correspond-il à une décision réelle non tracée ?
3. **Fusionner la PR #83** — sans quoi les cases de `suivi-rncp.md` restent décochées.

---

## 9. Historique de la session du 5 septembre 2026

```
ab565a8  chapitre 2, pilotage de l'avancement (C3.2.1 ÉLIM)
6af1604  chapitre 3, le cas d'arbitrage (C3.2.2)
d757b5e  chapitre 4, piloter l'équipe (C3.3.1)
7f1b954  chapitre 5, les besoins en compétences (C3.3.2)
4349b7e  chapitre 6, rendre compte au commanditaire (C3.4.1)
ba00a51  chapitre 7, la démonstration (C3.4.2 ÉLIM)
1171d9e  conclusion et annexes — le support est complet
a4c5850  revue complète, corrections et suivi des restes
f9db920  traitement des 5 points de vigilance de la revue
a9c2859  référence la PR #83 dans le suivi des restes
```

**Point de départ de la session** : plan arrêté, chapitre 1 produit, chapitres 2 à 8 à produire.
**Point d'arrivée** : support complet, revu, PR ouverte et verte.

## 10. Seconde relecture du 5 septembre 2026

Relecture de vérification : chaque chiffre recoupé contre le dépôt, chaque libellé d'interface contre `fr.ts`, chaque fichier cité contre son contenu, et — pour la première fois — **le support rendu dans un navigateur**.

**Ce qui tient.** Les 25 libellés d'interface du script de démonstration existent tous, au mot près. Le dispositif de délégation du chapitre 4 est exact (7 étapes, 3 arrêts en majuscules, 6 contrôles de pull request). Les 944 lignes TypeScript, les 4 653 lignes C# sur 111 fichiers, les 87 lignes de front, la médiane de 17 jours, les 7 écarts à +2 de la grille, le budget de 20 J/H et 2 100 €, les 5 contrôles bloquants : tous vérifiés exacts.

**Ce qui a été corrigé** : 11 écarts, listés en § 4 bis de [`RESTE-A-FAIRE.md`](RESTE-A-FAIRE.md).

**Ce qui a été découvert** : le support n'avait jamais été rendu, et 17 diapositives sont coupées (§ 0 de `RESTE-A-FAIRE.md`). D'où le nouveau contrôle du § 5.4 ci-dessus.

**La leçon de méthode, pour la prochaine reprise** : les contrôles du § 5.3 vérifient la *structure* du support — nombre de diapositives, équilibre des balises, minutage. Aucun ne vérifiait qu'il **s'affiche**. Un contrôle qui lit la source ne remplace pas un contrôle qui regarde le résultat.
