# Runbook : retirer une photo signalée

Un membre connecté peut signaler la photo de profil ou la bannière d'un autre membre depuis son profil public (bouton « Plus d’actions » à côté de « Partager »). L'API (`POST /api/v1/users/{handle}/photo-reports`) envoie alors un courriel à l'adresse de contact. Ce runbook dit quoi en faire. Il n'existe aucun rôle d'administrateur dans l'application : le retrait se fait depuis le poste, par une commande.

## Le courriel

- Destinataire : `CONTACT_EMAIL_ADDRESS`, `contact@movie-picker.fr` (l'adresse de `SECURITY.md`) quand la variable n'est pas posée. Envoyé par Resend comme la réinitialisation de mot de passe ; en développement, `LogEmailSender` l'écrit seulement dans le journal de l'API.
- Objet : `[modération] Photo de profil signalée : @<handle>` ou `[modération] Bannière signalée : @<handle>`.
- Contenu : un bouton vers le profil, l'adresse directe de l'image signalée, l'identifiant interne du compte qui signale (rien d'autre sur lui : ni nom, ni adresse, ni handle) et la commande de retrait prête à copier.
- Volume : un seul courriel par image et par 24 heures, quel que soit le nombre de signalements, et 20 au plus par jour pour toutes les images (`ReportProfilePhotoHandler`, compteurs partagés de `ISharedQuota`) ; chaque compte peut signaler 5 fois par heure (`ProfilePhotoReportPolicy`). Au-delà, le signalement est accepté mais seulement journalisé : chercher `PhotoReport:` dans les journaux de l'API (`jsonPayload.State.{OriginalFormat}`).
- Un courriel que Resend refuse laisse une erreur `PhotoReport: the moderation e-mail about the ...` dans les journaux et dans Sentry, avec l'image et le compte propriétaire : le signalement n'est pas perdu, il faut alors le traiter depuis là.

## Décider

Ouvrir l'adresse directe de l'image : c'est elle qui a été signalée, même si le membre l'a changée depuis (une image remplacée reste servie dix minutes, `StoredPhoto.ReplacedPhotoLifetime`, puis l'index TTL de MongoDB l'efface). Rien n'oblige à retirer : un signalement infondé se laisse sans suite.

## Retirer

Prérequis : Docker lancé ; `gcloud` connecté au projet qui porte le secret `MONGODB_URI`, ou `MONGODB_URI` posé dans l'environnement (comme pour `pnpm run usage`).

```bash
pnpm run photo:remove -- --handle <handle> --photo avatar
pnpm run photo:remove -- --handle <handle> --photo banner
```

Le handle s'écrit avec ou sans `@`, en majuscules ou non. `--db moviepicker_dev` vise la base de développement ; sans `--db`, la commande écrit **en production**.

En une transaction, la commande :

1. retire du compte le pointeur vers l'image (`avatarPhoto`, ou `bannerPhoto` et la bannière quand elle montrait cette image ; une bannière de film reste) ;
2. incrémente sa `version`, pour qu'une écriture de l'API qui tenait l'ancien compte échoue en `concurrent_update` au lieu de remettre la photo ;
3. supprime toutes les images de ce type que le compte possède dans `avatar_photos` ou `banner_photos`, y compris une image remplacée qui attendait son TTL.

Le premier geste est celui qui compte : supprimer l'image sans retirer le pointeur laisserait le profil pointer vers une image en 404, et l'avatar retomberait sans bruit sur les initiales. Après le retrait, le profil affiche l'avatar généré du membre (ou ses initiales) et plus de bannière photo.

La commande affiche ce qu'elle a fait : `Removed the profile photo <clé> of @<handle> (N stored image(s) deleted).`, ou `@<handle> has no profile photo: nothing was changed.` quand il n'y a rien à retirer (photo déjà supprimée par son auteur, par exemple). Un handle inconnu arrête la commande avec une erreur, sans rien écrire.

## Ce que la commande ne fait pas

- **Vider les caches.** L'image est servie `public, max-age=86400, immutable` : un navigateur qui l'a déjà affichée peut la garder jusqu'à un jour. Plus aucune page ne la demande après le retrait, et l'API répond 404 à son adresse.
- **Prévenir le membre.** S'il faut lui écrire, le faire depuis l'adresse de contact.
- **Empêcher un nouvel envoi.** Le membre peut téléverser une autre image ; il n'existe pas de blocage par compte. Une récidive se traite en supprimant le compte, à la main.

## Vérifier

La commande est testée contre une vraie MongoDB par `scripts/mongo-tests/remove-photo.test.mjs` (joué par `pnpm run test:api:mongo`), sur des documents semés dont les champs sont ceux que les classes `*Document` de l'API déclarent ; ses arguments par `scripts/remove-photo.test.mjs`. Après un retrait en production, ouvrir le profil : la photo ne doit plus y être, et son adresse directe doit répondre 404.
