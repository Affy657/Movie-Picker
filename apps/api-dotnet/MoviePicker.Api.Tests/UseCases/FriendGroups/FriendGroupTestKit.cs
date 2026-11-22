using Moq;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.FriendGroupMembers;
using MoviePicker.Api.Application.UseCases.FriendGroups;
using MoviePicker.Api.Application.UseCases.ListMyEvents;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Infrastructure.Persistence.InMemory;
using MoviePicker.Api.Tests.Builders;
using MoviePicker.Api.Tests.UseCases.MovieLists;

namespace MoviePicker.Api.Tests.UseCases.FriendGroups;

internal sealed class FriendGroupTestKit
{
    public const string Owner = "owner-1";
    public const string Stranger = "stranger-1";
    public const string Member = "member-1";
    public const string Invitee = "invitee-1";

    public static readonly DateTimeOffset Start = new(2026, 11, 13, 20, 0, 0, TimeSpan.Zero);

    public InMemoryFriendGroupRepository Groups { get; } = new();

    public InMemoryEventRepository Events { get; } = new();

    public InMemoryParticipantRepository Participants { get; } = new();

    public InMemoryMovieRepository Movies { get; } = new();

    public InMemoryVoteRepository Votes { get; } = new();

    public InMemorySeenMarkRepository SeenMarks { get; } = new();

    public InMemoryMovieRatingRepository Ratings { get; } = new();

    public InMemoryUserRepository Users { get; } = new();

    public InMemoryUserNotificationRepository Notifications { get; } = new();

    public InMemoryFollowRepository Follows { get; } = new();

    public InMemoryPushSubscriptionRepository PushSubscriptions { get; } = new();

    public Mock<IPushNotificationSender> Push { get; } = new();

    public Mock<ITmdbMovieSearch> Tmdb { get; } = new();

    public RecordingSharedQuota Quota { get; } = new();

    public SteppingClock Clock { get; } = new(Start);

    public FriendGroupNightsReader NightsReader() => new(
        Events,
        Participants,
        new MyEventSummaryEnricher(Participants, Movies, Ratings, Votes, Users),
        new FriendGroupShowcaseReader(Movies, Ratings, Tmdb.Object),
        Clock);

    public ListFriendGroupsHandler ListHandler() => new(Groups, Users, NightsReader(), Clock);

    public CreateFriendGroupHandler CreateHandler() => new(Groups, Users, Clock);

    public GetFriendGroupHandler GetHandler() => new(Groups, Users, NightsReader());

    public GetFriendGroupRankingHandler RankingHandler() =>
        new(Groups, Events, Participants, Movies, Votes, SeenMarks, Ratings, Clock);

    public UpdateFriendGroupHandler UpdateHandler() => new(Groups, Users, Clock);

    public DeleteFriendGroupHandler DeleteHandler() => new(Groups, Events, Notifications);

    public GetFriendGroupMembersHandler MembersHandler() => new(Groups, Users, Clock);

    public ListFriendGroupInvitableUsersHandler InvitableHandler() => new(Groups, Follows, Users, Clock);

    public InviteToFriendGroupHandler InviteHandler() =>
        new(Groups, Follows, Users, Notifications, PushSubscriptions, Push.Object, Quota, Clock);

    public CancelFriendGroupInvitationHandler CancelInvitationHandler() => new(Groups, Notifications);

    public AcceptFriendGroupInvitationHandler AcceptHandler() => new(Groups, Users, Clock);

    public DeclineFriendGroupInvitationHandler DeclineHandler() => new(Groups);

    public RemoveFriendGroupMemberHandler RemoveMemberHandler() => new(Groups);

    public LeaveFriendGroupHandler LeaveHandler() => new(Groups);

    public CreateFriendGroupInviteLinkHandler CreateLinkHandler() => new(Groups, Clock);

    public DisableFriendGroupInviteLinkHandler DisableLinkHandler() => new(Groups);

    public GetFriendGroupInvitePreviewHandler PreviewHandler() => new(Groups, Users, Clock);

    public JoinFriendGroupHandler JoinHandler() => new(Groups, Users, Clock);

    public Task<User> PersonAsync(string id, string displayName, bool isProfilePublic = true) =>
        Users.AddAsync(new User
        {
            Id = id,
            Email = $"{id}@test.local",
            DisplayName = displayName,
            Handle = id.Replace("-", string.Empty, StringComparison.Ordinal),
            AvatarId = $"avatar-{id}",
            IsProfilePublic = isProfilePublic,
            CreatedAt = Start,
            UpdatedAt = Start
        });

    public async Task AccountAsync(string id)
    {
        if (await Users.GetByIdAsync(id) is null)
            await Users.AddAsync(new User { Id = id, Email = $"{id}@test.local", CreatedAt = Start, UpdatedAt = Start });
    }

    public async Task<FriendGroupSummaryResponse> CreateAsync(string name, string owner = Owner)
    {
        await AccountAsync(owner);
        return await CreateHandler().HandleAsync(owner, new CreateFriendGroupRequest { Name = name });
    }

    public async Task ShareAsync(string groupId, params string[] members)
    {
        foreach (var member in members)
        {
            await Groups.AddInvitationAsync(groupId, new FriendGroupInvitation(member, Clock.Now), FriendGroup.MaxMembers);
            await Groups.AcceptInvitationAsync(groupId, new FriendGroupMember(member, Clock.Now));
        }
    }

    public Task InviteAsync(string groupId, string invitee) =>
        Groups.AddInvitationAsync(groupId, new FriendGroupInvitation(invitee, Clock.Now), FriendGroup.MaxMembers);
}

public abstract class FriendGroupTestBase
{
    internal FriendGroupTestKit Kit { get; } = new();

    protected async Task<FriendGroupSummaryResponse> SharedGroupAsync(params string[] members)
    {
        await Kit.PersonAsync(FriendGroupTestKit.Owner, "Léa");
        await Kit.PersonAsync(FriendGroupTestKit.Member, "Sam");
        await Kit.PersonAsync(FriendGroupTestKit.Invitee, "Zoé");
        await Kit.PersonAsync(FriendGroupTestKit.Stranger, "Intrus");
        var group = await Kit.CreateAsync("Les cinéphiles");
        if (members.Length > 0)
            await Kit.ShareAsync(group.Id, members);
        return group;
    }

    protected async Task FillAsync(string groupId, int seatsToTake)
    {
        for (var index = 1; index <= seatsToTake; index++)
        {
            var id = $"seat-{index}";
            await Kit.PersonAsync(id, $"Place {index}");
            await Kit.ShareAsync(groupId, id);
        }
    }
}
