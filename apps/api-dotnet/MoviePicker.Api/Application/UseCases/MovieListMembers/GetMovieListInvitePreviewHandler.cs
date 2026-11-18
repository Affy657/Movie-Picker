using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.MovieListMembers;

public sealed class GetMovieListInvitePreviewHandler : IGetMovieListInvitePreviewHandler
{
    private readonly IMovieListRepository _lists;
    private readonly IUserRepository _users;
    private readonly TimeProvider _clock;

    public GetMovieListInvitePreviewHandler(IMovieListRepository lists, IUserRepository users, TimeProvider clock)
    {
        _lists = lists;
        _users = users;
        _clock = clock;
    }

    public async Task<MovieListInvitePreviewResponse> HandleAsync(string? viewerId, string token, CancellationToken ct = default)
    {
        var now = _clock.GetUtcNow();
        var list = await MovieListInviteLinks.FindActiveAsync(_lists, token, now, ct)
            ?? throw Errors.MovieListInviteLinkInvalid();
        var role = viewerId is null ? null : list.RoleOf(viewerId);
        var owners = await _users.ListCardsByIdsAsync([list.OwnerId], ct);
        var owner = owners.Count > 0 ? owners[0] : null;
        var keptSeat = viewerId is not null && list.IsInvited(viewerId, now);

        return new MovieListInvitePreviewResponse
        {
            Name = list.Name,
            Owner = MovieListInviterResponse.From(owner is null ? DisplayedPerson.Unknown(list.OwnerId) : DisplayedPerson.From(owner)),
            ItemCount = list.Items.Count,
            PosterPaths = list.RecentPosterPaths(),
            IsFull = role is null && !keptSeat && list.IsFull(now),
            Role = role,
            ListId = role is null ? null : list.Id
        };
    }
}
