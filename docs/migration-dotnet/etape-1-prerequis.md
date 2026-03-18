# Étape 1 – Prérequis (Migration back .NET)

Ce document détaille l’**étape 1** de la [roadmap migration .NET](roadmap-migration-dotnet.md) : vérification des prérequis avant de créer le projet ASP.NET Core.

**LTS cible (mars 2026) :** [.NET 10](https://dotnet.microsoft.com/en-us/platform/support/policy) — support jusqu’en novembre 2028. **.NET 8** reste aussi en LTS jusqu’en novembre 2026 si besoin d’alignement sur un environnement existant.

---

## 1. Installer le SDK .NET 10 (dernière LTS)

### Option A – Winget (Windows)

```powershell
winget install Microsoft.DotNet.SDK.10
```

Ou :

```powershell
winget search dotnet-sdk
winget install dotnet-sdk-10
```

### Option B – Téléchargement manuel

- **Télécharger :** https://dotnet.microsoft.com/download/dotnet/10.0  
- Choisir **.NET SDK 10.x** pour votre OS (Windows x64 recommandé).  
- Installer puis **redémarrer le terminal** (ou la session) pour que `dotnet` soit dans le `PATH`.

---

## 2. Vérifier `dotnet --version` et NuGet

Après installation, ouvrir un **nouveau** terminal :

```powershell
dotnet --version
```

Vous devez voir une version **10.x** (ex. `10.0.105`).

```powershell
dotnet nuget list source
```

Au moins une source (ex. `https://api.nuget.org/v3/index.json`) doit être configurée.

---

## 3. MVP Node opérationnel

Avant de migrer, il faut pouvoir **comparer** les réponses entre l’API Node et la future API .NET.

- [x] **API .NET** : `apps/api-dotnet/MoviePicker.Api` démarre (`dotnet run` ou `pnpm dev:api-dotnet`).
- [x] **Front** : `apps/web` fonctionne et appelle l’API.
- [x] **MongoDB** : base accessible (Atlas ou local), variable `MONGODB_URI` configurée.
- [x] **TMDB** : clé API configurée (`TMDB_API_KEY`) pour la recherche de films.

*(Confirmé : MVP fonctionnel.)*

---

## 4. Contexte et périmètre

À lire : [contexte-et-perimetre.md](contexte-et-perimetre.md).

**Résumé utile pour l’étape 1 :**

- **Objectif** : remplacer l’API Node/Express par ASP.NET Core **sans changer le front** (mêmes URLs, même JSON).
- **Risque principal** : toute différence de contrat (routes, schémas, codes d’erreur) casse le front.
- **Ordre conseillé** : 1) Prérequis (cette étape), 2) Spécifier le contrat API (OpenAPI), 3) Créer le projet ASP.NET Core, puis implémenter les routes, Docker, CI/CD.

---

## État de l’étape 1 (à cocher)

| Prérequis | Statut |
|-----------|--------|
| SDK **.NET 10** (LTS) installé | À faire : `dotnet --version` → 10.x |
| Accès NuGet vérifié | À faire après installation du SDK |
| MVP Node opérationnel | **OK** (API, front, MongoDB, TMDB) |
| Lecture de [contexte-et-perimetre.md](contexte-et-perimetre.md) | Fait |

Une fois le SDK installé et vérifié, passer à l’**étape 2** : [Spécification du contrat API](roadmap-migration-dotnet.md#2-spécification-du-contrat-api).
