# Roadmaps par version

Chaque **version** (V1, V2, release longue…) a un **dossier dédié** directement sous `docs/`, avec un nom explicite.

## Convention de nommage

| Élément | Exemple | Rôle |
|--------|---------|------|
| Dossier | `docs/v1-produit/` | `v{numéro}-{slug}` — **slug** décrit le thème (stable, lisible dans l’explorateur) |
| Roadmap principale | `01-roadmap-v1.md` | Suffixe `-v{n}` **aligné** sur le `v1` du dossier |
| Autres docs de la version | `02-staging-v1.md`, `03-auth-v1.md`, … | Même suffixe `-v{n}` pour tout ce qui appartient à cette release |

Le **MVP** reste historisé dans [mvp/01-roadmap-mvp.md](mvp/01-roadmap-mvp.md) ; les dossiers `docs/v*-…/` concernent surtout les **prochaines releases**.

## Modèle à copier

- Dossier modèle (placeholder `vx`) : [v0-template-version/](v0-template-version/README.md)

## Versions définies dans le dépôt

| Dossier | Statut |
|---------|--------|
| [v1-produit/](v1-produit/01-roadmap-v1.md) | Roadmap V1 produit (carte de suivi) |
| [v1-produit/02-deploiement-secrets-et-ci-v1.md](v1-produit/02-deploiement-secrets-et-ci-v1.md) | Tutoriel GCP/GitHub : secret Data Protection auth V1 |
