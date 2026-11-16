using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.MovieLists;

public static class MovieListPolicy
{
    public static string NormalizeName(string? raw)
    {
        var trimmed = (raw ?? string.Empty).Trim();
        if (trimmed.Length == 0)
            throw Errors.MovieListNameRequired();
        if (trimmed.Length > MovieList.MaxNameLength)
            throw Errors.MovieListNameTooLong(MovieList.MaxNameLength);
        return trimmed;
    }

    public static string? NormalizeDescription(string? raw)
    {
        var trimmed = raw?.Trim();
        if (string.IsNullOrEmpty(trimmed))
            return null;
        if (trimmed.Length > MovieList.MaxDescriptionLength)
            throw Errors.MovieListDescriptionTooLong(MovieList.MaxDescriptionLength);
        return trimmed;
    }

    public static async Task EnsureRoomForNewListAsync(
        IMovieListRepository lists,
        string ownerId,
        string name,
        CancellationToken ct)
    {
        if (await lists.CountByOwnerAsync(ownerId, ct) >= MovieList.MaxPerOwner)
            throw Errors.MovieListLimitReached(MovieList.MaxPerOwner);
        await EnsureNameIsFreeAsync(lists, ownerId, name, exceptListId: null, ct);
    }

    public static async Task EnsureNameIsFreeAsync(
        IMovieListRepository lists,
        string ownerId,
        string name,
        string? exceptListId,
        CancellationToken ct)
    {
        if (MovieListName.IsReserved(name)
            || await lists.IsNameTakenAsync(ownerId, MovieListName.Key(name), exceptListId, ct))
            throw Errors.MovieListNameTaken(name);
    }

    public static async Task<MovieList> RequireAsync(
        IMovieListRepository lists,
        string userId,
        string listId,
        CancellationToken ct) =>
        await lists.GetAsync(userId, listId, ct) ?? throw Errors.MovieListNotFound();

    public static async Task<MovieList> RequireOwnerAsync(
        IMovieListRepository lists,
        string userId,
        string listId,
        CancellationToken ct)
    {
        var list = await RequireAsync(lists, userId, listId, ct);
        return list.OwnerId == userId ? list : throw Errors.MovieListOwnerOnly();
    }
}
