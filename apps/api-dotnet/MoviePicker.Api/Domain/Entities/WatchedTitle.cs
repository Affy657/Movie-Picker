namespace MoviePicker.Api.Domain.Entities;

public enum WatchedSource
{
    Night,
    Elsewhere
}

public enum WatchedOrigin
{
    Manual,
    Letterboxd
}

public sealed record WatchedTitle
{
    public string Id { get; init; } = string.Empty;
    public string OwnerId { get; init; } = string.Empty;
    public int TmdbId { get; init; }
    public MovieMediaType MediaType { get; init; } = MovieMediaType.Movie;
    public string Title { get; init; } = string.Empty;
    public string Year { get; init; } = string.Empty;
    public string? PosterPath { get; init; }
    public double? VoteAverage { get; init; }
    public int? RuntimeMinutes { get; init; }
    public IReadOnlyList<int> GenreIds { get; init; } = [];
    public DateTimeOffset WatchedAt { get; init; }
    public int? Rating { get; init; }
    public WatchedOrigin? RatingOrigin { get; init; }
    public WatchedOrigin Origin { get; init; } = WatchedOrigin.Manual;
    public string? LetterboxdSlug { get; init; }
    public DateTimeOffset CreatedAt { get; init; }
    public DateTimeOffset UpdatedAt { get; init; }

    public bool LetterboxdMayRate => Rating is null || RatingOrigin == WatchedOrigin.Letterboxd;

    public static WatchedTitle Of(
        string ownerId,
        MovieListItem facts,
        WatchedOrigin origin,
        int? rating,
        DateTimeOffset watchedAt,
        DateTimeOffset now) => new()
        {
            OwnerId = ownerId,
            TmdbId = facts.TmdbId,
            MediaType = facts.MediaType,
            Title = facts.Title,
            Year = facts.Year,
            PosterPath = facts.PosterPath,
            VoteAverage = facts.VoteAverage,
            RuntimeMinutes = facts.RuntimeMinutes,
            GenreIds = facts.GenreIds,
            WatchedAt = watchedAt,
            Rating = rating,
            RatingOrigin = rating is null ? null : origin,
            Origin = origin,
            CreatedAt = now,
            UpdatedAt = now
        };
}
