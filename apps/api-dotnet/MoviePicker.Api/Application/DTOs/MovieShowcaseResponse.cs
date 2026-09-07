using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.DTOs;

public sealed class MovieShowcaseListResponse
{
    public string Section { get; init; } = string.Empty;

    public string? Theme { get; init; }

    public IReadOnlyList<MovieShowcaseItemResponse> Items { get; init; } =
        Array.Empty<MovieShowcaseItemResponse>();

    public string Disclaimer { get; init; } = string.Empty;
    public string TmdbAttributionUrl { get; init; } = "https://www.themoviedb.org/";
}

public sealed class MovieShowcaseItemResponse
{
    public int Id { get; init; }
    public MovieMediaType MediaType { get; init; } = MovieMediaType.Movie;
    public string Title { get; init; } = string.Empty;
    public string Year { get; init; } = string.Empty;
    public string? PosterPath { get; init; }

    public double? VoteAverage { get; init; }

    public int? RuntimeMinutes { get; init; }

    public IReadOnlyList<int> GenreIds { get; init; } = Array.Empty<int>();

    public int? Rank { get; init; }

    public int? EventCount { get; init; }
}

public sealed class MovieCollectionListResponse
{
    public IReadOnlyList<MovieCollectionResponse> Items { get; init; } =
        Array.Empty<MovieCollectionResponse>();

    public string Disclaimer { get; init; } = string.Empty;
    public string TmdbAttributionUrl { get; init; } = "https://www.themoviedb.org/";
}

public sealed class MovieCollectionResponse
{
    public int Id { get; init; }
    public string Name { get; init; } = string.Empty;

    public string? Overview { get; init; }

    public string? PosterPath { get; init; }
    public int MovieCount { get; init; }
}
