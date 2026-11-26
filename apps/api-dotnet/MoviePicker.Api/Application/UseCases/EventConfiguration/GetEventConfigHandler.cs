using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;

namespace MoviePicker.Api.Application.UseCases.EventConfiguration;

public sealed class GetEventConfigHandler : IGetEventConfigHandler
{
    private readonly IEventRepository _events;

    public GetEventConfigHandler(IEventRepository events) => _events = events;

    public async Task<EventConfigResponse> HandleAsync(string slug, CancellationToken ct = default)
    {
        var evt = await _events.GetRequiredBySlugAsync(slug, ct);
        return EventConfigResponse.FromEvent(evt);
    }
}
