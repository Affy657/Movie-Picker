# Tutoriel — Secrets auth V1 (GCP + GitHub Actions)

Prérequis : déploiement MVP OK, `gcloud` sur le projet. L’API lit **`AUTH_DATAPROTECTION_KEYRING`** (voir `DataProtectionConfiguration.cs`).

## 1. XML key ring → Secret Manager

Générer le XML (même `SetApplicationName` que l’API : `MoviePicker`) :

```bash
# dépôt racine
dotnet run --project apps/api-dotnet/ToolGenDpKey/ToolGenDpKey.csproj > keyring.xml
```

PowerShell : `dotnet run --project apps/api-dotnet/ToolGenDpKey/ToolGenDpKey.csproj | Set-Content keyring.xml -Encoding utf8`

Créer ou versionner le secret :

```bash
gcloud secrets create AUTH_DATAPROTECTION_KEYRING --data-file=./keyring.xml --project=VOTRE_PROJECT_ID
# existe déjà :
gcloud secrets versions add AUTH_DATAPROTECTION_KEYRING --data-file=./keyring.xml --project=VOTRE_PROJECT_ID
```

Ne pas commiter `keyring.xml`. Ref. Microsoft : [Configurer la protection des données](https://learn.microsoft.com/aspnet/core/security/data-protection/configuration/).

## 2. IAM Secret Accessor

```bash
PROJECT="VOTRE_PROJECT_ID"
NUM="$(gcloud projects describe "$PROJECT" --format='value(projectNumber)')"
SA="${NUM}-compute@developer.gserviceaccount.com"   # ou SA dédié Cloud Run

for S in MONGODB_URI TMDB_API_KEY AUTH_DATAPROTECTION_KEYRING; do
  gcloud secrets add-iam-policy-binding "$S" \
    --project="$PROJECT" \
    --member="serviceAccount:${SA}" \
    --role="roles/secretmanager.secretAccessor"
done
```

Accorder **Accessor** sur `AUTH_DATAPROTECTION_KEYRING` au compte dont la clé = **`GCP_SA_KEY`** (CI) si différent du SA ci-dessus.

## 3. Workflow GitHub — Cloud Run

`.github/workflows/ci-cd.yml`, job **deploy-api** :

```text
--set-secrets "MONGODB_URI=MONGODB_URI:latest,TMDB_API_KEY=TMDB_API_KEY:latest,AUTH_DATAPROTECTION_KEYRING=AUTH_DATAPROTECTION_KEYRING:latest"
```

Push `master` → déploiement habituel.

## 4. Local

Optionnel : définir **`AUTH_DATAPROTECTION_KEYRING`** = contenu XML (une ligne difficile dans `.env` : préférer variable d’environnement utilisateur ou fichier non versionné). Sans variable : l’API utilise le défaut dev (pas de partage multi-instance).

---

**Plus tard** : `ALLOWED_ORIGINS` si nouvelle origine ; bucket affiches ; CORS / cookies prod.
