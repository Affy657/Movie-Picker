# Déploiement Front sur AWS (S3 + CloudFront)

Le front React est servi en statique : build Vite uploadé sur S3, exposé via CloudFront en HTTPS.

Référence : [01-spec-technique.md](../01-spec-technique.md) (front sur AWS, API sur GCP).

**Déjà créé le bucket et la distribution ?** → Applique la **section 3** (stratégie S3), puis **section 5** (upload du build) et **section 6** (vérification). **Important :** sans **Default root object** = `index.html` dans CloudFront (Paramètres généraux), l'URL racine renvoie « Access Denied » ; sans les **custom error responses** 403/404 → `/index.html`, les routes type `/s/xxx` ne marchent pas (section 4).

---

## 1. Build avec l'URL de l'API (Cloud Run)

L'URL de l'API est fixée **au build** via la variable `VITE_API_URL`. Elle doit pointer vers l'URL HTTPS de ton service Cloud Run.

**Depuis la racine du repo :**

```bash
# Remplacer par l'URL réelle de ton API Cloud Run (sans slash final)
cd apps/web
pnpm build -- --mode production
```

**Avec l'URL API en variable (recommandé) :**

```bash
cd apps/web
VITE_API_URL=https://VOTRE_SERVICE.run.app pnpm build
```

Exemple si ton API Cloud Run est `https://api-xxxxx-ew.a.run.app` :

**Linux / macOS / Git Bash :**
```bash
# Depuis la racine
VITE_API_URL=https://api-xxxxx-ew.a.run.app pnpm --filter web build

# Ou depuis apps/web
cd apps/web && VITE_API_URL=https://api-xxxxx-ew.a.run.app pnpm build
```

**Windows (PowerShell) :**
```powershell
cd apps\web
$env:VITE_API_URL="https://api-xxxxx-ew.a.run.app"; pnpm build
```

Le build est généré dans **`apps/web/dist/`** (fichiers statiques : `index.html`, `assets/`, etc.).

---

## 2. Bucket S3 pour l'hébergement statique

1. Aller dans [AWS S3](https://console.aws.amazon.com/s3/) → **Créer un bucket**.
2. Nom du bucket : ex. `movie-picker-web` (doit être unique au niveau global).
3. Région : choisir une région (ex. `eu-west-1`).
4. **Bloquer l'accès public** : laisser activé ; l'accès se fera uniquement via CloudFront.
5. Créer le bucket.

**Activer l'hébergement de site statique (optionnel pour S3 seul)** : pour S3 + CloudFront, on utilise le bucket comme **origine** CloudFront sans activer « Site web statique » sur le bucket. On configure uniquement les **autorisations** :

6. Onglet **Autorisations** du bucket :
   - **Stratégie de bucket** : ajouter une stratégie pour autoriser CloudFront à lire les objets (voir ci‑dessous après création de la distribution).

---

## 3. Politique du bucket (accès CloudFront uniquement)

Pour que seul CloudFront puisse lire le bucket (pas d'accès direct S3), on utilise une **Origin Access Control (OAC)** ou **Origin Access Identity (OAI)**. La console CloudFront peut créer une OAC et fournir une politique à coller dans S3.

**Après avoir créé la distribution CloudFront (étape 4)** : dans la distribution, onglet **Origines**, l'origine S3 affiche un bouton du type **« Copier la stratégie »**. Coller cette stratégie dans S3 → Bucket → Autorisations → Stratégie de bucket.

**Exemple de stratégie (à adapter avec ton ARN de bucket et l'ARN du rôle OAC CloudFront)** :

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowCloudFrontServicePrincipal",
      "Effect": "Allow",
      "Principal": {
        "Service": "cloudfront.amazonaws.com"
      },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::movie-picker-web/*",
      "Condition": {
        "StringEquals": {
          "AWS:SourceArn": "arn:aws:cloudfront::NUMERO_COMPTE:distribution/ID_DISTRIBUTION"
        }
      }
    }
  ]
}
```

(Remplacer `movie-picker-web`, `NUMERO_COMPTE`, `ID_DISTRIBUTION` par tes valeurs.)

---

## 4. Distribution CloudFront

1. Aller dans [CloudFront](https://console.aws.amazon.com/cloudfront/) → **Créer une distribution**.
2. **Origine** :
   - Domaine d'origine : sélectionner le bucket S3 (ex. `movie-picker-web.s3.eu-west-1.amazonaws.com`).
   - Activer **Origin access** : **Origin access control (recommandé)** et créer un groupe de contrôle si demandé.
   - Conserver le nom d'origine par défaut (ex. `S3-movie-picker-web`).
3. **Comportements par défaut** :
   - Viewer protocol policy : **Redirect HTTP to HTTPS**.
   - Méthodes autorisées : GET, HEAD, OPTIONS (suffisant pour du statique).
   - Cache policy : **CachingOptimized** ou **CachingDisabled** pour tester.
4. **Paramètres par défaut de la distribution** :
   - **Default root object** : **`index.html`** — obligatoire, sans ça l'URL racine affiche « Access Denied ».
   - **Custom error responses** : voir la section détaillée ci‑dessous.
5. Créer la distribution. Noter l'**URL de la distribution** (ex. `https://d1234abcd.cloudfront.net`).

### 4.1. Custom error responses (détail) — obligatoire pour la SPA

Sans ces réponses personnalisées, quand on ouvre une URL comme `https://xxx.cloudfront.net/s/abc123` ou qu'on rafraîchit la page sur une route, CloudFront demande à S3 le fichier `/s/abc123`. Ce fichier n'existe pas → S3 renvoie **403** (ou 404). L'utilisateur voit une erreur au lieu de l'app React. En redirigeant 403 et 404 vers `index.html` avec un code 200, CloudFront renvoie toujours la SPA ; React Router affiche ensuite la bonne page selon l'URL.

**Où les configurer :** CloudFront → ta distribution → onglet **Erreurs** (ou **Error pages**).

**À ajouter : deux entrées.**

| Paramètre | 1re entrée (403) | 2e entrée (404) |
|-----------|------------------|------------------|
| **HTTP error code** | 403 | 404 |
| **Customize error response** | Oui | Oui |
| **Response page path** | `/index.html` | `/index.html` |
| **HTTP response code** | 200 | 200 |
| **Error caching TTL** | 300 (ou 0 pour tester) | 300 (ou 0 pour tester) |

**Étapes dans la console :**

1. Aller dans [CloudFront](https://console.aws.amazon.com/cloudfront/) → sélectionner ta distribution.
2. Onglet **Erreurs** (Error pages).
3. **Créer une réponse d'erreur personnalisée** :
   - **Code d'erreur HTTP** : `403`.
   - **Personnaliser la réponse d'erreur** : Oui.
   - **Chemin de la page de réponse** : `/index.html`.
   - **Code de réponse HTTP** : `200`.
   - **Durée de mise en cache (TTL)** : `300` secondes (ou `0` pour désactiver le cache des erreurs en test).
   - Enregistrer.
4. Répéter pour **404** : mêmes valeurs (chemin `/index.html`, code de réponse `200`).

Après modification, la distribution se redéploie (quelques minutes). Ensuite, les URLs comme `/s/xxx` ou un refresh sur une route doivent afficher l'app au lieu d'une page d'erreur.

---

## 5. Déployer le build sur S3

**Upload du contenu de `apps/web/dist/` :**

```bash
# AWS CLI (installer et configurer : aws configure)
aws s3 sync apps/web/dist/ s3://movie-picker-web/ --delete
```

(Remplacer `movie-picker-web` par le nom de ton bucket.)

**Ou** via la console S3 : ouvrir le bucket → **Téléverser** → glisser le contenu du dossier `dist/` (y compris `index.html` et le dossier `assets/`).

---

## 6. Vérification

1. Attendre que la distribution CloudFront soit **Déployée** (quelques minutes).
2. Ouvrir l'URL CloudFront (ex. `https://d1234abcd.cloudfront.net`) dans le navigateur.
3. Vérifier : page d'accueil, création d'event, ouverture d'un event via `/s/:slug`. Les appels doivent partir vers l'API Cloud Run (vérifier l'onglet Réseau du navigateur : requêtes vers l'URL de l'API).

---

## 7. Résumé des commandes (build + déploiement)

**Build (PowerShell)** :
```powershell
cd apps\web
$env:VITE_API_URL="https://VOTRE_API_CLOUD_RUN.run.app"; pnpm build
```

**Build (Linux / macOS / Git Bash)** :
```bash
cd apps/web
VITE_API_URL=https://VOTRE_API_CLOUD_RUN.run.app pnpm build
```

**Upload S3** (depuis la racine du repo, remplacer le nom du bucket) :
```bash
aws s3 sync apps/web/dist/ s3://movie-picker-web/ --delete
```

**Invalidation CloudFront** (optionnel, après un nouveau déploiement) :
```bash
aws cloudfront create-invalidation --distribution-id ID_DISTRIBUTION --paths "/*"
```

---

## 8. Dépannage

- **« Access Denied » sur l'URL racine** : définir **Default root object** = `index.html` (CloudFront → distribution → **Paramètres généraux** → Modifier).
- **Page blanche, 403 ou 404 quand on ouvre `/s/xxx` ou qu'on rafraîchit une page** : configurer les **custom error responses** (section 4.1) : CloudFront → distribution → onglet **Erreurs** → créer deux réponses (403 et 404) avec **Chemin de la page** = `/index.html` et **Code de réponse HTTP** = `200`. Attendre la fin du déploiement de la distribution.
- **Les appels API échouent** : vérifier que le build a été fait avec la bonne `VITE_API_URL` (URL Cloud Run en HTTPS). Rebuilder si besoin.
- **CORS** : l'API restreint les origines en production via **`ALLOWED_ORIGINS`** (variable Cloud Run + variable GitHub `ALLOWED_ORIGINS` pour le déploiement CI). L’URL du front doit correspondre exactement (ex. `https://dxxx.cloudfront.net`, sans slash final). Domaine personnalisé : ajouter cette origine dans `ALLOWED_ORIGINS`.
