using System.Collections.Concurrent;
using System.Linq;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Infrastructure.Persistence.InMemory;

public sealed class InMemoryEventRepository : IEventRepository
{
    private readonly ConcurrentDictionary<string, Event> _byId = new();
    private readonly ConcurrentDictionary<string, Event> _bySlug = new();

    public Task<Event?> GetByIdOrSlugAsync(string idOrSlug, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(idOrSlug))
            return Task.FromResult<Event?>(null);
        if (_byId.TryGetValue(idOrSlug, out var e))
            return Task.FromResult<Event?>(e);
        if (_bySlug.TryGetValue(idOrSlug, out e))
            return Task.FromResult<Event?>(e);
        return Task.FromResult<Event?>(null);
    }

    public Task<Event> AddAsync(Event evt, CancellationToken ct = default)
    {
        var id = string.IsNullOrEmpty(evt.Id) ? Guid.NewGuid().ToString("N")[..24] : evt.Id;
        var created = new Event
        {
            Id = id,
            Title = evt.Title,
            Date = evt.Date,
            Time = evt.Time,
            HostToken = evt.HostToken,
            Slug = evt.Slug,
            CreatorUserId = evt.CreatorUserId,
            Config = evt.Config,
            ClosedAt = evt.ClosedAt,
            WinnerMovieId = evt.WinnerMovieId,
            CreatedAt = evt.CreatedAt,
            UpdatedAt = evt.UpdatedAt
        };
        _byId[id] = created;
        if (!string.IsNullOrEmpty(created.Slug))
            _bySlug[created.Slug] = created;
        return Task.FromResult(created);
    }

    public Task<Event> UpdateAsync(Event evt, CancellationToken ct = default)
    {
        _byId[evt.Id] = evt;
        if (!string.IsNullOrEmpty(evt.Slug))
            _bySlug[evt.Slug] = evt;
        return Task.FromResult(evt);
    }

    public Task<IReadOnlyList<Event>> ListByCreatorUserIdAsync(string creatorUserId, int limit, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(creatorUserId) || limit <= 0)
            return Task.FromResult<IReadOnlyList<Event>>(Array.Empty<Event>());

        var list = _byId.Values
            .Where(e => e.CreatorUserId == creatorUserId)
            .OrderByDescending(e => e.UpdatedAt)
            .Take(limit)
            .ToList();
        return Task.FromResult<IReadOnlyList<Event>>(list);
    }

    public Task<Event?> FindByCreatorAndTitleAsync(string creatorUserId, string title, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(creatorUserId) || string.IsNullOrEmpty(title))
            return Task.FromResult<Event?>(null);

        var match = _byId.Values.FirstOrDefault(e =>
            e.CreatorUserId == creatorUserId && string.Equals(e.Title, title, StringComparison.Ordinal));
        return Task.FromResult<Event?>(match);
    }

    public Task<IReadOnlyList<Event>> ListByIdsAsync(IReadOnlyCollection<string> eventIds, CancellationToken ct = default)
    {
        if (eventIds.Count == 0)
            return Task.FromResult<IReadOnlyList<Event>>(Array.Empty<Event>());

        var list = new List<Event>();
        foreach (var id in eventIds.Distinct())
        {
            if (string.IsNullOrWhiteSpace(id))
                continue;
            if (_byId.TryGetValue(id, out var e))
                list.Add(e);
        }

        return Task.FromResult<IReadOnlyList<Event>>(list);
    }

    public Task<int> CountByWinnerMovieIdsAsync(IReadOnlyCollection<string> movieIds, CancellationToken ct = default)
    {
        if (movieIds.Count == 0)
            return Task.FromResult(0);

        var set = movieIds.Where(id => !string.IsNullOrWhiteSpace(id)).ToHashSet();
        if (set.Count == 0)
            return Task.FromResult(0);

        var n = _byId.Values.Count(e => e.WinnerMovieId is not null && set.Contains(e.WinnerMovieId));
        return Task.FromResult(n);
    }

    public Task<bool> DeleteAsync(string eventId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(eventId))
            return Task.FromResult(false);

        if (!_byId.TryRemove(eventId, out var removed))
            return Task.FromResult(false);

        if (!string.IsNullOrEmpty(removed.Slug))
            _bySlug.TryRemove(removed.Slug, out _);

        return Task.FromResult(true);
    }

    public Task<IReadOnlyList<Event>> ListOpenEventsAsync(CancellationToken ct = default)
    {
        IReadOnlyList<Event> result = _byId.Values
            .Where(e => !e.ClosedAt.HasValue)
            .ToList();
        return Task.FromResult(result);
    }
}
