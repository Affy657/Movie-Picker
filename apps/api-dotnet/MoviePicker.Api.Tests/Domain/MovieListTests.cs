using MoviePicker.Api.Domain.Entities;
using Xunit;

namespace MoviePicker.Api.Tests.Domain;

public sealed class MovieListTests
{
    [Theory]
    [InlineData("Été", "ete")]
    [InlineData("  Films   cultes ", "films cultes")]
    [InlineData("FILMS CULTES", "Films cultes")]
    [InlineData("Ciné\tdu  dimanche", "cine du dimanche")]
    public void NameKey_IgnoresSpacingCaseAndDiacritics(string left, string right)
    {
        Assert.Equal(MovieListName.Key(left), MovieListName.Key(right));
    }

    [Theory]
    [InlineData("Films cultes", "Films culte")]
    [InlineData("Halloween", "Halloween 2")]
    public void NameKey_KeepsDistinctNamesApart(string left, string right)
    {
        Assert.NotEqual(MovieListName.Key(left), MovieListName.Key(right));
    }

    [Theory]
    [InlineData("À voir")]
    [InlineData("a voir")]
    [InlineData(" À VOIR ")]
    [InlineData("Watchlist")]
    [InlineData("WATCHLIST")]
    [InlineData("Films vus")]
    [InlineData(" films  VUS ")]
    [InlineData("Watched")]
    [InlineData("WATCHED")]
    public void SystemListNames_AreReserved(string name)
    {
        Assert.True(MovieListName.IsReserved(name));
    }

    [Theory]
    [InlineData("À voir absolument")]
    [InlineData("watch list")]
    [InlineData("Films vus en salle")]
    [InlineData("Watched twice")]
    public void OrdinaryNames_AreNotReserved(string name)
    {
        Assert.False(MovieListName.IsReserved(name));
    }

    [Fact]
    public void RecentPosterPaths_TakesTheLastThreePostersInReverseInsertionOrder()
    {
        var list = new MovieList
        {
            Items =
            [
                Item(1, "/p/1.jpg"),
                Item(2, "/p/2.jpg"),
                Item(3, null),
                Item(4, "/p/4.jpg"),
                Item(5, ""),
                Item(6, "/p/6.jpg")
            ]
        };

        Assert.Equal(["/p/6.jpg", "/p/4.jpg", "/p/2.jpg"], list.RecentPosterPaths());
    }

    [Fact]
    public void RecentPosterPaths_EmptyList_HasNone()
    {
        Assert.Empty(new MovieList().RecentPosterPaths());
    }

    [Fact]
    public void Find_MatchesTheIdAndTheMediaType()
    {
        var list = new MovieList { Items = [Item(42, null), Item(7, null) with { MediaType = MovieMediaType.Tv }] };

        Assert.NotNull(list.Find(42, MovieMediaType.Movie));
        Assert.Null(list.Find(42, MovieMediaType.Tv));
        Assert.NotNull(list.Find(7, MovieMediaType.Tv));
        Assert.Null(list.Find(7, MovieMediaType.Movie));
    }

    [Fact]
    public void RoleOf_TellsTheOwnerFromAMember_AndKnowsNeitherAnInviteeNorAStranger()
    {
        var list = Shared(members: ["lea", "sam"], invited: ["zoe"]);

        Assert.Equal(MovieListRole.Owner, list.RoleOf("owner"));
        Assert.Equal(MovieListRole.Member, list.RoleOf("sam"));
        Assert.Null(list.RoleOf("zoe"));
        Assert.Null(list.RoleOf("stranger"));
        Assert.True(list.IsInvited("zoe", InvitedAt));
        Assert.False(list.IsInvited("sam", InvitedAt));
    }

    [Fact]
    public void AuthorOf_AnItemWithoutAuthor_IsTheOwner()
    {
        var list = Shared(members: ["lea"]);

        Assert.Equal("owner", list.AuthorOf(Item(1, null)));
        Assert.Equal("lea", list.AuthorOf(Item(2, null) with { AddedByUserId = "lea" }));
    }

    [Fact]
    public void Seats_CountTheOwnerTheMembersAndThePendingInvitations()
    {
        var list = Shared(members: ["lea", "sam"], invited: ["zoe"]);

        Assert.Equal(3, list.MemberCount);
        Assert.Equal(4, list.SeatsTaken(InvitedAt));
        Assert.False(list.IsFull(InvitedAt));
    }

    [Fact]
    public void IsFull_AtTwentySeats_InvitationsIncluded()
    {
        var members = Enumerable.Range(1, 15).Select(index => $"m{index}").ToArray();
        var invited = Enumerable.Range(1, 4).Select(index => $"i{index}").ToArray();

        Assert.False(Shared(members: members, invited: invited[..3]).IsFull(InvitedAt));
        Assert.True(Shared(members: members, invited: invited).IsFull(InvitedAt));
        Assert.Equal(MovieList.MaxMembers, Shared(members: members, invited: invited).SeatsTaken(InvitedAt));
    }

    [Fact]
    public void AnInvitation_LapsesWithItsNotification_AndThenNeitherHoldsASeatNorCountsAsInvited()
    {
        var members = Enumerable.Range(1, 15).Select(index => $"m{index}").ToArray();
        var invited = Enumerable.Range(1, 4).Select(index => $"i{index}").ToArray();
        var list = Shared(members: members, invited: invited);
        var lastPendingMoment = InvitedAt + UserNotification.Lifetime - TimeSpan.FromMilliseconds(1);
        var lapsed = InvitedAt + UserNotification.Lifetime;

        Assert.Equal(TimeSpan.FromDays(90), MovieListInvitation.Lifetime);
        Assert.True(list.IsInvited("i1", lastPendingMoment));
        Assert.True(list.IsFull(lastPendingMoment));
        Assert.False(list.IsInvited("i1", lapsed));
        Assert.False(list.IsFull(lapsed));
        Assert.Equal(16, list.SeatsTaken(lapsed));
        Assert.Empty(list.PendingInvitations(lapsed));
        Assert.Equal(invited, list.PendingInvitations(lastPendingMoment).Select(invitation => invitation.UserId));
    }

    [Fact]
    public void PreviewMemberIds_PutsTheOwnerFirst_ThenTheEarliestMembers()
    {
        Assert.Equal(["owner", "lea", "sam"], Shared(members: ["lea", "sam", "zoe"]).PreviewMemberIds());
        Assert.Equal(["owner"], Shared().PreviewMemberIds());
    }

    [Fact]
    public void InviteLink_IsActive_OnlyBeforeItsExpiry_AndWhileEnabled()
    {
        var now = new DateTimeOffset(2026, 11, 13, 20, 0, 0, TimeSpan.Zero);
        var link = new MovieListInviteLink("token", now.AddDays(7), Disabled: false);

        Assert.True(link.IsActive(now));
        Assert.False(link.IsActive(now.AddDays(7)));
        Assert.False((link with { Disabled = true }).IsActive(now));
    }

    [Fact]
    public void AcceptsInviteToken_OnlyTheCurrentActiveToken()
    {
        var now = new DateTimeOffset(2026, 11, 13, 20, 0, 0, TimeSpan.Zero);
        var list = Shared() with { InviteLink = new MovieListInviteLink("token", now.AddDays(1), Disabled: false) };

        Assert.True(list.AcceptsInviteToken("token", now));
        Assert.False(list.AcceptsInviteToken("other", now));
        Assert.False(list.AcceptsInviteToken("token", now.AddDays(2)));
        Assert.False(Shared().AcceptsInviteToken("token", now));
    }

    private static readonly DateTimeOffset InvitedAt = new(2026, 11, 1, 20, 0, 0, TimeSpan.Zero);

    private static MovieList Shared(string[]? members = null, string[]? invited = null) =>
        new()
        {
            OwnerId = "owner",
            Members = [.. (members ?? []).Select((id, index) => new MovieListMember(id, InvitedAt.AddMinutes(index)))],
            Invitations = [.. (invited ?? []).Select(id => new MovieListInvitation(id, InvitedAt))]
        };

    private static MovieListItem Item(int tmdbId, string? poster) =>
        new() { TmdbId = tmdbId, Title = $"Film {tmdbId}", PosterPath = poster };
}
