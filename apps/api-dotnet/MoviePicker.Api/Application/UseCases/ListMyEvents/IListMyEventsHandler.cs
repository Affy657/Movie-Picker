using MoviePicker.Api.Application.DTOs;

namespace MoviePicker.Api.Application.UseCases.ListMyEvents;

public interface IListMyEventsHandler
{
    Task<MyEventsListResponse> HandleAsync(string userId, int? limit, int? offset, CancellationToken ct = default);
}
