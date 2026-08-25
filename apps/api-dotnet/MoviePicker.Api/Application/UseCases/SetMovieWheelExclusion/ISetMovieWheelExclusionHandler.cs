using MoviePicker.Api.Application.DTOs;

namespace MoviePicker.Api.Application.UseCases.SetMovieWheelExclusion;

public interface ISetMovieWheelExclusionHandler
{
    Task HandleAsync(string idOrSlug, string movieId, SetMovieWheelExclusionRequest request, CancellationToken ct = default);
}
