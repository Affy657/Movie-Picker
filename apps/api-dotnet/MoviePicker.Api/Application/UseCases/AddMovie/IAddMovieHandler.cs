using MoviePicker.Api.Application.DTOs;

namespace MoviePicker.Api.Application.UseCases.AddMovie;

public interface IAddMovieHandler
{
    Task<MovieWithScoreResponse> HandleAsync(string idOrSlug, AddMovieRequest request, CancellationToken ct = default);
}
