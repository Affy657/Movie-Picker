namespace MoviePicker.Api.Domain.Entities;

public sealed record SavedList
{
    public const int MaxPerOwner = 50;

    public string Id { get; init; } = string.Empty;
    public string OwnerId { get; init; } = string.Empty;
    public ListSourceType SourceType { get; init; }
    public string SourceId { get; init; } = string.Empty;
    public string? SourceOwnerId { get; init; }
    public string Name { get; init; } = string.Empty;
    public DateTimeOffset CreatedAt { get; init; }
    public IReadOnlyList<SavedListTitle> Snapshot { get; init; } = [];

    public ListSource Source => new(SourceType, SourceId);
}

public sealed record SavedListTitle
{
    public int TmdbId { get; init; }
    public MovieMediaType MediaType { get; init; } = MovieMediaType.Movie;
    public string Title { get; init; } = string.Empty;
    public string Year { get; init; } = string.Empty;
    public string? PosterPath { get; init; }
    public double? VoteAverage { get; init; }
    public int? RuntimeMinutes { get; init; }
    public IReadOnlyList<int> GenreIds { get; init; } = [];

    public bool SameFactsAs(SavedListTitle other) =>
        TmdbId == other.TmdbId
        && MediaType == other.MediaType
        && Title == other.Title
        && Year == other.Year
        && PosterPath == other.PosterPath
        && Nullable.Equals(VoteAverage, other.VoteAverage)
        && RuntimeMinutes == other.RuntimeMinutes
        && GenreIds.SequenceEqual(other.GenreIds);
}
