using System.Text.Json.Serialization;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.DTOs;

public sealed record MovieProposer(string Pseudo, string? Handle)
{
    public static MovieProposer None { get; } = new(string.Empty, null);
}

public sealed record MovieNightActivity(
    MovieVoteSummary Votes,
    int? MyVote,
    int SeenCount,
    IReadOnlyList<string> SeenByPseudos,
    IReadOnlyList<string> VotersUpPseudos,
    IReadOnlyList<MovieRatingResponse> Ratings)
{
    public static MovieNightActivity None { get; } = new(MovieVoteSummary.None, null, 0, [], [], []);
}

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
    public IReadOnlyList<int> GenreIds { get; init; } = Array.Empty<int>();
    public bool ExcludedFromWheel { get; init; }
    public DateTimeOffset CreatedAt { get; init; }
    public DateTimeOffset UpdatedAt { get; init; }
    public string ProposerPseudo { get; init; } = string.Empty;
    public string? ProposerHandle { get; init; }
    public int Score { get; init; }
    public int Up { get; init; }
    public int Down { get; init; }

    public int? MyVote { get; init; }

    public int SeenCount { get; init; }

    public IReadOnlyList<string> SeenByPseudos { get; init; } = Array.Empty<string>();

    public IReadOnlyList<string> VotersUpPseudos { get; init; } = Array.Empty<string>();

    public IReadOnlyList<MovieRatingResponse> Ratings { get; init; } = Array.Empty<MovieRatingResponse>();

    public double? VoteAverage { get; init; }
    public IReadOnlyList<WatchProviderOfferResponse> WatchProviders { get; init; } =
        Array.Empty<WatchProviderOfferResponse>();
    public string? TmdbWatchPageUrl { get; init; }

    public int? RuntimeMinutes { get; init; }
    public string? ReleaseDate { get; init; }

    public static MovieWithScoreResponse From(
        Movie movie,
        IPosterImageStore posters,
        MovieProposer proposer,
        MovieNightActivity activity,
        TmdbMovieEnrichment? enrichment) => new()
        {
            Id = movie.Id,
            EventId = movie.EventId,
            ParticipantId = movie.ParticipantId,
            TmdbId = movie.TmdbId,
            MediaType = movie.MediaType,
            Title = movie.Title,
            Year = movie.Year,
            PosterPath = posters.ToPublicPosterPath(movie.PosterPath),
            PitchNote = movie.PitchNote,
            GenreIds = movie.GenreIds,
            ExcludedFromWheel = movie.ExcludedFromWheel,
            CreatedAt = movie.CreatedAt,
            UpdatedAt = movie.UpdatedAt,
            ProposerPseudo = proposer.Pseudo,
            ProposerHandle = proposer.Handle,
            Score = activity.Votes.Score,
            Up = activity.Votes.Up,
            Down = activity.Votes.Down,
            MyVote = activity.MyVote,
            SeenCount = activity.SeenCount,
            SeenByPseudos = activity.SeenByPseudos,
            VotersUpPseudos = activity.VotersUpPseudos,
            Ratings = activity.Ratings,
            VoteAverage = enrichment?.VoteAverage,
            WatchProviders = enrichment is null ? [] : WatchProviderMapping.ToDto(enrichment.WatchProviders),
            TmdbWatchPageUrl = enrichment?.TmdbWatchPageUrl,
            RuntimeMinutes = enrichment?.RuntimeMinutes,
            ReleaseDate = enrichment?.ReleaseDate
        };
}
