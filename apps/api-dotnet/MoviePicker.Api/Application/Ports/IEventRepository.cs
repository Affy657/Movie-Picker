using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.Ports;

public interface IEventRepository
{
    Task<Event?> GetByIdOrSlugAsync(string idOrSlug, CancellationToken ct = default);
    Task<Event> AddAsync(Event evt, CancellationToken ct = default);
    Task<Event> UpdateAsync(Event evt, CancellationToken ct = default);

    Task<IReadOnlyList<Event>> ListByCreatorUserIdAsync(string creatorUserId, int limit, CancellationToken ct = default);

    Task<IReadOnlyList<Event>> ListByIdsAsync(IReadOnlyCollection<string> eventIds, CancellationToken ct = default);

    Task<int> CountByWinnerMovieIdsAsync(IReadOnlyCollection<string> movieIds, CancellationToken ct = default);

    Task<Event?> FindByCreatorAndTitleAsync(string creatorUserId, string title, CancellationToken ct = default);

    Task<bool> DeleteAsync(string eventId, CancellationToken ct = default);

    Task<IReadOnlyList<Event>> ListOpenEventsAsync(CancellationToken ct = default);
}
