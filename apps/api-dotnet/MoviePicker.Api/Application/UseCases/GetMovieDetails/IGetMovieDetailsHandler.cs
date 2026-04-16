using MoviePicker.Api.Application.DTOs;

namespace MoviePicker.Api.Application.UseCases.GetMovieDetails;

public interface IGetMovieDetailsHandler
{
    /// <summary>Retourne les détails TMDB d'un film ou <c>null</c> si indisponible (404, clé manquante).</summary>
    Task<MovieDetailsResponse?> HandleAsync(int tmdbId, CancellationToken ct = default);
}
