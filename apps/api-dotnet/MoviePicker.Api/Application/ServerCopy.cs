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

    public static class English
    {
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
