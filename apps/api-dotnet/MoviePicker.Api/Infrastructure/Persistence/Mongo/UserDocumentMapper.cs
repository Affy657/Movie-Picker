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
            Identities = (doc.Identities ?? []).ConvertAll(ToIdentityDomain),
            Handle = doc.Handle ?? string.Empty,
            Bio = doc.Bio,
            IsProfilePublic = doc.IsProfilePublic ?? true,
            UiTheme = ParseTheme(doc.UiTheme),
            AccentColor = ParseAccent(doc.AccentColor),
            RatingScale = ParseRatingScale(doc.RatingScale),
            AvatarId = doc.AvatarId ?? string.Empty,
            NotifyOnParticipantJoined = doc.NotifyOnParticipantJoined ?? true,
            NotifyEventReminder = doc.NotifyEventReminder ?? true,
            NotifyOnMovieAdded = doc.NotifyOnMovieAdded ?? true,
            NotifyOnMoviePicked = doc.NotifyOnMoviePicked ?? true,
            NotifyOnEventDeleted = doc.NotifyOnEventDeleted ?? true,
            NotifyOnNewFollower = doc.NotifyOnNewFollower ?? true,
            SupporterSince = doc.SupporterSince is null
                ? null
                : new DateTimeOffset(doc.SupporterSince.Value, TimeSpan.Zero),
            LetterboxdUsername = doc.LetterboxdUsername,
            LetterboxdLastSyncAt = doc.LetterboxdLastSyncAt is null
                ? null
                : new DateTimeOffset(doc.LetterboxdLastSyncAt.Value, TimeSpan.Zero),
            LetterboxdLastSyncError = doc.LetterboxdLastSyncError,
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
            Identities = user.Identities.Count == 0 ? null : user.Identities.Select(ToIdentityDocument).ToList(),
            Handle = string.IsNullOrEmpty(user.Handle) ? null : user.Handle,
            Bio = string.IsNullOrEmpty(user.Bio) ? null : user.Bio,
            IsProfilePublic = user.IsProfilePublic,
            UiTheme = ThemeToString(user.UiTheme),
            AccentColor = AccentToString(user.AccentColor),
            RatingScale = RatingScaleToString(user.RatingScale),
            AvatarId = string.IsNullOrEmpty(user.AvatarId) ? null : user.AvatarId,
            NotifyOnParticipantJoined = user.NotifyOnParticipantJoined,
            NotifyEventReminder = user.NotifyEventReminder,
            NotifyOnMovieAdded = user.NotifyOnMovieAdded,
            NotifyOnMoviePicked = user.NotifyOnMoviePicked,
            NotifyOnEventDeleted = user.NotifyOnEventDeleted,
            NotifyOnNewFollower = user.NotifyOnNewFollower,
            SupporterSince = user.SupporterSince?.UtcDateTime,
            LetterboxdUsername = string.IsNullOrEmpty(user.LetterboxdUsername) ? null : user.LetterboxdUsername,
            LetterboxdLastSyncAt = user.LetterboxdLastSyncAt?.UtcDateTime,
            LetterboxdLastSyncError = user.LetterboxdLastSyncError,
            CreatedAt = user.CreatedAt.UtcDateTime,
            UpdatedAt = user.UpdatedAt.UtcDateTime
        };

    private static LinkedIdentity ToIdentityDomain(UserIdentityDocument doc) => new()
    {
        Provider = doc.Provider,
        Subject = doc.Subject,
        Email = doc.Email,
        LinkedAt = new DateTimeOffset(doc.LinkedAt, TimeSpan.Zero)
    };

    private static UserIdentityDocument ToIdentityDocument(LinkedIdentity identity) => new()
    {
        Provider = identity.Provider,
        Subject = identity.Subject,
        Email = identity.Email,
        LinkedAt = identity.LinkedAt.UtcDateTime
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
}
