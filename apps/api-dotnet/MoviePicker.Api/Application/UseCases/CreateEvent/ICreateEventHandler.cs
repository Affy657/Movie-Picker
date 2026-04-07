using MoviePicker.Api.Application.DTOs;

namespace MoviePicker.Api.Application.UseCases.CreateEvent;

public interface ICreateEventHandler
{
    /// <param name="creatorUserId">Compte connecté (session), ou null si création anonyme MVP.</param>
    Task<CreateEventResponse> HandleAsync(CreateEventRequest request, string? creatorUserId, CancellationToken ct = default);
}
