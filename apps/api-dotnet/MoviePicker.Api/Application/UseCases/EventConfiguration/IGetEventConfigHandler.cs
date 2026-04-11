using MoviePicker.Api.Application.DTOs;

namespace MoviePicker.Api.Application.UseCases.EventConfiguration;

public interface IGetEventConfigHandler
{
    Task<EventConfigResponse> HandleAsync(string idOrSlug, CancellationToken ct = default);
}
