namespace MoviePicker.Api.Domain.Entities;

/// <summary>Préférence de thème UI (persistée compte ou recopiée côté client depuis le local).</summary>
public enum UiThemePreference
{
    System = 0,
    Light = 1,
    Dark = 2
}

public sealed class User
{
    public string Id { get; init; } = string.Empty;
    public string Email { get; init; } = string.Empty;
    public string PasswordHash { get; init; } = string.Empty;
    public string DisplayName { get; init; } = string.Empty;
    public UiThemePreference UiTheme { get; init; } = UiThemePreference.System;
    public DateTimeOffset CreatedAt { get; init; }
    public DateTimeOffset UpdatedAt { get; init; }
}
