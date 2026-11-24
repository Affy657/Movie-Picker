using MoviePicker.Api.Application.Ports;

namespace MoviePicker.Api.Application.UseCases.Profile;

public sealed class PublicProfileContent
{
    private readonly IParticipantRepository _participants;
    private readonly IMovieListRepository _lists;
    private readonly IWatchlistRepository _watchlist;

    public PublicProfileContent(
        IParticipantRepository participants,
        IMovieListRepository lists,
        IWatchlistRepository watchlist)
    {
        _participants = participants;
        _lists = lists;
        _watchlist = watchlist;
    }

    public async Task<bool> ShowsSomethingAsync(PublicProfileRef profile, CancellationToken ct = default)
    {
        if (profile.HasProfileText)
            return true;
        if ((await _participants.ListByUserIdAsync(profile.UserId, 1, ct)).Count > 0)
            return true;
        if (await _lists.CountPublicByOwnerAsync(profile.UserId, ct) > 0)
            return true;
        return profile.IsWatchlistPublic && await _watchlist.CountByUserIdAsync(profile.UserId, ct) > 0;
    }
}
