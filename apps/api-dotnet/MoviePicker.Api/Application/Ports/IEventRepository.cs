using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.Ports;

public interface IEventRepository
{
    Task<Event?> GetByIdOrSlugAsync(string idOrSlug, CancellationToken ct = default);
    Task<Event> AddAsync(Event evt, CancellationToken ct = default);
    Task<Event> UpdateAsync(Event evt, CancellationToken ct = default);

    /// <summary>Soirées dont l’utilisateur est le créateur (tri par date de mise à jour décroissante).</summary>
    Task<IReadOnlyList<Event>> ListByCreatorUserIdAsync(string creatorUserId, int limit, CancellationToken ct = default);

    Task<IReadOnlyList<Event>> ListByIdsAsync(IReadOnlyCollection<string> eventIds, CancellationToken ct = default);
}
