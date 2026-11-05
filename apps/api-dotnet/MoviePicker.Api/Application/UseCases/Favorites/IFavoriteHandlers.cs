using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.UseCases.Favorites;

public interface IAddFavoriteHandler
{
    Task<FavoriteListResponse> HandleAsync(string userId, AddFavoriteRequest request, CancellationToken ct = default);
}

public interface IRemoveFavoriteHandler
{
    Task<FavoriteListResponse> HandleAsync(
        string userId,
        int tmdbId,
        MovieMediaType mediaType,
        CancellationToken ct = default);
}
