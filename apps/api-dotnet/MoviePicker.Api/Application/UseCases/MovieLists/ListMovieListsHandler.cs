using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.UserMovies;

namespace MoviePicker.Api.Application.UseCases.MovieLists;

public sealed class ListMovieListsHandler : IListMovieListsHandler
{
    private readonly IMovieListRepository _lists;
    private readonly WatchedHistoryReader _history;
    private readonly IUserRepository _users;

    public ListMovieListsHandler(IMovieListRepository lists, WatchedHistoryReader history, IUserRepository users)
    {
        _lists = lists;
        _history = history;
        _users = users;
    }

    public async Task<MovieListsResponse> HandleAsync(string userId, MovieListTitle? probe, CancellationToken ct = default)
    {
        var summaries = await _lists.ListSummariesAsync(userId, ct);
        if (summaries.Count == 0)
            return new MovieListsResponse();

        var watchedTask = _history.ReadKeysAsync(userId, ct);
        var peopleTask = MovieListPeople.LoadAsync(_users, summaries.SelectMany(summary => summary.PreviewMemberIds), ct);
        await Task.WhenAll(watchedTask, peopleTask);
        var watched = await watchedTask;
        var people = await peopleTask;
        return new MovieListsResponse
        {
            Items =
            [
                .. summaries.Select(summary => MovieListSummaryResponse.From(
                    summary,
                    probe,
                    watched.CountAmong(summary.Titles),
                    people.AudienceOf(userId, summary)))
            ]
        };
    }
}
