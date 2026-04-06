# Redirection racine (`movie-picker.fr` → `web.…`) et référencement (SEO)

> Suite logique après [06-domaine-personnalise.md](06-domaine-personnalise.md) : le front public est sur **`https://web.movie-picker.fr`**. Ce document explique comment faire pointer **`https://movie-picker.fr`** (apex, sans sous-domaine) vers **`https://web.movie-picker.fr`**, et les **bases** pour que le site soit découvrable via les moteurs de recherche.

---

## Partie 1 — Redirection `https://movie-picker.fr/` → `https://web.movie-picker.fr/`

### Contexte

- En DNS, la **racine** du domaine (`movie-picker.fr`) ne se configure **pas** comme un simple **CNAME** vers `web.movie-picker.fr` sur tous les hébergeurs (règles DNS / zone apex).
- Tu veux une **redirection HTTP 301** (permanente) : l’utilisateur qui tape `movie-picker.fr` arrive sur `web.movie-picker.fr` — mieux pour le SEO qu’une page dupliquée sur deux hôtes.

### Option A — OVH (souvent la plus simple)

1. Connecte-toi à l’[espace client OVH](https://www.ovh.com/manager/) → **Web Cloud** → **Noms de domaine** → **movie-picker.fr**.
2. Cherche une fonctionnalité du type :
   - **Redirection** / **Forwarding** / **Redirection web** ;
   - ou **Hébergement web** / **Multisite** lié au domaine, avec option **rediriger vers une URL externe**.
3. Configure :
   - **Source** : `movie-picker.fr` (et éventuellement `www.movie-picker.fr` si tu veux la même règle).
   - **Cible** : `https://web.movie-picker.fr/` (avec **https**).
   - Type : **301** (redirection permanente) si proposé.
4. Attends la prise en effet (quelques minutes à quelques heures). Teste en navigation privée : `https://movie-picker.fr` doit afficher l’URL finale **`web.movie-picker.fr`** dans la barre d’adresse.

**Si tu ne vois pas de redirection** : la doc OVH évolue selon l’offre (domaine seul vs hébergement). Utilise l’aide OVH « redirection nom de domaine » ou l’option B.

### Option B — AWS CloudFront (plus technique)

À utiliser si tu préfères tout gérer côté AWS ou si OVH ne propose pas de redirection adaptée.

1. **Certificat ACM** dans **us-east-1** (obligatoire pour CloudFront) : un certificat **SAN** couvrant à la fois **`movie-picker.fr`** et **`web.movie-picker.fr`** (ou deux certificats selon ta stratégie) — validation DNS chez OVH, comme pour [06-domaine-personnalise.md](06-domaine-personnalise.md).
2. Sur la **distribution CloudFront** qui sert déjà le front :
   - Ajouter **`movie-picker.fr`** comme **Alternate domain name (CNAME)** ;
   - Attacher le certificat qui couvre ce nom.
3. **Redirection** : une **CloudFront Function** (ou Lambda@Edge) en **viewer request** : si l’en-tête **`Host`** vaut `movie-picker.fr`, répondre **301** avec `Location: https://web.movie-picker.fr` + chemin et query si tu veux préserver `/path?query`.
4. **DNS OVH** : pour l’apex, suivre ce qu’AWS indique (souvent enregistrements **A** / **ALIAS** vers CloudFront, selon capacités OVH — certaines zones permettent un **ANAME** / **ALIAS** vers `xxx.cloudfront.net`).

**Cache** : une réponse 301 peut être mise en cache ; ajuste politique de cache ou TTL si tu testes et que le navigateur « colle » à une ancienne cible.

Cette option demande plus de rigueur (certificat, déploiement fonction, DNS apex). Documente ce que tu retiens dans le dépôt si tu l’implémentes.

### `ALLOWED_ORIGINS` (API)

Si des utilisateurs peuvent encore atterrir sur **`https://movie-picker.fr`** avant redirection, ou si des outils appellent cette origine, tu peux ajouter **`https://movie-picker.fr`** dans **`ALLOWED_ORIGINS`** (en plus de `https://web.movie-picker.fr`), **séparé par une virgule**, **sans slash final** sur chaque URL — puis **redéployer l’API** (voir [04-deploy-cicd.md](04-deploy-cicd.md)). Souvent, après une **301** stricte, seul `web.` suffit pour le navigateur ; à valider selon les tests (préflight CORS, outils tiers).

---

## Partie 2 — Être « trouvable » sur Internet (bases SEO)

Aucun réglage ne garantit une place en tête de résultats ; en revanche tu peux couvrir les **minimums**.

### 1. Google Search Console

1. Va sur [Google Search Console](https://search.google.com/search-console).
2. **Ajouter une propriété** :
   - **Domaine** `movie-picker.fr` (recommandé : couvre tous les sous-domaines, dont `web.`) — validation par enregistrement **TXT** dans la zone DNS OVH (comme l’assistant Google l’indique) ;
   - ou **Préfixe d’URL** `https://web.movie-picker.fr/` si tu préfères cibler uniquement le sous-domaine du front (URL canonique réelle de l’app).
3. Après validation, utilise **Inspection d’URL** sur la page d’accueil → **Demander une indexation** pour accélérer la première prise en compte (sans garantie de délai).

**Canonique** : une fois l’apex en 301 vers `web.`, les moteurs traitent en général **`https://web.movie-picker.fr`** comme URL principale ; évite de servir la même app en 200 sur les deux hôtes.

### 2. Sitemap (optionnel mais utile)

- Le dépôt inclut un **`sitemap.xml`** statique dans [`apps/web/public/sitemap.xml`](../../apps/web/public/sitemap.xml) (routes `/` et `/new`, URL canoniques `https://web.movie-picker.fr/…` — à adapter si autre domaine). Il est copié à la racine du build Vite ; après déploiement, enregistre **`https://web.movie-picker.fr/sitemap.xml`** dans Search Console → **Sitemaps**.
- Pour une **SPA** avec peu de routes publiques : l’inspection d’URL suffit souvent ; le sitemap complète quand tu veux signaler explicitement les URL au moteur.

### 3. Balises et contenu

- **`apps/web/index.html`** : `<title>`, meta **description**, **Open Graph** (`og:title`, `og:description`, `og:type`, `og:url`, `og:locale`), **`link rel="canonical"`**. Optionnel : `og:image` (aperçu partage social — URL absolue vers une image dédiée).
- **Lighthouse / CI** : le workflow mesure le SEO (entre autres) sur le build — voir [04-deploy-cicd.md](04-deploy-cicd.md) et la roadmap MVP [§ 35 — Lighthouse](01-roadmap-mvp.md).
- Contenu **textuel visible** sur la home : aide les moteurs à comprendre le sujet du site (les SPA trop vides pénalisent la compréhension thématique).

### 4. `robots.txt` et indexation (piège SPA + CloudFront)

- Ne pas publier un **`Disallow: /`** sur tout le site en prod.
- Pas de meta **`noindex`** sur la page d’accueil publique.

**Piège fréquent** : avec la config documentée pour la SPA ([03-deploy-aws-front.md](03-deploy-aws-front.md)), les réponses d’erreur **403/404** sont renvoyées vers **`/index.html`** en **200**. Si aucun fichier **`robots.txt`** n’existe sur S3, une requête **`GET /robots.txt`** peut donc recevoir **du HTML d’application** avec un code **200** — les crawlers peuvent être indécis. Le dépôt inclut un fichier statique **`apps/web/public/robots.txt`** (copié à la racine du build Vite) pour servir un vrai `robots.txt` après déploiement. Après ajout ou changement, redéploie le front et vérifie avec `curl -sI https://web.movie-picker.fr/robots.txt` (type `text/plain`, contenu attendu).

### 5. Patience et liens

- L’indexation peut prendre **plusieurs jours**.
- Quelques **liens** vers `https://web.movie-picker.fr` (README GitHub, réseaux, portfolio) aident la découverte.

### 6. Bing (optionnel)

- [Bing Webmaster Tools](https://www.bing.com/webmasters) — même idée : ajouter le site et un sitemap si disponible.

---

## Checklist

**Redirection racine**

- [ ] `https://movie-picker.fr` redirige vers `https://web.movie-picker.fr` (301 de préférence).
- [ ] (Optionnel) `https://www.movie-picker.fr` redirige aussi si tu utilises `www`.
- [ ] `ALLOWED_ORIGINS` à jour si tu ajoutes une origine supplémentaire (virgules, pas de slash final).

**Référencement de base**

- [ ] Propriété Search Console validée (TXT DNS ou autre méthode).
- [ ] Inspection / demande d’indexation de la home ; dépôt du sitemap `https://web.movie-picker.fr/sitemap.xml` dans Search Console (fichier source : `apps/web/public/sitemap.xml`).
- [x] *(Dépôt)* Pas de **`Disallow: /`** dans `public/robots.txt` ; pas de **`noindex`** sur la home dans `index.html`.
- [ ] **`/robots.txt`** et **`/sitemap.xml`** renvoient bien du contenu attendu en prod (après déploiement : `curl -sI` — type `text/plain` / `application/xml`).
- [x] *(Dépôt)* Titre + description + `og:url` + canonical sur la home ; optionnel restant : `og:image`.

---

## Voir aussi

- Domaine custom front + API : [06-domaine-personnalise.md](06-domaine-personnalise.md)
- Déploiement front (SPA, erreurs → `index.html`) : [03-deploy-aws-front.md](03-deploy-aws-front.md)
- Variables `ALLOWED_ORIGINS`, job Lighthouse : [04-deploy-cicd.md](04-deploy-cicd.md)
- Roadmap MVP (§ 34 favicon / titres, § 35 Lighthouse, § 36 redirection / SEO) : [01-roadmap-mvp.md](01-roadmap-mvp.md)
