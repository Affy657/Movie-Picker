using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.Favorites;

public sealed class RemoveFavoriteHandler : IRemoveFavoriteHandler
{
    private readonly IUserRepository _users;
    private readonly TimeProvider _clock;

    public RemoveFavoriteHandler(IUserRepository users, TimeProvider clock)
    {
        _users = users;
        _clock = clock;
    }

    public async Task<FavoriteListResponse> HandleAsync(
        string userId,
        int tmdbId,
        MovieMediaType mediaType,
        CancellationToken ct = default)
    {
        await _users.RemoveFavoriteAsync(userId, tmdbId, mediaType, _clock.GetUtcNow(), ct);
        var user = await _users.GetByIdAsync(userId, ct) ?? throw Errors.UserNotFound();
        return FavoriteListResponse.From(user.Favorites);
    }
}
