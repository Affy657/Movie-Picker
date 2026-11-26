using MoviePicker.Api.Application.DTOs;

namespace MoviePicker.Api.Application.UseCases.SetMovieWheelExclusion;

public interface ISetMovieWheelExclusionHandler
{
    Task HandleAsync(
        string userId,
        string slug,
        string movieId,
        SetMovieWheelExclusionRequest request,
        CancellationToken ct = default);
}
