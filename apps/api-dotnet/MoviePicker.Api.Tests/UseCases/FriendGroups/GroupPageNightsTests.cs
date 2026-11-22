using MoviePicker.Api.Domain.Entities;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.FriendGroups;

public sealed class GroupPageNightsTests : FriendGroupTestBase
{
    private async Task<Event> GroupNightAsync(
        string groupId,
        string slug,
        string date,
        string hostId = FriendGroupTestKit.Owner,
        params string[] guests)
    {
        var night = await Kit.Events.AddAsync(new Event
        {
            Title = slug,
            Date = date,
            Time = "21:00",
            Slug = slug,
            HostToken = "host-token",
            CreatorUserId = hostId,
            GroupId = groupId,
            CreatedAt = FriendGroupTestKit.Start,
            UpdatedAt = FriendGroupTestKit.Start
        });
        foreach (var userId in guests.Prepend(hostId))
            await Kit.Participants.AddAsync(new Participant { EventId = night.Id, Pseudo = userId, UserId = userId });
        return night;
    }

    private async Task<Event> WonAsync(Event night, string movieTitle)
    {
        var movie = await Kit.Movies.InsertAsync(new Movie
        {
            EventId = night.Id,
            ParticipantId = "p",
            TmdbId = movieTitle.Length,
            Title = movieTitle,
            Year = "2001",
            CreatedAt = FriendGroupTestKit.Start
        });
        return await Kit.Events.UpdateAsync(night with
        {
            Winners = [new EventWinner { MovieId = movie.Id, PickedAt = FriendGroupTestKit.Start }],
            ClosedAt = FriendGroupTestKit.Start
        });
    }

    [Fact]
    public async Task TheGroupPage_ListsItsUpcomingNightsInDateOrder_AndWhoComesToTheNextOne()
    {
        var group = await SharedGroupAsync(FriendGroupTestKit.Member, FriendGroupTestKit.Invitee);
        await GroupNightAsync(group.Id, "halloween", "2026-11-28", FriendGroupTestKit.Member);
        await GroupNightAsync(group.Id, "jeudi", "2026-11-26", FriendGroupTestKit.Owner, FriendGroupTestKit.Member);

        var page = await Kit.GetHandler().HandleAsync(FriendGroupTestKit.Invitee, group.Id);

        Assert.Equal(["jeudi", "halloween"], page.UpcomingNights.Select(n => n.Slug));
        Assert.All(page.UpcomingNights, n => Assert.False(n.IsParticipant));
        Assert.All(page.UpcomingNights, n => Assert.Equal(group.Name, n.GroupName));
        Assert.Equal(2, page.UpcomingNights[0].ParticipantCount);
        Assert.Equal(
            new[] { FriendGroupTestKit.Owner, FriendGroupTestKit.Member }.Order(),
            page.NextNightParticipantIds.Order());
    }

    [Fact]
    public async Task TheGroupPage_PutsANightOnHoldAfterTheUpcomingOnes_AndCountsWhoComesToTheRealNextOne()
    {
        var group = await SharedGroupAsync(FriendGroupTestKit.Member, FriendGroupTestKit.Invitee);
        await GroupNightAsync(group.Id, "en-suspens", "2026-11-12", FriendGroupTestKit.Member);
        await GroupNightAsync(group.Id, "jeudi", "2026-11-19", FriendGroupTestKit.Owner, FriendGroupTestKit.Invitee);

        var page = await Kit.GetHandler().HandleAsync(FriendGroupTestKit.Member, group.Id);

        Assert.Equal(["jeudi", "en-suspens"], page.UpcomingNights.Select(n => n.Slug));
        Assert.Equal("pending", page.UpcomingNights[1].Lifecycle);
        Assert.Equal(
            new[] { FriendGroupTestKit.Owner, FriendGroupTestKit.Invitee }.Order(),
            page.NextNightParticipantIds.Order());
    }

    [Fact]
    public async Task TheGroupPage_CountsNobodyComing_WhenOnlyANightOnHoldIsLeft()
    {
        var group = await SharedGroupAsync(FriendGroupTestKit.Member);
        await GroupNightAsync(group.Id, "en-suspens", "2026-11-12", FriendGroupTestKit.Member);

        var page = await Kit.GetHandler().HandleAsync(FriendGroupTestKit.Member, group.Id);

        Assert.Equal(["en-suspens"], page.UpcomingNights.Select(n => n.Slug));
        Assert.Empty(page.NextNightParticipantIds);
    }

    [Fact]
    public async Task MyGroups_NeverGiveANightOnHoldAsTheNextOne()
    {
        var group = await SharedGroupAsync(FriendGroupTestKit.Member);
        var quiet = await Kit.CreateAsync("Famille", FriendGroupTestKit.Member);
        await GroupNightAsync(group.Id, "en-suspens", "2026-11-12", FriendGroupTestKit.Member);
        await GroupNightAsync(group.Id, "jeudi", "2026-11-19", FriendGroupTestKit.Member);
        await GroupNightAsync(quiet.Id, "famille-en-suspens", "2026-11-11", FriendGroupTestKit.Member);

        var mine = await Kit.ListHandler().HandleAsync(FriendGroupTestKit.Member);

        var next = Assert.Single(mine.NextNights);
        Assert.Equal("jeudi", next.Slug);
    }

    [Fact]
    public async Task TheGroupPage_ShowsTheFilmsOfItsFinishedNights_NewestFirst_AndSkipsNightsWithoutFilm()
    {
        var group = await SharedGroupAsync(FriendGroupTestKit.Member);
        await WonAsync(await GroupNightAsync(group.Id, "octobre", "2026-10-29", FriendGroupTestKit.Owner, FriendGroupTestKit.Member), "Brume");
        await WonAsync(await GroupNightAsync(group.Id, "novembre", "2026-11-05"), "Minuit à Kyoto");
        await GroupNightAsync(group.Id, "vide", "2026-10-15");

        var page = await Kit.GetHandler().HandleAsync(FriendGroupTestKit.Member, group.Id);

        Assert.Empty(page.UpcomingNights);
        Assert.Empty(page.NextNightParticipantIds);
        Assert.Equal(["novembre", "octobre"], page.PastNights.Select(n => n.Slug));
        Assert.Equal(["Minuit à Kyoto"], page.PastNights[0].WinnerMovies.Select(m => m.Title));
        Assert.True(page.PastNights[1].IsParticipant);
        Assert.False(page.PastNights[0].IsParticipant);
    }

    [Fact]
    public async Task TheGroupPage_LeavesOutTheNightsOfOtherGroups()
    {
        var group = await SharedGroupAsync(FriendGroupTestKit.Member);
        var other = await Kit.CreateAsync("Famille", FriendGroupTestKit.Member);
        await GroupNightAsync(other.Id, "famille", "2026-11-27", FriendGroupTestKit.Member);

        var page = await Kit.GetHandler().HandleAsync(FriendGroupTestKit.Member, group.Id);

        Assert.Empty(page.UpcomingNights);
    }

    [Fact]
    public async Task MyGroups_GiveTheNextNightOfEachGroup()
    {
        var group = await SharedGroupAsync(FriendGroupTestKit.Member);
        var quiet = await Kit.CreateAsync("Famille", FriendGroupTestKit.Member);
        await GroupNightAsync(group.Id, "halloween", "2026-11-28");
        await GroupNightAsync(group.Id, "jeudi", "2026-11-26");
        await WonAsync(await GroupNightAsync(quiet.Id, "passee", "2026-10-01", FriendGroupTestKit.Member), "Brume");

        var mine = await Kit.ListHandler().HandleAsync(FriendGroupTestKit.Member);

        var next = Assert.Single(mine.NextNights);
        Assert.Equal("jeudi", next.Slug);
        Assert.Equal(group.Id, next.GroupId);
    }

    [Fact]
    public async Task TheGroupPage_DropsTheUpcomingNightsOfAMemberWhoWasRemoved_ButKeepsTheirFilms()
    {
        var group = await SharedGroupAsync(FriendGroupTestKit.Member, FriendGroupTestKit.Invitee);
        await GroupNightAsync(group.Id, "a-venir", "2026-11-26", FriendGroupTestKit.Member);
        await WonAsync(await GroupNightAsync(group.Id, "octobre", "2026-10-29", FriendGroupTestKit.Member), "Brume");
        await Kit.RemoveMemberHandler().HandleAsync(FriendGroupTestKit.Owner, group.Id, FriendGroupTestKit.Member);

        var page = await Kit.GetHandler().HandleAsync(FriendGroupTestKit.Invitee, group.Id);
        var mine = await Kit.ListHandler().HandleAsync(FriendGroupTestKit.Invitee);

        Assert.Empty(page.UpcomingNights);
        Assert.Equal(["octobre"], page.PastNights.Select(n => n.Slug));
        Assert.Empty(mine.NextNights);
    }

    [Fact]
    public async Task DeletingTheGroup_TakesItsNightsOutOfIt()
    {
        var group = await SharedGroupAsync(FriendGroupTestKit.Member);
        var night = await GroupNightAsync(group.Id, "jeudi", "2026-11-26", FriendGroupTestKit.Member);

        await Kit.DeleteHandler().HandleAsync(FriendGroupTestKit.Owner, group.Id);

        Assert.Empty(await Kit.Events.ListByGroupIdsAsync([group.Id]));
        Assert.Null(Assert.Single(await Kit.Events.ListByIdsAsync([night.Id])).GroupId);
    }
}
