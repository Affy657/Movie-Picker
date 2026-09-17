---
name: verify
description: Lancer et piloter Movie Picker (web + api-dotnet) pour vérifier un changement à l'exécution, dans le Browser pane ou par l'API directement. Déclenché avec « /verify ».
---

# Vérifier un changement à l'exécution

Monorepo : `apps/web` (Vite, React, TypeScript) et `apps/api-dotnet` (.NET). `verify:local` joue les tests et le typage ; pour voir un changement fonctionner, il faut lancer la vraie application.

## Lancer

Les configurations de [.claude/launch.json](../../launch.json) se démarrent par `preview_start` :

| Nom | Commande | Port |
|---|---|---|
| `web` | `pnpm --filter web dev` | 5173 (`autoPort`) |
| `api` | `dotnet run --project apps/api-dotnet/MoviePicker.Api` | 4000 |
| `full` | `pnpm run dev:full`, les deux ensemble | 5173 et 4000 |
| `web-b`, `api-b`, `full-b` | seconde paire pour un second agent ou worktree, même base `moviepicker_dev` | 5273 et 4100 |

Si 4000 ou 5173 est déjà pris par le serveur d'une autre session, **ne pas le tuer** : démarrer une instance isolée (voir plus bas) ou la paire `-b`.

## Se connecter en développement

`POST /api/v1/auth/login` avec le compte de démonstration : `{"email":"dev@test.local","password":"DevTest123!"}` (source : `apps/web/src/features/auth/devQuickLoginCredentials.ts`). La réponse pose un cookie de session. La page de connexion a aussi un bouton « Connexion rapide compte développeur » qui fait la même chose côté client.

## Piège : le Browser pane bloque les `fetch` authentifiés entre origines

Si l'API tourne sur un autre port que celui de `VITE_API_URL` (pour ne pas heurter le serveur d'une autre session), les appels `fetch(..., { credentials: 'include' })` du front **échouent en silence dans le Browser pane** (« Failed to fetch »), même quand les en-têtes CORS du serveur sont corrects, ce qu'un `curl -i -H "Origin: ..."` confirme indépendamment (`Access-Control-Allow-Origin` et `Allow-Credentials` présents). Un `fetch` sans identifiants vers la même origine passe : seul le cas authentifié entre origines est bloqué. Reproduit à l'identique que l'API soit un processus de fond brut ou enregistrée par `preview_start` avec une configuration `url` seule. La cause ressemble à une restriction volontaire du bac à sable du Browser pane (empêcher une page pilotée par l'agent d'envoyer des cookies vers un hôte arbitraire), pas à un bug de l'application.

`apps/web/src/shared/api/client.ts` porte aussi `ensureApiIsNotFrontOrigin`, qui lève si l'origine de `VITE_API_URL` est celle de la page : pointer le front sur lui-même avec un proxy de dev pour contourner le blocage demanderait de toucher ce garde-fou, ce qui n'est pas une option.

**Conséquence** : un parcours authentifié dans l'interface ne se vérifie dans le Browser pane que si l'API répond à l'adresse que le front attend déjà (`VITE_API_URL`, normalement l'API de dev sur `:4000`). Si ce port est occupé par une autre session, la vérification graphique d'un parcours authentifié est bloquée : passer par l'API directement.

## Piloter l'API directement (curl)

Fiable, et ça exerce le vrai code qui tourne :

```bash
cookiejar=$(mktemp)
curl -s -c "$cookiejar" -X POST http://localhost:<port>/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"dev@test.local","password":"DevTest123!"}'
curl -s -b "$cookiejar" -X POST http://localhost:<port>/api/v1/<endpoint> \
  -H "Content-Type: application/json" --data-binary @payload.json -w "\n%{http_code}\n"
```

Construire en `-c Release` pour éviter le verrou de fichier d'un build Debug tenu par une autre session (`bin/Debug/**` ouvert) :

```bash
cd apps/api-dotnet && dotnet build MoviePicker.Api/MoviePicker.Api.csproj -c Release
ASPNETCORE_ENVIRONMENT=Development ASPNETCORE_URLS=http://localhost:<port> \
  dotnet run --project MoviePicker.Api -c Release --no-launch-profile
```

Le `.env` de la racine est lu par `EnvLoader`, qui ne remplit que les variables **absentes** de l'environnement du processus : passer `GITHUB_TOKEN=...`, `GITHUB_REPO_OWNER=...` et `GITHUB_REPO_NAME=...` en ligne sur la commande de lancement remplace donc les vrais secrets pour une répétition à blanc d'une fonctionnalité qui appelle l'API GitHub (la création de ticket depuis « Proposer une idée », par exemple). Un jeton visiblement invalide et un dépôt inexistant font échouer tout appel réel à `api.github.com` en 401 ou 404, donc rien ne peut être écrit, tout en exerçant la forme de l'appel HTTP, ses URL et sa journalisation.

## Nettoyer après une vérification isolée

- Arrêter le processus dotnet supplémentaire : `powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort <port> -State Listen | Select-Object -ExpandProperty OwningProcess"` puis `Stop-Process -Id <pid> -Force`.
- Supprimer un `apps/web/.env.local` temporaire.
- Retirer les entrées temporaires ajoutées à `.claude/launch.json` pour enregistrer un port auprès de `preview_start`.
- Laisser tourner les serveurs de dev que l'utilisateur va utiliser pour tester lui-même : ne pas `preview_stop` après sa propre vérification.
