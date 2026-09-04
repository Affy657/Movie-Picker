---
name: verify
description: How to build/launch/drive Movie Picker (web + api-dotnet) for runtime verification of a change.
---

# Verifying a change in this repo

Monorepo: `apps/web` (Vite/React/TS) + `apps/api-dotnet` (.NET). CI is
`verify:local`, but that's tests/typecheck — for runtime verification, run
the actual app.

## Launch

Use `.claude/launch.json` configs via `preview_start`:
- `web` — `pnpm --filter web dev`, port 5173 (autoPort).
- `api` — `dotnet run --project apps/api-dotnet/MoviePicker.Api`, port 4000.
- `full` — both via `pnpm run dev:full`.

If port 4000/5173 is already taken by another session's server, **do not
kill it** — start your own isolated instance instead (see below).

## Auth in dev

`POST /api/v1/auth/login` with the seeded dev account:
`{"email":"dev@test.local","password":"DevTest123!"}` (from
`apps/web/src/features/auth/devQuickLoginCredentials.ts`). Sets a session
cookie. The login page also has a "Connexion rapide compte développeur"
button that does the same thing client-side.

## Gotcha: the Browser pane sandboxes credentialed cross-origin fetches

If you run your own API instance on a port other than the one `VITE_API_URL`
points at (e.g. to avoid clashing with another session's server), the web
app's cross-origin `fetch(..., { credentials: 'include' })` calls **fail
silently in the Claude Browser pane** ("Failed to fetch"), even when the
server's CORS headers are perfectly correct (verified independently via
`curl -i -H "Origin: ..."` — proper `Access-Control-Allow-Origin` +
`Allow-Credentials`). A plain uncredentialed `fetch` to the same origin
*does* succeed — only the credentialed cross-origin case is blocked. This
reproduced identically whether the API was a raw background process or
registered via `preview_start` with a `url`-only config (attach mode).
Root cause looks like a deliberate sandbox restriction on the Browser pane
tool itself (preventing an agent-driven page from sending cookies
cross-origin to an arbitrary host), not an app bug.

Note: `apps/web/src/shared/api/client.ts` also has `ensureApiIsNotFrontOrigin`,
which explicitly throws if `VITE_API_URL` origin equals the page's own
origin — so pointing the web app at itself + a dev proxy to dodge this is
not an option without patching that guard.

**Consequence**: a live, browser-driven, *authenticated* GUI flow can only
be verified through the Browser pane when the API is reachable at the
`VITE_API_URL` the web app already expects (normally the one true dev API
on :4000). If that's occupied by another session, GUI verification of an
auth-gated flow is blocked — fall back to driving the API surface directly.

## Driving the API surface directly (curl)

Works reliably and exercises the real running code:

```bash
cookiejar=$(mktemp)
curl -s -c "$cookiejar" -X POST http://localhost:<port>/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"dev@test.local","password":"DevTest123!"}'
curl -s -b "$cookiejar" -X POST http://localhost:<port>/api/v1/<endpoint> \
  -H "Content-Type: application/json" --data-binary @payload.json -w "\n%{http_code}\n"
```

Build in `-c Release` to avoid file-lock conflicts with another session's
Debug build holding `bin/Debug/**` open:

```bash
cd apps/api-dotnet && dotnet build MoviePicker.Api/MoviePicker.Api.csproj -c Release
ASPNETCORE_ENVIRONMENT=Development ASPNETCORE_URLS=http://localhost:<port> \
  dotnet run --project MoviePicker.Api -c Release --no-launch-profile
```

`.env` at repo root is loaded by `EnvLoader` but only fills vars **not
already set** in the process environment — so passing `GITHUB_TOKEN=...` /
`GITHUB_REPO_OWNER=...` / `GITHUB_REPO_NAME=...` inline on the launch
command safely overrides real secrets for a dry-run against a feature that
calls the real GitHub API (e.g. idea-suggestion issue creation): use an
obviously-invalid token + a nonexistent owner/repo so any real outbound
call to `api.github.com` fails with 401/404 and can never actually write
anything, while still exercising the real HTTP call shape/URLs/logging.

## Cleanup after an isolated verification run

- Stop the extra dotnet process: `powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort <port> -State Listen | Select-Object -ExpandProperty OwningProcess"` then `Stop-Process -Id <pid> -Force`.
- Remove any temporary `apps/web/.env.local` you created.
- Revert any temporary `.claude/launch.json` entries added just to register a port with `preview_start`.
