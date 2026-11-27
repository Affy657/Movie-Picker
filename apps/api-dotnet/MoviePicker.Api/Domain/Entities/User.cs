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
    Teal = 9,
    Lime = 10,
    Gold = 11
}

public static class AccentColors
{
    public static AccentColor Parse(string? name) =>
        name?.Trim().ToLowerInvariant() switch
        {
            "blue" => AccentColor.Blue,
            "green" => AccentColor.Green,
            "purple" => AccentColor.Purple,
            "pink" => AccentColor.Pink,
            "orange" => AccentColor.Orange,
            "teal" => AccentColor.Teal,
            "lime" => AccentColor.Lime,
            "gold" => AccentColor.Gold,
            "red" => AccentColor.Pink,
            "cyan" => AccentColor.Teal,
            "indigo" => AccentColor.Purple,
            _ => AccentColor.Default
        };
}

public enum RatingScale
{
    Five = 0,
    Ten = 1
}

public sealed record LinkedIdentity
{
    public string Provider { get; init; } = string.Empty;
    public string Subject { get; init; } = string.Empty;
    public string Email { get; init; } = string.Empty;
    public DateTimeOffset LinkedAt { get; init; }
}

public sealed record UnlinkedIdentity
{
    public string Provider { get; init; } = string.Empty;
    public string Subject { get; init; } = string.Empty;
    public DateTimeOffset UnlinkedAt { get; init; }
}

public sealed record TwoFactorSettings
{
    public string ProtectedSecret { get; init; } = string.Empty;
    public DateTimeOffset EnabledAt { get; init; }
    public long LastUsedStep { get; init; }
    public IReadOnlyList<string> BackupCodeHashes { get; init; } = Array.Empty<string>();
}

public sealed record User
{
    public string Id { get; init; } = string.Empty;
    public string Email { get; init; } = string.Empty;
    public DateTimeOffset? EmailVerifiedAt { get; init; }
    public string PasswordHash { get; init; } = string.Empty;
    public string DisplayName { get; init; } = string.Empty;
    public IReadOnlyList<LinkedIdentity> Identities { get; init; } = Array.Empty<LinkedIdentity>();
    public IReadOnlyList<UnlinkedIdentity> UnlinkedIdentities { get; init; } = Array.Empty<UnlinkedIdentity>();
    public TwoFactorSettings? TwoFactor { get; init; }
    public string Handle { get; init; } = string.Empty;
    public string? Bio { get; init; }
    public bool IsProfilePublic { get; init; } = true;
    public bool IsWatchlistPublic { get; init; } = true;
    public bool IsWatchedPublic { get; init; } = true;
    public UiThemePreference UiTheme { get; init; } = UiThemePreference.System;
    public AccentColor AccentColor { get; init; } = AccentColor.Default;
    public RatingScale RatingScale { get; init; } = RatingScale.Five;
    public bool DimWatched { get; init; }
    public string AvatarId { get; init; } = string.Empty;
    public AvatarPhoto? AvatarPhoto { get; init; }
    public string DisplayedAvatarId => AvatarPhoto.DisplayedAvatarIdOf(AvatarId, AvatarPhoto);
    public ProfileBanner? Banner { get; init; }
    public BannerPhoto? BannerPhoto { get; init; }
    public IReadOnlyDictionary<UserNotificationType, bool> NotificationPreferences { get; init; }
        = NotificationPreferenceDefaults.All();
    public IReadOnlyList<EventTemplate> EventTemplates { get; init; } = Array.Empty<EventTemplate>();
    public IReadOnlyList<FavoriteTitle> Favorites { get; init; } = Array.Empty<FavoriteTitle>();
    public DateTimeOffset? SupporterSince { get; init; }
    public string? LetterboxdUsername { get; init; }
    public DateTimeOffset? LetterboxdLastSyncAt { get; init; }
    public string? LetterboxdLastSyncError { get; init; }
    public IReadOnlyDictionary<LetterboxdImportTarget, LetterboxdListSync> LetterboxdListSyncs { get; init; }
        = new Dictionary<LetterboxdImportTarget, LetterboxdListSync>();
    public int LetterboxdPendingReconciliationCount { get; init; }
    public IReadOnlyList<string>? LetterboxdPendingChoiceKeys { get; init; }
    public bool LetterboxdSyncWatchlist { get; init; } = true;
    public bool LetterboxdSyncWatched { get; init; } = true;
    public int LetterboxdWatchlistCount { get; init; }
    public int LetterboxdWatchedCount { get; init; }
    public DateTimeOffset CreatedAt { get; init; }
    public DateTimeOffset UpdatedAt { get; init; }
    public long Version { get; init; }
}
