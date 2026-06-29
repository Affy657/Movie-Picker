using MoviePicker.Api.Application.DTOs;

namespace MoviePicker.Api.Application.UseCases.ResetWheel;

public interface IResetWheelHandler
{
    Task<ResetWheelResponse> HandleAsync(string idOrSlug, CancellationToken ct = default);
}
