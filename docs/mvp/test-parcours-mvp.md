# Parcours complet MVP – Checklist de test

À valider avant la soutenance : parcours utilisateur de bout en bout sur l'application **déployée** (URL CloudFront + API Cloud Run).

**Complément automatisé (CI / local) :** le même type de parcours est couvert par des **tests E2E Playwright** (`e2e/critical-flow.spec.ts`, stub TMDB) et par les tests d’intégration API — voir [../testing.md](../testing.md).

---

## Prérequis

- [ ] L'app est déployée : front accessible via l'URL CloudFront, API via l'URL Cloud Run.
- [ ] Tu as deux appareils ou deux navigateurs (ou une fenêtre privée) pour simuler **hôte** et **invité**.

---

## 1. Créer un event (hôte)

- [ ] Ouvrir l'URL du front (CloudFront).
- [ ] Aller sur « Créer un event » (ou page d'accueil puis création).
- [ ] Remplir : titre, date, heure.
- [ ] Soumettre le formulaire.
- [ ] Vérifier : redirection vers la page de l'event avec un **lien de partage** affiché.
- [ ] **Copier le lien** (bouton « Copier le lien » ou copie manuelle de l'URL). Ex. : `https://xxx.cloudfront.net/s/abc123`.

---

## 2. Rejoindre l'event (invité)

- [ ] Ouvrir le lien copié dans un **autre navigateur** ou **fenêtre privée** (pour simuler un invité).
- [ ] Vérifier : page « Rejoindre » ou formulaire avec champ **pseudo**.
- [ ] Saisir un pseudo et valider.
- [ ] Vérifier : accès à la page de l'event (titre, date, liste des films, zone roue).

---

## 3. Proposer des films

- [ ] **En tant qu'invité** : utiliser la recherche de films (barre de recherche).
- [ ] Rechercher un film (ex. « Inception »), sélectionner un résultat.
- [ ] Vérifier : le film apparaît dans la liste (poster, titre, année, « proposé par [pseudo] »).
- [ ] **En tant qu'hôte** (onglet où tu as créé l'event) : proposer un autre film.
- [ ] Vérifier : les deux films sont listés.

---

## 4. Voter

- [ ] **En tant qu'invité** : upvote sur un film, downvote sur l'autre (ou l'inverse).
- [ ] Vérifier : les scores / boutons se mettent à jour.
- [ ] **En tant qu'hôte** : voter aussi.
- [ ] Vérifier : pas d'erreur, un vote par participant par film (pas de double vote).

---

## 5. Lancer la roue (hôte)

- [ ] **En tant qu'hôte** : le bouton **« Lancer la roue »** doit être visible.
- [ ] Cliquer sur « Lancer la roue ».
- [ ] Vérifier : une animation de roue se lance, puis s'arrête sur un film (le gagnant).
- [ ] Vérifier : le film gagnant est affiché clairement.

**Cas limites (optionnel)** :  
- [ ] Event avec 0 film : message « Aucun film » ou bouton roue désactivé.  
- [ ] Event avec 1 seul film : gagnant direct (avec ou sans courte animation).

---

## 6. Clôturer la soirée (hôte)

- [ ] Après le tirage, vérifier que le bouton **« Clôturer la soirée »** (ou équivalent) est visible pour l'hôte.
- [ ] Cliquer pour clôturer.
- [ ] Vérifier : la page passe en **lecture seule** (message type « Soirée terminée », plus d'ajout de film, plus de vote, plus de roue).

---

## 7. Vérifications transverses

- [ ] Aucune erreur visible dans la console navigateur (F12).
- [ ] Les appels API partent bien vers l'URL Cloud Run (onglet Réseau).
- [ ] En rechargeant la page de l'event (invité ou hôte), les données restent cohérentes.

---

## Résultat

Quand toutes les cases sont cochées, le **parcours complet MVP** est validé. Tu peux l'utiliser pour la démo lors de la soutenance et pour la case « Parcours complet testé » de la section 16 du [roadmap](roadmap-mvp.md).
