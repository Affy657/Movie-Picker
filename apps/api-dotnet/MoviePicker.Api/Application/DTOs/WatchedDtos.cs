using System.ComponentModel.DataAnnotations;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.DTOs;

public enum WatchedStatus
{
    None,
    Night,
    Elsewhere
}

public sealed class MarkWatchedRequest : TmdbTitleRequest, ITmdbTitleFactsRequest
{
    public double? VoteAverage { get; init; }

    public int? RuntimeMinutes { get; init; }

    [MaxLength(20)]
    public IReadOnlyList<int>? GenreIds { get; init; }

    [Range(MovieRating.MinValue, MovieRating.MaxValue)]
    public int? Rating { get; init; }
}

public sealed class SetWatchedRatingRequest
{
    [Range(MovieRating.MinValue, MovieRating.MaxValue)]
    public int? Value { get; init; }
}

public sealed class WatchedStatusResponse
{
    public WatchedStatus Status { get; init; }
    public DateTimeOffset? WatchedAt { get; init; }
    public int? Rating { get; init; }
    public string? NightSlug { get; init; }
    public string? NightTitle { get; init; }
}
