using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.Ports;

public static class EventRepositoryExtensions
{
    public static async Task<Event> GetRequiredBySlugAsync(
        this IEventRepository repo,
        string slug,
        CancellationToken ct = default)
    {
        return await repo.GetBySlugAsync(slug, ct)
            ?? throw Errors.EventNotFound();
    }
}
