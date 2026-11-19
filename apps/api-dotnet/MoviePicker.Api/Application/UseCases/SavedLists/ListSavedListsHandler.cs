using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.UserMovies;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.UseCases.SavedLists;

public sealed class ListSavedListsHandler : IListSavedListsHandler
{
    private readonly ISavedListRepository _saved;
    private readonly ListSourceReader _sources;
    private readonly WatchedHistoryReader _history;

    public ListSavedListsHandler(ISavedListRepository saved, ListSourceReader sources, WatchedHistoryReader history)
    {
        _saved = saved;
        _sources = sources;
        _history = history;
    }

    public async Task<SavedListsResponse> HandleAsync(
        string userId,
        string? sourceType,
        string? sourceId,
        CancellationToken ct = default)
    {
        var lists = await ListAsync(userId, sourceType, sourceId, ct);
        if (lists.Count == 0)
            return new SavedListsResponse();

        var watchedTask = _history.ReadKeysAsync(userId, ct);
        var contents = await _sources.ReadAllAsync([.. lists.Select(list => list.Source)], ct);
        var watched = await watchedTask;

        return new SavedListsResponse
        {
            Items = [.. lists.Select((list, index) => SavedListViews.Summary(list, contents[index], watched))]
        };
    }

    private async Task<IReadOnlyList<SavedList>> ListAsync(
        string userId,
        string? sourceType,
        string? sourceId,
        CancellationToken ct)
    {
        if (sourceType is null && sourceId is null)
            return await _saved.ListByOwnerAsync(userId, ct);

        var source = await _sources.ResolveAsync(ListSourceReader.Parse(sourceType, sourceId), ct);
        return source is not null && await _saved.FindBySourceAsync(userId, source, ct) is { } found ? [found] : [];
    }
}
