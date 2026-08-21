using System.ComponentModel.DataAnnotations;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.DTOs;

public sealed class AddWatchlistItemRequest
{
    [Required]
    [Range(1, int.MaxValue)]
    public int TmdbId { get; init; }

    public MovieMediaType MediaType { get; init; } = MovieMediaType.Movie;

    [Required]
    [MinLength(1)]
    [MaxLength(500)]
    public string Title { get; init; } = string.Empty;

    [MaxLength(10)]
    public string Year { get; init; } = string.Empty;

    public string? PosterPath { get; init; }

    public double? VoteAverage { get; init; }

    public int? RuntimeMinutes { get; init; }

    [MaxLength(200)]
    public string? LetterboxdSlug { get; init; }
}

public sealed class WatchlistItemResponse
{
    public int TmdbId { get; init; }
    public MovieMediaType MediaType { get; init; }
    public string Title { get; init; } = string.Empty;
    public string Year { get; init; } = string.Empty;
    public string? PosterPath { get; init; }
    public double? VoteAverage { get; init; }
    public int? RuntimeMinutes { get; init; }
    public IReadOnlyList<int> GenreIds { get; init; } = [];
    public DateTimeOffset CreatedAt { get; init; }

    public static WatchlistItemResponse FromDomain(WatchlistItem item) => new()
    {
        TmdbId = item.TmdbId,
        MediaType = item.MediaType,
        Title = item.Title,
        Year = item.Year,
        PosterPath = item.PosterPath,
        VoteAverage = item.VoteAverage,
        RuntimeMinutes = item.RuntimeMinutes,
        GenreIds = item.GenreIds,
        CreatedAt = item.CreatedAt
    };
}

public sealed class WatchlistResponse
{
    public IReadOnlyList<WatchlistItemResponse> Items { get; init; } = [];
}
