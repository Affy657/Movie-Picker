using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using Xunit;
using static MoviePicker.Api.Tests.UseCases.FriendGroups.FriendGroupTestKit;

namespace MoviePicker.Api.Tests.UseCases.FriendGroups;

public sealed class CreateFriendGroupHandlerTests : FriendGroupTestBase
{
    [Fact]
    public async Task HandleAsync_TrimsTheName_AndMakesTheCallerTheOwnerAlone()
    {
        await Kit.PersonAsync(Owner, "Léa");

        var created = await Kit.CreateAsync("  Les cinéphiles  ");

        Assert.False(string.IsNullOrEmpty(created.Id));
        Assert.Equal("Les cinéphiles", created.Name);
        Assert.Equal(FriendGroupRole.Owner, created.Role);
        Assert.Equal((Owner, "Léa"), (created.OwnerId, created.OwnerDisplayName));
        Assert.Equal(1, created.MemberCount);
        var owner = Assert.Single(created.MemberPreview);
        Assert.Equal((Owner, "Léa", "avatar-owner-1"), (owner.UserId, owner.DisplayName, owner.AvatarId));
        Assert.Equal((Start, Start), (created.CreatedAt, created.UpdatedAt));
        Assert.Equal(Owner, (await Kit.Groups.FindAsync(created.Id))!.OwnerId);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public async Task HandleAsync_BlankName_IsAValidationError(string name)
    {
        var ex = await Assert.ThrowsAsync<BadRequestException>(() => Kit.CreateAsync(name));

        Assert.Equal(ErrorCodes.ValidationFailed, ex.Reason);
        Assert.Equal(0, await Kit.Groups.CountByOwnerAsync(Owner));
    }

    [Fact]
    public async Task HandleAsync_NameOfFortyCharactersOnceTrimmed_IsAccepted_AndOneMoreIsRefused()
    {
        var longest = new string('a', FriendGroup.MaxNameLength);

        var accepted = await Kit.CreateAsync($"  {longest}  ");
        var ex = await Assert.ThrowsAsync<BadRequestException>(() => Kit.CreateAsync(longest + "a"));

        Assert.Equal(longest, accepted.Name);
        Assert.Equal(ErrorCodes.ValidationFailed, ex.Reason);
        Assert.Equal(FriendGroup.MaxNameLength, ex.Parameters!["max"]);
    }

    [Fact]
    public async Task HandleAsync_TheSameNameTwice_IsAllowed()
    {
        await Kit.CreateAsync("Les cinéphiles");

        var again = await Kit.CreateAsync("Les cinéphiles");

        Assert.Equal("Les cinéphiles", again.Name);
        Assert.Equal(2, await Kit.Groups.CountByOwnerAsync(Owner));
    }

    [Fact]
    public async Task HandleAsync_TwentyFirstGroup_IsAConflict()
    {
        for (var index = 1; index <= FriendGroup.MaxPerOwner; index++)
            await Kit.CreateAsync($"Groupe {index}");

        var ex = await Assert.ThrowsAsync<ConflictException>(() => Kit.CreateAsync("Un de trop"));

        Assert.Equal(ErrorCodes.GroupLimitReached, ex.Reason);
        Assert.Equal(FriendGroup.MaxPerOwner, ex.Parameters!["max"]);
        Assert.Equal(FriendGroup.MaxPerOwner, await Kit.Groups.CountByOwnerAsync(Owner));
    }

    [Fact]
    public async Task HandleAsync_TheLimitIsPerOwner_AndGroupsJoinedDoNotCount()
    {
        for (var index = 1; index <= FriendGroup.MaxPerOwner; index++)
        {
            var joined = await Kit.CreateAsync($"Groupe {index}", owner: Stranger);
            await Kit.ShareAsync(joined.Id, Owner);
        }

        var created = await Kit.CreateAsync("Mon premier");

        Assert.Equal("Mon premier", created.Name);
    }

    [Fact]
    public async Task HandleAsync_ADeletedAccount_CreatesNothing()
    {
        var ex = await Assert.ThrowsAsync<NotFoundException>(() =>
            Kit.CreateHandler().HandleAsync("ghost-1", new CreateFriendGroupRequest { Name = "Fantômes" }));

        Assert.Equal(ErrorCodes.UserNotFound, ex.Reason);
        Assert.Equal(0, await Kit.Groups.CountByOwnerAsync("ghost-1"));
    }
}

public sealed class UpdateFriendGroupHandlerTests : FriendGroupTestBase
{
    private Task<FriendGroupSummaryResponse> RenameAsync(string groupId, string name, string by = Owner) =>
        Kit.UpdateHandler().HandleAsync(by, groupId, new UpdateFriendGroupRequest { Name = name });

    [Fact]
    public async Task HandleAsync_RenamesTheGroup_AndBumpsUpdatedAt()
    {
        var group = await SharedGroupAsync(Member);
        Kit.Clock.Advance(TimeSpan.FromHours(1));

        var renamed = await RenameAsync(group.Id, "  Ciné du jeudi  ");

        Assert.Equal((group.Id, "Ciné du jeudi"), (renamed.Id, renamed.Name));
        Assert.Equal((Start, Kit.Clock.Now), (renamed.CreatedAt, renamed.UpdatedAt));
        Assert.Equal(2, renamed.MemberCount);
        Assert.Equal("Ciné du jeudi", (await Kit.Groups.FindAsync(group.Id))!.Name);
    }

    [Fact]
    public async Task HandleAsync_BlankName_IsAValidationError()
    {
        var group = await SharedGroupAsync();

        var ex = await Assert.ThrowsAsync<BadRequestException>(() => RenameAsync(group.Id, "  "));

        Assert.Equal(ErrorCodes.ValidationFailed, ex.Reason);
        Assert.Equal("Les cinéphiles", (await Kit.Groups.FindAsync(group.Id))!.Name);
    }

    [Fact]
    public async Task HandleAsync_AMember_IsForbidden()
    {
        var group = await SharedGroupAsync(Member);

        var ex = await Assert.ThrowsAsync<ForbiddenException>(() => RenameAsync(group.Id, "Volé", by: Member));

        Assert.Equal(ErrorCodes.GroupOwnerOnly, ex.Reason);
        Assert.Equal("Les cinéphiles", (await Kit.Groups.FindAsync(group.Id))!.Name);
    }

    [Fact]
    public async Task HandleAsync_AStranger_SeesNoGroup()
    {
        var group = await SharedGroupAsync();

        var ex = await Assert.ThrowsAsync<NotFoundException>(() => RenameAsync(group.Id, "Volé", by: Stranger));

        Assert.Equal(ErrorCodes.GroupNotFound, ex.Reason);
    }
}

public sealed class DeleteFriendGroupHandlerTests : FriendGroupTestBase
{
    [Fact]
    public async Task HandleAsync_RemovesTheGroup_ForEveryMember_WithItsPendingInvitationNotices()
    {
        var group = await SharedGroupAsync(Member);
        await Kit.Follows.FollowAsync(Owner, Invitee);
        await Kit.InviteHandler().HandleAsync(Owner, group.Id, new InviteToFriendGroupRequest { UserId = Invitee });

        await Kit.DeleteHandler().HandleAsync(Owner, group.Id);

        Assert.Null(await Kit.Groups.FindAsync(group.Id));
        Assert.Empty((await Kit.ListHandler().HandleAsync(Member)).Groups);
        Assert.Empty(await Kit.Notifications.ListByUserIdAsync(Invitee));
    }

    [Fact]
    public async Task HandleAsync_AMember_IsForbidden_AndTheGroupStays()
    {
        var group = await SharedGroupAsync(Member);

        var ex = await Assert.ThrowsAsync<ForbiddenException>(() => Kit.DeleteHandler().HandleAsync(Member, group.Id));

        Assert.Equal(ErrorCodes.GroupOwnerOnly, ex.Reason);
        Assert.NotNull(await Kit.Groups.FindAsync(group.Id));
    }

    [Fact]
    public async Task HandleAsync_SomeoneElsesGroup_IsNotFound()
    {
        var group = await SharedGroupAsync();

        var ex = await Assert.ThrowsAsync<NotFoundException>(() => Kit.DeleteHandler().HandleAsync(Stranger, group.Id));

        Assert.Equal(ErrorCodes.GroupNotFound, ex.Reason);
        Assert.NotNull(await Kit.Groups.FindAsync(group.Id));
    }
}

public sealed class ListFriendGroupsHandlerTests : FriendGroupTestBase
{
    [Fact]
    public async Task HandleAsync_ListsTheOwnedAndJoinedGroups_LatestUpdatedFirst_WithTheirOwnerAndFirstPeople()
    {
        var shared = await SharedGroupAsync(Member, Invitee);
        Kit.Clock.Advance(TimeSpan.FromHours(1));
        var own = await Kit.CreateAsync("Les miens", owner: Member);
        await Kit.CreateAsync("Sans Sam", owner: Stranger);

        var groups = (await Kit.ListHandler().HandleAsync(Member)).Groups;

        Assert.Equal([own.Id, shared.Id], groups.Select(group => group.Id));
        Assert.Equal(FriendGroupRole.Owner, groups[0].Role);
        Assert.Equal(1, groups[0].MemberCount);
        var joined = groups[1];
        Assert.Equal(FriendGroupRole.Member, joined.Role);
        Assert.Equal((Owner, "Léa"), (joined.OwnerId, joined.OwnerDisplayName));
        Assert.Equal(3, joined.MemberCount);
        Assert.Equal(["Léa", "Sam", "Zoé"], joined.MemberPreview.Select(person => person.DisplayName));
    }

    [Fact]
    public async Task HandleAsync_ThePreview_StopsAtFourPeople_OwnerFirst()
    {
        var group = await SharedGroupAsync(Member, Invitee, Stranger);
        await Kit.PersonAsync("member-4", "Ana");
        await Kit.ShareAsync(group.Id, "member-4");

        var summary = Assert.Single((await Kit.ListHandler().HandleAsync(Owner)).Groups);

        Assert.Equal(5, summary.MemberCount);
        Assert.Equal([Owner, Member, Invitee, Stranger], summary.MemberPreview.Select(person => person.UserId));
    }

    [Fact]
    public async Task HandleAsync_ListsThePendingInvitationsAddressedToTheCaller_ButNotThoseLapsedOrSentToOthers()
    {
        var group = await SharedGroupAsync(Member);
        await Kit.InviteAsync(group.Id, Invitee);
        Kit.Clock.Advance(TimeSpan.FromMinutes(5));
        var lapsed = await Kit.CreateAsync("Oublié", owner: Stranger);
        await Kit.Groups.AddInvitationAsync(lapsed.Id, new FriendGroupInvitation(Invitee, Start - FriendGroupInvitation.Lifetime), FriendGroup.MaxMembers);

        var mine = await Kit.ListHandler().HandleAsync(Invitee);
        var others = await Kit.ListHandler().HandleAsync(Member);

        Assert.Empty(mine.Groups);
        var invitation = Assert.Single(mine.Invitations);
        Assert.Equal((group.Id, "Les cinéphiles", "Léa", 2, Start), (invitation.GroupId, invitation.Name, invitation.InvitedByDisplayName, invitation.MemberCount, invitation.InvitedAt));
        Assert.Equal(["Léa", "Sam"], invitation.MemberPreview.Select(person => person.DisplayName));
        Assert.Empty(others.Invitations);
    }

    [Fact]
    public async Task HandleAsync_SomeoneWithoutAnyGroup_GetsTwoEmptyCollections()
    {
        var mine = await Kit.ListHandler().HandleAsync(Stranger);

        Assert.Empty(mine.Groups);
        Assert.Empty(mine.Invitations);
    }
}

public sealed class GetFriendGroupHandlerTests : FriendGroupTestBase
{
    [Fact]
    public async Task HandleAsync_AMember_SeesTheSummaryAndEveryMember_OwnerFirst()
    {
        var group = await SharedGroupAsync(Member);
        Kit.Clock.Advance(TimeSpan.FromHours(1));
        await Kit.ShareAsync(group.Id, Invitee);
        await Kit.PersonAsync("member-4", "Ana", isProfilePublic: false);
        await Kit.ShareAsync(group.Id, "member-4");

        var detail = await Kit.GetHandler().HandleAsync(Member, group.Id);

        Assert.Equal((group.Id, "Les cinéphiles", FriendGroupRole.Member), (detail.Id, detail.Name, detail.Role));
        Assert.Equal((Owner, "Léa", 4), (detail.OwnerId, detail.OwnerDisplayName, detail.MemberCount));
        Assert.Equal([Owner, Member, Invitee, "member-4"], detail.MemberPreview.Select(person => person.UserId));
        Assert.Equal(
            [
                (Owner, (string?)"owner1", "Léa", "avatar-owner-1", FriendGroupRole.Owner, Start),
                (Member, "member1", "Sam", "avatar-member-1", FriendGroupRole.Member, Start),
                (Invitee, "invitee1", "Zoé", "avatar-invitee-1", FriendGroupRole.Member, Kit.Clock.Now),
                ("member-4", null, "Ana", "avatar-member-4", FriendGroupRole.Member, Kit.Clock.Now)
            ],
            detail.Members.Select(m => (m.UserId, m.Handle, m.DisplayName, m.AvatarId, m.Role, m.JoinedAt)));
    }

    [Fact]
    public async Task HandleAsync_TheOwner_SeesTheirRole()
    {
        var group = await SharedGroupAsync(Member);

        var detail = await Kit.GetHandler().HandleAsync(Owner, group.Id);

        Assert.Equal(FriendGroupRole.Owner, detail.Role);
        Assert.Equal(2, detail.Members.Count);
    }

    [Theory]
    [InlineData(Invitee)]
    [InlineData(Stranger)]
    public async Task HandleAsync_SomeoneOutside_IsNotFound(string outsider)
    {
        var group = await SharedGroupAsync(Member);
        await Kit.InviteAsync(group.Id, Invitee);

        var ex = await Assert.ThrowsAsync<NotFoundException>(() => Kit.GetHandler().HandleAsync(outsider, group.Id));

        Assert.Equal(ErrorCodes.GroupNotFound, ex.Reason);
    }

    [Fact]
    public async Task HandleAsync_AnUnknownGroup_IsNotFound()
    {
        var ex = await Assert.ThrowsAsync<NotFoundException>(() => Kit.GetHandler().HandleAsync(Owner, "missing"));

        Assert.Equal(ErrorCodes.GroupNotFound, ex.Reason);
    }
}
