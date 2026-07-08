# Titre RNCP 39583 — Expert en développement logiciel

Dossier regroupant **tous les livrables liés au titre RNCP 39583** pour le projet **Movie Picker**, organisés **par bloc de compétences** pour la lisibilité.

> Les documents **produit / technique** (spec, roadmaps, architecture, cartes de livraison V1) restent dans [`../`](../) et [`../v1-produit/`](../v1-produit/) ; ils sont **référencés** depuis ce dossier mais ne sont pas des livrables RNCP au sens strict.

---

## Organisation

| Élément | Contenu |
|---------|---------|
| [`suivi-rncp.md`](suivi-rncp.md) | **Carte de suivi maîtresse** — couverture par bloc/compétence + détail des tâches (anciennement `livraison-RNCP.md`) |
| [`referentiel/`](referentiel/) | **Grilles officielles** d'évaluation (fiche récapitulative + 4 blocs) — *lecture seule, source jury* |
| [`bloc-1-cadrage/`](../../archive/docs/RNCP/bloc-1-cadrage/) | **Bloc 1 — Cadrer le projet** ✅ *(11 livrables, complet — archivé dans [`archive/docs/`](../../archive/docs/))* |
| [`bloc-2-conception-developpement/`](bloc-2-conception-developpement/) | **Bloc 2 — Concevoir & développer** *(livrables documentaires)* |
| [`bloc-3-coordination-pilotage/`](bloc-3-coordination-pilotage/) | **Bloc 3 — Coordonner & piloter** |
| [`bloc-4-mco/`](bloc-4-mco/) | **Bloc 4 — Maintien en condition opérationnelle** |

---

## État d'avancement par bloc

| Bloc | Intitulé | Compétences ÉLIM | État |
|------|----------|------------------|------|
| **1** | Cadrer un projet de développement | C1.1.1, C1.2.2, C1.3.2, C1.4.1, C1.6 | ✅ **Écrit complet** (oral C1.6 à préparer) |
| **2** | Concevoir et développer | C2.2.1✅, C2.2.2✅, C2.2.3, C2.3.1 | 🟡 Code livré, docs à produire |
| **3** | Coordonner et piloter | C3.1, C3.2.1, C3.4.2 | ⬜ À produire |
| **4** | Maintenir en condition opérationnelle | C4.1.2, C4.2.1, C4.3.2 | ⬜ À produire |

> Détail exhaustif des cases (cochées / à faire) dans [`suivi-rncp.md`](suivi-rncp.md).

---

## Convention

- Une case n'est cochée dans `suivi-rncp.md` que lorsque le livrable est **terminé et mergé sur `master`** (lien vérifiable).
- Chaque livrable cite en exergue le **critère officiel** correspondant (extrait de [`referentiel/`](referentiel/)).
- Les livrables s'appuient sur le **code réel** du dépôt (endpoints, architecture, stack) — pas de contenu générique.
