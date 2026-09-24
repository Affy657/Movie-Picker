using System.ComponentModel.DataAnnotations;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.DTOs;

public sealed class AddFavoriteRequest
{
    [Required]
    [Range(1, int.MaxValue)]
    public int TmdbId { get; init; }

    [EnumDataType(typeof(MovieMediaType))]
    public MovieMediaType MediaType { get; init; } = MovieMediaType.Movie;

    [Required]
    [MaxLength(500)]
    public string Title { get; init; } = string.Empty;

    [MaxLength(10)]
    public string Year { get; init; } = string.Empty;

    [MaxLength(500)]
    public string? PosterPath { get; init; }
}

public sealed class FavoriteTitleResponse
{
    public int TmdbId { get; init; }
    public MovieMediaType MediaType { get; init; }
    public string Title { get; init; } = string.Empty;
    public string Year { get; init; } = string.Empty;
    public string? PosterPath { get; init; }

    public static FavoriteTitleResponse FromDomain(FavoriteTitle favorite) => new()
    {
        TmdbId = favorite.TmdbId,
        MediaType = favorite.MediaType,
        Title = favorite.Title,
        Year = favorite.Year,
        PosterPath = favorite.PosterPath
    };

    public static IReadOnlyList<FavoriteTitleResponse> ListFrom(IEnumerable<FavoriteTitle> favorites) =>
        favorites.Select(FromDomain).ToList();
}

public sealed class FavoriteListResponse
{
    public IReadOnlyList<FavoriteTitleResponse> Items { get; init; } = [];

    public static FavoriteListResponse From(IEnumerable<FavoriteTitle> favorites) =>
        new() { Items = FavoriteTitleResponse.ListFrom(favorites) };
}
