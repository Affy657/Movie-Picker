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
            UiTheme = ParseTheme(doc.UiTheme),
            AccentColor = ParseAccent(doc.AccentColor),
            AvatarId = doc.AvatarId ?? string.Empty,
            NotifyOnParticipantJoined = doc.NotifyOnParticipantJoined ?? true,
            NotifyEventReminder = doc.NotifyEventReminder ?? true,
            NotifyOnMovieAdded = doc.NotifyOnMovieAdded ?? true,
            NotifyOnMoviePicked = doc.NotifyOnMoviePicked ?? true,
            NotifyOnEventDeleted = doc.NotifyOnEventDeleted ?? true,
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
            UiTheme = ThemeToString(user.UiTheme),
            AccentColor = AccentToString(user.AccentColor),
            AvatarId = string.IsNullOrEmpty(user.AvatarId) ? null : user.AvatarId,
            NotifyOnParticipantJoined = user.NotifyOnParticipantJoined,
            NotifyEventReminder = user.NotifyEventReminder,
            NotifyOnMovieAdded = user.NotifyOnMovieAdded,
            NotifyOnMoviePicked = user.NotifyOnMoviePicked,
            NotifyOnEventDeleted = user.NotifyOnEventDeleted,
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
            _ => null
        };
}
