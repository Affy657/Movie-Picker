using MoviePicker.Api.Application.DTOs;

namespace MoviePicker.Api.Application.UseCases.ListMyEvents;

public interface IListMyEventsHandler
{
    Task<MyEventsListResponse> HandleAsync(
        string userId, string? scope, int? limit, int? offset, string? q, bool previews = true, CancellationToken ct = default);
}
