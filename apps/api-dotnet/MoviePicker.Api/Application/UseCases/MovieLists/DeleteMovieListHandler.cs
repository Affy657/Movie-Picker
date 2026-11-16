using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.MovieLists;

public sealed class DeleteMovieListHandler : IDeleteMovieListHandler
{
    private readonly IMovieListRepository _lists;
    private readonly IUserNotificationRepository _notifications;

    public DeleteMovieListHandler(IMovieListRepository lists, IUserNotificationRepository notifications)
    {
        _lists = lists;
        _notifications = notifications;
    }

    public async Task HandleAsync(string userId, string listId, CancellationToken ct = default)
    {
        await MovieListPolicy.RequireOwnerAsync(_lists, userId, listId, ct);
        if (!await _lists.DeleteAsync(userId, listId, ct))
            throw Errors.MovieListNotFound();
        await _notifications.DeleteByListAsync(listId, ct: ct);
    }
}
