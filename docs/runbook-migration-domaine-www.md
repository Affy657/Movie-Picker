# Runbook — Migration domaine front : `web.movie-picker.fr` → `www.movie-picker.fr`

> **Statut : à exécuter (rien n'a encore été fait).** Rédigé le 2026-07-16.
> Ce document est autonome : il contient l'état initial constaté, les décisions actées,
> les commandes exactes et l'ordre d'exécution. Suivre les étapes dans l'ordre.

---

## 1. Objectif

Servir le front sur **`www.movie-picker.fr`** (canonical) au lieu de `web.movie-picker.fr`.
L'apex `movie-picker.fr` redirige en 301 vers `www`. `web.movie-picker.fr` est retiré.
**L'API `api.movie-picker.fr` ne change pas.**

État cible :

| Hôte | Rôle |
|---|---|
| `www.movie-picker.fr` | **canonical** — sert le front (CloudFront) |
| `movie-picker.fr` (apex) | 301 → `https://www.movie-picker.fr` (redirection OVH) |
| `web.movie-picker.fr` | **retiré** (DNS + alias CloudFront supprimés) |
| `api.movie-picker.fr` | inchangé (Cloud Run domain mapping) |

## 2. Décisions actées

- **Option B** retenue : canonical = `www` (et non l'apex nu). Raison : OVH ne gère pas
  d'ALIAS/ANAME à l'apex, et un apex nu sur CloudFront imposerait de migrer toute la zone
  DNS vers Route53 (risque sur l'email). `www` est CNAME-able → un seul enregistrement chez OVH.
- **Bascule sèche** : `web.movie-picker.fr` est abandonné, pas maintenu.
  - ⚠️ Conséquence assumée : les liens de partage `/e/:slug` déjà diffusés et les emails de
    reset password déjà envoyés qui pointent vers `web.` deviennent morts. (Si un jour on veut
    l'éviter : 301 `web` → `www` chez OVH, non prévu ici.)
- **CORS** : autoriser `www` **+** `web` pendant la fenêtre de bascule pour éviter une coupure,
  puis retirer `web` à la fin (étape 9).

## 3. État initial constaté (recon lecture seule, 2026-07-16)

**AWS (front)** — compte `831680222380` :

- Distribution CloudFront : **`E32M2PR26FCH96`** (`d1uc368ae7xu4s.cloudfront.net`), alias actuel : `web.movie-picker.fr`.
- Certificat ACM (us-east-1) : **wildcard `*.movie-picker.fr`**
  (`arn:aws:acm:us-east-1:831680222380:certificate/1a9fed21-eedf-4089-b97d-557ad8fd8ece`).
  → **`www.movie-picker.fr` est DÉJÀ couvert. Aucun nouveau certificat, aucune validation DNS.**
  (Le wildcard ne couvre PAS l'apex nu, mais l'apex ne fait qu'une redirection → pas besoin.)

**GCP (API)** : projet `movie-picker-2026`, service Cloud Run `movie-picker-api`, région `europe-west1`.

**DNS live (chez OVH, NS `ns14/dns14.ovh.net`)** :

| Hôte | Actuel |
|---|---|
| `movie-picker.fr` (apex) | A `213.186.33.5` (redirection OVH) |
| `www.movie-picker.fr` | A `213.186.33.5` (redirection OVH) |
| `web.movie-picker.fr` | CNAME → `d1uc368ae7xu4s.cloudfront.net` |
| `api.movie-picker.fr` | CNAME → `ghs.googlehosted.com` (Cloud Run) |
| MX | `mx1/2/3.mail.ovh.net` (mail reçu OVH — **ne pas toucher**) |
| TXT | SPF / DKIM / DMARC (dont Resend — **ne pas toucher**) |

## 4. Pré-requis outillage

Vérifié disponible et authentifié en local le 2026-07-16 :

- `aws` CLI — authentifié **en ROOT** (compte `831680222380`). ⚠️ Rayon d'action maximal : confirmer chaque commande mutante.
- `gcloud` CLI — authentifié (`movie-picker-2026`).
- `gh` CLI — authentifié (`Affy657`, scopes `repo` + `workflow`).
- PostHog — via MCP (projet `movie-picker-prod`).
- `jq` requis pour l'édition CloudFront (sinon éditer le JSON à la main).
- **OVH** : aucun MCP, aucune CLI → les 3 gestes DNS se font **manuellement dans le manager OVH**.

---

## 5. Étapes d'exécution (dans l'ordre)

### Étape 1 — Repo §1 : `web.` → `www.` (moi)

Remplacer le littéral `web.movie-picker.fr` par `www.movie-picker.fr` dans les fichiers
versionnés **sauf `archive/`** (laissée en historique). Le remplacement est sûr : `web.movie-picker.fr`
n'apparaît que comme hôte du front (jamais dans `noreply@movie-picker.fr`, `api.movie-picker.fr` ni l'apex nu).

```bash
# Depuis la racine du repo
git grep -lF 'web.movie-picker.fr' -- ':!archive' | xargs sed -i 's/web\.movie-picker\.fr/www.movie-picker.fr/g'
```

Fichiers impactés (à relire) :

| Fichier | Lignes |
|---|---|
| `apps/api-dotnet/MoviePicker.Api/Configuration/MoviePickerOptions.cs` | 23 (défaut `PublicWebBaseUrl`) |
| `apps/api-dotnet/MoviePicker.Api/Application/UseCases/EventSharePreview/GetEventSharePreviewHtmlHandler.cs` | 35 (fallback) |
| `apps/api-dotnet/MoviePicker.Api/Infrastructure/Web/MoviePickerCookieAuthenticationConfigurer.cs` | 40 (commentaire) |
| `apps/web/index.html` | 25, 27, 34, 35 (og:url, og:image, twitter:image, canonical) |
| `apps/web/public/robots.txt` | 1 (commentaire), 16 (`Sitemap:`) |
| `apps/web/public/sitemap.xml` | 5 (commentaire), 11 (`<loc>`) |
| `apps/api-dotnet/MoviePicker.Api.Tests/UseCases/Auth/PasswordReset/RequestPasswordResetHandlerTests.cs` | 80, 100, 323 |
| `apps/api-dotnet/MoviePicker.Api.Tests/UseCases/Auth/PasswordReset/PasswordResetEmailFactoryTests.cs` | 8, 54, 55 |
| `apps/api-dotnet/MoviePicker.Api.Tests/Infrastructure/Email/LogEmailSenderTests.cs` | 19, 20, 31 |
| `README.md` | 5, 75 |

**NE PAS toucher** : `noreply@movie-picker.fr` (EmailFromAddress), `mailto:noreply@movie-picker.fr`
(VapidSubject), `api.movie-picker.fr`, la CSP (`apps/web/vite.config.ts` — utilise `'self'` + origine API),
le secret `VITE_API_URL` (= API), et tout `archive/`.

Vérifs avant commit :

```bash
dotnet test apps/api-dotnet/MoviePicker.slnx        # tests API (assertions mises à jour)
pnpm run test --filter=web                            # tests front
pnpm run format:check                                 # hook pre-push
```

Commit sur branche puis merge (workflow habituel) :

```bash
git checkout -b feat/domaine-www
git add -A && git commit -m "chore(domaine): bascule front web.movie-picker.fr -> www.movie-picker.fr"
git checkout master && git merge --no-ff feat/domaine-www
# NE PAS pusher encore si on veut caler le push avec l'étape 5 (voir ordre)
```

> Note : le push déclenche la CI/CD (lane api impactée → `deploy-api`, lane web → `deploy-front`).
> Faire les étapes 2–4 **avant** le push pour que le déploiement atterrisse sur une infra prête.

### Étape 2 — CloudFront : ajouter l'alias `www` (moi — réversible, zéro impact)

Le cert wildcard couvre déjà `www`. Ajout de l'alias sans impact tant que le DNS ne pointe pas.

```bash
aws cloudfront get-distribution-config --id E32M2PR26FCH96 > /tmp/dist.json
ETAG=$(jq -r '.ETag' /tmp/dist.json)
jq '.DistributionConfig | .Aliases = {"Quantity":2,"Items":["web.movie-picker.fr","www.movie-picker.fr"]}' /tmp/dist.json > /tmp/dist-config.json
aws cloudfront update-distribution --id E32M2PR26FCH96 --distribution-config file:///tmp/dist-config.json --if-match "$ETAG"
```

Attendre le déploiement de la distribution (`Status: Deployed`, ~5 min).

### Étape 3 — OVH : CNAME `www` → CloudFront (toi)

Dans le manager OVH (zone DNS `movie-picker.fr`) :

1. **Supprimer** la redirection / l'enregistrement A de `www` (`213.186.33.5`).
2. **Créer** un **CNAME** : `www` → `d1uc368ae7xu4s.cloudfront.net.`

(Un sous-domaine ne peut pas avoir à la fois une redirection OVH et un CNAME : supprimer d'abord.)

### Étape 4 — CORS : `ALLOWED_ORIGINS` (moi)

Variable de repo GitHub lue par `deploy-api` (`vars.ALLOWED_ORIGINS`). **Pendant la fenêtre**, autoriser les deux :

```bash
gh variable set ALLOWED_ORIGINS --repo Affy657/Movie-Picker --body "https://www.movie-picker.fr,https://web.movie-picker.fr"
```

> Prend effet au **prochain `deploy-api`** (variable injectée via `--set-env-vars` au déploiement).
> D'où l'ordre : régler la variable **avant** le push de l'étape 5.

### Étape 5 — Push → build + déploiement (moi)

```bash
git push origin master
```

- `deploy-api` (Cloud Run) redéploie l'API : le **défaut code** `PublicWebBaseUrl` devient
  `https://www.movie-picker.fr` → les emails de reset et le canonical du partage pointent vers `www`.
- `deploy-front` (S3 + CloudFront) redéploie le front.

> **Optionnel** (`PUBLIC_WEB_BASE_URL` explicite) : `gcloud run services update movie-picker-api
> --project movie-picker-2026 --region europe-west1 --update-env-vars PUBLIC_WEB_BASE_URL=https://www.movie-picker.fr`.
> ⚠️ **Piège** : le `deploy-api` de la CI utilise `--set-env-vars` (remplace tout le jeu d'env vars)
> et n'inclut PAS `PUBLIC_WEB_BASE_URL` → il **écraserait** un réglage manuel. Le défaut code (§1)
> est donc le mécanisme fiable ; le `gcloud` manuel n'est utile qu'en stopgap avant le merge.

### Étape 6 — PostHog (moi)

Ajouter `https://www.movie-picker.fr` aux *authorized URLs* (toolbar / web analytics) du projet
`movie-picker-prod`, retirer `web.` si présent. Non bloquant pour l'ingestion d'events (pas de
filtrage par domaine côté PostHog), mais nécessaire pour la toolbar / le heatmap.

### Étape 7 — Vérifications E2E (moi)

Voir §6. Ne pas passer à l'étape 8 tant que `www` ne sert pas correctement (auth + CORS OK).

### Étape 8 — OVH : apex + retrait `web` (toi)

Dans le manager OVH :

1. **Apex** `movie-picker.fr` : éditer la redirection existante → **301 vers `https://www.movie-picker.fr`**.
   S'assurer que la redirection supporte **HTTPS** (option SSL OVH sur la redirection).
2. **Supprimer** le CNAME `web` → `d1uc368ae7xu4s.cloudfront.net`.

### Étape 9 — Finalisation (moi)

Retirer `web` de CloudFront :

```bash
aws cloudfront get-distribution-config --id E32M2PR26FCH96 > /tmp/dist.json
ETAG=$(jq -r '.ETag' /tmp/dist.json)
jq '.DistributionConfig | .Aliases = {"Quantity":1,"Items":["www.movie-picker.fr"]}' /tmp/dist.json > /tmp/dist-config.json
aws cloudfront update-distribution --id E32M2PR26FCH96 --distribution-config file:///tmp/dist-config.json --if-match "$ETAG"
```

Restreindre CORS à `www` seul :

```bash
gh variable set ALLOWED_ORIGINS --repo Affy657/Movie-Picker --body "https://www.movie-picker.fr"
```

> Nécessite un redéploiement API pour propager (relancer le workflow CI/CD via `workflow_dispatch`
> s'il n'y a pas de nouveau commit).

### Étape 10 — Search Console (toi)

Ajouter la propriété `https://www.movie-picker.fr`, soumettre `https://www.movie-picker.fr/sitemap.xml`.

---

## 6. Vérifications finales (commandes)

```bash
curl -sI https://www.movie-picker.fr/ | head -1                       # attendu : HTTP/2 200
curl -sI https://movie-picker.fr/ | head -3                           # attendu : 301 -> https://www.movie-picker.fr/
curl -sI -H 'Origin: https://www.movie-picker.fr' https://api.movie-picker.fr/health | grep -i access-control-allow-origin
```

Manuel :
- Reset password : demander un reset → l'email (Resend, `noreply@movie-picker.fr`) contient un lien `https://www.movie-picker.fr/reset?token=...`.
- Ouvrir une soirée partagée `https://www.movie-picker.fr/e/<slug>` + vérifier l'aperçu OG.
- Connexion / cookie de session (SameSite=Lax, même eTLD+1 → doit fonctionner sans régression).

## 7. Rollback

- **CloudFront** : réappliquer les Aliases précédents (`web.movie-picker.fr` seul) via la séquence get/jq/update.
- **OVH** : restaurer le CNAME `web`, restaurer les redirections `www`/apex d'origine.
- **CORS** : `gh variable set ALLOWED_ORIGINS ... "https://web.movie-picker.fr"` + redéploiement.
- **Repo** : `git revert` du commit §1 + push (redéploie).
- Risque principal = propagation DNS (TTL OVH). Faire la bascule hors heure de pointe.

## 8. Points de vigilance

- **AWS = credentials root** (dette sécu connue) → confirmer chaque commande, une à la fois.
- **`--set-env-vars` de la CI écrase les env vars manuelles** sur Cloud Run (cf. étape 5) → s'appuyer sur le défaut code.
- **`ALLOWED_ORIGINS` ne se propage qu'au déploiement** API (pas à chaud).
- **Wildcard `*.movie-picker.fr`** couvre `www` mais **pas l'apex nu** — OK car l'apex ne fait qu'une redirection OVH.
- **Cookie de session** : `www` et `api` partagent l'eTLD+1 `movie-picker.fr` → `SameSite=Lax` OK, pas de régression auth.
- **MX + TXT (SPF/DKIM/DMARC Resend)** : ne pas y toucher (email envoi/réception).
- Un alias CloudFront (CNAME) ne peut être attaché qu'à une seule distribution — `www` n'est attaché nulle part, OK.

## 9. Checklist

- [ ] §1 Repo édité + tests verts + branche mergée (pas encore poussée)
- [ ] §2 Alias `www` ajouté à CloudFront `E32M2PR26FCH96` (Deployed)
- [ ] §3 OVH : CNAME `www` → `d1uc368ae7xu4s.cloudfront.net`
- [ ] §4 `ALLOWED_ORIGINS` = `www,web`
- [ ] §5 `git push` → `deploy-api` + `deploy-front` verts
- [ ] §6 PostHog : `www` autorisé
- [ ] §7 Vérifs E2E OK sur `www`
- [ ] §8 OVH : apex 301 → `www` (HTTPS) + CNAME `web` supprimé
- [ ] §9 CloudFront : `web` retiré des Aliases + `ALLOWED_ORIGINS` = `www` seul (redéployé)
- [ ] §10 Search Console : propriété `www` + sitemap
