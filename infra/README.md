# infra

Deux choses vivent ici : la description Terraform de l'infrastructure, construite lot par lot (chantier Terraform de [`../docs/roadmap.md`](../docs/roadmap.md)), et les documents de configuration encore appliqués à la main sur les fournisseurs, en attendant le lot qui les absorbe. Aucun des seconds n'est appliqué par la CI.

| Fichier | Ce qu'il décrit | Comment il s'applique |
|---|---|---|
| `iam-github-actions-deploy-policy.json` | politique au moindre privilège du rôle que `deploy-front` assume par OIDC | console IAM, ou `aws iam attach-role-policy` |
| `cloudfront-response-headers-policy.json` | en-têtes de sécurité servis par CloudFront | [`../scripts/apply-cloudfront-headers.sh`](../scripts/apply-cloudfront-headers.sh) |

## Les identifiants sont des espaces réservés

Le dépôt est public : aucun identifiant de compte, de bucket ou de distribution n'y est écrit. Les fichiers portent des gabarits `<COMME_CECI>`, **à substituer avant d'appliquer**, jamais à committer remplis.

| Gabarit | Où se relève la valeur |
|---|---|
| `<COMPTE_AWS>` | `aws sts get-caller-identity --query Account --output text` |
| `<BUCKET_FRONT>` | secret Actions `AWS_S3_BUCKET`, ou `aws s3 ls` |
| `<ID_DISTRIBUTION_CLOUDFRONT>` | variable Actions `AWS_CLOUDFRONT_DISTRIBUTION_ID`, ou `aws cloudfront list-distributions` |
| `<DOMAINE_CLOUDFRONT>` | `aws cloudfront list-distributions --query 'DistributionList.Items[].DomainName'`, la cible du CNAME du front chez OVH |
| `<ID_CERTIFICAT_ACM>` | `aws acm list-certificates --region us-east-1` |
| `<PROJET_GCP>` | `gcloud config get-value project` |
| `<BUCKET_TFSTATE>` | `TF_STATE_BUCKET` du `.env` local, ou `gcloud storage buckets list` |

Les secrets de déploiement (`GCP_WORKLOAD_IDENTITY_PROVIDER`, `GCP_SERVICE_ACCOUNT`, `GCP_PROJECT_ID`, `AWS_DEPLOY_ROLE_ARN`, `AWS_S3_BUCKET`, `VITE_*`) vivent dans l'environnement GitHub **production** (`Settings / Environments`), réservé à la branche `master` ; seuls `SONAR_TOKEN` et `SENTRY_AUTH_TOKEN` (DEBT-027) sont encore des secrets de dépôt (`Settings / Secrets and variables / Actions`), où vivent aussi les variables. Un secret ne se relit pas après sa création, seulement se remplacer : `gh secret set <NOM> --env production`.

## Terraform

```
infra/terraform/
├─ modules/
│  ├─ artifact-registry/   dépôt Docker des images de l'API et sa rétention (10 versions gardées, purge à 30 jours)
│  ├─ secrets/             les secrets de l'API dans Secret Manager, conteneurs seuls, et le droit de lecture de l'identité d'exécution
│  └─ cloud-run-api/       le service Cloud Run de l'API, son invocation publique et son domaine
└─ environments/
   └─ production/          module racine : main.tf (les trois modules), versions.tf, backend.tf, providers.tf, variables.tf, outputs.tf, .terraform.lock.hcl
```

Un module racine par environnement, un état distant par module racine (préfixe `environments/<nom>` dans le bucket d'état) ; la recette (lot 8) sera un second dossier sous `environments/` qui instancie les mêmes modules. Rien n'est écrit dans les fichiers `.tf` qui identifie le projet : l'identifiant du projet est une variable, le nom du bucket d'état est fourni à `init`.

### Ce que Terraform décrit, ce que le pipeline garde

La production a été **importée** le 2026-09-18 (lot 2 : 32 ressources, `plan` vide depuis), jamais recréée. Le partage avec `deploy.yml`, qui continue de déployer :

- **Terraform décrit la forme** : dépôt d'images et sa rétention, les quatorze secrets et le droit `secretAccessor` de l'identité d'exécution sur chacun, le service Cloud Run (identité, ingress, plafond d'instances, CPU et mémoire, concurrence, délai, port), son invocation par `allUsers` et son domaine `api.movie-picker.fr`.
- **Le pipeline garde le conteneur** : l'image, les variables d'environnement et les secrets montés (`--set-secrets`, `--set-env-vars`, dont `ALLOWED_ORIGINS`, variable GitHub, et `SENTRY_RELEASE`, qui change à chaque déploiement), le trafic (`--no-traffic` puis promotion, épinglage par `rollback.yml`) et les marqueurs `client` / `client_version` posés par gcloud. Le module `cloud-run-api` les écrit à la création d'un service (recette) puis les ignore (`lifecycle.ignore_changes`) : un `plan` reste vide après un déploiement ou un retour arrière. Les faire passer sous Terraform demande d'abord que la version voyage dans l'image plutôt qu'en variable, c'est le lot 6.
- **Les versions des secrets ne passent jamais par Terraform** (`gcloud secrets versions add`), sinon leur valeur finirait dans l'état. Les secrets et le service portent `deletion_protection` : retirer un secret de la liste ou détruire le service demande d'abord de lever ce verrou dans le code.
- Le montage d'un secret dans le service reste décrit à deux endroits, la liste `SECRETS` de `deploy.yml` et `api_secret_names` dans `main.tf`, le premier faisant foi jusqu'au lot 6 : ajouter un secret, c'est le créer ici (`apply`), lui ajouter une version à la main, puis l'ajouter à `deploy.yml`.

### Lancer Terraform

Terraform n'est pas installé sur le poste : il tourne depuis son image Docker épinglée par digest dans [`../scripts/terraform.mjs`](../scripts/terraform.mjs), et c'est cette image que tout le monde utilise, la porte locale comprise. Docker Desktop lancé et `gcloud auth login` fait, puis :

```bash
pnpm run terraform -- init
pnpm run terraform -- plan
pnpm run terraform -- --root production plan   # même chose, la racine par défaut est production
pnpm run terraform -- fmt -recursive           # fmt s'applique à tout infra/terraform/
pnpm run terraform -- providers lock           # après un changement de version de provider
```

Ce que l'enveloppe ajoute d'elle-même :

- à `init`, le bucket d'état (`-backend-config=bucket=…`), lu dans `TF_STATE_BUCKET` (variable d'environnement, sinon `.env` à la racine du dépôt) ; `-backend=false` s'en passe, c'est ce que font la porte locale et la CI ;
- `TF_VAR_project_id`, lu dans `GCP_PROJECT_ID` (variable d'environnement, sinon `.env`), sinon le projet actif de gcloud ;
- `GOOGLE_OAUTH_ACCESS_TOKEN`, obtenu par `gcloud auth print-access-token` pour toute commande qui parle à GCP : aucun fichier de clé sur le poste, le jeton dure une heure et passe à Docker par son nom, jamais sur sa ligne de commande ;
- à `providers lock` sans `-platform`, les cinq plateformes (linux et darwin en amd64 et arm64, windows amd64) : sans elles le fichier de verrouillage ne porterait que l'empreinte `h1:` de linux_amd64 et `init -lockfile=readonly` refuserait le cache des providers partout ailleurs.

Les providers sont mis en cache dans le volume Docker `movie-picker-terraform-plugins`, et le dossier de travail `.terraform/` de chaque racine vit dans `movie-picker-terraform-data` (la porte y a le sien, à part, pour que le backend configuré par `init` ne lui soit jamais demandé) : un montage Windows ne porte pas les liens symboliques que Terraform crée vers son cache, et rien de tout cela n'a sa place dans l'arbre de travail. Seul `.terraform.lock.hcl` s'écrit à côté de la configuration, et il est versionné. Effacer ces deux volumes ne perd rien : `init` les remplit à nouveau.

### État distant

L'état est dans un bucket Cloud Storage versionné (chaque `apply` en garde l'ancienne version) et verrouillé (le backend `gcs` pose un verrou le temps d'une écriture, deux `apply` concurrents ne peuvent pas se croiser). Le bucket lui-même n'est pas décrit en Terraform, on ne peut pas décrire l'endroit où l'on range la description : il se crée une fois, à la main.

```bash
gcloud storage buckets create gs://<BUCKET_TFSTATE> --location=europe-west1   --uniform-bucket-level-access --public-access-prevention
gcloud storage buckets update gs://<BUCKET_TFSTATE> --versioning
printf '{"rule":[{"action":{"type":"Delete"},"condition":{"isLive":false,"daysSinceNoncurrentTime":90}}]}' > /tmp/lifecycle.json
gcloud storage buckets update gs://<BUCKET_TFSTATE> --lifecycle-file=/tmp/lifecycle.json
```

puis, dans le `.env` local (ignoré par git, en liste blanche de gitleaks) :

```
TF_STATE_BUCKET=<BUCKET_TFSTATE>
GCP_PROJECT_ID=<PROJET_GCP>
```

La règle de cycle de vie ne supprime que les versions non courantes de plus de 90 jours ; la version courante de l'état ne s'efface jamais d'elle-même. L'état porte tout ce que les ressources exposent, valeurs de secrets comprises quand Terraform les lit : accès public interdit, accès uniforme au niveau du bucket, et seuls le compte propriétaire du projet et, au lot 6, le compte de service du pipeline y lisent et y écrivent.

### Portes

`pnpm run check:terraform` ([`../scripts/check-terraform.mjs`](../scripts/check-terraform.mjs)) joue `terraform fmt -check -diff -recursive` sur tout `infra/terraform/`, puis `init -backend=false -lockfile=readonly` et `validate` sur chaque module racine de `environments/`, découverts par lecture du dossier. Ni bucket ni identifiants : la porte ne parle jamais à GCP. Elle est jouée dans `verify:local` (voie docker) et rejouée par le job `lint-terraform` de `ci-cd.yml`, à la même version de Terraform, avec le binaire de `hashicorp/setup-terraform`.

Deux familles de versions, deux mécanismes :

- **les providers** (`required_providers` dans `versions.tf`) sont suivis par Dependabot (écosystème `terraform`, un groupe mensuel). Après une montée de version, `.terraform.lock.hcl` doit porter les nouvelles empreintes : `pnpm run terraform -- providers lock`, à committer ; jusque-là la porte refuse le fichier de verrouillage en lecture seule ;
- **le binaire Terraform** est épinglé à trois endroits qui doivent dire la même version : `TERRAFORM_VERSION` dans `ci-cd.yml`, le tag de l'image dans `scripts/terraform.mjs` (digest compris) et `required_version` dans chaque `versions.tf`. `pnpm run check:tools` compare les trois entre eux et à la dernière version publiée, dans la passe hebdomadaire.
