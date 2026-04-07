using MoviePicker.Api.Application.DTOs;

namespace MoviePicker.Api.Application.UseCases.Reactions;

public interface IGetMovieReactionsHandler
{
    Task<MovieReactionsResponse> HandleAsync(string idOrSlug, string movieId, CancellationToken ct = default);
}
