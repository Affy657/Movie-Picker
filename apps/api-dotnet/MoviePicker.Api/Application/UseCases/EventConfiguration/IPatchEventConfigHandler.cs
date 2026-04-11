using MoviePicker.Api.Application.DTOs;

namespace MoviePicker.Api.Application.UseCases.EventConfiguration;

public interface IPatchEventConfigHandler
{
    Task<EventConfigResponse> HandleAsync(string idOrSlug, PatchEventConfigRequest request, CancellationToken ct = default);
}
