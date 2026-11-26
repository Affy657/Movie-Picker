using MoviePicker.Api.Application.DTOs;

namespace MoviePicker.Api.Application.UseCases.JoinEvent;

public interface IJoinEventHandler
{
    Task<JoinEventResult> HandleAsync(string slug, JoinEventRequest request, string authenticatedUserId, CancellationToken ct = default);
}
