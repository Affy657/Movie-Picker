using MoviePicker.Api.Application.UseCases.FriendGroupMembers;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using MoviePicker.Api.Tests.UseCases.FriendGroups;
using Xunit;
using static MoviePicker.Api.Tests.UseCases.FriendGroups.FriendGroupTestKit;

namespace MoviePicker.Api.Tests.UseCases.FriendGroupMembers;

public sealed class FriendGroupInviteTokenTests
{
    [Fact]
    public void New_IsUrlSafe_LongEnough_AndNeverTheSame()
    {
        var tokens = Enumerable.Range(0, 200).Select(_ => FriendGroupInviteToken.New()).ToList();

        Assert.All(tokens, token => Assert.Matches("^[A-Za-z0-9_-]{22,}$", token));
        Assert.Equal(tokens.Count, tokens.Distinct(StringComparer.Ordinal).Count());
    }
}

public sealed class FriendGroupInviteLinkHandlersTests : FriendGroupTestBase
{
    [Fact]
    public async Task Create_GivesASevenDayLink_AndANewOneReplacesIt()
    {
        var group = await SharedGroupAsync();

        var first = await Kit.CreateLinkHandler().HandleAsync(Owner, group.Id);
        var second = await Kit.CreateLinkHandler().HandleAsync(Owner, group.Id);

        Assert.True(first.Active);
        Assert.Equal(Start.AddDays(7), first.ExpiresAt);
        Assert.NotEqual(first.Token, second.Token);
        Assert.Equal(second.Token, (await Kit.Groups.FindAsync(group.Id))!.InviteLink!.Token);
    }

    [Fact]
    public async Task CreateAndDisable_AreForTheOwnerOnly()
    {
        var group = await SharedGroupAsync(Member);

        var create = await Assert.ThrowsAsync<ForbiddenException>(() => Kit.CreateLinkHandler().HandleAsync(Member, group.Id));
        var disable = await Assert.ThrowsAsync<ForbiddenException>(() => Kit.DisableLinkHandler().HandleAsync(Member, group.Id));
        var hidden = await Assert.ThrowsAsync<NotFoundException>(() => Kit.CreateLinkHandler().HandleAsync(Stranger, group.Id));

        Assert.Equal(ErrorCodes.GroupOwnerOnly, create.Reason);
        Assert.Equal(ErrorCodes.GroupOwnerOnly, disable.Reason);
        Assert.Equal(ErrorCodes.GroupNotFound, hidden.Reason);
    }

    [Fact]
    public async Task Disable_StopsTheLink_ForThePreviewAndForJoining()
    {
        var group = await SharedGroupAsync();
        var link = await Kit.CreateLinkHandler().HandleAsync(Owner, group.Id);

        await Kit.DisableLinkHandler().HandleAsync(Owner, group.Id);

        var preview = await Assert.ThrowsAsync<NotFoundException>(() => Kit.PreviewHandler().HandleAsync(null, link.Token));
        var join = await Assert.ThrowsAsync<NotFoundException>(() => Kit.JoinHandler().HandleAsync(Invitee, link.Token));
        Assert.Equal(ErrorCodes.GroupInviteLinkInvalid, preview.Reason);
        Assert.Equal(ErrorCodes.GroupInviteLinkInvalid, join.Reason);
        Assert.False((await Kit.MembersHandler().HandleAsync(Owner, group.Id)).InviteLink!.Active);
    }

    [Fact]
    public async Task Preview_ShowsTheNameTheOwnerTheCountAndTheFirstPeople_ToAnyone()
    {
        var group = await SharedGroupAsync(Member);
        var link = await Kit.CreateLinkHandler().HandleAsync(Owner, group.Id);

        var preview = await Kit.PreviewHandler().HandleAsync(null, link.Token);

        Assert.Equal("Les cinéphiles", preview.Name);
        Assert.Equal("Léa", preview.OwnerDisplayName);
        Assert.Equal(2, preview.MemberCount);
        Assert.Equal([("Léa", "avatar-owner-1"), ("Sam", "avatar-member-1")], preview.MemberPreview.Select(person => (person.DisplayName, person.AvatarId)));
        Assert.False(preview.IsFull);
        Assert.Null(preview.Role);
        Assert.Null(preview.GroupId);
    }

    [Fact]
    public async Task Preview_ToSomeoneAlreadyIn_TellsTheirRoleAndTheGroup()
    {
        var group = await SharedGroupAsync(Member);
        var link = await Kit.CreateLinkHandler().HandleAsync(Owner, group.Id);

        var asMember = await Kit.PreviewHandler().HandleAsync(Member, link.Token);
        var asOwner = await Kit.PreviewHandler().HandleAsync(Owner, link.Token);
        var asStranger = await Kit.PreviewHandler().HandleAsync(Stranger, link.Token);

        Assert.Equal((FriendGroupRole.Member, group.Id), (asMember.Role, asMember.GroupId));
        Assert.Equal(FriendGroupRole.Owner, asOwner.Role);
        Assert.Null(asStranger.Role);
        Assert.Null(asStranger.GroupId);
    }

    [Fact]
    public async Task Preview_AFullGroup_SaysSo_ExceptToWhomItKeptASeat()
    {
        var group = await SharedGroupAsync(Member);
        await FillAsync(group.Id, 17);
        await Kit.InviteAsync(group.Id, Invitee);
        var link = await Kit.CreateLinkHandler().HandleAsync(Owner, group.Id);

        Assert.True((await Kit.PreviewHandler().HandleAsync(Stranger, link.Token)).IsFull);
        Assert.False((await Kit.PreviewHandler().HandleAsync(Invitee, link.Token)).IsFull);
    }

    [Theory]
    [InlineData("unknown-token")]
    [InlineData("")]
    public async Task Preview_AnUnknownToken_IsNotFound(string token)
    {
        var ex = await Assert.ThrowsAsync<NotFoundException>(() => Kit.PreviewHandler().HandleAsync(null, token));

        Assert.Equal(ErrorCodes.GroupInviteLinkInvalid, ex.Reason);
    }

    [Fact]
    public async Task PreviewAndJoin_ATokenLongerThanAnyIssued_IsNotFound()
    {
        var token = new string('a', FriendGroupInviteToken.MaxLength + 1);

        var preview = await Assert.ThrowsAsync<NotFoundException>(() => Kit.PreviewHandler().HandleAsync(null, token));
        var join = await Assert.ThrowsAsync<NotFoundException>(() => Kit.JoinHandler().HandleAsync(Invitee, token));

        Assert.Equal(ErrorCodes.GroupInviteLinkInvalid, preview.Reason);
        Assert.Equal(ErrorCodes.GroupInviteLinkInvalid, join.Reason);
    }

    [Fact]
    public async Task PreviewAndJoin_AnExpiredLink_IsNotFound()
    {
        var group = await SharedGroupAsync();
        var link = await Kit.CreateLinkHandler().HandleAsync(Owner, group.Id);
        Kit.Clock.Advance(TimeSpan.FromDays(7));

        var preview = await Assert.ThrowsAsync<NotFoundException>(() => Kit.PreviewHandler().HandleAsync(null, link.Token));
        var join = await Assert.ThrowsAsync<NotFoundException>(() => Kit.JoinHandler().HandleAsync(Invitee, link.Token));

        Assert.Equal(ErrorCodes.GroupInviteLinkInvalid, preview.Reason);
        Assert.Equal(ErrorCodes.GroupInviteLinkInvalid, join.Reason);
    }

    [Fact]
    public async Task Join_AddsTheCallerAsAMember_AndAnswersTheGroup()
    {
        var group = await SharedGroupAsync();
        var link = await Kit.CreateLinkHandler().HandleAsync(Owner, group.Id);
        Kit.Clock.Advance(TimeSpan.FromHours(2));

        var join = await Kit.JoinHandler().HandleAsync(Stranger, link.Token);

        Assert.True(join.Joined);
        Assert.Equal((group.Id, FriendGroupRole.Member, 2), (join.Group.Id, join.Group.Role, join.Group.MemberCount));
        Assert.Equal(new FriendGroupMember(Stranger, Kit.Clock.Now), Assert.Single((await Kit.Groups.FindAsync(group.Id))!.Members));
    }

    [Fact]
    public async Task Join_IsIdempotent_ForAMemberAndForTheOwner_EvenOnceTheLinkExpired()
    {
        var group = await SharedGroupAsync(Member);
        var link = await Kit.CreateLinkHandler().HandleAsync(Owner, group.Id);
        Kit.Clock.Advance(TimeSpan.FromDays(8));

        var member = await Kit.JoinHandler().HandleAsync(Member, link.Token);
        var owner = await Kit.JoinHandler().HandleAsync(Owner, link.Token);

        Assert.False(member.Joined);
        Assert.Equal(FriendGroupRole.Member, member.Group.Role);
        Assert.False(owner.Joined);
        Assert.Equal(FriendGroupRole.Owner, owner.Group.Role);
        Assert.Single((await Kit.Groups.FindAsync(group.Id))!.Members);
    }

    [Fact]
    public async Task Join_APendingInvitee_TakesTheSeatKeptForThem()
    {
        var group = await SharedGroupAsync(Member);
        await FillAsync(group.Id, 17);
        await Kit.InviteAsync(group.Id, Invitee);
        var link = await Kit.CreateLinkHandler().HandleAsync(Owner, group.Id);

        var join = await Kit.JoinHandler().HandleAsync(Invitee, link.Token);

        Assert.True(join.Joined);
        var stored = (await Kit.Groups.FindAsync(group.Id))!;
        Assert.Empty(stored.Invitations);
        Assert.Equal(FriendGroup.MaxMembers, stored.MemberCount);
    }

    [Fact]
    public async Task Join_AFullGroup_IsAConflict()
    {
        var group = await SharedGroupAsync(Member);
        await FillAsync(group.Id, 18);
        var link = await Kit.CreateLinkHandler().HandleAsync(Owner, group.Id);

        var ex = await Assert.ThrowsAsync<ConflictException>(() => Kit.JoinHandler().HandleAsync(Stranger, link.Token));

        Assert.Equal(ErrorCodes.GroupMembersLimitReached, ex.Reason);
        Assert.Equal(FriendGroup.MaxMembers, ex.Parameters!["max"]);
    }

    [Fact]
    public async Task Join_AnUnknownToken_IsNotFound()
    {
        var ex = await Assert.ThrowsAsync<NotFoundException>(() => Kit.JoinHandler().HandleAsync(Stranger, "unknown-token"));

        Assert.Equal(ErrorCodes.GroupInviteLinkInvalid, ex.Reason);
    }
}
