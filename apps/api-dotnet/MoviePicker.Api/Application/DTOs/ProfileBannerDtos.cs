using System.ComponentModel.DataAnnotations;
using MoviePicker.Api.Application.Banners;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.DTOs;

public sealed class ProfileBannerResponse
{
    public const string FilmSource = "film";
    public const string PhotoSource = "photo";

    private const string TmdbImageBase = "https://image.tmdb.org/t/p/w1280";
    private const string BannerPhotoBase = "/api/v1/banners/";

    public string Source { get; init; } = string.Empty;
    public string ImageUrl { get; init; } = string.Empty;
    public int? TmdbId { get; init; }
    public string? Title { get; init; }

    public static ProfileBannerResponse? From(User user) => user.Banner switch
    {
        { Source: ProfileBannerSource.Film, TmdbId: { } tmdbId, ImagePath: { } path } banner => new()
        {
            Source = FilmSource,
            ImageUrl = TmdbImageBase + path,
            TmdbId = tmdbId,
            Title = banner.Title
        },
        { Source: ProfileBannerSource.Photo } when PhotoUrlOf(user) is { } url => new() { Source = PhotoSource, ImageUrl = url },
        _ => null
    };

    public static string? PhotoUrlOf(User user) => user.BannerPhoto is { } photo ? BannerPhotoBase + photo.Key : null;
}

public sealed class SetProfileBannerRequest
{
    public const string FilmSource = ProfileBannerResponse.FilmSource;
    public const string PhotoSource = ProfileBannerResponse.PhotoSource;

    [Required(ErrorMessage = "source is required")]
    [RegularExpression("^(film|photo)$", ErrorMessage = "source must be film or photo")]
    public string Source { get; init; } = string.Empty;

    [Range(1, int.MaxValue, ErrorMessage = "tmdbId must be positive")]
    public int? TmdbId { get; init; }

    [MaxLength(64, ErrorMessage = "imagePath is too long")]
    [RegularExpression(@"^/[A-Za-z0-9_-]+\.(jpg|jpeg|png|webp)$", ErrorMessage = "imagePath is invalid")]
    public string? ImagePath { get; init; }
}

public sealed class UploadBannerPhotoRequest
{
    [Required(ErrorMessage = "contentType is required")]
    [RegularExpression("^image/(jpeg|png|webp)$", ErrorMessage = "contentType must be image/jpeg, image/png or image/webp")]
    public string ContentType { get; init; } = string.Empty;

    [Required(ErrorMessage = "base64Content is required")]
    [MaxLength(BannerPhotoImage.MaxBase64Length, ErrorMessage = "base64Content is too long")]
    public string Base64Content { get; init; } = string.Empty;
}

public sealed class MovieBackdropResponse
{
    public string Path { get; init; } = string.Empty;
    public string ThumbnailUrl { get; init; } = string.Empty;
    public int Width { get; init; }
    public int Height { get; init; }
}

public sealed class MovieBackdropsResponse
{
    public int TmdbId { get; init; }
    public IReadOnlyList<MovieBackdropResponse> Backdrops { get; init; } = [];
}
