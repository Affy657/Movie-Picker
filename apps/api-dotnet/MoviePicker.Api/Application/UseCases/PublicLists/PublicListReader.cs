using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Profile;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.PublicLists;

public sealed record PublicList(User Creator, MovieList List);

public sealed record PublicListLookup(MovieList? List, UserCard? Creator, ListSourceUnavailableReason? UnavailableReason)
{
    public bool IsPublic => UnavailableReason is null;
}

public sealed class PublicListReader
{
    private static readonly PublicListLookup Deleted = new(null, null, ListSourceUnavailableReason.Deleted);

    private readonly IMovieListRepository _lists;
    private readonly IUserRepository _users;

    public PublicListReader(IMovieListRepository lists, IUserRepository users)
    {
        _lists = lists;
        _users = users;
    }

    public async Task<PublicList> RequireAsync(string? handle, string listId, CancellationToken ct = default)
    {
        var creatorTask = PublicProfileGuard.RequirePublicUserAsync(_users, handle, ct);
        var listTask = _lists.FindAsync(listId, ct);
        await Task.WhenAll(creatorTask, listTask);
        var creator = await creatorTask;
        var list = await listTask;
        if (list is null || !list.IsPublic || list.OwnerId != creator.Id)
            throw Errors.MovieListNotFound();
        return new PublicList(creator, list);
    }

    public async Task<PublicListLookup> FindAsync(string listId, CancellationToken ct = default)
    {
        var list = await _lists.FindAsync(listId, ct);
        if (list is null)
            return Deleted;

        var creator = (await _users.ListCardsByIdsAsync([list.OwnerId], ct))
            .FirstOrDefault(card => card.Id == list.OwnerId);
        return Lookup(list, creator);
    }

    public async Task<IReadOnlyDictionary<string, PublicListLookup>> FindManyAsync(
        IReadOnlyCollection<string> listIds,
        CancellationToken ct = default)
    {
        var requested = listIds.Distinct(StringComparer.Ordinal).ToList();
        if (requested.Count == 0)
            return new Dictionary<string, PublicListLookup>(StringComparer.Ordinal);

        var lists = await _lists.ListByIdsAsync(requested, ct);
        var ownerIds = lists.Select(list => list.OwnerId).Distinct(StringComparer.Ordinal).ToList();
        var creators = ownerIds.Count == 0
            ? []
            : await _users.ListCardsByIdsAsync(ownerIds, ct);
        var creatorById = creators
            .GroupBy(card => card.Id, StringComparer.Ordinal)
            .ToDictionary(group => group.Key, group => group.First(), StringComparer.Ordinal);
        var listById = lists.ToDictionary(list => list.Id, StringComparer.Ordinal);
        return requested.ToDictionary(
            id => id,
            id => listById.TryGetValue(id, out var list) ? Lookup(list, creatorById.GetValueOrDefault(list.OwnerId)) : Deleted,
            StringComparer.Ordinal);
    }

    private static PublicListLookup Lookup(MovieList list, UserCard? creator)
    {
        if (creator is null)
            return new PublicListLookup(list, null, ListSourceUnavailableReason.Deleted);

        return list.IsPublic && creator.IsProfilePublic
            ? new PublicListLookup(list, creator, null)
            : new PublicListLookup(list, creator, ListSourceUnavailableReason.Private);
    }
}
