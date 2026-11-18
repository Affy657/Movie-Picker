using MoviePicker.Api.Application.DTOs;

namespace MoviePicker.Api.Application.UseCases.EventLive;

public interface ISetPresenceHandler
{
    Task HandleAsync(string userId, string idOrSlug, PresenceRequest request, CancellationToken ct = default);
}
