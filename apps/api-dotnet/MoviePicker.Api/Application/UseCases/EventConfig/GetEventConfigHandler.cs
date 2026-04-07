using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.EventConfiguration;

public sealed class GetEventConfigHandler : IGetEventConfigHandler
{
    private readonly IEventRepository _events;

    public GetEventConfigHandler(IEventRepository events) => _events = events;

    public async Task<EventConfigResponse> HandleAsync(string idOrSlug, CancellationToken ct = default)
    {
        var evt = await _events.GetByIdOrSlugAsync(idOrSlug, ct)
            ?? throw new NotFoundException("Soirée introuvable");
        return EventConfigResponse.FromEvent(evt);
    }
}
