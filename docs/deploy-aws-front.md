# Déploiement Front sur AWS (S3 + CloudFront)

Le front React est servi en statique : build Vite uploadé sur S3, exposé via CloudFront en HTTPS.

Référence : [spec-technique.md](spec-technique.md) (front sur AWS, API sur GCP).

---

## 1. Build avec l’URL de l’API (Cloud Run)

L’URL de l’API est fixée **au build** via la variable `VITE_API_URL`. Elle doit pointer vers l’URL HTTPS de ton service Cloud Run.

**Depuis la racine du repo :**

```bash
# Remplacer par l’URL réelle de ton API Cloud Run (sans slash final)
cd apps/web
pnpm build -- --mode production
```

**Avec l’URL API en variable (recommandé) :**

```bash
cd apps/web
VITE_API_URL=https://VOTRE_SERVICE.run.app pnpm build
```

Exemple si ton API Cloud Run est `https://api-xxxxx-ew.a.run.app` :

```bash
VITE_API_URL=https://api-xxxxx-ew.a.run.app pnpm build
```

Le build est généré dans **`apps/web/dist/`** (fichiers statiques : `index.html`, `assets/`, etc.).

---

## 2. Bucket S3 pour l’hébergement statique

1. Aller dans [AWS S3](https://console.aws.amazon.com/s3/) → **Créer un bucket**.
2. Nom du bucket : ex. `movie-picker-web` (doit être unique au niveau global).
3. Région : choisir une région (ex. `eu-west-1`).
4. **Bloquer l’accès public** : laisser activé ; l’accès se fera uniquement via CloudFront.
5. Créer le bucket.

**Activer l’hébergement de site statique (optionnel pour S3 seul)** : pour S3 + CloudFront, on utilise le bucket comme **origine** CloudFront sans activer « Site web statique » sur le bucket. On configure uniquement les **autorisations** :

6. Onglet **Autorisations** du bucket :
   - **Stratégie de bucket** : ajouter une stratégie pour autoriser CloudFront à lire les objets (voir ci‑dessous après création de la distribution).

---

## 3. Politique du bucket (accès CloudFront uniquement)

Pour que seul CloudFront puisse lire le bucket (pas d’accès direct S3), on utilise une **Origin Access Control (OAC)** ou **Origin Access Identity (OAI)**. La console CloudFront peut créer une OAC et fournir une politique à coller dans S3.

**Après avoir créé la distribution CloudFront (étape 4)** : dans la distribution, onglet **Origines**, l’origine S3 affiche un bouton du type **« Copier la stratégie »**. Coller cette stratégie dans S3 → Bucket → Autorisations → Stratégie de bucket.

**Exemple de stratégie (à adapter avec ton ARN de bucket et l’ARN du rôle OAC CloudFront)** :

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
   - Domaine d’origine : sélectionner le bucket S3 (ex. `movie-picker-web.s3.eu-west-1.amazonaws.com`).
   - Activer **Origin access** : **Origin access control (recommandé)** et créer un groupe de contrôle si demandé.
   - Conserver le nom d’origine par défaut (ex. `S3-movie-picker-web`).
3. **Comportements par défaut** :
   - Viewer protocol policy : **Redirect HTTP to HTTPS**.
   - Méthodes autorisées : GET, HEAD, OPTIONS (suffisant pour du statique).
   - Cache policy : **CachingOptimized** ou **CachingDisabled** pour tester.
4. **Paramètres par défaut de la distribution** :
   - **Default root object** : `index.html` (obligatoire pour une SPA).
   - **Custom error responses** (pour React Router en mode SPA) : ajouter une réponse d’erreur pour **HTTP 403** et **HTTP 404** avec **Response page path** = `/index.html` et **HTTP response code** = **200**. Ainsi, les chemins comme `/s/abc123` renvoient `index.html` et le routeur React gère la page.
5. Créer la distribution. Noter l’**URL de la distribution** (ex. `https://d1234abcd.cloudfront.net`).

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
2. Ouvrir l’URL CloudFront (ex. `https://d1234abcd.cloudfront.net`) dans le navigateur.
3. Vérifier : page d’accueil, création d’event, ouverture d’un event via `/s/:slug`. Les appels doivent partir vers l’API Cloud Run (vérifier l’onglet Réseau du navigateur : requêtes vers l’URL de l’API).

---

## 7. Résumé des commandes (build + déploiement)

```bash
# 1. Build du front (depuis la racine ou apps/web)
cd apps/web
VITE_API_URL=https://VOTRE_API_CLOUD_RUN.run.app pnpm build

# 2. Upload S3 (depuis la racine)
aws s3 sync apps/web/dist/ s3://movie-picker-web/ --delete

# 3. Invalidation CloudFront (optionnel, pour vider le cache après un nouveau déploiement)
aws cloudfront create-invalidation --distribution-id ID_DISTRIBUTION --paths "/*"
```

---

## 8. Dépannage

- **Page blanche ou 403** : vérifier que **Default root object** = `index.html` et que les **custom error responses** 403/404 renvoient `/index.html` avec code 200.
- **Les appels API échouent** : vérifier que le build a été fait avec la bonne `VITE_API_URL` (URL Cloud Run en HTTPS). Rebuilder si besoin.
- **CORS** : l’API (Cloud Run) a CORS activé (`origin: true`) ; si tu utilises un domaine personnalisé pour le front, vérifier que l’origine est autorisée côté API si besoin.
