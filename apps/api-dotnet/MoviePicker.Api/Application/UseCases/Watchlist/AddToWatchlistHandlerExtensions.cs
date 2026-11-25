using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.Watchlist;

public static class AddToWatchlistHandlerExtensions
{
    public static async Task<bool> TryAddKnownTitleAsync(
        this IAddToWatchlistHandler handler,
        string userId,
        AddWatchlistItemRequest request,
        CancellationToken ct = default)
    {
        try
        {
            await handler.HandleAsync(userId, request, ct);
            return true;
        }
        catch (NotFoundException ex) when (ex.Reason == ErrorCodes.MovieNotFound)
        {
            return false;
        }
    }
}
