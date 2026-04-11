using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.Ports;

public static class EventRepositoryExtensions
{
    public static async Task<Event> GetRequiredByIdOrSlugAsync(
        this IEventRepository repo,
        string idOrSlug,
        CancellationToken ct = default)
    {
        return await repo.GetByIdOrSlugAsync(idOrSlug, ct)
            ?? throw new NotFoundException("Soirée introuvable");
    }
}
