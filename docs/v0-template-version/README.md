# Modèle — structure « roadmap par version »

Ce dossier sert de **modèle à copier**. Le préfixe `v0` indique que ce n’est pas une vraie release.

Quand tu crées une version (ex. **V1 produit**), copie tout le dossier vers un nom du type `docs/v1-nom-descriptif/` puis :

1. Renomme les fichiers : remplace le suffixe `-vx` par `-v1` (ou `-v2`, etc.) — le numéro doit **matcher** le `v1` du dossier.
2. Remplace dans les fichiers le libellé `VERSION` / `vx` par ton numéro (`v1`, …).
3. Ajoute ici **toute** doc liée à cette version (roadmap, guides manuels, ADR locaux, etc.).

Convention récapitulée dans [00-roadmaps-par-version.md](../00-roadmaps-par-version.md).
