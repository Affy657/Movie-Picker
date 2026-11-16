using MoviePicker.Api.Application.UseCases.MovieListMembers;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using Xunit;
using static MoviePicker.Api.Tests.UseCases.MovieLists.MovieListTestKit;

namespace MoviePicker.Api.Tests.UseCases.MovieListMembers;

public sealed class MovieListInviteTokenTests
{
    [Fact]
    public void New_IsUrlSafe_LongEnough_AndNeverTheSame()
    {
        var tokens = Enumerable.Range(0, 200).Select(_ => MovieListInviteToken.New()).ToList();

        Assert.All(tokens, token => Assert.Matches("^[A-Za-z0-9_-]{22,}$", token));
        Assert.Equal(tokens.Count, tokens.Distinct(StringComparer.Ordinal).Count());
    }
}

public sealed class MovieListInviteLinkHandlersTests : MovieListMembershipTestBase
{
    [Fact]
    public async Task Create_GivesASevenDayLink_AndANewOneReplacesIt()
    {
        var list = await SharedListAsync();

        var first = await Kit.CreateLinkHandler().HandleAsync(Owner, list.Id);
        var second = await Kit.CreateLinkHandler().HandleAsync(Owner, list.Id);

        Assert.True(first.Active);
        Assert.Equal(Start.AddDays(7), first.ExpiresAt);
        Assert.NotEqual(first.Token, second.Token);
        Assert.Equal(second.Token, (await Kit.Lists.FindAsync(list.Id))!.InviteLink!.Token);
    }

    [Fact]
    public async Task CreateAndDisable_AreForTheOwnerOnly()
    {
        var list = await SharedListAsync(Member);

        var create = await Assert.ThrowsAsync<ForbiddenException>(() => Kit.CreateLinkHandler().HandleAsync(Member, list.Id));
        var disable = await Assert.ThrowsAsync<ForbiddenException>(() => Kit.DisableLinkHandler().HandleAsync(Member, list.Id));
        var hidden = await Assert.ThrowsAsync<NotFoundException>(() => Kit.CreateLinkHandler().HandleAsync(Stranger, list.Id));

        Assert.Equal(ErrorCodes.ListOwnerOnly, create.Reason);
        Assert.Equal(ErrorCodes.ListOwnerOnly, disable.Reason);
        Assert.Equal(ErrorCodes.ListNotFound, hidden.Reason);
    }

    [Fact]
    public async Task Disable_StopsTheLink_ForThePreviewAndForJoining()
    {
        var list = await SharedListAsync();
        var link = await Kit.CreateLinkHandler().HandleAsync(Owner, list.Id);

        await Kit.DisableLinkHandler().HandleAsync(Owner, list.Id);

        var preview = await Assert.ThrowsAsync<NotFoundException>(() => Kit.PreviewHandler().HandleAsync(null, link.Token));
        var join = await Assert.ThrowsAsync<NotFoundException>(() => Kit.JoinHandler().HandleAsync(Invitee, link.Token));
        Assert.Equal(ErrorCodes.ListInviteLinkInvalid, preview.Reason);
        Assert.Equal(ErrorCodes.ListInviteLinkInvalid, join.Reason);
        Assert.False((await Kit.MembersHandler().HandleAsync(Owner, list.Id)).InviteLink!.Active);
    }

    [Fact]
    public async Task Preview_ShowsTheNameTheOwnerTheCountAndAFewPosters_ToAnyone()
    {
        var list = await SharedListAsync(Member);
        await Kit.AddAsync(list.Id, Title(1, Poster(1)));
        await Kit.AddAsync(list.Id, Title(2, Poster(2)), owner: Member);
        var link = await Kit.CreateLinkHandler().HandleAsync(Owner, list.Id);

        var preview = await Kit.PreviewHandler().HandleAsync(null, link.Token);

        Assert.Equal("Halloween", preview.Name);
        Assert.Equal(("owner1", "Léa", "avatar-owner-1"), (preview.Owner.Handle, preview.Owner.DisplayName, preview.Owner.AvatarId));
        Assert.Equal(2, preview.ItemCount);
        Assert.Equal([Poster(2), Poster(1)], preview.PosterPaths);
        Assert.False(preview.IsFull);
        Assert.Null(preview.Role);
        Assert.Null(preview.ListId);
    }

    [Fact]
    public async Task Preview_ToSomeoneAlreadyIn_TellsTheirRoleAndTheList()
    {
        var list = await SharedListAsync(Member);
        var link = await Kit.CreateLinkHandler().HandleAsync(Owner, list.Id);

        var asMember = await Kit.PreviewHandler().HandleAsync(Member, link.Token);
        var asOwner = await Kit.PreviewHandler().HandleAsync(Owner, link.Token);
        var asStranger = await Kit.PreviewHandler().HandleAsync(Stranger, link.Token);

        Assert.Equal((MovieListRole.Member, list.Id), (asMember.Role, asMember.ListId));
        Assert.Equal(MovieListRole.Owner, asOwner.Role);
        Assert.Null(asStranger.Role);
        Assert.Null(asStranger.ListId);
    }

    [Fact]
    public async Task Preview_AFullList_SaysSo_ExceptToWhomItKeptASeat()
    {
        var list = await SharedListAsync(Member);
        await FillAsync(list.Id, 17);
        await Kit.InviteAsync(list.Id, Invitee);
        var link = await Kit.CreateLinkHandler().HandleAsync(Owner, list.Id);

        Assert.True((await Kit.PreviewHandler().HandleAsync(Stranger, link.Token)).IsFull);
        Assert.False((await Kit.PreviewHandler().HandleAsync(Invitee, link.Token)).IsFull);
    }

    [Theory]
    [InlineData("unknown-token")]
    [InlineData("")]
    public async Task Preview_AnUnknownToken_IsNotFound(string token)
    {
        var ex = await Assert.ThrowsAsync<NotFoundException>(() => Kit.PreviewHandler().HandleAsync(null, token));

        Assert.Equal(ErrorCodes.ListInviteLinkInvalid, ex.Reason);
    }

    [Fact]
    public async Task PreviewAndJoin_AnExpiredLink_IsNotFound()
    {
        var list = await SharedListAsync();
        var link = await Kit.CreateLinkHandler().HandleAsync(Owner, list.Id);
        Kit.Clock.Advance(TimeSpan.FromDays(7));

        var preview = await Assert.ThrowsAsync<NotFoundException>(() => Kit.PreviewHandler().HandleAsync(null, link.Token));
        var join = await Assert.ThrowsAsync<NotFoundException>(() => Kit.JoinHandler().HandleAsync(Invitee, link.Token));

        Assert.Equal(ErrorCodes.ListInviteLinkInvalid, preview.Reason);
        Assert.Equal(ErrorCodes.ListInviteLinkInvalid, join.Reason);
    }

    [Fact]
    public async Task Join_AddsTheCallerAsAMember_AndAnswersTheList()
    {
        var list = await SharedListAsync();
        var link = await Kit.CreateLinkHandler().HandleAsync(Owner, list.Id);
        Kit.Clock.Advance(TimeSpan.FromHours(2));

        var join = await Kit.JoinHandler().HandleAsync(Stranger, link.Token);

        Assert.True(join.Joined);
        Assert.Equal((list.Id, MovieListRole.Member, 2), (join.List.Id, join.List.Role, join.List.MemberCount));
        Assert.Equal(new MovieListMember(Stranger, Kit.Clock.Now), Assert.Single((await Kit.Lists.FindAsync(list.Id))!.Members));
    }

    [Fact]
    public async Task Join_IsIdempotent_ForAMemberAndForTheOwner_EvenOnceTheLinkExpired()
    {
        var list = await SharedListAsync(Member);
        var link = await Kit.CreateLinkHandler().HandleAsync(Owner, list.Id);
        Kit.Clock.Advance(TimeSpan.FromDays(8));

        var member = await Kit.JoinHandler().HandleAsync(Member, link.Token);
        var owner = await Kit.JoinHandler().HandleAsync(Owner, link.Token);

        Assert.False(member.Joined);
        Assert.Equal(MovieListRole.Member, member.List.Role);
        Assert.False(owner.Joined);
        Assert.Equal(MovieListRole.Owner, owner.List.Role);
        Assert.Single((await Kit.Lists.FindAsync(list.Id))!.Members);
    }

    [Fact]
    public async Task Join_APendingInvitee_TakesTheSeatKeptForThem()
    {
        var list = await SharedListAsync(Member);
        await FillAsync(list.Id, 17);
        await Kit.InviteAsync(list.Id, Invitee);
        var link = await Kit.CreateLinkHandler().HandleAsync(Owner, list.Id);

        var join = await Kit.JoinHandler().HandleAsync(Invitee, link.Token);

        Assert.True(join.Joined);
        var stored = (await Kit.Lists.FindAsync(list.Id))!;
        Assert.Empty(stored.Invitations);
        Assert.Equal(MovieList.MaxMembers, stored.MemberCount);
    }

    [Fact]
    public async Task Join_AFullList_IsAConflict()
    {
        var list = await SharedListAsync(Member);
        await FillAsync(list.Id, 18);
        var link = await Kit.CreateLinkHandler().HandleAsync(Owner, list.Id);

        var ex = await Assert.ThrowsAsync<ConflictException>(() => Kit.JoinHandler().HandleAsync(Stranger, link.Token));

        Assert.Equal(ErrorCodes.ListMembersLimitReached, ex.Reason);
        Assert.Equal(MovieList.MaxMembers, ex.Parameters!["max"]);
    }

    [Fact]
    public async Task Join_AnUnknownToken_IsNotFound()
    {
        var ex = await Assert.ThrowsAsync<NotFoundException>(() => Kit.JoinHandler().HandleAsync(Stranger, "unknown-token"));

        Assert.Equal(ErrorCodes.ListInviteLinkInvalid, ex.Reason);
    }
}
