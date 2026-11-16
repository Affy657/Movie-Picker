using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.UserMovies;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.UseCases.MovieLists;

public static class MovieListViews
{
    public static async Task<MovieListSummaryResponse> DescribeAsync(
        this WatchedHistoryReader history,
        IUserRepository users,
        MovieList list,
        string viewerId,
        MovieListTitle? probe,
        CancellationToken ct)
    {
        var summary = MovieListSummary.Of(list);
        var watchedCountTask = CountWatchedAsync(history, viewerId, summary.Titles, ct);
        var peopleTask = MovieListPeople.LoadAsync(users, summary.PreviewMemberIds, ct);
        await Task.WhenAll(watchedCountTask, peopleTask);
        return MovieListSummaryResponse.From(
            summary,
            probe,
            await watchedCountTask,
            (await peopleTask).AudienceOf(viewerId, summary));
    }

    public static async Task<MovieListResponse> DescribeDetailAsync(
        this WatchedHistoryReader history,
        IUserRepository users,
        MovieList list,
        string viewerId,
        CancellationToken ct)
    {
        var watchedTask = history.ReadKeysAsync(viewerId, ct);
        var peopleTask = MovieListPeople.LoadAsync(users, list, ct);
        await Task.WhenAll(watchedTask, peopleTask);
        var watched = await watchedTask;
        var people = await peopleTask;
        return MovieListResponse.From(
            list,
            item => watched.Contains(item.TmdbId, item.MediaType),
            people.AudienceOf(viewerId, list),
            item => people.AuthorOf(list, item));
    }

    private static async Task<int> CountWatchedAsync(
        WatchedHistoryReader history,
        string viewerId,
        IReadOnlyList<MovieListTitle> titles,
        CancellationToken ct) =>
        titles.Count == 0 ? 0 : (await history.ReadKeysAsync(viewerId, ct)).CountAmong(titles);
}
