using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Infrastructure.Persistence.InMemory;

public sealed class InMemorySavedListRepository : ISavedListRepository
{
    private readonly Dictionary<string, SavedList> _store = new(StringComparer.Ordinal);
    private readonly Lock _gate = new();

    public Task<IReadOnlyList<SavedList>> ListByOwnerAsync(string ownerId, CancellationToken ct = default)
    {
        lock (_gate)
        {
            IReadOnlyList<SavedList> lists =
            [
                .. _store.Values
                    .Where(list => list.OwnerId == ownerId)
                    .OrderByDescending(list => list.CreatedAt)
            ];
            return Task.FromResult(lists);
        }
    }

    public Task<SavedList?> GetAsync(string ownerId, string savedListId, CancellationToken ct = default)
    {
        lock (_gate)
            return Task.FromResult(Owned(ownerId, savedListId));
    }

    public Task<SavedList?> FindBySourceAsync(string ownerId, ListSource source, CancellationToken ct = default)
    {
        lock (_gate)
            return Task.FromResult(FindBySource(ownerId, source));
    }

    public Task<long> CountByOwnerAsync(string ownerId, CancellationToken ct = default)
    {
        lock (_gate)
            return Task.FromResult(_store.Values.LongCount(list => list.OwnerId == ownerId));
    }

    public Task<SavedList> AddIfAbsentAsync(SavedList list, CancellationToken ct = default)
    {
        lock (_gate)
        {
            if (FindBySource(list.OwnerId, list.Source) is { } existing)
                return Task.FromResult(existing);

            var stored = list with { Id = Guid.NewGuid().ToString("N") };
            _store[stored.Id] = stored;
            return Task.FromResult(stored);
        }
    }

    public Task<bool> RefreshSnapshotAsync(
        string ownerId,
        string savedListId,
        string? sourceOwnerId,
        string name,
        IReadOnlyList<SavedListTitle> snapshot,
        CancellationToken ct = default)
    {
        lock (_gate)
        {
            if (Owned(ownerId, savedListId) is not { } list || list.SourceOwnerId != sourceOwnerId)
                return Task.FromResult(false);

            _store[savedListId] = list with { Name = name, Snapshot = [.. snapshot] };
            return Task.FromResult(true);
        }
    }

    public Task<long> ForgetListsOfCreatorAsync(string creatorId, CancellationToken ct = default)
    {
        lock (_gate)
        {
            var forgotten = _store.Values.Where(list => list.SourceOwnerId == creatorId).ToList();
            foreach (var list in forgotten)
                _store[list.Id] = list with { Name = string.Empty, Snapshot = [], SourceOwnerId = null };
            return Task.FromResult((long)forgotten.Count);
        }
    }

    public Task<bool> DeleteAsync(string ownerId, string savedListId, CancellationToken ct = default)
    {
        lock (_gate)
            return Task.FromResult(Owned(ownerId, savedListId) is not null && _store.Remove(savedListId));
    }

    public Task<long> DeleteAllForOwnerAsync(string ownerId, CancellationToken ct = default)
    {
        lock (_gate)
        {
            var owned = _store.Values.Where(list => list.OwnerId == ownerId).Select(list => list.Id).ToList();
            owned.ForEach(id => _store.Remove(id));
            return Task.FromResult((long)owned.Count);
        }
    }

    private SavedList? Owned(string ownerId, string savedListId) =>
        _store.TryGetValue(savedListId, out var list) && list.OwnerId == ownerId ? list : null;

    private SavedList? FindBySource(string ownerId, ListSource source) =>
        _store.Values.FirstOrDefault(list => list.OwnerId == ownerId && list.Source == source);
}
