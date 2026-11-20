namespace MoviePicker.Api.Domain.Entities;

public enum ProfileBannerSource
{
    Film = 0,
    Photo = 1
}

public sealed record ProfileBanner
{
    public ProfileBannerSource Source { get; init; }
    public int? TmdbId { get; init; }
    public string? Title { get; init; }
    public string? ImagePath { get; init; }
    public DateTimeOffset UpdatedAt { get; init; }

    public static ProfileBanner FromFilm(int tmdbId, string title, string imagePath, DateTimeOffset now) => new()
    {
        Source = ProfileBannerSource.Film,
        TmdbId = tmdbId,
        Title = title,
        ImagePath = imagePath,
        UpdatedAt = now
    };

    public static ProfileBanner FromPhoto(DateTimeOffset now) => new() { Source = ProfileBannerSource.Photo, UpdatedAt = now };
}

public sealed record BannerPhoto
{
    public string Key { get; init; } = string.Empty;
    public DateTimeOffset UpdatedAt { get; init; }

    public static string NewKey() => AvatarPhoto.NewKey();

    public static bool IsValidKey(string key) => AvatarPhoto.IsValidKey(key);
}
