using MoviePicker.Api.Application.Ports;

namespace MoviePicker.Api.Application.UseCases.LetterboxdImport;

public sealed class LetterboxdLinkedCounter
{
    private readonly IUserRepository _users;
    private readonly IWatchlistRepository _watchlist;
    private readonly IWatchedTitleRepository _watched;

    public LetterboxdLinkedCounter(IUserRepository users, IWatchlistRepository watchlist, IWatchedTitleRepository watched)
    {
        _users = users;
        _watchlist = watchlist;
        _watched = watched;
    }

    public async Task RefreshAsync(string userId, CancellationToken ct = default)
    {
        var watchlistCountTask = _watchlist.CountLinkedToLetterboxdAsync(userId, ct);
        var watchedCountTask = _watched.CountFromLetterboxdAsync(userId, ct);
        await Task.WhenAll(watchlistCountTask, watchedCountTask);
        await _users.SetLetterboxdLinkedCountsAsync(userId, (int)await watchlistCountTask, (int)await watchedCountTask, ct);
    }
}
