using System.Text.Json.Serialization;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.DTOs;

public static class TmdbIndicativeCopy
{
    public const string Disclaimer =
        "Les notes et les offres de visionnage (streaming / VOD) sont indicatives, issues de The Movie Database (TMDB). Les services disponibles peuvent varier.";
}

public sealed class MovieSearchListResponse
{
    public IReadOnlyList<MovieSearchItemResponse> Items { get; init; } = Array.Empty<MovieSearchItemResponse>();

    public string WatchProvidersRegion { get; init; } = "FR";

    public string Disclaimer { get; init; } = string.Empty;
    public string TmdbAttributionUrl { get; init; } = "https://www.themoviedb.org/";
}

public sealed class MovieSearchItemResponse
{
    public int Id { get; init; }
    public MovieMediaType MediaType { get; init; } = MovieMediaType.Movie;
    public string Title { get; init; } = string.Empty;
    public string Year { get; init; } = string.Empty;
    public string? PosterPath { get; init; }

    public double? VoteAverage { get; init; }

    public int? RuntimeMinutes { get; init; }

    public IReadOnlyList<WatchProviderOfferResponse> WatchProviders { get; init; } =
        Array.Empty<WatchProviderOfferResponse>();

    public string? TmdbWatchPageUrl { get; init; }
}

public sealed class WatchProviderOfferResponse
{
    public int ProviderId { get; init; }
    public string Name { get; init; } = string.Empty;

    public string? LogoPath { get; init; }

    public string Type { get; init; } = string.Empty;
}
