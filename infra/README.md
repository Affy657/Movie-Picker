# infra

Documents de configuration appliqués à la main sur les fournisseurs, en attendant le chantier Terraform de [`../docs/roadmap-tech.md`](../docs/roadmap-tech.md). Aucun n'est appliqué par la CI.

| Fichier | Ce qu'il décrit | Comment il s'applique |
|---|---|---|
| `iam-github-actions-deploy-policy.json` | politique au moindre privilège pour l'identité de déploiement du front | console IAM, ou `aws iam put-user-policy` |
| `cloudfront-response-headers-policy.json` | en-têtes de sécurité servis par CloudFront | [`../scripts/apply-cloudfront-headers.sh`](../scripts/apply-cloudfront-headers.sh) |
| `artifact-registry-cleanup-policy.json` | rétention des images de l'API | [`../.github/workflows/registry-cleanup.yml`](../.github/workflows/registry-cleanup.yml) |

## Les identifiants sont des espaces réservés

Le dépôt est public : aucun identifiant de compte, de bucket ou de distribution n'y est écrit. Les fichiers portent des gabarits `<COMME_CECI>`, **à substituer avant d'appliquer**, jamais à committer remplis.

| Gabarit | Où se relève la valeur |
|---|---|
| `<COMPTE_AWS>` | `aws sts get-caller-identity --query Account --output text` |
| `<BUCKET_FRONT>` | secret Actions `AWS_S3_BUCKET`, ou `aws s3 ls` |
| `<ID_DISTRIBUTION_CLOUDFRONT>` | variable Actions `AWS_CLOUDFRONT_DISTRIBUTION_ID`, ou `aws cloudfront list-distributions` |
| `<ID_CERTIFICAT_ACM>` | `aws acm list-certificates --region us-east-1` |
| `<PROJET_GCP>` | `gcloud config get-value project` |

Les secrets et variables Actions se lisent dans **Settings → Secrets and variables → Actions**. Un secret ne se relit pas après sa création, seulement se remplacer.
