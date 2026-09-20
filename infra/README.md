# infra

Deux choses vivent ici : la description Terraform de l'infrastructure, construite lot par lot (chantier Terraform de [`../docs/roadmap.md`](../docs/roadmap.md)), et la configuration de service du site Firebase Hosting, que le pipeline envoie avec chaque version.

| Fichier | Ce qu'il décrit | Comment il s'applique |
|---|---|---|
| `firebase-hosting.json` | configuration de service du site Firebase Hosting (repli SPA, en-têtes de sécurité, paliers de cache) | envoyée avec chaque version par [`../scripts/publish-front-firebase.mjs`](../scripts/publish-front-firebase.mjs), section Hosting ci-dessous |

## Les identifiants sont des espaces réservés

Le dépôt est public : aucun identifiant de projet ni de bucket n'y est écrit. Les fichiers portent des gabarits `<COMME_CECI>`, **à substituer avant d'appliquer**, jamais à committer remplis.

| Gabarit | Où se relève la valeur |
|---|---|
| `<PROJET_GCP>` | `gcloud config get-value project` |
| `<BUCKET_TFSTATE>` | `TF_STATE_BUCKET` du `.env` local, ou `gcloud storage buckets list` |

Les secrets de déploiement (`GCP_WORKLOAD_IDENTITY_PROVIDER`, `GCP_SERVICE_ACCOUNT`, `GCP_PROJECT_ID`, `VITE_*`) vivent dans l'environnement GitHub **production** (`Settings / Environments`), réservé à la branche `master` ; seuls `SONAR_TOKEN` et `SENTRY_AUTH_TOKEN` (DEBT-027) sont encore des secrets de dépôt (`Settings / Secrets and variables / Actions`), où vivent aussi les variables. Un secret ne se relit pas après sa création, seulement se remplacer : `gh secret set <NOM> --env production`.

## Terraform

```
infra/terraform/
├─ modules/
│  ├─ artifact-registry/   dépôt Docker des images de l'API et sa rétention (10 versions gardées, purge à 30 jours)
│  ├─ secrets/             les secrets de l'API dans Secret Manager, conteneurs seuls, et le droit de lecture de l'identité d'exécution
│  ├─ cloud-run-api/       le service Cloud Run de l'API, son invocation publique et son domaine
│  ├─ web-hosting/         le site Firebase Hosting du front (provider google-beta)
│  ├─ github-federation/   le pool et le provider OIDC qui font confiance aux workflows du dépôt, environnement par environnement
│  ├─ workload-identity/   un compte sans clé que GitHub assume depuis un seul environnement, et chaque droit du compte, lié à sa ressource
│  └─ monitoring/          les trois sondes, les six politiques d'alerte, le canal e-mail et le tableau de bord
└─ environments/
   └─ production/          module racine : main.tf (les API du projet, l'identité d'exécution, les modules, l'activation de Firebase), versions.tf, backend.tf, providers.tf, variables.tf, outputs.tf, .terraform.lock.hcl
```

Les providers portent `user_project_override` et `billing_project` : les API Firebase refusent un jeton utilisateur sans projet de quota, et c'est un jeton utilisateur (`gcloud auth print-access-token`) que l'enveloppe fournit. Activer Firebase sur le projet (`google_firebase_project`) a demandé une fois d'accepter les conditions Firebase dans la console avec le compte propriétaire, l'API répond 403 avant : la ressource a été importée, pas créée.

Un module racine par environnement, un état distant par module racine (préfixe `environments/<nom>` dans le bucket d'état) ; la recette (lot 8) sera un second dossier sous `environments/` qui instancie les mêmes modules. Rien n'est écrit dans les fichiers `.tf` qui identifie le projet : l'identifiant du projet est une variable, le nom du bucket d'état est fourni à `init`.

### Ce que Terraform décrit, ce que le pipeline garde

La production a été **importée** le 2026-09-18 (lot 2 : 32 ressources, `plan` vide depuis), jamais recréée. Le partage avec `deploy.yml`, qui continue de déployer :

- **Terraform décrit la forme** : dépôt d'images et sa rétention, les quatorze secrets et le droit `secretAccessor` de l'identité d'exécution sur chacun, le service Cloud Run (identité, ingress, plafond d'instances, CPU et mémoire, concurrence, délai, port), son invocation par `allUsers` et son domaine `api.movie-picker.fr`.
- **Le pipeline garde le conteneur** : l'image, les variables d'environnement et les secrets montés (`--set-secrets`, `--set-env-vars`, dont `ALLOWED_ORIGINS`, variable GitHub, et `SENTRY_RELEASE`, qui change à chaque déploiement), le trafic (`--no-traffic` puis promotion, épinglage par `rollback.yml`) et les marqueurs `client` / `client_version` posés par gcloud. Le module `cloud-run-api` les écrit à la création d'un service (recette) puis les ignore (`lifecycle.ignore_changes`) : un `plan` reste vide après un déploiement ou un retour arrière. Les faire passer sous Terraform demanderait d'abord que la version voyage dans l'image plutôt qu'en variable ; ce n'est pas dans le chantier, DEBT-044 en garde la trace.
- **Les versions des secrets ne passent jamais par Terraform** (`gcloud secrets versions add`), sinon leur valeur finirait dans l'état. Les secrets et le service portent `deletion_protection` : retirer un secret de la liste ou détruire le service demande d'abord de lever ce verrou dans le code.
- Le montage d'un secret dans le service reste décrit à deux endroits, la liste `SECRETS` de `deploy.yml` et `api_secret_names` dans `main.tf`, le premier faisant foi (DEBT-044) : ajouter un secret, c'est le créer ici (`apply`), lui ajouter une version à la main, puis l'ajouter à `deploy.yml`.

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
- `TF_VAR_project_id`, lu dans `GCP_PROJECT_ID` (variable d'environnement, sinon `.env`), sinon le projet actif de gcloud ; `TF_VAR_state_bucket` depuis `TF_STATE_BUCKET` et `TF_VAR_alert_email` depuis `ALERT_EMAIL`, deux valeurs que le module racine attend et que le dépôt ne porte pas ;
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
ALERT_EMAIL=<ADRESSE_DES_ALERTES>
```

La règle de cycle de vie ne supprime que les versions non courantes de plus de 90 jours ; la version courante de l'état ne s'efface jamais d'elle-même. L'état porte tout ce que les ressources exposent, valeurs de secrets comprises quand Terraform les lit : accès public interdit, accès uniforme au niveau du bucket, et seuls le compte propriétaire du projet, `movie-picker-terraform@` (lecture et écriture, depuis master) et `movie-picker-terraform-plan@` (lecture seule, depuis une PR) y accèdent, les deux derniers par des liaisons décrites dans le module racine (`state_bucket`).

### Front sur Firebase Hosting (lot 3)

Le site `movie-picker-web` (module `web-hosting`) est la cible de `deploy-front` dans `deploy.yml` : une version publiée, puis vérifiée sur `https://movie-picker-web.web.app` et sur le domaine public (`verify-front`, première origine d'`ALLOWED_ORIGINS`, point d'entrée du build comparé à celui servi).

- **Publication** : [`../scripts/publish-front-firebase.mjs`](../scripts/publish-front-firebase.mjs) parle à l'API REST Hosting (version créée avec la configuration, fichiers gzippés et hachés, envoi des seuls inconnus, finalisation, release), sans `firebase-tools`, avec le même jeton que le reste du pipeline ; dans `deploy-front` la version est étiquetée `commit` et `run_id`. En local : `GCP_PROJECT_ID=<PROJET_GCP> node scripts/publish-front-firebase.mjs --site movie-picker-web` après `pnpm --filter web build` (`--dry-run` liste les fichiers sans rien envoyer). Chaque version est immuable et les releases restent listées : `rollback-front.yml` ([`../scripts/rollback-front-firebase.mjs`](../scripts/rollback-front-firebase.mjs)) remet en service la version précédente, ou celle d'un commit, en une release, sans archive ni republication ; seules les versions étiquetées par le pipeline sont éligibles.
- **Parité avec l'ancien CloudFront**, vérifiée le 2026-09-19 en-tête par en-tête sur `/`, une route prérendue, un chemin inconnu, un actif haché, `sw.js`, le manifeste, `sitemap.xml`, `robots.txt` et une icône : mêmes six en-têtes de sécurité, mêmes trois paliers (`immutable` un an sur `assets/`, `icons/`, `avatars/`, les images et `robots.txt` ; une heure sur `sitemap.xml` ; `no-cache, must-revalidate` partout ailleurs, `no-store` en plus sur `sw.js`), même repli SPA en 200. Trois écarts, tous dans le bon sens : Hosting impose son propre `Strict-Transport-Security` (`max-age=31556926; includeSubDomains; preload`, plus strict que celui de la configuration, qu'il remplace) ; `/decouvrir/` répond `301` vers `/decouvrir` au lieu de servir la coquille (DEBT-043) ; les scripts partent en `text/javascript` et le sitemap en `application/xml` sans charset, deux libellés équivalents.
- **Ce que la configuration encode** (`firebase-hosting.json`) : les routes prérendues sont publiées comme `<route>/index.html`, que Hosting sert à l'adresse de la route (`trailingSlashBehavior: REMOVE`), là où S3 demandait une clé sans extension ; `cleanUrls` reste faux ; le repli `**` vers `/index.html` ne joue que pour les chemins sans fichier. Pour les en-têtes, quand plusieurs règles s'appliquent à un chemin, **la dernière règle du fichier l'emporte** sur une clé dupliquée, vérifié : la règle `**` pose la base et les règles suivantes la précisent, garder cet ordre.
- **Identité du pipeline** : `roles/firebasehosting.admin` fait partie des droits du compte CI (module `ci-identity`, section Identités). Les appels envoient `x-goog-user-project`, exigé avec un jeton utilisateur et sans effet avec celui du compte de service.

### Domaines (lot 4, bascule du 2026-09-20)

Le module `web-hosting` décrit trois domaines : `www.movie-picker.fr`, canonique et servi, et `web.movie-picker.fr` plus l'apex, qui répondent `301` vers `www` en gardant le chemin (`redirect_target`) : les liens `/e/<slug>` et les courriels envoyés du temps de `web` continuent d'arriver. Le DNS est chez OVH, sans CLI : chaque enregistrement se pose dans le manager, et `pnpm run terraform -- output web_dns` dit pour chaque domaine son état (`host_state`, `ownership_state`, `cert_state`) et les enregistrements que Hosting attend encore. Un sous-domaine se prouve et se sert par un seul CNAME vers `<site>.web.app` ; l'apex demande un A `199.36.158.100` et un TXT `hosting-site=<site>`, qui couvre aussi les sous-domaines.

Ce qui a permis la bascule sans coupure, à rejouer pour un domaine déjà servi ailleurs : Hosting expose dans `cert.verification` de l'API un défi ACME par TXT (`_acme-challenge.<hôte>`) ou par HTTP (chemin `/.well-known/acme-challenge/<jeton>` sur le site en service). Le défi HTTP servi depuis l'ancien hébergement fait passer le certificat `CERT_ACTIVE` avant que le DNS ne bouge ; le certificat `TEMPORARY` affiché avant cela ne couvre pas le domaine. Un `hostState` à `HOST_MISMATCH` avec un certificat `CERT_VALIDATING` est l'état normal d'un domaine décrit dont le DNS n'a pas encore bougé.

AWS est vide depuis le 2026-09-20 : distribution (désactivée, puis supprimée une fois déployée), bucket, certificat wildcard (il ne servait que cette distribution, vérifié par `aws acm describe-certificate`), politique d'en-têtes, WAF, contrôle d'accès à l'origine, rôle et fournisseur OIDC supprimés ; les secrets et variables `AWS_*` retirés de GitHub et `ALLOWED_ORIGINS` réduit aux deux domaines servis. Ne reste que l'utilisateur IAM `movie-picker-ops` de la CLI locale, qui ne sert plus qu'à fermer le compte. La sonde de disponibilité du front (Cloud Monitoring) vise `www` : un `monitoredResource` ne se modifie pas, la sonde a été recréée et la politique « Front indisponible » repointée sur son `check_id`.

### Identités (lots 5 et 6, posés le 2026-09-20)

Quatre comptes de service, aucune clé : `gcloud iam service-accounts keys list --managed-by=user` ne rend rien sur aucun compte du projet, et rien ne doit en créer.

- **`movie-picker-api@`**, l'identité d'exécution des révisions Cloud Run (`google_service_account.api_runtime`) : `secretAccessor` sur chacun des quatorze secrets (module `secrets`), aucun rôle sur le projet.
- **`movie-picker-ci@`**, l'identité que les workflows de déploiement assument (module `workload-identity`) : le jeton OIDC de GitHub est échangé contre elle par le pool `github` et son provider `github-actions` (module `github-federation`), qui n'acceptent qu'un job du dépôt tournant dans un environnement GitHub nommé (`attribute_condition`), et sa liaison `workloadIdentityUser` ne vise que le sujet de l'environnement `production` : un job d'un autre environnement, même accepté par le provider, ne peut pas l'assumer. Ses droits sont ceux que les workflows exercent, relevés commande par commande, et rien de plus : `run.developer` (déployer une révision, déplacer le trafic, lire les révisions ; pas de `setIamPolicy`, l'invocation publique est décrite ici), `cloudscheduler.admin` (les deux jobs, créés s'ils manquent), `firebasehosting.admin`, `secretmanager.viewer` (l'existence d'un secret, jamais sa valeur) et `serviceusage.serviceUsageConsumer` (`x-goog-user-project`, la liste des API) sur le projet ; `serviceAccountUser` sur `movie-picker-api@` seul (déployer sous cette identité) ; `artifactregistry.writer` sur le dépôt `movie-picker` seul ; `secretAccessor` sur `SCHEDULER_TOKEN` (l'en-tête des jobs) et `MONGODB_URI` (la sauvegarde) seuls ; `storage.objectAdmin` sur le bucket de sauvegarde seul.

- **`movie-picker-terraform@`**, l'identité de l'`apply` sur master (workflow `infra.yml`, section suivante) : elle gère tout ce que le module racine décrit, donc `serviceUsageAdmin`, `serviceAccountAdmin`, `workloadIdentityPoolAdmin`, `projectIamAdmin`, `roleAdmin`, `run.admin`, `artifactregistry.admin`, `firebasehosting.admin` et `firebase.viewer` sur le projet, plus deux rôles personnalisés qui lui refusent ce que les rôles prédéfinis auraient donné en trop : `secretsOperator` (créer, décrire et partager un secret, jamais lire une version) et `bucketIamEditor` (la politique d'un bucket, jamais ses objets, posé sur le bucket d'état et sur celui des sauvegardes) ; `objectAdmin` sur le bucket d'état ; `serviceAccountUser` sur `movie-picker-api@`. Sa liaison ne vise que le sujet de `production`, que la politique de branche réserve à `master`.
- **`movie-picker-terraform-plan@`**, l'identité du `plan` sur une pull request : lecture seule (`viewer`, `securityReviewer`, `workloadIdentityPoolViewer`, `secretmanager.viewer`, `firebase.viewer`, `serviceUsageConsumer`), `objectViewer` sur le bucket d'état, liée au seul sujet de l'environnement `infra-plan`, qui n'a ni politique de branche ni secret d'écriture.

Les secrets GitHub qui désignent ces identités sont des sorties du module racine : `ci_service_account_email` (`GCP_SERVICE_ACCOUNT` de `production`), `terraform_service_account_email` (`GCP_TERRAFORM_SERVICE_ACCOUNT` de `production`), `terraform_plan_service_account_email` (`GCP_SERVICE_ACCOUNT` de `infra-plan`) et `workload_identity_provider` (`GCP_WORKLOAD_IDENTITY_PROVIDER` des deux environnements). Après tout changement du pool, du provider ou des droits, `gh workflow run cloud-auth-check.yml --ref master` prouve l'échange avant qu'un déploiement ne le découvre ; une liaison IAM fraîchement posée met une à deux minutes à être visible, un premier échec en `iam.serviceAccounts.getAccessToken` juste après un `apply` se rejoue.

Les API du projet dont tout cela dépend (`iam`, `iamcredentials`, `run`, `artifactregistry`, `secretmanager`, `cloudscheduler`) sont décrites et importées (`google_project_service.platform`, `disable_on_destroy = false`) : `deploy.yml` n'active plus rien lui-même. Le compte Compute par défaut, qui portait le pipeline jusqu'au 2026-09-20 avec neuf rôles sur le projet, `artifactregistry.admin` sur le dépôt et `objectAdmin` sur le bucket, n'a plus aucun droit ni liaison ; le rôle `cloudbuild.builds.builder` du compte Cloud Build, vestige du premier déploiement depuis les sources, est retiré avec lui.

### Supervision (lot 7, importée le 2026-09-20)

Le module `monitoring` décrit ce que les alertes du projet sont, et le lie : les trois sondes de disponibilité (`/health` toutes les 60 s, `/health/ready` toutes les 15 minutes avec son ping MongoDB, le domaine canonique du front toutes les 5 minutes, depuis l'Europe, les USA et l'Asie-Pacifique), les six politiques (trois sur les sondes, deux sur les métriques Cloud Run, une notification de nouveau compte lue dans les journaux structurés de l'API), le canal e-mail qu'elles notifient et le tableau de bord de MCO. L'identifiant d'une sonde est attribué par l'API à sa création : les conditions et les tuiles du tableau de bord le lisent sur la ressource (`uptime_check_id`) au lieu de le recopier, ce qui est la raison de les décrire ensemble. Recréer une sonde (un `monitoredResource` ne se modifie pas) repointe donc tout ce qui la lit dans le même `apply`.

La documentation de chaque politique, celle qui arrive dans l'e-mail d'alerte, vit ici en Markdown (`documentation.content`) : c'est elle que l'on relit avant de toucher un seuil, et les seuils y sont justifiés par les mesures qui les ont fixés. L'adresse notifiée est `ALERT_EMAIL` (`.env` local, secret des deux environnements GitHub et de Dependabot), déclarée sensible : un `plan` l'affiche en `(sensitive value)`, et le premier `apply` après l'import a mis à jour le canal sans rien changer, pour que l'état porte cette sensibilité.

Une sonde qui reçoit un `301` compte comme en échec (`2xx` attendu) : la sonde du front vise le domaine canonique, jamais un alias qui redirige.

### Plan en PR, apply sur master (lot 6, posé le 2026-09-20)

[`../.github/workflows/infra.yml`](../.github/workflows/infra.yml) est le seul endroit d'où la production est changée par Terraform une fois un lot fusionné :

- **sur une pull request qui touche `infra/terraform/`**, un `plan` contre la production, en lecture seule et sans prendre le verrou (`-lock=false`), publié en commentaire de la PR (un seul commentaire par module racine, réédité à chaque push, retrouvé par sa première ligne). Le verdict est en tête : rien à changer, des changements à lire, ou un plan en échec qui met le job en rouge. Un plan qui montre des changements que la PR ne décrit pas est une dérive de l'infrastructure réelle, à corriger avant de fusionner. Les PR Dependabot (montées de providers) le jouent aussi : leurs secrets sont ceux de Dependabot, posés avec les mêmes noms ;
- **sur master**, `plan -out` puis `apply` de ce fichier, derrière l'environnement `production` : ce qui est appliqué est exactement ce que le résumé du job montre. Un plan vide s'arrête là. Le même job se rejoue à la main (`gh workflow run infra.yml --ref master`) pour constater une dérive sans rien changer dans le dépôt.

Ce qui en découle pour un lot : décrire, `plan` en local pour construire, puis pousser ; l'`apply` local reste possible (le compte propriétaire y lit et y écrit encore), et le job de master retrouve alors un plan vide. Les deux jobs partagent un groupe de concurrence : un `plan` de PR attend un `apply` en cours pour lire l'état qu'il laisse. Une liaison IAM fraîchement posée met une à deux minutes à être visible : un premier échec en `iam.serviceAccounts.getAccessToken` juste après un `apply` se rejoue.

### Portes

`pnpm run check:terraform` ([`../scripts/check-terraform.mjs`](../scripts/check-terraform.mjs)) joue `terraform fmt -check -diff -recursive` sur tout `infra/terraform/`, puis `init -backend=false -lockfile=readonly` et `validate` sur chaque module racine de `environments/`, découverts par lecture du dossier. Ni bucket ni identifiants : la porte ne parle jamais à GCP. Elle est jouée dans `verify:local` (voie docker) et rejouée par le job `lint-terraform` de `ci-cd.yml`, à la même version de Terraform, avec le binaire de `hashicorp/setup-terraform`.

Deux familles de versions, deux mécanismes :

- **les providers** (`required_providers` dans `versions.tf`) sont suivis par Dependabot (écosystème `terraform`, un groupe mensuel). Après une montée de version, `.terraform.lock.hcl` doit porter les nouvelles empreintes : `pnpm run terraform -- providers lock`, à committer ; jusque-là la porte refuse le fichier de verrouillage en lecture seule ;
- **le binaire Terraform** est épinglé à trois endroits qui doivent dire la même version : `TERRAFORM_VERSION` dans `ci-cd.yml`, le tag de l'image dans `scripts/terraform.mjs` (digest compris) et `required_version` dans chaque `versions.tf`. `pnpm run check:tools` compare les trois entre eux et à la dernière version publiée, dans la passe hebdomadaire.
