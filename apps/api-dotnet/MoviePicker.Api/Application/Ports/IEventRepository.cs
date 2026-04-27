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

    /// <summary>
    /// Première soirée dont le créateur correspond exactement à <paramref name="creatorUserId"/> et
    /// dont le titre correspond exactement à <paramref name="title"/>. Sert principalement aux scénarios
    /// d’idempotence côté seed (Development) afin de ne pas dépendre d’une limite de pagination.
    /// </summary>
    Task<Event?> FindByCreatorAndTitleAsync(string creatorUserId, string title, CancellationToken ct = default);

    /// <summary>
    /// Supprime définitivement une soirée par son identifiant. Retourne <c>true</c> si une ligne
    /// a effectivement été supprimée. La cascade (participants, films, votes, vus) est de la
    /// responsabilité de l'appelant (cf. <c>DeleteEventHandler</c>).
    /// </summary>
    Task<bool> DeleteAsync(string eventId, CancellationToken ct = default);
}
