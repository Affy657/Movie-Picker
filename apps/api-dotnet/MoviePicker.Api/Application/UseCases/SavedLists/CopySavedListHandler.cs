using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.MovieLists;
using MoviePicker.Api.Application.UseCases.Shared;
using MoviePicker.Api.Application.UseCases.UserMovies;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.SavedLists;

public sealed class CopySavedListHandler : ICopySavedListHandler
{
    private readonly ISavedListRepository _saved;
    private readonly IMovieListRepository _lists;
    private readonly ListSourceReader _sources;
    private readonly WatchedHistoryReader _history;
    private readonly IUserRepository _users;
    private readonly TimeProvider _clock;

    public CopySavedListHandler(
        ISavedListRepository saved,
        IMovieListRepository lists,
        ListSourceReader sources,
        WatchedHistoryReader history,
        IUserRepository users,
        TimeProvider clock)
    {
        _saved = saved;
        _lists = lists;
        _sources = sources;
        _history = history;
        _users = users;
        _clock = clock;
    }

    public async Task<MovieListResponse> HandleAsync(
        string userId,
        string savedListId,
        CopySavedListRequest request,
        CancellationToken ct = default)
    {
        var name = MovieListPolicy.NormalizeName(request.Name);
        var saved = await _saved.GetAsync(userId, savedListId, ct) ?? throw Errors.SavedListNotFound();
        await MovieListPolicy.EnsureRoomForNewListAsync(_lists, userId, name, ct);

        var titles = CopiedTitles(saved, await _sources.ReadAsync(saved.Source, ct));
        var now = _clock.StorageNow();
        return await _history.CreateCopyAsync(
            _lists,
            _users,
            userId,
            name,
            titles.Select(title => title.ToListItem(now)),
            now,
            ct);
    }

    private static IEnumerable<SavedListTitle> CopiedTitles(SavedList saved, ListSourceContent content)
    {
        if (content.IsAvailable)
            return content.Titles;
        if (saved.Snapshot.Count > 0)
            return saved.Snapshot;
        throw ListSourceReader.FollowsAMember(saved.SourceType)
            ? Errors.SavedListCopyUnavailable()
            : Errors.ListSourceUnavailable();
    }
}
