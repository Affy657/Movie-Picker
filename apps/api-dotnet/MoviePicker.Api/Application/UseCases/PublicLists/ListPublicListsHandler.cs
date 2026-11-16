using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Profile;
using MoviePicker.Api.Application.UseCases.UserMovies;

namespace MoviePicker.Api.Application.UseCases.PublicLists;

public sealed class ListPublicListsHandler : IListPublicListsHandler
{
    private readonly IUserRepository _users;
    private readonly IMovieListRepository _lists;
    private readonly WatchedHistoryReader _history;

    public ListPublicListsHandler(IUserRepository users, IMovieListRepository lists, WatchedHistoryReader history)
    {
        _users = users;
        _lists = lists;
        _history = history;
    }

    public async Task<PublicListsResponse> HandleAsync(string handle, string? viewerId, CancellationToken ct = default)
    {
        var creator = await PublicProfileGuard.RequirePublicUserAsync(_users, handle, ct);
        var summaries = await _lists.ListPublicSummariesAsync(creator.Id, ct);
        if (summaries.Count == 0)
            return new PublicListsResponse();

        var watched = string.IsNullOrEmpty(viewerId) ? null : await _history.ReadKeysAsync(viewerId, ct);
        return new PublicListsResponse
        {
            Items = [.. summaries.Select(summary => PublicListSummaryResponse.From(summary, watched?.CountAmong(summary.Titles)))]
        };
    }
}
