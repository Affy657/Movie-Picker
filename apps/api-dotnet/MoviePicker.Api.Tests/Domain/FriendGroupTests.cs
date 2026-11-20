using MoviePicker.Api.Domain.Entities;
using Xunit;

namespace MoviePicker.Api.Tests.Domain;

public sealed class FriendGroupTests
{
    private static readonly DateTimeOffset InvitedAt = new(2026, 11, 1, 20, 0, 0, TimeSpan.Zero);

    [Fact]
    public void Limits_AreThoseOfTheProduct()
    {
        Assert.Equal(40, FriendGroup.MaxNameLength);
        Assert.Equal(20, FriendGroup.MaxMembers);
        Assert.Equal(20, FriendGroup.MaxPerOwner);
        Assert.Equal(4, FriendGroup.MemberPreviewCount);
        Assert.Equal(TimeSpan.FromDays(7), FriendGroup.InviteLinkLifetime);
    }

    [Fact]
    public void RoleOf_TellsTheOwnerFromAMember_AndKnowsNeitherAnInviteeNorAStranger()
    {
        var group = Shared(members: ["lea", "sam"], invited: ["zoe"]);

        Assert.Equal(FriendGroupRole.Owner, group.RoleOf("owner"));
        Assert.Equal(FriendGroupRole.Member, group.RoleOf("sam"));
        Assert.Null(group.RoleOf("zoe"));
        Assert.Null(group.RoleOf("stranger"));
        Assert.True(group.IsInvited("zoe", InvitedAt));
        Assert.False(group.IsInvited("sam", InvitedAt));
        Assert.True(group.HoldsInvitationOf("zoe"));
        Assert.False(group.HoldsInvitationOf("sam"));
    }

    [Fact]
    public void Seats_CountTheOwnerTheMembersAndThePendingInvitations()
    {
        var group = Shared(members: ["lea", "sam"], invited: ["zoe"]);

        Assert.Equal(3, group.MemberCount);
        Assert.Equal(4, group.SeatsTaken(InvitedAt));
        Assert.False(group.IsFull(InvitedAt));
    }

    [Fact]
    public void IsFull_AtTwentySeats_InvitationsIncluded()
    {
        var members = Enumerable.Range(1, 15).Select(index => $"m{index}").ToArray();
        var invited = Enumerable.Range(1, 4).Select(index => $"i{index}").ToArray();

        Assert.False(Shared(members: members, invited: invited[..3]).IsFull(InvitedAt));
        Assert.True(Shared(members: members, invited: invited).IsFull(InvitedAt));
        Assert.Equal(FriendGroup.MaxMembers, Shared(members: members, invited: invited).SeatsTaken(InvitedAt));
    }

    [Fact]
    public void AnInvitation_LapsesWithItsNotification_AndThenNeitherHoldsASeatNorCountsAsInvited()
    {
        var members = Enumerable.Range(1, 15).Select(index => $"m{index}").ToArray();
        var invited = Enumerable.Range(1, 4).Select(index => $"i{index}").ToArray();
        var group = Shared(members: members, invited: invited);
        var lastPendingMoment = InvitedAt + UserNotification.Lifetime - TimeSpan.FromMilliseconds(1);
        var lapsed = InvitedAt + UserNotification.Lifetime;

        Assert.Equal(UserNotification.Lifetime, FriendGroupInvitation.Lifetime);
        Assert.True(group.IsInvited("i1", lastPendingMoment));
        Assert.True(group.IsFull(lastPendingMoment));
        Assert.False(group.IsInvited("i1", lapsed));
        Assert.False(group.IsFull(lapsed));
        Assert.Equal(16, group.SeatsTaken(lapsed));
        Assert.Empty(group.PendingInvitations(lapsed));
        Assert.Equal(invited, group.PendingInvitations(lastPendingMoment).Select(invitation => invitation.UserId));
    }

    [Fact]
    public void PreviewMemberIds_PutsTheOwnerFirst_ThenTheEarliestMembers_FourPeopleAtMost()
    {
        Assert.Equal(["owner", "lea", "sam", "zoe"], Shared(members: ["lea", "sam", "zoe", "ana"]).PreviewMemberIds());
        Assert.Equal(["owner"], Shared().PreviewMemberIds());
    }

    [Fact]
    public void InviteLink_IsActive_OnlyBeforeItsExpiry_AndWhileEnabled()
    {
        var now = new DateTimeOffset(2026, 11, 13, 20, 0, 0, TimeSpan.Zero);
        var link = new FriendGroupInviteLink("token", now.AddDays(7), Disabled: false);

        Assert.True(link.IsActive(now));
        Assert.False(link.IsActive(now.AddDays(7)));
        Assert.False((link with { Disabled = true }).IsActive(now));
    }

    [Fact]
    public void AcceptsInviteToken_OnlyTheCurrentActiveToken()
    {
        var now = new DateTimeOffset(2026, 11, 13, 20, 0, 0, TimeSpan.Zero);
        var group = Shared() with { InviteLink = new FriendGroupInviteLink("token", now.AddDays(1), Disabled: false) };

        Assert.True(group.AcceptsInviteToken("token", now));
        Assert.False(group.AcceptsInviteToken("other", now));
        Assert.False(group.AcceptsInviteToken("token", now.AddDays(2)));
        Assert.False(Shared().AcceptsInviteToken("token", now));
    }

    private static FriendGroup Shared(string[]? members = null, string[]? invited = null) =>
        new()
        {
            OwnerId = "owner",
            Members = [.. (members ?? []).Select((id, index) => new FriendGroupMember(id, InvitedAt.AddMinutes(index)))],
            Invitations = [.. (invited ?? []).Select(id => new FriendGroupInvitation(id, InvitedAt))]
        };
}
