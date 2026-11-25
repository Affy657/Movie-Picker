using MoviePicker.Api.Application.UseCases.ListMyEvents;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Infrastructure.Persistence.InMemory;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.FriendGroups;

public sealed class GroupNightsInMyNightsTests : FriendGroupTestBase
{
    private readonly InMemoryEventRepository _events = new();
    private readonly InMemoryParticipantRepository _participants = new();
    private readonly InMemoryMovieRepository _movies = new();

    private ListMyEventsHandler Handler() => new(
        _events,
        _participants,
        _movies,
        new InMemoryMovieRatingRepository(),
        new InMemoryVoteRepository(),
        Kit.Users,
        Kit.Groups,
        Kit.Clock);

    private async Task<Event> GroupNightAsync(string hostId, string groupId, string date = "2026-11-26", string slug = "jeudi-cine")
    {
        var night = await _events.AddAsync(new Event
        {
            Title = "Jeudi ciné",
            Date = date,
            Time = "21:00",
            Slug = slug,
            HostToken = "host-token",
            CreatorUserId = hostId,
            GroupId = groupId,
            CreatedAt = FriendGroupTestKit.Start,
            UpdatedAt = FriendGroupTestKit.Start
        });
        await _participants.AddAsync(new Participant { EventId = night.Id, Pseudo = "Hôte", UserId = hostId });
        return night;
    }

    [Fact]
    public async Task AnUpcomingNightOfTheirGroup_ShowsInAMemberNights_NotJoinedYet_WithItsGroupName()
    {
        var group = await SharedGroupAsync(FriendGroupTestKit.Member);
        var night = await GroupNightAsync(FriendGroupTestKit.Owner, group.Id);

        var mine = await Handler().HandleAsync(FriendGroupTestKit.Member, "active", null, null, null);

        var listed = Assert.Single(mine.Events);
        Assert.Equal(night.Slug, listed.Slug);
        Assert.False(listed.IsParticipant);
        Assert.False(listed.IsCreator);
        Assert.Equal(group.Id, listed.GroupId);
        Assert.Equal(group.Name, listed.GroupName);
        Assert.Equal(1, mine.TotalActive);
    }

    [Fact]
    public async Task TheHostOwnNight_CarriesItsGroupName()
    {
        var group = await SharedGroupAsync(FriendGroupTestKit.Member);
        await GroupNightAsync(FriendGroupTestKit.Owner, group.Id);

        var mine = await Handler().HandleAsync(FriendGroupTestKit.Owner, "active", null, null, null);

        var listed = Assert.Single(mine.Events);
        Assert.True(listed.IsParticipant);
        Assert.Equal(group.Name, listed.GroupName);
    }

    [Fact]
    public async Task ANightOfAGroupTheViewerLeft_IsNoLongerListed()
    {
        var group = await SharedGroupAsync(FriendGroupTestKit.Member);
        await GroupNightAsync(FriendGroupTestKit.Owner, group.Id);
        await Kit.LeaveHandler().HandleAsync(FriendGroupTestKit.Member, group.Id);

        var mine = await Handler().HandleAsync(FriendGroupTestKit.Member, "active", null, null, null);

        Assert.Empty(mine.Events);
        Assert.Equal(0, mine.TotalActive);
    }

    [Fact]
    public async Task AFinishedGroupNightTheViewerNeverJoined_StaysOutOfTheirHistory()
    {
        var group = await SharedGroupAsync(FriendGroupTestKit.Member);
        await GroupNightAsync(FriendGroupTestKit.Owner, group.Id, date: "2026-10-01", slug: "octobre");

        var history = await Handler().HandleAsync(FriendGroupTestKit.Member, "finished", null, null, null);

        Assert.Empty(history.Events);
        Assert.Equal(0, history.TotalFinished);
    }

    [Fact]
    public async Task AStrangerToTheGroup_DoesNotSeeItsNights()
    {
        var group = await SharedGroupAsync(FriendGroupTestKit.Member);
        await GroupNightAsync(FriendGroupTestKit.Owner, group.Id);

        var mine = await Handler().HandleAsync(FriendGroupTestKit.Stranger, "active", null, null, null);

        Assert.Empty(mine.Events);
    }

    [Fact]
    public async Task ANightWhoseHostLeftTheGroup_IsNoLongerOfferedToItsMembers()
    {
        var group = await SharedGroupAsync(FriendGroupTestKit.Member, FriendGroupTestKit.Invitee);
        await GroupNightAsync(FriendGroupTestKit.Member, group.Id);
        await Kit.LeaveHandler().HandleAsync(FriendGroupTestKit.Member, group.Id);

        var mine = await Handler().HandleAsync(FriendGroupTestKit.Invitee, "active", null, null, null);

        Assert.Empty(mine.Events);
    }

    [Fact]
    public async Task AGroupNightPastItsHourWithoutFilm_IsNotOfferedToMembersWhoNeverJoined()
    {
        var group = await SharedGroupAsync(FriendGroupTestKit.Member);
        await GroupNightAsync(FriendGroupTestKit.Owner, group.Id, date: "2026-11-12", slug: "hier");

        var mine = await Handler().HandleAsync(FriendGroupTestKit.Member, "active", null, null, null);

        Assert.Empty(mine.Events);
        Assert.Equal(0, mine.TotalActive);
    }

    [Fact]
    public async Task AnUnjoinedGroupNight_ShowsTheFilmAlreadyPicked()
    {
        var group = await SharedGroupAsync(FriendGroupTestKit.Member);
        var night = await GroupNightAsync(FriendGroupTestKit.Owner, group.Id);
        var movie = await _movies.InsertAsync(new Movie
        {
            EventId = night.Id,
            ParticipantId = "p",
            TmdbId = 7,
            Title = "Brume",
            Year = "2001",
            CreatedAt = FriendGroupTestKit.Start
        });
        await _events.UpdateAsync(night with { Winners = [new EventWinner { MovieId = movie.Id, PickedAt = FriendGroupTestKit.Start }] });

        var mine = await Handler().HandleAsync(FriendGroupTestKit.Member, "active", null, null, null);

        Assert.Equal(["Brume"], Assert.Single(mine.Events).WinnerMovies.Select(m => m.Title));
    }

    [Fact]
    public async Task ANightOfTheirGroupTheHostRemovedThemFrom_IsNoLongerOfferedToAMember()
    {
        var group = await SharedGroupAsync(FriendGroupTestKit.Member);
        var night = await GroupNightAsync(FriendGroupTestKit.Owner, group.Id);
        await _events.UpdateAsync(night.KeepingOut(FriendGroupTestKit.Member));

        var mine = await Handler().HandleAsync(FriendGroupTestKit.Member, "active", null, null, null);

        Assert.Empty(mine.Events);
        Assert.Equal(0, mine.TotalActive);
    }
}
