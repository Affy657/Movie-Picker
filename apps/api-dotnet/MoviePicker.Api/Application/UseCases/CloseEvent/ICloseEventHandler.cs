using MoviePicker.Api.Application.DTOs;

namespace MoviePicker.Api.Application.UseCases.CloseEvent;

public interface ICloseEventHandler
{
    Task<CloseEventResponse> HandleAsync(string idOrSlug, CancellationToken ct = default);
}
