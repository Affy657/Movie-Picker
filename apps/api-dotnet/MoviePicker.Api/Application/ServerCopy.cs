using MoviePicker.Api.Application.Ports;

namespace MoviePicker.Api.Application;

public sealed record PushText(string Title, string Body)
{
    public PushMessage ToMessage(string tag, string url, TimeSpan? timeToLive = null) =>
        new(Title, Body, tag, url, timeToLive);
}

public static class ServerCopy
{
    public static class Push
    {
        public const string WinnerPickedByHostTitle = "🎬 Film choisi par l'hôte !";
        public const string WinnerDrawnTitle = "🎡 Film tiré au sort !";
        public const string Tonight = "Ce soir";

        public static PushText MovieAdded(string movieTitle, string eventTitle) =>
            new("Un film de plus au menu 🍿", $"{movieTitle} a été ajouté à la soirée {eventTitle}");

        public static PushText EventCancelled(string eventTitle) =>
            new("Soirée annulée 😢", $"{eventTitle} a été annulée.");

        public static PushText HostRoleReceived(string eventTitle) =>
            new("Vous êtes l’hôte 🎬", $"L’hôte de « {eventTitle} » a supprimé son compte : vous organisez désormais la soirée.");

        public static PushText EventRescheduled(string eventTitle) =>
            new("Nouvelle date pour la soirée 📅", $"{eventTitle} a été reprogrammée.");

        public static PushText NewFollower(string followerName) =>
            new("Nouveau follower 👀", $"{followerName} a commencé à vous suivre.");

        public static PushText EventInvitation(string? inviterName, string eventTitle) =>
            new("Invitation reçue ! 💌", $"{inviterName} vous invite à rejoindre {eventTitle}");

        public static PushText ListInvitation(string? ownerName, string listName) =>
            new("Invitation reçue ! 💌", $"{ownerName} vous invite à rejoindre la liste {listName}");

        public static PushText GroupInvitation(string? ownerName, string groupName) =>
            new("Invitation reçue ! 💌", $"{ownerName} vous invite à rejoindre le groupe « {groupName} »");

        public static PushText GroupNight(string? hostName, string nightTitle, string groupName) =>
            new($"{groupName} 🍿", $"{hostName} vous attend à « {nightTitle} » : proposez vos films !");

        public static PushText ParticipantJoined(string pseudo, string eventTitle) =>
            new("Ça s'anime !", $"{pseudo} vient de rejoindre {eventTitle} ! 🎉");

        public static PushText ReminderOneDayBefore(string eventTitle) =>
            new("J-1 !", $"Demain, c'est {eventTitle} ! Préparez le canapé et le popcorn 🍿");

        public static PushText ReminderOneHourBefore(string eventTitle) =>
            new("Dans 1 heure !", $"⏰ {eventTitle} arrive à grands pas !");

        public static PushText ReminderWithoutMovie(string eventTitle) =>
            new(
                "Toujours rien au programme ?",
                $"Plus qu'une heure avant {eventTitle} et toujours aucun film choisi… on en ajoute un ? 👀");

        public static PushText EventPending(string eventTitle) =>
            new(
                "Soirée en suspens 😅",
                $"{eventTitle} s'est terminée sans qu'aucun film n'ait été choisi… on se rattrape la prochaine fois ?");

        public static PushText RemovedFromEvent(string eventTitle) =>
            new("Participation retirée", $"L'hôte a retiré votre participation à {eventTitle}.");

        public static PushText RatingReminder(string movieTitle, string eventTitle) =>
            new("Alors, ce film ? ⭐", $"{movieTitle}, vu pendant {eventTitle} : donnez-lui votre note !");

        public static string WinnerProgramme(string winnerTitle, string eventTitle) =>
            $"« {winnerTitle} » pour « {eventTitle} »";

        public static string WinnerProgrammeOn(string day, string programme) => $"{day} : {programme}";
    }

    public static class SharePreviews
    {
        public const string SiteDescription =
            "Choisissez votre prochain film ensemble : chacun propose, tout le monde vote, la roue tranche.";

        public const string OpenOnSite = "Ouvrir sur Movie Picker";

        public const string JoinAndVote = "Rejoignez la soirée et votez pour votre film.";

        public const string PrivateInvitationTitle = "Invitation à une soirée ciné";

        public const string PrivateInvitationDescription =
            "Vous avez reçu une invitation pour une soirée ciné sur Movie Picker. Ouvrez le lien pour la rejoindre.";

        public const string RecapWithoutWinner =
            "Le film n'est pas encore choisi. Soirée ciné organisée sur Movie Picker.";

        public const string MovieWithoutOverview =
            "Découvrez ce film sur Movie Picker et proposez-le à votre prochaine soirée ciné entre amis.";

        public const string ShowWithoutOverview =
            "Découvrez cette série sur Movie Picker et proposez-la à votre prochaine soirée entre amis.";

        public static string OnDay(string day) => $" le {day}";

        public static string AtHour(string hour) => $" à {hour}";

        public static string Invitation(string when, string? theme) =>
            string.IsNullOrEmpty(theme)
                ? $"Soirée ciné{when}. {JoinAndVote}"
                : $"Soirée ciné{when}. Thème : {theme}. {JoinAndVote}";

        public static string Gathering(string when, string? theme)
        {
            var invitation = string.IsNullOrEmpty(theme) ? JoinAndVote : $"Thème : {theme}. {JoinAndVote}";
            return string.IsNullOrEmpty(when) ? invitation : $"Rendez-vous{when}. {invitation}";
        }

        public static string InvitedTo(string host, string eventTitle) => $"{host} vous invite à « {eventTitle} »";

        public static string InvitedToANight(string host) => $"{host} vous invite à une soirée ciné";

        public static string Programme(string film, string when) => $"Au programme : {film}{when}.";

        public static string PosterOf(string title) => $"Affiche de {title}";

        public static string ImageOf(string title) => $"Image de {title}";

        public static string RecapTitle(string eventTitle) => $"{eventTitle}, le recap";

        public static string RecapUpcoming(string film, string day, string participants) =>
            $"Au programme : {film} le {day}, avec {participants}.";

        public static string RecapWatched(string film, string day, string participants) =>
            $"On a vu {film} le {day}, avec {participants}.";

        public static string RecapRated(string film, string average, string raters, string day) =>
            $"On a vu {film}, noté {average}/5 par {raters}, le {day}.";

        public static string Participants(int count) => count == 1 ? "1 participant" : $"{count} participants";

        public static string ProfileTitle(string name, string handle) => $"{name} (@{handle})";

        public static string ProfileDescription(string name, string handle) =>
            $"Profil {Of(name)} (@{handle}) sur Movie Picker : statistiques de soirées ciné, films proposés et abonnements.";

        public static string BannerOf(string name) => $"Bannière du profil {Of(name)}";

        private static string Of(string name) =>
            name.Length > 0 && "aeiouyàâäéèêëîïôöùûüÿæœ".Contains(char.ToLowerInvariant(name[0]), StringComparison.Ordinal)
                ? $"d’{name}"
                : $"de {name}";
    }

    public static class DeletedAccount
    {
        public const string Pseudo = "Compte supprimé";
    }

    public static class IdeaIssue
    {
        public const string BugPrefix = "Bug";
        public const string ImprovementPrefix = "Amélioration";
        public const string IdeaPrefix = "Idée";

        public static string Title(string prefix, string title) => $"[{prefix}] {title}";

        public static string Reference(string reference) => $"Référence : {reference}";

        public static string Page(string page) => $"Page : {page}";

        public static string Version(string version) => $"Version : {version}";
    }

    public static class PasswordResetEmail
    {
        public const string Subject = "Réinitialisez votre mot de passe Movie Picker";

        public static string HtmlBody(string url, string siteUrl) => BrandedEmailHtml.Render(new BrandedEmail(
            Lang: "fr",
            Title: Subject,
            Heading: "Réinitialisez votre mot de passe",
            Intro:
            [
                "Bonjour,",
                "Vous avez demandé à réinitialiser votre mot de passe Movie Picker. Cliquez sur le bouton ci-dessous, le lien reste valable 30 minutes."
            ],
            ButtonLabel: "Définir un nouveau mot de passe",
            ButtonUrl: url,
            FallbackIntro: "Si le bouton ne fonctionne pas, copiez cette adresse dans votre navigateur :",
            Outro: ["Si vous n’êtes pas à l’origine de cette demande, ignorez cet e-mail : votre mot de passe restera inchangé."],
            Signature: "L’équipe Movie Picker",
            SiteUrl: siteUrl));

        public static string TextBody(string url) => $"""
            Bonjour,

            Vous avez demandé à réinitialiser votre mot de passe Movie Picker.
            Cliquez sur le lien ci-dessous (valide 30 minutes) :

            {url}

            Si vous n’êtes pas à l’origine de cette demande, ignorez cet e-mail : votre mot de passe restera inchangé.

            L’équipe Movie Picker
            """;
    }

    public static class EmailVerificationEmail
    {
        public const string Subject = "Confirmez votre adresse e-mail Movie Picker";

        private const string NotYourAccount =
            "Si vous n’avez pas créé ce compte, quelqu’un a saisi votre adresse par erreur : ignorez cet e-mail, ou reprenez le compte avec « Mot de passe oublié » sur la page de connexion.";

        public static string HtmlBody(string url, string siteUrl) => BrandedEmailHtml.Render(new BrandedEmail(
            Lang: "fr",
            Title: Subject,
            Heading: "Confirmez votre adresse e-mail",
            Intro:
            [
                "Bonjour,",
                "Votre compte Movie Picker est prêt. Confirmez que cette adresse est bien la vôtre en cliquant sur le bouton ci-dessous, le lien reste valable 48 heures."
            ],
            ButtonLabel: "Confirmer mon adresse",
            ButtonUrl: url,
            FallbackIntro: "Si le bouton ne fonctionne pas, copiez cette adresse dans votre navigateur :",
            Outro: [NotYourAccount],
            Signature: "L’équipe Movie Picker",
            SiteUrl: siteUrl));

        public static string TextBody(string url) => $"""
            Bonjour,

            Votre compte Movie Picker est prêt.
            Confirmez que cette adresse est bien la vôtre en ouvrant le lien ci-dessous (valide 48 heures) :

            {url}

            {NotYourAccount}

            L’équipe Movie Picker
            """;
    }

    public static class PhotoReportEmail
    {
        public const string AvatarPhoto = "Photo de profil";
        public const string BannerPhoto = "Bannière";

        private const string Intro = "Un membre l’a signalée depuis le profil public. Elle reste affichée tant qu’elle n’est pas retirée.";

        public static string Subject(string photo, string handle) => $"[modération] {photo} signalée : @{handle}";

        public static string HtmlBody(
            string photo,
            string handle,
            string profileUrl,
            string imageUrl,
            string reporterId,
            string removal,
            string siteUrl) => BrandedEmailHtml.Render(new BrandedEmail(
            Lang: "fr",
            Title: Subject(photo, handle),
            Heading: Heading(photo, handle),
            Intro: [Intro, ImageLine(imageUrl)],
            ButtonLabel: "Voir le profil",
            ButtonUrl: profileUrl,
            FallbackIntro: "Si le bouton ne fonctionne pas, copiez cette adresse dans votre navigateur :",
            Outro: [ReporterLine(reporterId), RemovalLine(removal)],
            Signature: "Movie Picker",
            SiteUrl: siteUrl));

        public static string TextBody(
            string photo,
            string handle,
            string profileUrl,
            string imageUrl,
            string reporterId,
            string removal) => $"""
            {Heading(photo, handle)}

            {Intro}

            Profil : {profileUrl}
            {ImageLine(imageUrl)}

            {ReporterLine(reporterId)}

            {RemovalLine(removal)}
            """;

        private static string Heading(string photo, string handle) => $"{photo} de @{handle} signalée";

        private static string ImageLine(string imageUrl) => $"Image signalée : {imageUrl}";

        private static string ReporterLine(string reporterId) =>
            $"Signalement envoyé par le compte {reporterId}, seule donnée transmise sur son auteur.";

        private static string RemovalLine(string removal) =>
            $"Pour la retirer : {removal} (procédure dans docs/runbook-photo-moderation.md).";
    }

    public static class English
    {
        public static class VerificationEmail
        {
            public const string Subject = "Confirm your Movie Picker email address";

            private const string NotYourAccount =
                "If you didn't create this account, someone typed your address by mistake: ignore this email, or take the account back with “Forgot password” on the sign-in page.";

            public static string HtmlBody(string url, string siteUrl) => BrandedEmailHtml.Render(new BrandedEmail(
                Lang: "en",
                Title: Subject,
                Heading: "Confirm your email address",
                Intro:
                [
                    "Hi,",
                    "Your Movie Picker account is ready. Confirm this address is yours by clicking the button below, the link stays valid for 48 hours."
                ],
                ButtonLabel: "Confirm my address",
                ButtonUrl: url,
                FallbackIntro: "If the button doesn't work, copy this address into your browser:",
                Outro: [NotYourAccount],
                Signature: "The Movie Picker team",
                SiteUrl: siteUrl));

            public static string TextBody(string url) => $"""
                Hi,

                Your Movie Picker account is ready.
                Confirm this address is yours by opening the link below (valid for 48 hours):

                {url}

                {NotYourAccount}

                The Movie Picker team
                """;
        }

        public static class ResetEmail
        {
            public const string Subject = "Reset your Movie Picker password";

            public static string HtmlBody(string url, string siteUrl) => BrandedEmailHtml.Render(new BrandedEmail(
                Lang: "en",
                Title: Subject,
                Heading: "Reset your password",
                Intro:
                [
                    "Hi,",
                    "You asked to reset your Movie Picker password. Click the button below, the link stays valid for 30 minutes."
                ],
                ButtonLabel: "Set a new password",
                ButtonUrl: url,
                FallbackIntro: "If the button doesn't work, copy this address into your browser:",
                Outro: ["If you didn't request this, ignore this email: your password will remain unchanged."],
                Signature: "The Movie Picker team",
                SiteUrl: siteUrl));

            public static string TextBody(string url) => $"""
                Hi,

                You asked to reset your Movie Picker password.
                Click the link below (valid for 30 minutes):

                {url}

                If you didn't request this, ignore this email: your password will remain unchanged.

                The Movie Picker team
                """;
        }
    }
}
