using MoviePicker.Api.Application.DTOs;

namespace MoviePicker.Api.Application.UseCases.Profile;

public interface IGetUserWatchlistHandler
{
    Task<WatchlistResponse> HandleAsync(
        string handle,
        string? currentUserId,
        int skip,
        int? take,
        CancellationToken ct = default);
}
