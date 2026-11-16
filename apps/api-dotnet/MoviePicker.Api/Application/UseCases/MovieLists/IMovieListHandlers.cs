using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;

namespace MoviePicker.Api.Application.UseCases.MovieLists;

public interface IListMovieListsHandler
{
    Task<MovieListsResponse> HandleAsync(string userId, MovieListTitle? probe, CancellationToken ct = default);
}

public interface ICreateMovieListHandler
{
    Task<MovieListSummaryResponse> HandleAsync(string userId, CreateMovieListRequest request, CancellationToken ct = default);
}

public interface IGetMovieListHandler
{
    Task<MovieListResponse> HandleAsync(string userId, string listId, CancellationToken ct = default);
}

public interface IUpdateMovieListHandler
{
    Task<MovieListSummaryResponse> HandleAsync(
        string userId,
        string listId,
        UpdateMovieListRequest request,
        CancellationToken ct = default);
}

public interface IDeleteMovieListHandler
{
    Task HandleAsync(string userId, string listId, CancellationToken ct = default);
}

public interface IAddMovieListItemHandler
{
    Task<MovieListItemAddition> HandleAsync(
        string userId,
        string listId,
        AddWatchlistItemRequest request,
        CancellationToken ct = default);
}

public interface IRemoveMovieListItemHandler
{
    Task HandleAsync(string userId, string listId, MovieListTitle title, CancellationToken ct = default);
}

public sealed record MovieListItemAddition(MovieListItemResponse Item, bool Created);
