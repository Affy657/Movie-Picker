using System.Text.Json.Serialization;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.DTOs;

public sealed class MovieWithScoreResponse
{
    [JsonPropertyName("_id")]
    public string Id { get; init; } = string.Empty;
    public string EventId { get; init; } = string.Empty;
    public string ParticipantId { get; init; } = string.Empty;
    public int TmdbId { get; init; }
    public MovieMediaType MediaType { get; init; } = MovieMediaType.Movie;
    public string Title { get; init; } = string.Empty;
    public string Year { get; init; } = string.Empty;
    public string? PosterPath { get; init; }
    public string? PitchNote { get; init; }
    public bool ExcludedFromWheel { get; init; }
    public DateTimeOffset CreatedAt { get; init; }
    public DateTimeOffset UpdatedAt { get; init; }
    public string ProposerPseudo { get; init; } = string.Empty;
    public int Score { get; init; }
    public int Up { get; init; }
    public int Down { get; init; }

    public int? MyVote { get; init; }

    public int SeenCount { get; init; }

    public IReadOnlyList<string> SeenByPseudos { get; init; } = Array.Empty<string>();

    public double? VoteAverage { get; init; }
    public IReadOnlyList<WatchProviderOfferResponse> WatchProviders { get; init; } =
        Array.Empty<WatchProviderOfferResponse>();
    public string? TmdbWatchPageUrl { get; init; }

    public int? RuntimeMinutes { get; init; }
}
