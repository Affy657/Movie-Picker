# V1 — Email transactionnel : « Mot de passe oublié »

Procédure opérationnelle pour activer l’envoi des emails de réinitialisation de mot de passe. Complète le code (cf. § Architecture ci-dessous) et la doc d’infra ([`deploiement-secrets-ci.md`](deploiement-secrets-ci.md)).

> **Provider retenu pour V1** : **Resend** ([resend.com](https://resend.com)) — API HTTP simple, free tier 3 000 emails/mois (largement suffisant pour V1), domaine custom + DKIM/SPF/DMARC en quelques minutes.

## 1. Architecture côté API

| Couche | Fichier(s) | Rôle |
|---|---|---|
| Port | [`Application/Ports/IEmailSender.cs`](../../apps/api-dotnet/MoviePicker.Api/Application/Ports/IEmailSender.cs) | Contrat `SendAsync(EmailMessage, ct)` ; record `EmailMessage` (`PrintMembers` override pour ne **jamais** logger le HTML / texte / nom destinataire) |
| Factory | [`Application/UseCases/Auth/PasswordReset/PasswordResetEmailFactory.cs`](../../apps/api-dotnet/MoviePicker.Api/Application/UseCases/Auth/PasswordReset/PasswordResetEmailFactory.cs) | Génère le `EmailMessage` localisé FR / EN (sujet + HTML + texte + tag `password-reset`) |
| Impl `log` | [`Infrastructure/Email/LogEmailSender.cs`](../../apps/api-dotnet/MoviePicker.Api/Infrastructure/Email/LogEmailSender.cs) | Logge l’email (destinataire **masqué**, lien extrait pour debug local) ; **n’envoie rien** |
| Impl `resend` | [`Infrastructure/Email/ResendEmailSender.cs`](../../apps/api-dotnet/MoviePicker.Api/Infrastructure/Email/ResendEmailSender.cs) | `HttpClient` typé vers `https://api.resend.com/emails` ; bearer auth ; un retry sur **429** ; lève `EmailDeliveryException` sur erreur réseau / HTTP non-2xx |
| DI | [`Infrastructure/Email/EmailServiceCollectionExtensions.cs`](../../apps/api-dotnet/MoviePicker.Api/Infrastructure/Email/EmailServiceCollectionExtensions.cs) | Sélectionne l’impl selon `EMAIL_PROVIDER` ; warning stderr si `resend` mais pas de `RESEND_API_KEY` en non-Development → repli `LogEmailSender` |
| Use case | [`RequestPasswordResetHandler.cs`](../../apps/api-dotnet/MoviePicker.Api/Application/UseCases/Auth/PasswordReset/RequestPasswordResetHandler.cs) | Anti-énumération (silence si email inconnu) ; throttle **60 s** par utilisateur ; **swallow** `EmailDeliveryException` (pas de fuite à l’API → endpoint répond toujours `202 Accepted`) |

## 2. Variables d’environnement

| Variable | Valeur attendue (V1 prod) | Notes |
|---|---|---|
| `EMAIL_PROVIDER` | `resend` | `log` (défaut) en local / dev sans Resend |
| `EMAIL_FROM_ADDRESS` | `noreply@movie-picker.fr` | Domaine **doit être vérifié** dans Resend (étape § 3) |
| `EMAIL_FROM_NAME` | `Movie Picker` | Nom affiché dans la boîte de réception |
| `RESEND_API_KEY` | `re_…` (secret) | **GCP Secret Manager** ; jamais committé |
| `RESEND_API_BASE_URL` | (omis) | Défaut `https://api.resend.com` ; override uniquement pour tests E2E avec mock |

Référence complète : [`.env.example`](../../.env.example) à la racine + tableau § 2 de [`deploiement-secrets-ci.md`](deploiement-secrets-ci.md).

## 3. Vérification du domaine `movie-picker.fr` dans Resend (à faire une fois)

> **À faire par un mainteneur** disposant des accès au registrar DNS et au compte Resend.

1. **Créer un compte Resend** ([resend.com/signup](https://resend.com/signup)) ou se connecter avec le compte d’équipe.
2. **Domains → Add Domain → `movie-picker.fr`** ; choisir la région (`eu-west-1` ou autre selon hébergement).
3. Resend affiche **3 enregistrements DNS** à créer chez le registrar (ex. OVH / Cloudflare) :
   - **TXT** SPF : `v=spf1 include:amazonses.com ~all` (Resend utilise SES côté infra)
   - **CNAME** DKIM (3 enregistrements `resend._domainkey…` pour la rotation des clés)
   - **MX** retour bounces (parfois optionnel selon plan)
4. Ajouter ces enregistrements dans la zone DNS du registrar. Propagation **5 min à 1 h** (souvent < 10 min).
5. Cliquer **Verify** dans Resend → tous les enregistrements doivent passer à **Verified** (vert).
6. *Optionnel mais recommandé* : ajouter **DMARC** (`_dmarc.movie-picker.fr` TXT `v=DMARC1; p=none; rua=mailto:dmarc@movie-picker.fr`) pour observer les rapports d’authentification (passer à `p=quarantine` puis `p=reject` après 1-2 semaines de mesures).

> **Sans cette vérification**, Resend refuse les envois depuis `*@movie-picker.fr` (HTTP 422). Tester d’abord en `log` (cf. § 6).

## 4. Génération de la clé API Resend

1. Resend → **API Keys → Create API Key**.
2. Nom : `movie-picker-prod` (ou `staging` pour un environnement séparé).
3. **Permission** : `Sending access` (lecture seule désactivée — principe du moindre privilège).
4. **Domain restriction** : restreindre à `movie-picker.fr` (la clé ne peut envoyer **que** depuis ce domaine).
5. Copier la clé `re_…` (affichée **une seule fois**).
6. Stocker dans **GCP Secret Manager** :

   ```bash
   echo -n "re_xxxxxxxxxxxxxxxxxxxxxxx" | gcloud secrets create RESEND_API_KEY \
     --data-file=- --replication-policy=automatic --project=<PROJECT_ID>
   ```

7. Le service Cloud Run consomme la variable via `--set-secrets` (cf. [`ci-cd.yml`](../../.github/workflows/ci-cd.yml) — section déploiement API). Ajouter `RESEND_API_KEY=RESEND_API_KEY:latest` au mapping si pas déjà fait.
8. Variables non-secrètes (`EMAIL_PROVIDER`, `EMAIL_FROM_ADDRESS`, `EMAIL_FROM_NAME`) : `--set-env-vars` (ou `vars.*` côté GitHub Actions).

## 5. Tests locaux

### 5.1 Mode `log` (défaut, pas d’envoi réel)

```bash
# .env à la racine (ou variables shell)
EMAIL_PROVIDER=log
EMAIL_FROM_ADDRESS=noreply@movie-picker.fr
EMAIL_FROM_NAME=Movie Picker

dotnet run --project apps/api-dotnet/MoviePicker.Api
```

Déclencher un POST `/api/v1/auth/password-reset/request` avec un email **existant** dans la base locale. Logs API attendus :

```
info: MoviePicker.Api.Infrastructure.Email.LogEmailSender[0]
      Email simulé envoyé à n***@m***.fr (sujet="Réinitialisation de votre mot de passe Movie Picker", lien=https://web.movie-picker.fr/reset?token=…)
```

Le **lien complet** apparaît dans les logs serveur — copier-coller pour tester le parcours `/reset?token=…` côté front sans configurer Resend.

### 5.2 Mode `resend` (envoi réel, après § 3 et § 4)

```bash
EMAIL_PROVIDER=resend
EMAIL_FROM_ADDRESS=noreply@movie-picker.fr
EMAIL_FROM_NAME=Movie Picker
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxx

dotnet run --project apps/api-dotnet/MoviePicker.Api
```

Demander un reset pour une **vraie adresse** dont on contrôle la boîte. Vérifier :

- Réception sous **5 secondes** dans la boîte (non-spam de préférence — vérifie SPF / DKIM / DMARC OK § 3).
- Sujet localisé selon le `Locale` envoyé (FR / EN).
- Lien `https://web.movie-picker.fr/reset?token=…` cliquable, valide **30 minutes**.
- Resend dashboard (`Logs`) montre l’email avec status `delivered` et tag `password-reset`.

## 6. Anti-énumération et limites côté API (rappel)

- **Endpoint `/auth/password-reset/request`** répond **toujours `202 Accepted`** — pas de différence visible entre email connu / inconnu.
- Throttle **60 s par utilisateur** (côté handler) : un second appel dans la fenêtre n’envoie **pas** d’email mais répond quand même `202`.
- Rate limit **5 req/min/IP** (cf. [`deploiement-secrets-ci.md`](deploiement-secrets-ci.md) § 5).
- Token plain : `Base64Url(32 bytes)`, stocké **hashé** SHA-256 en base ; index TTL Mongo sur `expiresAtUtc` → purge auto post-30 min.
- **Confirmation** (`/auth/password-reset/confirm`) : token consommé après usage ; **toutes** les sessions actives de l’utilisateur sont **invalidées** ; pas d’auto-login (sécurité OWASP).

## 7. En cas de problème

| Symptôme | Cause probable | Action |
|---|---|---|
| Email reçu mais marqué spam | DKIM / SPF non vérifiés ou DMARC absent | Vérifier les enregistrements DNS § 3 dans Resend ; ajouter DMARC `p=none` |
| HTTP 422 « domain not verified » | Domaine pas validé chez Resend | Refaire § 3 ; attendre propagation DNS (`dig TXT movie-picker.fr` doit retourner le SPF) |
| HTTP 429 « rate_limit_exceeded » | Trop d’envois (free tier : 100/jour, plan payant) | `ResendEmailSender` retry **une fois** après 1 s ; sinon log warning + `EmailDeliveryException` (swallowed côté handler) |
| Aucun log `Email envoyé` | `EMAIL_PROVIDER=log` mais user inconnu (anti-énumération) | Vérifier que l’email est bien en base (compte créé) ; sinon comportement attendu |
| Warning stderr « EMAIL_PROVIDER=resend but RESEND_API_KEY missing » | Secret manquant en prod | Vérifier le mapping `--set-secrets` Cloud Run ; redéployer |

## 8. Coûts et limites

- **Free tier Resend** : 3 000 emails/mois, 100/jour, 1 domaine. Suffisant pour V1.
- **Pricing Pro** ($20/mois) : 50 k emails/mois, multi-domaines, DKIM rotation auto.
- En cas de croissance forte : envisager **AWS SES** (moins cher au-delà de 50 k) — adapter `IEmailSender` (`AwsSesEmailSender`).

## 9. Références

- Code : [`Infrastructure/Email/`](../../apps/api-dotnet/MoviePicker.Api/Infrastructure/Email/)
- Tests : [`MoviePicker.Api.Tests/Infrastructure/Email/`](../../apps/api-dotnet/MoviePicker.Api.Tests/Infrastructure/Email/) ; [`MoviePicker.Api.IntegrationTests/PasswordResetEndpointsTests.cs`](../../apps/api-dotnet/MoviePicker.Api.IntegrationTests/PasswordResetEndpointsTests.cs)
- Spec design : [`docs/superpowers/specs/2026-04-29-password-reset-v1-design.md`](../superpowers/specs/2026-04-29-password-reset-v1-design.md)
- Plan implémentation : [`docs/superpowers/plans/2026-04-29-password-reset-v1.md`](../superpowers/plans/2026-04-29-password-reset-v1.md)
- Resend docs : <https://resend.com/docs>
