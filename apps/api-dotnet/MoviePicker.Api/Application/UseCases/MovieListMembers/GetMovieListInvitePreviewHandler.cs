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
        var list = await MovieListInviteLinks.FindActiveAsync(_lists, token, _clock.GetUtcNow(), ct)
            ?? throw Errors.MovieListInviteLinkInvalid();
        var role = viewerId is null ? null : list.RoleOf(viewerId);
        var owner = (await _users.ListCardsByIdsAsync([list.OwnerId], ct)).FirstOrDefault();
        var keptSeat = viewerId is not null && list.IsInvited(viewerId);

        return new MovieListInvitePreviewResponse
        {
            Name = list.Name,
            Owner = new MovieListInviterResponse
            {
                Handle = PublicHandleResolver.Resolve(owner),
                DisplayName = owner?.DisplayName ?? string.Empty,
                AvatarId = owner?.AvatarId ?? string.Empty
            },
            ItemCount = list.Items.Count,
            PosterPaths = list.RecentPosterPaths(),
            IsFull = role is null && !keptSeat && list.IsFull,
            Role = role,
            ListId = role is null ? null : list.Id
        };
    }
}
