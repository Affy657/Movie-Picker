using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.SearchUsers;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Infrastructure.Persistence.InMemory;

public sealed class InMemoryMovieListRepository : IMovieListRepository
{
    private readonly Dictionary<string, MovieList> _store = new(StringComparer.Ordinal);
    private readonly Lock _gate = new();

    public Task<IReadOnlyList<MovieListSummary>> ListSummariesAsync(string userId, CancellationToken ct = default)
    {
        lock (_gate)
        {
            IReadOnlyList<MovieListSummary> summaries =
            [
                .. Latest(_store.Values.Where(list => list.RoleOf(userId) is not null))
                    .Select(MovieListSummary.Of)
            ];
            return Task.FromResult(summaries);
        }
    }

    public Task<IReadOnlyList<MovieListSummary>> SearchPublicSummariesAsync(string query, int limit, CancellationToken ct = default)
    {
        var normalized = UserSearchPolicy.Normalize(query);
        lock (_gate)
        {
            IReadOnlyList<MovieListSummary> summaries = normalized.Length == 0
                ? []
                :
                [
                    .. Latest(_store.Values.Where(list => list.IsPublic && UserSearchPolicy.Contains(list.Name, normalized)))
                        .Take(Math.Max(0, limit))
                        .Select(MovieListSummary.Of)
                ];
            return Task.FromResult(summaries);
        }
    }

    public Task<IReadOnlyList<MovieListSummary>> ListPublicSummariesAsync(string ownerId, CancellationToken ct = default)
    {
        lock (_gate)
        {
            IReadOnlyList<MovieListSummary> summaries =
            [
                .. Latest(_store.Values.Where(list => list.OwnerId == ownerId && list.IsPublic))
                    .Select(MovieListSummary.Of)
            ];
            return Task.FromResult(summaries);
        }
    }

    public Task<long> CountPublicByOwnerAsync(string ownerId, CancellationToken ct = default)
    {
        lock (_gate)
            return Task.FromResult(_store.Values.LongCount(list => list.OwnerId == ownerId && list.IsPublic));
    }

    public Task<IReadOnlyList<MovieList>> ListByOwnerAsync(string ownerId, CancellationToken ct = default) =>
        Select(list => list.OwnerId == ownerId);

    public Task<IReadOnlyList<MovieList>> ListJoinedAsync(string userId, CancellationToken ct = default) =>
        Select(list => list.RoleOf(userId) == MovieListRole.Member);

    public Task<IReadOnlyList<MovieList>> ListInvitingAsync(string userId, CancellationToken ct = default) =>
        Select(list => list.HoldsInvitationOf(userId));

    public Task<IReadOnlySet<string>> ListPendingInvitationIdsAsync(
        string userId,
        IReadOnlyCollection<string> listIds,
        DateTimeOffset now,
        CancellationToken ct = default)
    {
        lock (_gate)
        {
            IReadOnlySet<string> pending = listIds
                .Where(id => _store.TryGetValue(id, out var list) && list.IsInvited(userId, now))
                .ToHashSet(StringComparer.Ordinal);
            return Task.FromResult(pending);
        }
    }

    public Task<long> CountByOwnerAsync(string ownerId, CancellationToken ct = default)
    {
        lock (_gate)
            return Task.FromResult(_store.Values.LongCount(list => list.OwnerId == ownerId));
    }

    public Task<bool> IsNameTakenAsync(string ownerId, string nameKey, string? exceptListId, CancellationToken ct = default)
    {
        lock (_gate)
            return Task.FromResult(HoldsNameKey(ownerId, nameKey, exceptListId));
    }

    public Task<MovieList?> GetAsync(string userId, string listId, CancellationToken ct = default)
    {
        lock (_gate)
            return Task.FromResult(Admitting(userId, listId));
    }

    public Task<MovieList?> FindAsync(string listId, CancellationToken ct = default)
    {
        lock (_gate)
            return Task.FromResult(_store.GetValueOrDefault(listId));
    }

    public Task<IReadOnlyList<MovieList>> ListByIdsAsync(
        IReadOnlyCollection<string> listIds,
        CancellationToken ct = default)
    {
        lock (_gate)
        {
            IReadOnlyList<MovieList> lists =
            [
                .. listIds
                    .Distinct(StringComparer.Ordinal)
                    .Select(id => _store.GetValueOrDefault(id))
                    .OfType<MovieList>()
            ];
            return Task.FromResult(lists);
        }
    }

    public Task<MovieList?> FindByInviteTokenAsync(string token, CancellationToken ct = default)
    {
        lock (_gate)
            return Task.FromResult(ByToken(token));
    }

    public Task<MovieList> AddAsync(MovieList list, CancellationToken ct = default)
    {
        lock (_gate)
        {
            if (HoldsNameKey(list.OwnerId, list.NameKey, exceptListId: null))
                throw Errors.MovieListNameTaken(list.Name);

            var stored = list with { Id = Guid.NewGuid().ToString("N"), Items = [.. list.Items] };
            _store[stored.Id] = stored;
            return Task.FromResult(stored);
        }
    }

    public Task<MovieList?> UpdateDetailsAsync(
        string ownerId,
        string listId,
        string name,
        string? description,
        bool isPublic,
        DateTimeOffset updatedAt,
        CancellationToken ct = default)
    {
        lock (_gate)
        {
            if (Owned(ownerId, listId) is not { } list)
                return Task.FromResult<MovieList?>(null);
            if (HoldsNameKey(ownerId, MovieListName.Key(name), listId))
                throw Errors.MovieListNameTaken(name);

            var updated = list with { Name = name, Description = description, IsPublic = isPublic, UpdatedAt = updatedAt };
            _store[listId] = updated;
            return Task.FromResult<MovieList?>(updated);
        }
    }

    public Task<bool> DeleteAsync(string ownerId, string listId, CancellationToken ct = default)
    {
        lock (_gate)
            return Task.FromResult(Owned(ownerId, listId) is not null && _store.Remove(listId));
    }

    public Task<bool> AddItemAsync(
        string userId,
        string listId,
        MovieListItem item,
        int maxItems,
        CancellationToken ct = default)
    {
        lock (_gate)
        {
            if (Admitting(userId, listId) is not { } list
                || list.Items.Count >= maxItems
                || list.Find(item.TmdbId, item.MediaType) is not null)
                return Task.FromResult(false);

            _store[listId] = list with { Items = [.. list.Items, item], UpdatedAt = item.AddedAt };
            return Task.FromResult(true);
        }
    }

    public Task<bool> RemoveItemAsync(
        string userId,
        string listId,
        MovieListTitle title,
        DateTimeOffset updatedAt,
        CancellationToken ct = default)
    {
        lock (_gate)
        {
            if (Admitting(userId, listId) is not { } list || list.Find(title.TmdbId, title.MediaType) is not { } item)
                return Task.FromResult(false);

            _store[listId] = list with { Items = [.. list.Items.Where(entry => entry != item)], UpdatedAt = updatedAt };
            return Task.FromResult(true);
        }
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

    public Task<bool> AddInvitationAsync(
        string listId,
        MovieListInvitation invitation,
        int maxSeats,
        CancellationToken ct = default) =>
        Change(
            listId,
            list => list.RoleOf(invitation.UserId) is null
                && !list.IsInvited(invitation.UserId, invitation.InvitedAt)
                && list.SeatsTaken(invitation.InvitedAt) < maxSeats,
            list => WithInvitation(list, invitation));

    public Task<bool> RemoveInvitationAsync(string listId, string userId, CancellationToken ct = default) =>
        Change(
            listId,
            list => list.HoldsInvitationOf(userId),
            list => WithoutInvitation(list, userId));

    public Task<bool> AcceptInvitationAsync(string listId, MovieListMember member, CancellationToken ct = default) =>
        Change(
            listId,
            list => list.IsInvited(member.UserId, member.JoinedAt),
            list => WithoutInvitation(list, member.UserId) with { Members = [.. list.Members, member] });

    public Task<bool> JoinByInviteTokenAsync(
        string token,
        MovieListMember member,
        DateTimeOffset now,
        int maxSeats,
        CancellationToken ct = default)
    {
        lock (_gate)
        {
            if (ByToken(token) is not { } list
                || !list.AcceptsInviteToken(token, now)
                || list.RoleOf(member.UserId) is not null
                || (!list.IsInvited(member.UserId, now) && list.SeatsTaken(now) >= maxSeats))
                return Task.FromResult(false);

            _store[list.Id] = WithoutInvitation(list, member.UserId) with { Members = [.. list.Members, member] };
            return Task.FromResult(true);
        }
    }

    public Task<bool> RemoveMemberAsync(string listId, string userId, bool disableInviteLink, CancellationToken ct = default) =>
        Change(
            listId,
            list => list.RoleOf(userId) == MovieListRole.Member,
            list => WithoutMember(list, userId) with
            {
                InviteLink = disableInviteLink && list.InviteLink is { } link ? link with { Disabled = true } : list.InviteLink
            });

    public Task<bool> SetInviteLinkAsync(
        string ownerId,
        string listId,
        MovieListInviteLink link,
        CancellationToken ct = default) =>
        Change(listId, list => list.OwnerId == ownerId, list => list with { InviteLink = link });

    public Task<bool> DisableInviteLinkAsync(string ownerId, string listId, CancellationToken ct = default) =>
        Change(
            listId,
            list => list.OwnerId == ownerId && list.InviteLink is not null,
            list => list with { InviteLink = list.InviteLink! with { Disabled = true } });

    public Task<long> RemoveFromOthersListsAsync(string userId, CancellationToken ct = default)
    {
        lock (_gate)
        {
            var touched = _store.Values
                .Where(list => list.RoleOf(userId) == MovieListRole.Member || list.HoldsInvitationOf(userId))
                .ToList();
            foreach (var list in touched)
                _store[list.Id] = WithoutMember(WithoutInvitation(list, userId), userId);
            return Task.FromResult((long)touched.Count);
        }
    }

    private Task<IReadOnlyList<MovieList>> Select(Func<MovieList, bool> predicate)
    {
        lock (_gate)
        {
            IReadOnlyList<MovieList> lists = [.. Latest(_store.Values.Where(predicate))];
            return Task.FromResult(lists);
        }
    }

    private Task<bool> Change(string listId, Func<MovieList, bool> precondition, Func<MovieList, MovieList> change)
    {
        lock (_gate)
        {
            if (!_store.TryGetValue(listId, out var list) || !precondition(list))
                return Task.FromResult(false);

            _store[listId] = change(list);
            return Task.FromResult(true);
        }
    }

    private static MovieList WithoutInvitation(MovieList list, string userId) =>
        list with { Invitations = [.. list.Invitations.Where(invitation => invitation.UserId != userId)] };

    private static MovieList WithInvitation(MovieList list, MovieListInvitation invitation)
    {
        var others = WithoutInvitation(list, invitation.UserId);
        return others with { Invitations = [.. others.Invitations, invitation] };
    }

    private static MovieList WithoutMember(MovieList list, string userId) =>
        list with { Members = [.. list.Members.Where(member => member.UserId != userId)] };

    private static IEnumerable<MovieList> Latest(IEnumerable<MovieList> lists) =>
        lists.OrderByDescending(list => list.UpdatedAt);

    private MovieList? ByToken(string token) =>
        _store.Values.FirstOrDefault(list => list.InviteLink is { } link && string.Equals(link.Token, token, StringComparison.Ordinal));

    private MovieList? Owned(string ownerId, string listId) =>
        _store.TryGetValue(listId, out var list) && list.OwnerId == ownerId ? list : null;

    private MovieList? Admitting(string userId, string listId) =>
        _store.TryGetValue(listId, out var list) && list.RoleOf(userId) is not null ? list : null;

    private bool HoldsNameKey(string ownerId, string nameKey, string? exceptListId) =>
        _store.Values.Any(list => list.OwnerId == ownerId && list.Id != exceptListId && list.NameKey == nameKey);
}
