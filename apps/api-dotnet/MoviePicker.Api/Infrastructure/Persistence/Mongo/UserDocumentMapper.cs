using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Infrastructure.Persistence.Mongo;

public static class UserDocumentMapper
{
    public static User ToDomain(UserDocument doc) =>
        new()
        {
            Id = doc.Id,
            Email = doc.Email,
            PasswordHash = doc.PasswordHash,
            DisplayName = doc.DisplayName,
            Handle = doc.Handle ?? string.Empty,
            Bio = doc.Bio,
            IsProfilePublic = doc.IsProfilePublic ?? true,
            UiTheme = ParseTheme(doc.UiTheme),
            AccentColor = ParseAccent(doc.AccentColor),
            RatingScale = ParseRatingScale(doc.RatingScale),
            AvatarId = doc.AvatarId ?? string.Empty,
            NotificationPreferences = BuildNotificationPreferences(doc),
            CreatedAt = new DateTimeOffset(doc.CreatedAt, TimeSpan.Zero),
            UpdatedAt = new DateTimeOffset(doc.UpdatedAt, TimeSpan.Zero)
        };

    public static UserDocument ToDocument(User user) =>
        new()
        {
            Id = user.Id,
            Email = user.Email,
            PasswordHash = user.PasswordHash,
            DisplayName = user.DisplayName,
            Handle = string.IsNullOrEmpty(user.Handle) ? null : user.Handle,
            Bio = string.IsNullOrEmpty(user.Bio) ? null : user.Bio,
            IsProfilePublic = user.IsProfilePublic,
            UiTheme = ThemeToString(user.UiTheme),
            AccentColor = AccentToString(user.AccentColor),
            RatingScale = RatingScaleToString(user.RatingScale),
            AvatarId = string.IsNullOrEmpty(user.AvatarId) ? null : user.AvatarId,
            NotificationPreferences = user.NotificationPreferences
                .Select(kv => new NotificationPreferenceEntryDocument { Type = (int)kv.Key, Enabled = kv.Value })
                .ToList(),
            CreatedAt = user.CreatedAt.UtcDateTime,
            UpdatedAt = user.UpdatedAt.UtcDateTime
        };

    private static UiThemePreference ParseTheme(string? s) =>
        s?.ToLowerInvariant() switch
        {
            "light" => UiThemePreference.Light,
            "dark" => UiThemePreference.Dark,
            _ => UiThemePreference.System
        };

    private static string ThemeToString(UiThemePreference t) =>
        t switch
        {
            UiThemePreference.Light => "light",
            UiThemePreference.Dark => "dark",
            _ => "system"
        };

    internal static AccentColor ParseAccent(string? s) =>
        s?.ToLowerInvariant() switch
        {
            "blue" => AccentColor.Blue,
            "green" => AccentColor.Green,
            "purple" => AccentColor.Purple,
            "pink" => AccentColor.Pink,
            "orange" => AccentColor.Orange,
            "red" => AccentColor.Red,
            "cyan" => AccentColor.Cyan,
            "indigo" => AccentColor.Indigo,
            _ => AccentColor.Default
        };

    internal static string? AccentToString(AccentColor c) =>
        c switch
        {
            AccentColor.Blue => "blue",
            AccentColor.Green => "green",
            AccentColor.Purple => "purple",
            AccentColor.Pink => "pink",
            AccentColor.Orange => "orange",
            AccentColor.Red => "red",
            AccentColor.Cyan => "cyan",
            AccentColor.Indigo => "indigo",
            _ => null
        };

    internal static RatingScale ParseRatingScale(string? s) =>
        s?.ToLowerInvariant() switch
        {
            "ten" => RatingScale.Ten,
            _ => RatingScale.Five
        };

    internal static string RatingScaleToString(RatingScale r) =>
        r switch
        {
            RatingScale.Ten => "ten",
            _ => "five"
        };

    // Migration à la volée, sans écriture en base : tant que l'utilisateur n'a pas encore été
    // sauvegardé avec le nouveau tableau `notificationPreferences`, on le reconstruit depuis les
    // 6 anciens booléens. La bascule réelle a lieu au premier PATCH de préférences (ToDocument()
    // n'écrit plus jamais les anciens champs).
    private static IReadOnlyDictionary<UserNotificationType, bool> BuildNotificationPreferences(UserDocument doc)
    {
        if (doc.NotificationPreferences is { Count: > 0 })
        {
            var fromDoc = doc.NotificationPreferences
                .ToDictionary(e => (UserNotificationType)e.Type, e => e.Enabled);
            foreach (var type in Enum.GetValues<UserNotificationType>())
                fromDoc.TryAdd(type, NotificationPreferenceDefaults.For(type));
            return fromDoc;
        }

        var participantJoined = doc.NotifyOnParticipantJoined ?? true;
        var reminder = doc.NotifyEventReminder ?? true;
        // Ce document n'a jamais été migré : son comportement effectif historique était "true"
        // (ancien code : `doc.NotifyOnMovieAdded ?? true`), qu'il ait explicitement choisi ou non.
        // Le nouveau défaut `false` ne s'applique qu'aux comptes créés après la refonte (via
        // NotificationPreferenceDefaults.All() sur un User tout neuf) — on ne le rejoue pas ici.
        var movieAdded = doc.NotifyOnMovieAdded ?? true;
        var moviePicked = doc.NotifyOnMoviePicked ?? true;
        var eventDeleted = doc.NotifyOnEventDeleted ?? true;
        var newFollower = doc.NotifyOnNewFollower ?? true;

        return new Dictionary<UserNotificationType, bool>
        {
            [UserNotificationType.NewFollower] = newFollower,
            [UserNotificationType.MovieAdded] = movieAdded,
            [UserNotificationType.MoviePicked] = moviePicked,
            [UserNotificationType.ParticipantJoined] = participantJoined,
            [UserNotificationType.EventDeleted] = eventDeleted,
            [UserNotificationType.EventReminder1h] = reminder,
            [UserNotificationType.EventReminder24h] = reminder,
            [UserNotificationType.EventInvitation] = true,
            [UserNotificationType.EventPending] = true,
        };
    }
}
