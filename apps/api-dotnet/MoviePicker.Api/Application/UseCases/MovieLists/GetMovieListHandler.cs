using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.UserMovies;

namespace MoviePicker.Api.Application.UseCases.MovieLists;

public sealed class GetMovieListHandler : IGetMovieListHandler
{
    private readonly IMovieListRepository _lists;
    private readonly WatchedHistoryReader _history;
    private readonly IUserRepository _users;

    public GetMovieListHandler(IMovieListRepository lists, WatchedHistoryReader history, IUserRepository users)
    {
        _lists = lists;
        _history = history;
        _users = users;
    }

    public async Task<MovieListResponse> HandleAsync(string userId, string listId, CancellationToken ct = default)
    {
        var list = await MovieListPolicy.RequireAsync(_lists, userId, listId, ct);
        return await _history.DescribeDetailAsync(_users, list, userId, ct);
    }
}
