using System.Collections.Concurrent;
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
        var created = new Event { Id = id, Title = evt.Title, Date = evt.Date, Time = evt.Time, HostToken = evt.HostToken, Slug = evt.Slug, Config = evt.Config, ClosedAt = evt.ClosedAt, WinnerMovieId = evt.WinnerMovieId, CreatedAt = evt.CreatedAt, UpdatedAt = evt.UpdatedAt };
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
}
