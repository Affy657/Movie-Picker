# Movie Picker – Fixes & Dette

Suivi des bugs, problèmes UX et dette à corriger. Une entrée par problème.

**Légende statut** : ⬜ à faire · 🚧 en cours · ✅ réglé  
**Légende type** : 🐛 Bug · 🎨 UI/UX · ⚡ Performance · 🧹 Dette / Legacy

---

## 🐛 Bugs

- ⬜ 🐛 **Affichage du lien de partage** : le lien de partage ne s'affiche pas correctement dans certains cas.

- ⬜ 🐛 **Nom de domaine — supprimer le préfixe `web.`** : l'URL actuelle expose `web.movie-picker.fr` ; l'apex `movie-picker.fr` doit rediriger proprement et le préfixe `web.` disparaître pour les utilisateurs.

---

## 🎨 UI/UX

- ✅ 🎨 **Éléments centrés qui font grossir la page** : `overflow-x: clip` ajouté sur `html` et `body` + sur `.page` ; `max-width: 100%; min-width: 0` ajouté sur les conteneurs flex-column avec `align-items: center` (`.rootCentered` ShareLink, `.layout` NotFoundPage) et sur les éléments `width: fit-content` sans contrainte (`.actions` MovieList, `.loadMoreBtn` MyEventsPage).

---

## ⚡ Performance

- ⬜ ⚡ **Lenteur de chargement des pages et des éléments** : les pages et certains composants sont lents à s'afficher ; à investiguer (bundle size, waterfall réseau, images non optimisées, requêtes non parallélisées).

---

## 🧹 Dette / Legacy

- ⬜ 🧹 **Nettoyage du repo pour livraison cours** : ranger et nettoyer le dépôt pour qu'il soit présentable — supprimer fichiers temporaires, vérifier que la doc est à jour, s'assurer que le parcours d'installation est clair pour un correcteur.
