using MoviePicker.Api.Application.DTOs;

namespace MoviePicker.Api.Application.UseCases.JoinEvent;

public interface IJoinEventHandler
{
    /// <param name="authenticatedUserId">Compte connecté, ou null si invité pseudo seul.</param>
    Task<JoinEventResult> HandleAsync(string idOrSlug, JoinEventRequest request, string? authenticatedUserId, CancellationToken ct = default);
}
