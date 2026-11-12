using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.DTOs;

public sealed class MovieDetailsResponse
{
    public int TmdbId { get; init; }
    public MovieMediaType MediaType { get; init; } = MovieMediaType.Movie;
    public string Title { get; init; } = string.Empty;
    public string? Overview { get; init; }
    public string? Tagline { get; init; }
    public string? Director { get; init; }
    public IReadOnlyList<string> Cast { get; init; } = Array.Empty<string>();
    public int? RuntimeMinutes { get; init; }
    public IReadOnlyList<string> Genres { get; init; } = Array.Empty<string>();
    public string? ReleaseDate { get; init; }
    public string? TrailerUrl { get; init; }
    public double? VoteAverage { get; init; }
    public string? PosterPath { get; init; }
    public string? BackdropPath { get; init; }
    public int? SeasonCount { get; init; }
    public int? EpisodeCount { get; init; }
    public IReadOnlyList<WatchProviderOfferResponse> WatchProviders { get; init; } =
        Array.Empty<WatchProviderOfferResponse>();
    public string? TmdbWatchPageUrl { get; init; }
    public string? OriginalTitle { get; init; }
    public string? OriginalLanguage { get; init; }
    public IReadOnlyList<string> ProductionCountries { get; init; } = Array.Empty<string>();
    public long? Budget { get; init; }
    public int? VoteCount { get; init; }
    public string? Certification { get; init; }
    public MovieDetailsCollectionResponse? Collection { get; init; }
    public int? DirectorId { get; init; }
    public IReadOnlyList<MovieCastMemberResponse> CastMembers { get; init; } = Array.Empty<MovieCastMemberResponse>();
    public IReadOnlyList<MovieCrewMemberResponse> Crew { get; init; } = Array.Empty<MovieCrewMemberResponse>();
    public IReadOnlyList<MovieVideoResponse> Videos { get; init; } = Array.Empty<MovieVideoResponse>();
}

public sealed class MovieDetailsCollectionResponse
{
    public int Id { get; init; }
    public string Name { get; init; } = string.Empty;
}

public sealed class MovieCastMemberResponse
{
    public string Name { get; init; } = string.Empty;
    public string? Character { get; init; }
    public string? ProfilePath { get; init; }
}

public sealed class MovieCrewMemberResponse
{
    public string Job { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
}

public sealed class MovieVideoResponse
{
    public string Key { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public string Type { get; init; } = string.Empty;
    public string? Language { get; init; }
}
