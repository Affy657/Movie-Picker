using System.Collections.Concurrent;
using System.Linq;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Infrastructure.Persistence.InMemory;

public sealed class InMemoryEventRepository : IEventRepository
{
    private readonly ConcurrentDictionary<string, Event> _byId = new();
    private readonly ConcurrentDictionary<string, string> _idBySlug = new();

    public Task<Event?> GetByIdOrSlugAsync(string slug, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(slug))
            return Task.FromResult<Event?>(null);
        return Task.FromResult(
            _idBySlug.TryGetValue(slug, out var id) && _byId.TryGetValue(id, out var e) && e.Slug == slug ? e : null);
    }

    public Task<Event> AddAsync(Event evt, CancellationToken ct = default)
    {
        if (evt.CreationRequestId is { } requestId
            && _byId.Values.Any(e => e.CreatorUserId == evt.CreatorUserId && e.CreationRequestId == requestId))
            throw new EventCreationReplayedException();

        var id = string.IsNullOrEmpty(evt.Id) ? Guid.NewGuid().ToString("N")[..24] : evt.Id;
        var created = evt with { Id = id };
        _byId[id] = created;
        if (!string.IsNullOrEmpty(created.Slug))
            _idBySlug[created.Slug] = id;
        return Task.FromResult(created);
    }

    public Task<Event?> FindByCreationRequestAsync(
        string creatorUserId,
        string creationRequestId,
        CancellationToken ct = default) =>
        Task.FromResult(_byId.Values.FirstOrDefault(e =>
            e.CreatorUserId == creatorUserId && e.CreationRequestId == creationRequestId));

    public Task<bool> MarkWatchlistCleanedAsync(string eventId, DateTimeOffset cleanedAt, CancellationToken ct = default)
    {
        var stamped = _byId.SwapIfPresent(eventId, evt => evt.WatchlistCleanedAt is not null
            ? null
            : evt with
            {
                WatchlistCleanedAt = cleanedAt,
                UpdatedAt = cleanedAt,
                Version = evt.Version + 1,
                WriteSeq = evt.WriteSeq + 1
            });
        return Task.FromResult(stamped is not null);
    }

    public Task<Event> UpdateAsync(Event evt, CancellationToken ct = default)
    {
        var saved = _byId.SwapIfPresent(evt.Id, current => current.Version == evt.Version
            ? evt with { Version = evt.Version + 1, WriteSeq = current.WriteSeq + 1 }
            : throw Errors.ConcurrentUpdate());
        if (saved is null)
            throw Errors.EventNotFound();
        if (!string.IsNullOrEmpty(saved.Slug))
            _idBySlug.TryAdd(saved.Slug, saved.Id);
        return Task.FromResult(saved);
    }

    public Task LockForWriteAsync(string eventId, CancellationToken ct = default) =>
        IncrementWriteSeqAsync(eventId);

    public Task MarkChangedAsync(string eventId, CancellationToken ct = default) =>
        IncrementWriteSeqAsync(eventId);

    private Task IncrementWriteSeqAsync(string eventId)
    {
        if (_byId.SwapIfPresent(eventId, evt => evt with { WriteSeq = evt.WriteSeq + 1 }) is null)
            throw Errors.EventNotFound();
        return Task.CompletedTask;
    }

    public Task<IReadOnlyList<Event>> ListAllByCreatorUserIdAsync(string creatorUserId, CancellationToken ct = default) =>
        ListByCreatorUserIdAsync(creatorUserId, int.MaxValue, ct);

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

        var n = _byId.Values.Count(e => e.GetWinnerMovieIds().Any(set.Contains));
        return Task.FromResult(n);
    }

    public Task<bool> DeleteAsync(string eventId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(eventId))
            return Task.FromResult(false);

        if (!_byId.TryRemove(eventId, out var removed))
            return Task.FromResult(false);

        if (!string.IsNullOrEmpty(removed.Slug))
            _idBySlug.TryRemove(new KeyValuePair<string, string>(removed.Slug, removed.Id));

        return Task.FromResult(true);
    }

    public Task<IReadOnlyList<Event>> ListMissingStartAtAsync(int limit, CancellationToken ct = default) =>
        Task.FromResult<IReadOnlyList<Event>>([]);

    public Task<IReadOnlyList<Event>> ListOpenEventsStartingBetweenAsync(
        DateTimeOffset fromInclusive,
        DateTimeOffset toInclusive,
        CancellationToken ct = default)
    {
        IReadOnlyList<Event> result = _byId.Values
            .Where(e => !e.ClosedAt.HasValue
                && EventSchedule.TryGetStartUtc(e.Date, e.Time, out var startAt)
                && startAt >= fromInclusive
                && startAt <= toInclusive)
            .ToList();
        return Task.FromResult(result);
    }

    public Task<IReadOnlyList<Event>> ListWithWinnerStartingBetweenAsync(
        DateTimeOffset fromInclusive,
        DateTimeOffset toExclusive,
        CancellationToken ct = default)
    {
        IReadOnlyList<Event> result = _byId.Values
            .Where(e => e.HasWinner
                && EventSchedule.TryGetStartUtc(e.Date, e.Time, out var startAt)
                && startAt >= fromInclusive
                && startAt < toExclusive)
            .ToList();
        return Task.FromResult(result);
    }

    public Task<IReadOnlyList<Event>> ListRecurringAwaitingNextOccurrenceAsync(
        string? creatorUserId,
        CancellationToken ct = default)
    {
        IReadOnlyList<Event> result = _byId.Values
            .Where(e => e.Recurrence.HasValue && string.IsNullOrEmpty(e.NextOccurrenceEventId))
            .Where(e => string.IsNullOrEmpty(creatorUserId) || e.CreatorUserId == creatorUserId)
            .ToList();
        return Task.FromResult(result);
    }

    public Task<IReadOnlyList<Event>> ListAwaitingWatchlistCleanupAsync(
        DateTimeOffset utcNow,
        int limit,
        CancellationToken ct = default)
    {
        IReadOnlyList<Event> result = _byId.Values
            .Where(e => e.HasWinner && e.WatchlistCleanedAt is null && e.IsFinished(utcNow))
            .Take(Math.Max(0, limit))
            .ToList();
        return Task.FromResult(result);
    }

    public Task<long> AnonymizeCreatorAsync(string creatorUserId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(creatorUserId))
            return Task.FromResult(0L);

        long count = 0;
        foreach (var eventId in _byId.Values.Where(e => e.CreatorUserId == creatorUserId).Select(e => e.Id).ToList())
        {
            var anonymized = _byId.SwapIfPresent(eventId, e => e.CreatorUserId == creatorUserId
                ? e with { CreatorUserId = null, Version = e.Version + 1, WriteSeq = e.WriteSeq + 1 }
                : null);
            if (anonymized is not null)
                count++;
        }

        return Task.FromResult(count);
    }
}
