using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.MovieLists;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.UseCases.MovieListMembers;

public sealed class GetMovieListMembersHandler : IGetMovieListMembersHandler
{
    private readonly IMovieListRepository _lists;
    private readonly IUserRepository _users;
    private readonly TimeProvider _clock;

    public GetMovieListMembersHandler(IMovieListRepository lists, IUserRepository users, TimeProvider clock)
    {
        _lists = lists;
        _users = users;
        _clock = clock;
    }

    public async Task<MovieListMembersResponse> HandleAsync(string userId, string listId, CancellationToken ct = default)
    {
        var list = await MovieListPolicy.RequireAsync(_lists, userId, listId, ct);
        var ownerView = list.OwnerId == userId;
        var now = _clock.GetUtcNow();
        List<MovieListInvitation> pending = ownerView ? [.. list.PendingInvitations(now)] : [];
        IEnumerable<string> visible =
        [
            list.OwnerId,
            .. list.Members.Select(member => member.UserId),
            .. pending.Select(invitation => invitation.UserId)
        ];
        var people = await MovieListPeople.LoadAsync(_users, visible, ct);

        return new MovieListMembersResponse
        {
            Members =
            [
                MovieListMemberResponse.From(people.PersonOf(list.OwnerId), isOwner: true, list.CreatedAt),
                .. list.Members.Select(member => MovieListMemberResponse.From(people.PersonOf(member.UserId), isOwner: false, member.JoinedAt))
            ],
            Invitations = ownerView
                ? [.. pending.Select(invitation => MovieListPendingInvitationResponse.From(people.PersonOf(invitation.UserId), invitation.InvitedAt))]
                : null,
            InviteLink = ownerView && list.InviteLink is { } link ? MovieListInviteLinkResponse.From(link, now) : null
        };
    }

}
