# Tutoriel — Nom de domaine personnalisé (front AWS + API GCP)

> **Objectif (roadmap § 28)** : au lieu d’utiliser seulement `https://dxxxx.cloudfront.net` et `https://xxxx.run.app`, faire tourner l’app sur des URL du type **`https://web.movie-picker.fr`** et **`https://api.movie-picker.fr`**.  
> Ce document est une **procédure à suivre dans l’ordre**. Références complémentaires : [03-deploy-aws-front.md](03-deploy-aws-front.md), [02-deploy-gcp-api.md](02-deploy-gcp-api.md), [04-deploy-cicd.md](04-deploy-cicd.md).

---

## Ce que tu obtiens à la fin

| Avant | Après (exemple) |
|--------|------------------|
| Front CloudFront `dxxxx.cloudfront.net` | `https://web.movie-picker.fr` |
| API Cloud Run `xxxx.region.run.app` | `https://api.movie-picker.fr` |

Les utilisateurs ne voient plus les URLs « techniques » ; le code du front appelle l’API sur l’URL **racine** `https://api.movie-picker.fr` (le client ajoute déjà `/api/v1/...`).

---

## Prérequis (à cocher avant de commencer)

- [ ] Domaine **movie-picker.fr** (ou autre) **actif** chez un registrar — ce tutoriel détaille la **zone DNS OVH**.
- [ ] Accès **AWS** (compte où est ta distribution **CloudFront** et ton bucket **S3**).
- [ ] Accès **Google Cloud** (projet où tourne **Cloud Run** pour l’API).
- [ ] Tu connais l’URL actuelle de ta distribution CloudFront : onglet **CloudFront** → distribution → **General** → *Distribution domain name* (ex. `d1uc368ae7xu4s.cloudfront.net`).
- [ ] Pour la CI : droits pour modifier les **secrets GitHub** `VITE_API_URL` et la variable / secret **`ALLOWED_ORIGINS`** (voir [04-deploy-cicd.md](04-deploy-cicd.md)).

**Ordre conseillé** : d’abord le **front** (certificat + CloudFront + DNS), puis l’**API** (mapping Cloud Run + DNS), puis **CORS + rebuild front** (sinon l’app peut encore pointer vers l’ancienne URL API).

### Tu es en **eu-west-1** (Irlande) ? C’est normal

Souvent le **bucket S3** du front est en **eu-west-1** (ou une autre région UE). **Aucun problème** : tu ne dois **pas** déplacer ton bucket ni recréer CloudFront ailleurs.

| Ressource | Région habituelle | À retenir |
|-----------|-------------------|-----------|
| Bucket S3 (origine du front) | **eu-west-1**, etc. | Tu **gardes** ta région actuelle. |
| Distribution **CloudFront** | Service **global** (pas « une région » comme EC2) | Elle peut continuer à pointer vers ton bucket en eu-west-1. |
| Certificat **ACM** pour le **nom custom** (`web.movie-picker.fr`) sur CloudFront | **Uniquement [us-east-1](https://console.aws.amazon.com/acm/home?region=us-east-1)** | Exigence AWS : CloudFront ne propose que des certificats ACM créés en **N. Virginia**. |

**Concrètement** : dans la console AWS, le **sélecteur de région** (en haut à droite) affiche souvent **eu-west-1** pour S3 ou d’autres services. Pour **demander et valider** le certificat, ouvre **Certificate Manager** et passe **explicitement** la région sur **US East (N. Virginia) `us-east-1`** — c’est une **exception** pour ce seul certificat, pas un changement de région pour tout ton projet.

---

## Partie A — Front : `web.movie-picker.fr` sur CloudFront

### Étape A1 — Choisir le sous-domaine du front

Exemple utilisé ci-dessous : **`web.movie-picker.fr`**. Tu peux en choisir un autre (`app.…`, `cinema.…`, `www.…`), mais garde le **même** partout (ACM, CloudFront, OVH, `ALLOWED_ORIGINS`).

Noter pour plus tard : l’**origine** exacte sera `https://web.movie-picker.fr` (**sans** slash final).

---

### Étape A2 — Demander un certificat SSL dans AWS (région OBLIGATOIRE **us-east-1**)

CloudFront **n’accepte** les certificats ACM que dans la région **US East (N. Virginia)**.

1. Ouvre la [console AWS Certificate Manager](https://console.aws.amazon.com/acm/home?region=us-east-1) en choisissant la région **us-east-1** (menu en haut à droite).
2. **Request certificate** → **Request a public certificate** → **Next**.
3. **Fully qualified domain name** : saisir `web.movie-picker.fr`  
   - *Option* : demander `*.movie-picker.fr` (wildcard) si tu prévois plusieurs sous-domaines HTTPS sous le même certificat (ex. `web` et `www`) — une seule entrée suffit souvent pour commencer avec `web.movie-picker.fr` seul.
4. **Validation method** : **DNS validation** → **Request**.
5. Sur l’écran du certificat en attente, clique sur le bouton **Create records in Route 53** **seulement si** ta zone est chez Route 53. **Chez OVH**, tu dois créer l’enregistrement **manuellement** (étape A3).

---

### Étape A3 — Valider le certificat via la zone DNS OVH

1. Dans ACM (**us-east-1**), ouvre le certificat → section **Domains** → tu vois un tableau avec :
   - **CNAME name** (ex. `_abc123.web.movie-picker.fr` ou similaire),
   - **CNAME value** (ex. `_xyz.acm-validations.aws.`).
2. Connecte-toi à [OVH](https://www.ovh.com/manager/) → **Web Cloud** → **Noms de domaine** → **movie-picker.fr** → onglet **Zone DNS**.
3. **Ajouter une entrée** :
   - **Type** : `CNAME`,

   **Correspondance avec le tableau ACM** (ne pas inverser les deux) :

   | Colonne dans ACM | Champ OVH | Quoi mettre |
   |------------------|-----------|-------------|
   | **CNAME name** (nom complet du type `_xxx.web.movie-picker.fr`) | **Sous-domaine** | Uniquement la partie **avant** `.movie-picker.fr` du *CNAME name*. Ex. ACM donne `_abcdefgh.web.movie-picker.fr` → sous-domaine OVH : **`_abcdefgh.web`**. |
   | **CNAME value** (cible du type `_yyy.acm-validations.aws.`) | **Cible** (ou *Cible / CNAME*) | Colle **tel quel** la **valeur CNAME** d’ACM (souvent finit par `acm-validations.aws.`). |

   En résumé : **Sous-domaine** = dérivé du **nom** CNAME ACM ; **Cible** = la **valeur** CNAME ACM. Si OVH affiche « Nom CNAME » / « Valeur CNAME », aligne **Nom** sur le *CNAME name* (partie relative au domaine) et **Valeur** sur le *CNAME value*.

   - OVH accepte parfois la cible **avec ou sans** point final (`…aws.` vs `…aws`) ; si la validation reste bloquée, réessaie l’autre variante.
4. Enregistre ; attends **quelques minutes** (parfois jusqu’à 30–60 min). Dans ACM, le statut du certificat doit passer à **Issued**. Tant que ce n’est pas **Issued**, ne passe pas à A4.

**Si la validation reste bloquée** : vérifie qu’il n’y a pas **deux** zones DNS concurrentes pour le même domaine, et que le sous-domaine du CNAME est **exactement** celui demandé par ACM (copier-coller).

---

### Étape A4 — Attacher le domaine et le certificat à ta distribution CloudFront

1. [Console CloudFront](https://console.aws.amazon.com/cloudfront/v4/home) → sélectionne la **distribution** qui sert déjà ton front (celle avec `dxxxx.cloudfront.net`).
2. Onglet **General** → bouton **Edit**.
3. **Alternate domain name (CNAME) — optional** : ajoute **`web.movie-picker.fr`** (un domaine par ligne si plusieurs).
4. **Custom SSL certificate** : choisir le certificat **Issued** créé en A2–A3 (il doit apparaître dans la liste ; sinon = mauvaise région ACM ou certificat pas encore Issued).
5. **Save changes**.  
   → La distribution passe en statut **Deploying** ; compte **15 à 25 minutes** avant que les changements soient actifs partout.

---

### Étape A5 — Pointer `web.movie-picker.fr` vers CloudFront (OVH)

1. Note le **Distribution domain name** de la distribution (ex. `d1uc368ae7xu4s.cloudfront.net`) — onglet **General**, pas l’URL du bucket S3.
2. OVH → **Zone DNS** de **movie-picker.fr** → **Ajouter une entrée** :
   - **Type** : `CNAME`,
   - **Sous-domaine** : `web`,
   - **Cible** : `d1uc368ae7xu4s.cloudfront.net` (remplace par **ton** domaine CloudFront ; sans `https://` ; si OVH exige un point final : `d1uc368ae7xu4s.cloudfront.net.`).
3. Évite un **deuxième** CNAME `web` qui ferait doublon ; supprime l’ancien test si besoin.

Attends la propagation DNS (souvent rapide sur OVH, parfois jusqu’à quelques heures).

---

### Étape A6 — Vérifier le front en HTTPS

1. Ouvre **`https://web.movie-picker.fr`** dans le navigateur.
2. Tu dois voir **Movie Picker** comme sur l’URL `.cloudfront.net`, avec **cadenas** valide.
3. Teste une route interne (ex. `/new` ou un slug `/s/...`) — si 404 sur refresh, reprend la config **Custom error responses** / **Single Page App** décrite dans [03-deploy-aws-front.md](03-deploy-aws-front.md) § 4.

4. **Créer une soirée** ne marchera pas tant que la **Partie C** n’est pas faite (CORS + URL API dans le bundle). Si tu vois *« Impossible de joindre l’API… »*, voir la section **Dépannage — message « Impossible de joindre l’API »** plus bas dans ce fichier.

---

## Partie B — API : `api.movie-picker.fr` sur Cloud Run

### Étape B1 — Lancer l’assistant de domaine sur Cloud Run

1. [Console Cloud Run](https://console.cloud.google.com/run) → même **projet** et **région** que ton service API actuel.
2. Ouvre le **service** de l’API (pas le front).
3. Onglet **Domain mappings** (ou **Manage custom domains** / **Mapa domain** selon l’UI) → **Add mapping** / **Map domain**.
4. Saisis **`api.movie-picker.fr`** et valide ; Google indique des **enregistrements DNS** à créer (souvent des enregistrements **A** et **AAAA** pointant vers des adresses Google, ou un **CNAME** vers un hôte type `ghs.googlehosted.com` — **suis exactement** ce que l’UI affiche pour **ton** mapping).

---

### Étape B2 — Créer les enregistrements dans OVH

1. OVH → **Zone DNS** → **movie-picker.fr** → ajoute **chaque** enregistrement indiqué par Cloud Run (type, nom/sous-domaine, cible / adresse IPv4 / IPv6).
2. Attends que le mapping Cloud Run passe en état **Active** et que le certificat managé Google soit OK.

---

### Étape B3 — Tester l’API

Dans un navigateur ou avec curl :

```text
https://api.movie-picker.fr/health
```

Réponse attendue (JSON) du type : `"status":"ok"` (voir ton OpenAPI / spec).

---

## Partie C — Application Movie Picker : CORS et build du front

Sans cette partie, le navigateur peut **bloquer** les appels (CORS) ou le JS peut encore utiliser l’**ancienne URL** Cloud Run.

### Étape C1 — `ALLOWED_ORIGINS` (API Cloud Run)

1. La valeur doit contenir **l’origine exacte du front** telle que tapée dans la barre d’adresse : ici **`https://web.movie-picker.fr`** (même sous-domaine que sur CloudFront : **`web`**, **`www`**, etc.).  
   - Pas `http`, **pas** de slash final.  
   - Si tu utilises un autre sous-domaine que `web`, mets **exactement** celui de la barre d’adresse (ex. `https://www.movie-picker.fr`) — chaque variante est une origine différente pour le navigateur.
2. Plusieurs environnements : sépare par **virgules** sans espace superflu, ex.  
   `https://web.movie-picker.fr,https://d1uc368ae7xu4s.cloudfront.net`  
   (utile le temps de la bascule).
3. Applique la variable sur Cloud Run (console ou déploiement CI) selon [04-deploy-cicd.md](04-deploy-cicd.md).

---

### Étape C2 — `VITE_API_URL` et redeploy du front

1. Le secret GitHub **`VITE_API_URL`** (ou équivalent) doit valoir **`https://api.movie-picker.fr`** — **sans** `/api/v1`, **sans** slash final.
2. **Redéclenche un déploiement** du job **deploy-front** (push sur `master` ou lancement manuel du workflow) pour que le bundle Vite soit regénéré avec la bonne base URL.
3. Optionnel : une fois tout vérifié, tu peux retirer l’ancienne origine de `ALLOWED_ORIGINS` si tu n’en as plus besoin.

---

### Étape C3 — Vérification dans le navigateur

1. Ouvre **`https://web.movie-picker.fr`**.
2. Outils développeur (F12) → onglet **Réseau** : les requêtes vers l’API doivent partir vers **`api.movie-picker.fr`** (ou ton URL `*.run.app` selon le build).
3. Onglet **Console** : **aucune** erreur du type *blocked by CORS*.

---

## Checklist finale

- [ ] Certificat ACM **Issued** (région **us-east-1**).
- [ ] CloudFront : **Alternate domain name** = `web.movie-picker.fr` + bon certificat.
- [ ] OVH : CNAME `web` → `xxx.cloudfront.net`.
- [ ] `https://web.movie-picker.fr` OK (SPA + routes).
- [ ] Cloud Run : mapping **Active** pour `api.movie-picker.fr`.
- [ ] `https://api.movie-picker.fr/health` OK.
- [ ] `ALLOWED_ORIGINS` inclut `https://web.movie-picker.fr`.
- [ ] `VITE_API_URL` = `https://api.movie-picker.fr` + front redéployé.

---

## Dépannage — message « Impossible de joindre l’API »

Ce texte vient du front quand l’appel **`fetch`** vers l’API échoue (réseau ou **CORS**). Sur un domaine custom (**ex. `https://web.movie-picker.fr/new`**), ce n’est **pas** `pnpm dev:api-dotnet` : l’API est sur **Cloud Run** (ou ton domaine `api.…`).

**À faire dans l’ordre :**

1. **F12** → onglet **Réseau** : refais « Créer une soirée » et regarde la requête vers l’API (souvent `…/api/v1/events` ou hôte `*.run.app` / `api.…`).  
   - Statut **(failed)** ou **CORS** / *blocked by CORS* dans la **Console** → mets à jour **`ALLOWED_ORIGINS`** sur Cloud Run avec **exactement** `https://web.movie-picker.fr` (ou ton vrai sous-domaine), puis **redéploie l’API** (ou mets à jour la variable dans la console et redémarre le service).
2. **`VITE_API_URL`** (secret GitHub pour le build du front) : doit être l’URL **HTTPS de l’API** (`https://xxxx.run.app` ou `https://api.movie-picker.fr`), **sans** `/api/v1`, **sans** slash final. Après changement : **redéploie le front** (nouveau build) — sinon le JS embarque encore l’ancienne valeur.
3. Vérifie **`https://…/health`** dans le navigateur (URL **API**). Si ça ne répond pas, l’API ou le domaine API est en cause avant le CORS.

---

## Dépannage rapide

| Symptôme | Piste |
|----------|--------|
| Page custom OK mais *Impossible de joindre l’API* | **ALLOWED_ORIGINS** = origine exacte du front (`https://web.…` si c’est ton URL) ; **VITE_API_URL** + redeploy front — voir section ci-dessus. |
| Certificat ACM reste **Pending validation** | CNAME OVH incorrect ou zone DNS pas chez OVH / doublon ailleurs. |
| CloudFront : pas de certificat dans la liste | Tu n’es pas en **us-east-1** dans ACM, ou certificat pas **Issued**. |
| `https://web.movie-picker.fr` ne répond pas | Attendre fin **Deploying** CloudFront ; vérifier CNAME OVH vers le **bon** *Distribution domain name*. |
| CORS dans la console | `ALLOWED_ORIGINS` doit être **exactement** l’origine du front (schéma + host). Redéployer l’API après changement. |
| L’app appelle encore `*.run.app` | Rebuild / redeploy front avec **`VITE_API_URL`** mis à jour. |
| Mixed content / erreur API | Vérifier que front et API sont bien en **https**. |

---

## Rappel utile

L’URL **`.cloudfront.net`** continue d’exister en interne : tu ajoutes un **alias** (`web.movie-picker.fr`) vers la même distribution. Tu ne « renommes » pas CloudFront ; tu poses un **nom lisible** dessus via DNS + certificat.
