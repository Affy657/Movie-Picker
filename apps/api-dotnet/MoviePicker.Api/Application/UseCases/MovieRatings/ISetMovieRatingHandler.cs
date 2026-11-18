using MoviePicker.Api.Application.DTOs;

namespace MoviePicker.Api.Application.UseCases.MovieRatings;

public interface ISetMovieRatingHandler
{
    Task<MovieRatingResponse> HandleAsync(
        string userId,
        string idOrSlug,
        string movieId,
        SetMovieRatingRequest request,
        CancellationToken ct = default);
}
