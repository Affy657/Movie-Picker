using System.Text.Json.Serialization;

namespace MoviePicker.Api.Application.DTOs;

/// <summary>Texte légal / produit commun recherche + cartes films (TMDB indicatif).</summary>
public static class TmdbIndicativeCopy
{
    public const string Disclaimer =
        "Les notes et les offres de visionnage (streaming / VOD) sont indicatives, issues de The Movie Database (TMDB). Les services disponibles peuvent varier.";
}

/// <summary>Réponse <c>GET /api/v1/movies/search</c> (V1 §7 TMDB enrichi).</summary>
public sealed class MovieSearchListResponse
{
    public IReadOnlyList<MovieSearchItemResponse> Items { get; init; } = Array.Empty<MovieSearchItemResponse>();

    /// <summary>Région ISO utilisée pour les fournisseurs VOD/streaming (ex. FR).</summary>
    public string WatchProvidersRegion { get; init; } = "FR";

    /// <summary>Texte indicatif conformité / attribution TMDB pour le front.</summary>
    public string Disclaimer { get; init; } = string.Empty;
    public string TmdbAttributionUrl { get; init; } = "https://www.themoviedb.org/";
}

public sealed class MovieSearchItemResponse
{
    public int Id { get; init; }
    public string Title { get; init; } = string.Empty;
    public string Year { get; init; } = string.Empty;
    public string? PosterPath { get; init; }

    /// <summary>Note moyenne TMDB (0–10), si fournie par la recherche ou le détail.</summary>
    public double? VoteAverage { get; init; }
    public IReadOnlyList<WatchProviderOfferResponse> WatchProviders { get; init; } =
        Array.Empty<WatchProviderOfferResponse>();

    /// <summary>Lien page « où regarder » TMDB pour la région (indicatif).</summary>
    public string? TmdbWatchPageUrl { get; init; }
}

public sealed class WatchProviderOfferResponse
{
    public int ProviderId { get; init; }
    public string Name { get; init; } = string.Empty;

    /// <summary>URL absolue logo (w45 TMDB).</summary>
    public string? LogoPath { get; init; }

    /// <summary><c>flatrate</c>, <c>rent</c> ou <c>buy</c>.</summary>
    public string Type { get; init; } = string.Empty;
}
