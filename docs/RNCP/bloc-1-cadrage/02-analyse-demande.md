# 02 — Analyse de la demande

> **RNCP 39583 — C1.1.2** : « La présentation de l'analyse de la demande permet de recenser et d'identifier les besoins et les attentes des parties prenantes. L'analyse est structurée et permet de définir les objectifs et les principaux enjeux. La problématique du client est identifiée. Les pistes de solutions techniques sont cohérentes avec la problématique. »

---

## 1. Problématique

> **Comment permettre à un groupe d'amis de choisir un film à regarder ensemble, rapidement et équitablement, sans 30 minutes de débat improductif ni outil contraignant ?**

Le choix collectif d'un film est un problème social récurrent : chacun a ses préférences, personne ne veut imposer, et les outils existants (sondages génériques, watchlists individuelles) ne sont pas pensés pour la **décision collective ponctuelle et ludique** au moment de la soirée.

---

## 2. Recensement des besoins par partie prenante

| Partie prenante | Besoin exprimé / déduit | Traduction produit |
|-----------------|-------------------------|--------------------|
| **Hôte** | Organiser sans effort, garder le contrôle de la décision finale | Création rapide, configuration de soirée, rôle hôte exclusif (roue, clôture) |
| **Participant invité** | Rejoindre et participer simplement | Lien de partage → connexion/inscription rapide → redirection automatique sur la soirée (`returnTo`) |
| **Groupe récurrent** | Retrouver ses soirées, éviter de reproposer un film déjà vu | Compte (requis), historique, marqueur « déjà vu » neutre |
| **Tous** | Décider vite et de façon équitable | Vote up/down + roue (aléatoire ou pondérée) |
| **Tous (mobile)** | Utiliser au doigt, depuis un lien de messagerie | Mobile-first, « Copier le lien », QR code |
| **Commanditaire (Ynov)** | Démontrer la maîtrise du cycle complet (cadrage → dev → pilotage → MCO) | Couverture des 4 blocs RNCP, livrables documentaires versionnés |

---

## 3. Objectifs du projet

### Objectifs produit
- **Choix collectif rapide** : passer de « quel film ? » à un film décidé en quelques minutes.
- **Équité** : chaque participant propose et vote ; la roue tranche (option pondérée pour respecter les votes).
- **Friction maîtrisée** : partage par simple lien menant à une inscription rapide, puis retour automatique sur la soirée (`returnTo`).
- **Dimension ludique** : l'animation de la roue rend la décision engageante plutôt que conflictuelle.

### Objectifs académiques (RNCP 39583)
- Démontrer la capacité à **cadrer, concevoir, développer, piloter et maintenir** une application logicielle.
- Produire des **livrables vérifiables** (code, tests, documentation, schémas, ADR, process) versionnés dans le dépôt.

---

## 4. Enjeux principaux

| Enjeu | Description | Levier produit / technique |
|-------|-------------|----------------------------|
| **Adoption** | Faire entrer un maximum de participants avec un minimum de friction | Mobile-first, lien partagé + inscription rapide avec redirection automatique sur la soirée |
| **Engagement** | Rendre la décision plaisante et non conflictuelle | Animation de la roue, vote visible, marqueur « déjà vu » |
| **Confiance / sécurité** | Protéger les données et le rôle hôte | Auth par cookie, OWASP Top 10, rôle hôte non devinable (cf. [`../owasp-top-10.md`](../bloc-2-conception-developpement/owasp-top-10.md)) |
| **Conformité** | Respecter le cadre légal et l'accessibilité | RGPD basique (export/suppression), accessibilité (OPQUAST/RGAA) |
| **Soutenabilité** | Tenir le projet en solo avec un budget étudiant | Automatisation CI/CD, free tiers cloud, scale-to-zero |

---

## 5. État de l'existant (analyse concurrentielle)

| Solution existante | Ce qu'elle fait | Limites pour notre problématique |
|--------------------|-----------------|----------------------------------|
| **Sondage WhatsApp / Doodle** | Liste d'options + votes | Pas d'infos films (poster, note), pas de départage automatique, pas ludique |
| **Watchlist Letterboxd / TMDB** | Liste de films personnelle | Centrée sur l'individu, pas sur la décision collective ponctuelle |
| **MUBI / plateformes de curation** | Sélection éditoriale de films | Ne résout pas le choix d'un groupe à un instant T |
| **Watcha / apps de recommandation** | Suggestions personnalisées | Orientées découverte, pas décision de groupe immédiate |
| **« On lance Netflix et on scrolle »** | Statu quo | Le problème même que l'on cherche à résoudre |

**Constat** : aucune solution ne combine **décision collective + métadonnées films riches + départage ludique + zéro friction mobile**. C'est le créneau de Movie Picker.

---

## 6. Pistes de solutions

### Pistes retenues
- **Vote up/down + roue** (aléatoire stricte ou pondérée par les votes) : départage rapide et équitable, paramétrable par l'hôte.
- **Lien partagé + inscription rapide (`returnTo`)** : adoption fluide tout en garantissant des participants identifiés (pseudo = nom du compte).
- **Métadonnées TMDB** (poster, note, bande-annonce, watch providers) : aide à la décision, ancrage visuel mobile.
- **Marqueur « déjà vu » neutre** (n'influence pas la roue) : évite de reproposer sans fausser le tirage.
- **Compte obligatoire pour tous les participants** : persistance, historique, notifications et fonctions sociales pour chacun ; le pseudo affiché = le nom du compte.

### Pistes écartées (reportées au backlog)
- **Deep links streaming natifs** (ouverture directe dans l'app de streaming) : complexité de mapping par plateforme → backlog (cf. [`../../roadmap-product.md`](../../roadmap-product.md)).
- **Recommandation algorithmique** : hors périmètre — la valeur est dans la décision collective, pas la suggestion.
- **Notifications push / email de rappel** : nécessitent consentement RGPD + infra de file d'envoi → V1.1 / backlog.

> **Cohérence problématique → solutions** : chaque piste retenue répond directement à un enjeu identifié (vote+roue → équité/rapidité ; lien + inscription rapide → adoption ; TMDB → engagement ; compte pour tous → identité, social et soutenabilité). Les justifications techniques détaillées figurent dans [`04-etude-comparative.md`](04-etude-comparative.md).

---

*Voir aussi : [`01-parties-prenantes.md`](01-parties-prenantes.md) (cartographie — C1.1.1) et [`11-argumentaire-client.md`](11-argumentaire-client.md) (synthèse argumentée — C1.6).*
