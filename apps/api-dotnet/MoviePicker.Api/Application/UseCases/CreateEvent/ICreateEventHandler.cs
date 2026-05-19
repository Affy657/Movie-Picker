using MoviePicker.Api.Application.DTOs;

namespace MoviePicker.Api.Application.UseCases.CreateEvent;

public interface ICreateEventHandler
{
    Task<CreateEventResponse> HandleAsync(CreateEventRequest request, string? creatorUserId, CancellationToken ct = default);
}
