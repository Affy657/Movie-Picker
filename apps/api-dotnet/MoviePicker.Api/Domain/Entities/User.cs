namespace MoviePicker.Api.Domain.Entities;

public enum UiThemePreference
{
    System = 0,
    Light = 1,
    Dark = 2
}

public enum AccentColor
{
    Default = 0,
    Blue = 1,
    Green = 2,
    Purple = 3,
    Pink = 4,
    Orange = 5,
    Red = 6,
    Cyan = 7,
    Indigo = 8
}

public sealed record User
{
    public string Id { get; init; } = string.Empty;
    public string Email { get; init; } = string.Empty;
    public string PasswordHash { get; init; } = string.Empty;
    public string DisplayName { get; init; } = string.Empty;
    public UiThemePreference UiTheme { get; init; } = UiThemePreference.System;
    public AccentColor AccentColor { get; init; } = AccentColor.Default;
    public string AvatarId { get; init; } = string.Empty;
    public bool NotifyOnParticipantJoined { get; init; } = true;
    public bool NotifyEventReminder { get; init; } = true;
    public bool NotifyOnMovieAdded { get; init; } = true;
    public bool NotifyOnMoviePicked { get; init; } = true;
    public bool NotifyOnEventDeleted { get; init; } = true;
    public DateTimeOffset CreatedAt { get; init; }
    public DateTimeOffset UpdatedAt { get; init; }
}
