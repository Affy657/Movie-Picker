# Schéma d'architecture – Movie Picker MVP

## Vue d'ensemble

- **Front** : React (Vite), hébergé sur **AWS** (S3 + CloudFront).
- **Back** : API ASP.NET Core (C#, .NET 10), déployée sur **GCP** (Cloud Run).
- **Données** : MongoDB Atlas.
- **CI/CD** : GitHub Actions (build, push image, déploiement Cloud Run + S3/CloudFront).

## Diagramme

```mermaid
flowchart TB
    subgraph Users["Utilisateurs"]
        U[Navigateur]
    end

    subgraph AWS["AWS"]
        CF[CloudFront]
        S3[(S3)]
        CF --> S3
    end

    subgraph GCP["GCP"]
        CR[Cloud Run<br/>API .NET]
        AR[Artifact Registry]
    end

    subgraph External["Externes"]
        MongoDB[(MongoDB Atlas)]
        TMDB[TMDB API]
    end

    subgraph CICD["CI/CD"]
        GA[GitHub Actions]
        GA --> AR
        GA --> CR
        GA --> S3
        GA -.->|invalidation| CF
    end

    U -->|HTTPS| CF
    U -->|HTTPS / API| CR
    CR --> MongoDB
    CR --> TMDB
```

## Légende

| Élément | Rôle |
|--------|------|
| **CloudFront** | CDN, sert le build React (fichiers statiques depuis S3). |
| **S3** | Stockage du build front (index.html, assets). |
| **Cloud Run** | Exécution du conteneur API (ASP.NET Core). |
| **Artifact Registry** | Stockage de l'image Docker de l'API. |
| **MongoDB Atlas** | Base de données (events, participants, movies, votes). |
| **TMDB** | API films (recherche, posters). |
| **GitHub Actions** | Build, tests, push image, déploiement API + front, invalidation CloudFront. |

## Flux

1. **Utilisateur** → ouvre l'URL CloudFront → reçoit l'app React depuis S3.
2. **App React** → appelle l'API sur l'URL Cloud Run (HTTPS).
3. **API** → lit/écrit MongoDB, appelle TMDB pour les films.
4. **CI/CD** : à chaque push sur `main`, GitHub Actions build l'API .NET (Docker), pousse l'image vers Artifact Registry, déploie sur Cloud Run, build le front, uploade sur S3, invalide le cache CloudFront.

Pour l'architecture détaillée de l'API .NET (hexagonale, couches), voir [architecture-api-dotnet.md](../migration-dotnet/architecture-api-dotnet.md).
