# Movie Picker — Référence des notifications

Deux canaux coexistent : **in-app** (cloche dans le header) et **push navigateur / PWA** (VAPID). Les préférences sont configurables par l'utilisateur depuis la page Compte.

---

## Notifications in-app

Visibles via la cloche 🔔 dans le header. Rechargement automatique toutes les 60 secondes. Les 10 plus récentes sont affichées ; cliquer ouvre la liste et marque tout comme lu.

| Type | Reçu par | Déclencheur | Texte affiché | Clic → |
|------|----------|-------------|---------------|--------|
| `NewFollower` | L'utilisateur suivi | Quelqu'un clique « Suivre » sur ton profil | **[Prénom]** a commencé à vous suivre. | Profil de l'abonné `/u/:handle` |
| `ParticipantJoined` | L'hôte de la soirée | Un participant rejoint la soirée | **[Titre soirée]** — [pseudo] a rejoint la soirée. | Détail soirée `/e/:slug` |
| `MovieAdded` | Tous les participants sauf le proposant | Un film est ajouté à la soirée | **[Titre soirée]** — « [film] » a été proposé. | Détail soirée `/e/:slug` |
| `MoviePicked` | Tous les participants | L'hôte lance la roue | **[Titre soirée]** — film tiré au sort : « [film] » | Détail soirée `/e/:slug` |
| `EventDeleted` | Tous les participants | L'hôte supprime la soirée | **[Titre soirée]** — la soirée a été annulée. | Aucun lien |
| `EventReminder1h` | Tous les participants | Job automatique : 50–80 min avant le début | **[Titre soirée]** — commence dans 1 heure. | Détail soirée `/e/:slug` |
| `EventReminder24h` | Tous les participants | Job automatique : 23h50–24h20 avant le début | **[Titre soirée]** — commence demain. | Détail soirée `/e/:slug` |
| `EventInvitation` | L'utilisateur invité | L'hôte envoie une invitation directe (doit suivre la cible) | **[Prénom hôte]** vous invite à rejoindre **[Titre soirée]** | Détail soirée `/e/:slug` |

---

## Notifications push (navigateur / PWA)

Envoyées via Web Push (VAPID). Seuls les utilisateurs avec un abonnement push actif les reçoivent.

> **`EventInvitation` n'envoie pas de push** — uniquement in-app.

| Type | Titre | Corps | Clic → |
|------|-------|-------|--------|
| `NewFollower` | [Prénom] vous suit | @[handle] a commencé à vous suivre. | `/u/:handle` |
| `ParticipantJoined` | 🎉 Nouvelle inscription | [pseudo] a rejoint « [Titre soirée] » | `/e/:slug` |
| `MovieAdded` | 🎬 Nouveau film proposé | « [film] » a été ajouté à « [Titre soirée] » | `/e/:slug` |
| `MoviePicked` | 🎡 Film tiré au sort ! | Ce soir : « [film] » pour « [Titre soirée] » | `/e/:slug` |
| `EventDeleted` | ❌ Soirée annulée | « [Titre soirée] » a été annulée. | `/` (accueil) |
| `EventReminder1h` | 🎬 Soirée dans 1 heure | La soirée "[Titre soirée]" commence bientôt ! | `/e/:slug` |
| `EventReminder24h` | 🎬 Soirée demain | La soirée "[Titre soirée]" commence bientôt ! | `/e/:slug` |

---

## Préférences utilisateur

Chaque préférence est un toggle indépendant, configurable depuis Compte → Notifications.

| Label affiché | Type(s) contrôlé(s) |
|---------------|---------------------|
| Quelqu'un rejoint votre soirée | `ParticipantJoined` |
| Rappel 1 heure avant la soirée | `EventReminder1h` + `EventReminder24h` |
| Un film est proposé à votre soirée | `MovieAdded` |
| Résultat du tirage au sort | `MoviePicked` |
| Une soirée est annulée | `EventDeleted` |
| Quelqu'un vous suit | `NewFollower` |
