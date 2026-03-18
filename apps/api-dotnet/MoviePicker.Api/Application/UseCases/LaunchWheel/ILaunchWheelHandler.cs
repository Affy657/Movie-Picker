using MoviePicker.Api.Application.DTOs;

namespace MoviePicker.Api.Application.UseCases.LaunchWheel;

public interface ILaunchWheelHandler
{
    Task<WheelResponse> HandleAsync(string idOrSlug, CancellationToken ct = default);
}
