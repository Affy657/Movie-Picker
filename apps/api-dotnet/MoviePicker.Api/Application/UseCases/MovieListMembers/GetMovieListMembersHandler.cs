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
                Member(people, list.OwnerId, list.CreatedAt, isOwner: true),
                .. list.Members.Select(member => Member(people, member.UserId, member.JoinedAt, isOwner: false))
            ],
            Invitations = ownerView ? [.. pending.Select(invitation => Pending(people, invitation))] : null,
            InviteLink = ownerView && list.InviteLink is { } link ? MovieListInviteLinkResponse.From(link, now) : null
        };
    }

    private static MovieListMemberResponse Member(MovieListPeople people, string userId, DateTimeOffset joinedAt, bool isOwner)
    {
        var person = people.Find(userId) ?? new MovieListPersonResponse { UserId = userId };
        return new MovieListMemberResponse
        {
            UserId = userId,
            Handle = person.Handle,
            DisplayName = person.DisplayName,
            AvatarId = person.AvatarId,
            IsOwner = isOwner,
            JoinedAt = joinedAt
        };
    }

    private static MovieListPendingInvitationResponse Pending(MovieListPeople people, MovieListInvitation invitation)
    {
        var person = people.Find(invitation.UserId) ?? new MovieListPersonResponse { UserId = invitation.UserId };
        return new MovieListPendingInvitationResponse
        {
            UserId = invitation.UserId,
            Handle = person.Handle,
            DisplayName = person.DisplayName,
            AvatarId = person.AvatarId,
            InvitedAt = invitation.InvitedAt
        };
    }
}
