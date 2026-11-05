using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.Posters;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.Favorites;

public sealed class AddFavoriteHandler : IAddFavoriteHandler
{
    private readonly IUserRepository _users;
    private readonly IPosterImageStore _posterImageStore;
    private readonly TimeProvider _clock;

    public AddFavoriteHandler(IUserRepository users, IPosterImageStore posterImageStore, TimeProvider clock)
    {
        _users = users;
        _posterImageStore = posterImageStore;
        _clock = clock;
    }

    public async Task<FavoriteListResponse> HandleAsync(string userId, AddFavoriteRequest request, CancellationToken ct = default)
    {
        var user = await RequireUserAsync(userId, ct);
        if (Contains(user, request))
            return FavoriteListResponse.From(user.Favorites);
        if (user.Favorites.Count >= FavoriteTitle.MaxPerUser)
            throw Errors.FavoritesLimitReached(FavoriteTitle.MaxPerUser);

        var favorite = new FavoriteTitle
        {
            TmdbId = request.TmdbId,
            MediaType = request.MediaType,
            Title = request.Title.Trim(),
            Year = (request.Year ?? string.Empty).Trim(),
            PosterPath = await TmdbPosterPathResolver.ResolveAsync(_posterImageStore, request.PosterPath, ct)
        };

        var added = await _users.AddFavoriteAsync(user.Id, favorite, FavoriteTitle.MaxPerUser, _clock.GetUtcNow(), ct);
        var stored = await RequireUserAsync(user.Id, ct);
        if (!added && !Contains(stored, request))
            throw Errors.FavoritesLimitReached(FavoriteTitle.MaxPerUser);

        return FavoriteListResponse.From(stored.Favorites);
    }

    private static bool Contains(User user, AddFavoriteRequest request) =>
        user.Favorites.Any(f => f.Is(request.TmdbId, request.MediaType));

    private async Task<User> RequireUserAsync(string userId, CancellationToken ct) =>
        await _users.GetByIdAsync(userId, ct) ?? throw Errors.UserNotFound();
}
