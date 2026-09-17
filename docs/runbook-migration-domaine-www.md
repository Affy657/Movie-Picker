# Runbook : bascule du front de `web.movie-picker.fr` vers `www.movie-picker.fr`

Rédigé le 2026-07-16, repris le 2026-09-15 après les premières étapes. Ce document porte la procédure : l'état initial constaté, les décisions actées, les commandes et l'ordre d'exécution. **L'état d'avancement, lui, est porté par une seule entrée, DEBT-014 dans [`technical-debt.md`](technical-debt.md)** : ce qui est fait, ce qui reste, dans quel ordre. La lire avant de reprendre ici, et la mettre à jour après chaque étape plutôt que d'annoter ce runbook.

Les identifiants sont des gabarits `<COMME_CECI>`, le dépôt est public. La table de correspondance, et la commande qui relève chaque valeur, sont dans [`../infra/README.md`](../infra/README.md).

## 1. Objectif

Servir le front sur **`www.movie-picker.fr`** (canonique) au lieu de `web.movie-picker.fr`. L'apex `movie-picker.fr` redirige en 301 vers `www`. `web.movie-picker.fr` est retiré. **L'API `api.movie-picker.fr` ne change pas.**

État cible :

| Hôte | Rôle |
|---|---|
| `www.movie-picker.fr` | **canonique**, sert le front (CloudFront) |
| `movie-picker.fr` (apex) | 301 vers `https://www.movie-picker.fr` (redirection OVH) |
| `web.movie-picker.fr` | **retiré** (DNS et alias CloudFront supprimés) |
| `api.movie-picker.fr` | inchangé (domain mapping Cloud Run) |

## 2. Décisions actées

- **Canonique sur `www`**, pas sur l'apex nu : OVH ne gère pas d'ALIAS ou d'ANAME à l'apex, et un apex nu sur CloudFront imposerait de migrer toute la zone DNS vers Route 53, avec un risque sur le courriel. `www` accepte un CNAME, donc un seul enregistrement chez OVH.
- **Bascule sèche** : `web.movie-picker.fr` est abandonné, pas maintenu. Conséquence assumée : les liens de partage `/e/:slug` déjà diffusés et les courriels de réinitialisation déjà envoyés qui pointent vers `web.` deviennent morts. Pour l'éviter un jour, une redirection 301 de `web` vers `www` chez OVH, non prévue ici.
- **CORS** : autoriser `www` **et** `web` pendant la fenêtre de bascule pour éviter une coupure, puis retirer `web` à la fin (étape 9).

## 3. État initial constaté (lecture seule, 2026-07-16)

**AWS (front)**, compte `<COMPTE_AWS>` :

- Distribution CloudFront `<ID_DISTRIBUTION_CLOUDFRONT>` (`<DOMAINE_CLOUDFRONT>`), alias `web.movie-picker.fr`.
- Certificat ACM (us-east-1) **wildcard `*.movie-picker.fr`** (`arn:aws:acm:us-east-1:<COMPTE_AWS>:certificate/<ID_CERTIFICAT_ACM>`) : `www.movie-picker.fr` est déjà couvert, aucun nouveau certificat ni validation DNS. Le wildcard ne couvre pas l'apex nu, ce qui est sans conséquence puisque l'apex ne fait qu'une redirection.

**GCP (API)** : projet `<PROJET_GCP>`, service Cloud Run `movie-picker-api`, région `europe-west1`.

**DNS chez OVH** (NS `ns14/dns14.ovh.net`) :

| Hôte | Actuel |
|---|---|
| `movie-picker.fr` (apex) | A `213.186.33.5` (redirection OVH) |
| `www.movie-picker.fr` | A `213.186.33.5` (redirection OVH) |
| `web.movie-picker.fr` | CNAME vers `<DOMAINE_CLOUDFRONT>` |
| `api.movie-picker.fr` | CNAME vers `ghs.googlehosted.com` (Cloud Run) |
| MX | `mx1/2/3.mail.ovh.net` (courriel reçu par OVH, **ne pas toucher**) |
| TXT | SPF, DKIM, DMARC, dont Resend (**ne pas toucher**) |

## 4. Outillage

- `aws` CLI, authentifié par l'utilisateur IAM dédié du poste de travail (la clé du compte root est supprimée depuis le 2026-09-15). Confirmer chaque commande mutante.
- `gcloud` CLI, authentifié sur `<PROJET_GCP>`.
- `gh` CLI, authentifié (`Affy657`, scopes `repo` et `workflow`).
- PostHog, par MCP (projet `movie-picker-prod`).
- `jq`, pour l'édition de la configuration CloudFront.
- **OVH** : ni MCP ni CLI, les trois gestes DNS se font dans le manager OVH, par l'utilisateur ou par l'extension Chrome.

## 5. Étapes, dans l'ordre

Les rôles : « agent » pour ce que l'agent fait seul, « utilisateur » pour ce qui demande le manager OVH ou un déploiement.

### Étape 1, dépôt : `web.` devient `www.` (agent)

Remplacer le littéral `web.movie-picker.fr` par `www.movie-picker.fr` dans les fichiers versionnés **sauf `archive/`**, laissée en historique. Le remplacement est sûr : `web.movie-picker.fr` n'apparaît que comme hôte du front, jamais dans `noreply@movie-picker.fr`, `api.movie-picker.fr` ni l'apex nu. La liste des fichiers se relève au moment du geste, pas dans une table écrite à l'avance :

```bash
git grep -lF 'web.movie-picker.fr' -- ':!archive'
git grep -lF 'web.movie-picker.fr' -- ':!archive' | xargs sed -i 's/web\.movie-picker\.fr/www.movie-picker.fr/g'
```

Attendre de la liste : le défaut `PublicWebBaseUrl` de l'API et le repli de l'aperçu de partage, `index.html` (`og:url`, `og:image`, `twitter:image`, `canonical`), `robots.txt` et `sitemap.xml`, les métadonnées SEO, les locales, les tests API et front qui vérifient les liens de réinitialisation, `README.md`, `SECURITY.md`, `.env.example`, le gabarit de ticket, et les scripts de prérendu et d'image Open Graph. Régénérer ensuite le bandeau `apps/web/public/og-image.png` par `node apps/web/scripts/generate-og-image.mjs`.

**Ne pas toucher** : `noreply@movie-picker.fr` (`EmailFromAddress`, `VapidSubject`), `api.movie-picker.fr`, la CSP de `apps/web/vite.config.ts` (`'self'` plus l'origine de l'API), le secret `VITE_API_URL` (c'est l'API), et tout `archive/`.

Vérifier puis pousser comme d'habitude : `pnpm run verify:local`, commit `chore(domain): serve the front on www.movie-picker.fr`, fusion dans `master`. Pousser ne déploie rien : le code peut attendre sur `master` que les étapes 2 à 4 soient prêtes, le déploiement est l'étape 5.

### Étape 2, CloudFront : ajouter l'alias `www` (agent, réversible, sans impact)

Le certificat wildcard couvre déjà `www`. L'ajout de l'alias est sans effet tant que le DNS ne pointe pas.

```bash
aws cloudfront get-distribution-config --id <ID_DISTRIBUTION_CLOUDFRONT> > /tmp/dist.json
ETAG=$(jq -r '.ETag' /tmp/dist.json)
jq '.DistributionConfig | .Aliases = {"Quantity":2,"Items":["web.movie-picker.fr","www.movie-picker.fr"]}' /tmp/dist.json > /tmp/dist-config.json
aws cloudfront update-distribution --id <ID_DISTRIBUTION_CLOUDFRONT> --distribution-config file:///tmp/dist-config.json --if-match "$ETAG"
```

Attendre `Status: Deployed` sur la distribution, environ 5 minutes.

### Étape 3, OVH : CNAME `www` vers CloudFront (utilisateur)

Dans la zone DNS `movie-picker.fr` du manager OVH :

1. **supprimer** la redirection et l'enregistrement A de `www` (`213.186.33.5`) ;
2. **créer** un CNAME `www` vers `<DOMAINE_CLOUDFRONT>.`

Un sous-domaine ne peut pas porter à la fois une redirection OVH et un CNAME : supprimer d'abord.

### Étape 4, CORS : `ALLOWED_ORIGINS` (agent)

Variable Actions lue par `deploy-api` (`vars.ALLOWED_ORIGINS`) et injectée dans Cloud Run par `--set-env-vars` **au déploiement**, jamais à chaud. Pendant la fenêtre, autoriser les deux hôtes et le domaine CloudFront, **`web` en première position** : le smoke test du front lit la première entrée, et `www` ne doit y passer en tête qu'une fois le DNS basculé.

```bash
gh variable set ALLOWED_ORIGINS --repo Affy657/Movie-Picker --body "https://web.movie-picker.fr,https://www.movie-picker.fr,https://<DOMAINE_CLOUDFRONT>"
```

### Étape 5, déploiement (utilisateur)

```bash
gh workflow run deploy.yml --ref master -f target=all
```

`deploy-api` redéploie l'API : le défaut `PublicWebBaseUrl` devient `https://www.movie-picker.fr`, donc les courriels de réinitialisation et le canonique du partage pointent vers `www`. `deploy-front` republie le front avec ses métadonnées `www`.

Piège : `deploy-api` passe `--set-env-vars`, qui remplace tout le jeu de variables de la révision et ne connaît pas `PUBLIC_WEB_BASE_URL`. Un réglage manuel par `gcloud run services update --update-env-vars PUBLIC_WEB_BASE_URL=...` serait donc écrasé au déploiement suivant : le défaut dans le code (étape 1) est le mécanisme fiable, le `gcloud` manuel n'est qu'un dépannage d'avant fusion.

### Étape 6, PostHog (agent)

Ajouter `https://www.movie-picker.fr` aux URL autorisées (toolbar, web analytics) du projet `movie-picker-prod`, retirer `web.` si présent. Sans effet sur l'ingestion des événements, PostHog ne filtre pas par domaine, mais nécessaire à la toolbar et aux cartes de chaleur.

### Étape 7, vérifications (agent)

Voir la section 6. Ne pas passer à l'étape 8 tant que `www` ne sert pas correctement, authentification et CORS compris.

### Étape 8, OVH : apex et retrait de `web` (utilisateur)

Dans le manager OVH :

1. **apex** `movie-picker.fr` : éditer la redirection existante en **301 vers `https://www.movie-picker.fr`**, avec l'option SSL d'OVH pour qu'elle réponde aussi en HTTPS ;
2. **supprimer** le CNAME `web` vers `<DOMAINE_CLOUDFRONT>`.

### Étape 9, finalisation (agent)

Retirer `web` de CloudFront :

```bash
aws cloudfront get-distribution-config --id <ID_DISTRIBUTION_CLOUDFRONT> > /tmp/dist.json
ETAG=$(jq -r '.ETag' /tmp/dist.json)
jq '.DistributionConfig | .Aliases = {"Quantity":1,"Items":["www.movie-picker.fr"]}' /tmp/dist.json > /tmp/dist-config.json
aws cloudfront update-distribution --id <ID_DISTRIBUTION_CLOUDFRONT> --distribution-config file:///tmp/dist-config.json --if-match "$ETAG"
```

Restreindre CORS à `www`, puis redéployer l'API pour propager (`gh workflow run deploy.yml --ref master -f target=api`, geste de l'utilisateur) :

```bash
gh variable set ALLOWED_ORIGINS --repo Affy657/Movie-Picker --body "https://www.movie-picker.fr,https://<DOMAINE_CLOUDFRONT>"
```

Puis supprimer ce runbook et l'entrée DEBT-014 : ils n'ont plus d'objet.

### Étape 10, Search Console (utilisateur)

La propriété est une propriété de domaine `movie-picker.fr`, qui couvre tous les sous-domaines : rien à ajouter. Seule l'URL du sitemap soumise (`https://web.movie-picker.fr/sitemap.xml`) est à remplacer par `https://www.movie-picker.fr/sitemap.xml`.

## 6. Vérifications finales

```bash
curl -sI https://www.movie-picker.fr/ | head -1                       # attendu : HTTP/2 200
curl -sI https://movie-picker.fr/ | head -3                           # attendu : 301 vers https://www.movie-picker.fr/
curl -sI -H 'Origin: https://www.movie-picker.fr' https://api.movie-picker.fr/health | grep -i access-control-allow-origin
```

À la main :

- demander une réinitialisation de mot de passe : le courriel (Resend, `noreply@movie-picker.fr`) contient un lien `https://www.movie-picker.fr/reset?token=...` ;
- ouvrir une soirée partagée `https://www.movie-picker.fr/e/<slug>` et vérifier l'aperçu Open Graph ;
- se connecter : `www` et `api` partagent l'eTLD+1 `movie-picker.fr`, le cookie `SameSite=Lax` doit passer sans régression.

## 7. Retour arrière

- **CloudFront** : réappliquer les alias précédents (`web.movie-picker.fr` seul) par la séquence get, jq, update.
- **OVH** : restaurer le CNAME `web`, restaurer les redirections `www` et apex d'origine.
- **CORS** : `gh variable set ALLOWED_ORIGINS ... "https://web.movie-picker.fr,..."` puis redéploiement de l'API.
- **Dépôt** : `git revert` du commit de l'étape 1, puis déploiement.
- Le risque principal est la propagation DNS (TTL OVH) : basculer hors heure de pointe.

## 8. Points de vigilance

- **`--set-env-vars` de `deploy-api` écrase les variables posées à la main** sur Cloud Run (étape 5) : s'appuyer sur le défaut dans le code.
- **`ALLOWED_ORIGINS` ne se propage qu'au déploiement** de l'API, pas à chaud. Pointer le CNAME avant de déployer donne un `www` à moitié vivant : le front se charge, l'API refuse l'origine.
- **`web` reste en première position d'`ALLOWED_ORIGINS`** tant que le DNS de `www` n'a pas basculé : le smoke test du front lit la première entrée.
- **Le wildcard `*.movie-picker.fr`** couvre `www` mais pas l'apex nu, sans conséquence puisque l'apex ne fait qu'une redirection OVH.
- **MX et TXT** (SPF, DKIM, DMARC de Resend) : ne pas y toucher, le courriel en dépend dans les deux sens.
- Un alias CloudFront ne peut être attaché qu'à une seule distribution ; `www` n'est attaché nulle part ailleurs.
- Le lot Terraform 4 de la roadmap fait la même bascule DNS en décommissionnant AWS : si ce lot est engagé, finir la bascule ici serait du travail jeté (voir DEBT-014).
