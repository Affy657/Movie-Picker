using MoviePicker.Api.Application.DTOs;

namespace MoviePicker.Api.Application.UseCases.CreateEvent;

public interface ICreateEventHandler
{
    Task<CreateEventResponse> HandleAsync(CreateEventRequest request, CancellationToken ct = default);
}
