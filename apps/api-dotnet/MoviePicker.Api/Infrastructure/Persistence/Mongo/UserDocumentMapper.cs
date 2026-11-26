using System.Text.Json;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Infrastructure.Persistence.Mongo;

public static class UserDocumentMapper
{
    public static User ToDomain(UserDocument doc) =>
        new()
        {
            Id = doc.Id,
            Email = doc.Email,
            EmailVerifiedAt = doc.EmailVerifiedAt is { } verifiedAt ? new DateTimeOffset(verifiedAt, TimeSpan.Zero) : null,
            PasswordHash = doc.PasswordHash,
            DisplayName = doc.DisplayName,
            Identities = (doc.Identities ?? []).ConvertAll(ToIdentityDomain),
            UnlinkedIdentities = (doc.UnlinkedIdentities ?? []).ConvertAll(ToUnlinkedIdentityDomain),
            Handle = doc.Handle ?? string.Empty,
            Bio = doc.Bio,
            IsProfilePublic = doc.IsProfilePublic ?? true,
            IsWatchlistPublic = doc.IsWatchlistPublic ?? true,
            IsWatchedPublic = doc.IsWatchedPublic ?? true,
            UiTheme = ParseTheme(doc.UiTheme),
            AccentColor = ParseAccent(doc.AccentColor),
            RatingScale = ParseRatingScale(doc.RatingScale),
            DimWatched = doc.DimWatched,
            AvatarId = doc.AvatarId ?? string.Empty,
            AvatarPhoto = ToAvatarPhotoDomain(doc.AvatarPhoto),
            Banner = ToBannerDomain(doc.Banner),
            BannerPhoto = doc.BannerPhoto is null
                ? null
                : new BannerPhoto { Key = doc.BannerPhoto.Key, UpdatedAt = new DateTimeOffset(doc.BannerPhoto.UpdatedAt, TimeSpan.Zero) },
            NotificationPreferences = BuildNotificationPreferences(doc),
            EventTemplates = (doc.EventTemplates ?? []).ConvertAll(ToTemplateDomain),
            Favorites = (doc.Favorites ?? []).ConvertAll(ToFavoriteDomain),
            SupporterSince = doc.SupporterSince is null
                ? null
                : new DateTimeOffset(doc.SupporterSince.Value, TimeSpan.Zero),
            LetterboxdUsername = doc.LetterboxdUsername,
            LetterboxdLastSyncAt = doc.LetterboxdLastSyncAt is null
                ? null
                : new DateTimeOffset(doc.LetterboxdLastSyncAt.Value, TimeSpan.Zero),
            LetterboxdLastSyncError = doc.LetterboxdLastSyncError,
            LetterboxdListSyncs = ToListSyncsDomain(doc.LetterboxdListSyncs),
            LetterboxdPendingReconciliationCount = doc.LetterboxdPendingReconciliationCount,
            LetterboxdPendingChoiceKeys = doc.LetterboxdPendingChoiceKeys,
            LetterboxdSyncWatchlist = doc.LetterboxdSyncWatchlist ?? true,
            LetterboxdSyncWatched = doc.LetterboxdSyncWatched ?? false,
            LetterboxdWatchlistCount = doc.LetterboxdWatchlistCount,
            LetterboxdWatchedCount = doc.LetterboxdWatchedCount,
            CreatedAt = new DateTimeOffset(doc.CreatedAt, TimeSpan.Zero),
            UpdatedAt = new DateTimeOffset(doc.UpdatedAt, TimeSpan.Zero),
            Version = doc.Version
        };

    public static UserDocument ToDocument(User user) =>
        new()
        {
            Id = user.Id,
            Email = user.Email,
            EmailVerifiedAt = user.EmailVerifiedAt?.UtcDateTime,
            PasswordHash = user.PasswordHash,
            DisplayName = user.DisplayName,
            Identities = user.Identities.Count == 0 ? null : user.Identities.Select(ToIdentityDocument).ToList(),
            UnlinkedIdentities = user.UnlinkedIdentities.Count == 0
                ? null
                : user.UnlinkedIdentities.Select(ToUnlinkedIdentityDocument).ToList(),
            Handle = string.IsNullOrEmpty(user.Handle) ? null : user.Handle,
            Bio = string.IsNullOrEmpty(user.Bio) ? null : user.Bio,
            IsProfilePublic = user.IsProfilePublic,
            IsWatchlistPublic = user.IsWatchlistPublic,
            IsWatchedPublic = user.IsWatchedPublic,
            UiTheme = ThemeToString(user.UiTheme),
            AccentColor = AccentToString(user.AccentColor),
            RatingScale = RatingScaleToString(user.RatingScale),
            DimWatched = user.DimWatched,
            AvatarId = string.IsNullOrEmpty(user.AvatarId) ? null : user.AvatarId,
            AvatarPhoto = user.AvatarPhoto is null ? null : ToAvatarPhotoDocument(user.AvatarPhoto),
            Banner = user.Banner is null ? null : ToBannerDocument(user.Banner),
            BannerPhoto = user.BannerPhoto is null
                ? null
                : new BannerPhotoDocument { Key = user.BannerPhoto.Key, UpdatedAt = user.BannerPhoto.UpdatedAt.UtcDateTime },
            NotificationPreferences = user.NotificationPreferences
                .Select(kv => new NotificationPreferenceEntryDocument { Type = (int)kv.Key, Enabled = kv.Value })
                .ToList(),
            EventTemplates = user.EventTemplates.Count == 0
                ? null
                : user.EventTemplates.Select(ToTemplateDocument).ToList(),
            Favorites = user.Favorites.Count == 0
                ? null
                : user.Favorites.Select(ToFavoriteDocument).ToList(),
            SupporterSince = user.SupporterSince?.UtcDateTime,
            LetterboxdUsername = string.IsNullOrEmpty(user.LetterboxdUsername) ? null : user.LetterboxdUsername,
            LetterboxdLastSyncAt = user.LetterboxdLastSyncAt?.UtcDateTime,
            LetterboxdLastSyncError = user.LetterboxdLastSyncError,
            LetterboxdListSyncs = ToListSyncsDocument(user.LetterboxdListSyncs),
            LetterboxdPendingReconciliationCount = user.LetterboxdPendingReconciliationCount,
            LetterboxdPendingChoiceKeys = user.LetterboxdPendingChoiceKeys?.ToList(),
            LetterboxdSyncWatchlist = user.LetterboxdSyncWatchlist,
            LetterboxdSyncWatched = user.LetterboxdSyncWatched,
            LetterboxdWatchlistCount = user.LetterboxdWatchlistCount,
            LetterboxdWatchedCount = user.LetterboxdWatchedCount,
            CreatedAt = user.CreatedAt.UtcDateTime,
            UpdatedAt = user.UpdatedAt.UtcDateTime,
            Version = user.Version
        };

    internal static string ListSyncKey(LetterboxdImportTarget list) =>
        JsonNamingPolicy.CamelCase.ConvertName(list.ToString());

    internal static LetterboxdListSyncDocument ToListSyncDocument(LetterboxdListSync sync) =>
        new() { At = sync.At.UtcDateTime, Error = sync.Error };

    private static Dictionary<LetterboxdImportTarget, LetterboxdListSync> ToListSyncsDomain(
        Dictionary<string, LetterboxdListSyncDocument>? docs)
    {
        var syncs = new Dictionary<LetterboxdImportTarget, LetterboxdListSync>();
        foreach (var (key, doc) in docs ?? [])
        {
            if (Enum.TryParse<LetterboxdImportTarget>(key, ignoreCase: true, out var list))
                syncs[list] = new LetterboxdListSync(new DateTimeOffset(doc.At, TimeSpan.Zero), doc.Error);
        }

        return syncs;
    }

    private static Dictionary<string, LetterboxdListSyncDocument>? ToListSyncsDocument(
        IReadOnlyDictionary<LetterboxdImportTarget, LetterboxdListSync> syncs) =>
        syncs.Count == 0
            ? null
            : syncs.ToDictionary(entry => ListSyncKey(entry.Key), entry => ToListSyncDocument(entry.Value));

    private static EventTemplate ToTemplateDomain(EventTemplateDocument doc) => new()
    {
        Id = doc.Id,
        Name = doc.Name,
        Config = EventDocumentMapper.ToConfigDomain(doc.Config),
        CreatedAt = new DateTimeOffset(doc.CreatedAt, TimeSpan.Zero)
    };

    internal static EventTemplateDocument ToTemplateDocument(EventTemplate template) => new()
    {
        Id = template.Id,
        Name = template.Name,
        Config = EventDocumentMapper.ToConfigDocument(template.Config),
        CreatedAt = template.CreatedAt.UtcDateTime
    };

    internal static AvatarPhoto? ToAvatarPhotoDomain(AvatarPhotoDocument? doc) => doc is null
        ? null
        : new AvatarPhoto
        {
            Key = doc.Key,
            IsActive = doc.IsActive,
            UpdatedAt = new DateTimeOffset(doc.UpdatedAt, TimeSpan.Zero)
        };

    private const string FilmBannerSource = "film";
    private const string PhotoBannerSource = "photo";

    private static ProfileBanner? ToBannerDomain(ProfileBannerDocument? doc) => doc?.Source switch
    {
        FilmBannerSource when doc.TmdbId is { } tmdbId && doc.ImagePath is { } path =>
            ProfileBanner.FromFilm(tmdbId, doc.Title ?? string.Empty, path, new DateTimeOffset(doc.UpdatedAt, TimeSpan.Zero)),
        PhotoBannerSource => ProfileBanner.FromPhoto(new DateTimeOffset(doc.UpdatedAt, TimeSpan.Zero)),
        _ => null
    };

    private static ProfileBannerDocument ToBannerDocument(ProfileBanner banner) => new()
    {
        Source = banner.Source == ProfileBannerSource.Photo ? PhotoBannerSource : FilmBannerSource,
        TmdbId = banner.TmdbId,
        Title = banner.Title,
        ImagePath = banner.ImagePath,
        UpdatedAt = banner.UpdatedAt.UtcDateTime
    };

    private static AvatarPhotoDocument ToAvatarPhotoDocument(AvatarPhoto photo) => new()
    {
        Key = photo.Key,
        IsActive = photo.IsActive,
        UpdatedAt = photo.UpdatedAt.UtcDateTime
    };

    private static FavoriteTitle ToFavoriteDomain(FavoriteTitleDocument doc) => new()
    {
        TmdbId = doc.TmdbId,
        MediaType = MovieMapper.ParseMediaType(doc.MediaType),
        Title = doc.Title,
        Year = doc.Year,
        PosterPath = doc.PosterPath
    };

    internal static FavoriteTitleDocument ToFavoriteDocument(FavoriteTitle favorite) => new()
    {
        TmdbId = favorite.TmdbId,
        MediaType = MovieMapper.MediaTypeToString(favorite.MediaType),
        Title = favorite.Title,
        Year = favorite.Year,
        PosterPath = favorite.PosterPath
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

    private static UnlinkedIdentity ToUnlinkedIdentityDomain(UnlinkedIdentityDocument doc) => new()
    {
        Provider = doc.Provider,
        Subject = doc.Subject,
        UnlinkedAt = new DateTimeOffset(doc.UnlinkedAt, TimeSpan.Zero)
    };

    private static UnlinkedIdentityDocument ToUnlinkedIdentityDocument(UnlinkedIdentity identity) => new()
    {
        Provider = identity.Provider,
        Subject = identity.Subject,
        UnlinkedAt = identity.UnlinkedAt.UtcDateTime
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

    internal static AccentColor ParseAccent(string? s) => AccentColors.Parse(s);

    internal static string? AccentToString(AccentColor c) =>
        c switch
        {
            AccentColor.Blue => "blue",
            AccentColor.Green => "green",
            AccentColor.Purple => "purple",
            AccentColor.Pink => "pink",
            AccentColor.Orange => "orange",
            AccentColor.Teal => "teal",
            AccentColor.Lime => "lime",
            AccentColor.Gold => "gold",
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

    private static Dictionary<UserNotificationType, bool> BuildNotificationPreferences(UserDocument doc)
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
            [UserNotificationType.MoviePickedManually] = true,
            [UserNotificationType.LetterboxdReconciliationPending] = true,
        };
    }
}
