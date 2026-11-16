using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.UserMovies;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.SavedLists;

public sealed class GetSavedListHandler : IGetSavedListHandler
{
    private readonly ISavedListRepository _saved;
    private readonly ListSourceReader _sources;
    private readonly WatchedHistoryReader _history;

    public GetSavedListHandler(ISavedListRepository saved, ListSourceReader sources, WatchedHistoryReader history)
    {
        _saved = saved;
        _sources = sources;
        _history = history;
    }

    public async Task<SavedListResponse> HandleAsync(string userId, string savedListId, CancellationToken ct = default)
    {
        var saved = await _saved.GetAsync(userId, savedListId, ct) ?? throw Errors.SavedListNotFound();
        return await _sources.ReadDetailAsync(_history, saved, ct);
    }
}
