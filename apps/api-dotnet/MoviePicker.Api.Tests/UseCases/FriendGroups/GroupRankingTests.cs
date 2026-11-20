using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using Xunit;
using static MoviePicker.Api.Tests.UseCases.FriendGroups.FriendGroupTestKit;

namespace MoviePicker.Api.Tests.UseCases.FriendGroups;

public sealed class GroupRankingTests : FriendGroupTestBase
{
    private const string Guest = "guest-1";

    private readonly Dictionary<(string Night, string User), string> _participantIds = [];

    private async Task<Event> NightAsync(string? groupId, string slug, string date, string hostId, params string[] guests)
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
            CreatedAt = Start,
            UpdatedAt = Start
        });
        foreach (var userId in guests.Prepend(hostId))
        {
            var participant = await Kit.Participants.AddAsync(new Participant { EventId = night.Id, Pseudo = userId, UserId = userId });
            _participantIds[(night.Id, userId)] = participant.Id;
        }
        return night;
    }

    private async Task<Movie> ProposeAsync(Event night, string userId, string title) =>
        await Kit.Movies.InsertAsync(new Movie
        {
            EventId = night.Id,
            ParticipantId = _participantIds[(night.Id, userId)],
            TmdbId = title.GetHashCode(StringComparison.Ordinal),
            Title = title,
            Year = "2001",
            CreatedAt = Start
        });

    private async Task<Event> CloseAsync(Event night, params Movie[] winners) =>
        await Kit.Events.UpdateAsync(night with
        {
            Winners = winners.Select(movie => new EventWinner { MovieId = movie.Id, PickedAt = Start }).ToList(),
            ClosedAt = Start
        });

    private Task<Vote> VoteAsync(Movie movie, string userId, int value) =>
        Kit.Votes.UpsertAsync(new Vote
        {
            EventId = movie.EventId,
            MovieId = movie.Id,
            ParticipantId = _participantIds[(movie.EventId, userId)],
            Value = value
        });

    private Task<SeenMark> SeenAsync(Movie movie, string userId) =>
        Kit.SeenMarks.AddAsync(new SeenMark
        {
            EventId = movie.EventId,
            MovieId = movie.Id,
            ParticipantId = _participantIds[(movie.EventId, userId)]
        });

    private Task<MovieRating> RateAsync(Movie movie, string userId, int value) =>
        Kit.Ratings.UpsertAsync(new MovieRating
        {
            EventId = movie.EventId,
            MovieId = movie.Id,
            ParticipantId = _participantIds[(movie.EventId, userId)],
            Value = value
        });

    private async Task<FriendGroupSummaryResponse> ThreeNightsAsync()
    {
        var group = await SharedGroupAsync(Member);
        await Kit.PersonAsync(Guest, "Invité");
        Kit.Clock.Advance(TimeSpan.FromDays(3));
        await Kit.ShareAsync(group.Id, Invitee);

        var first = await NightAsync(group.Id, "premiere", "2026-11-14", Owner, Member);
        var firstWinner = await ProposeAsync(first, Owner, "Brume");
        var firstOther = await ProposeAsync(first, Member, "Orbite basse");
        await VoteAsync(firstWinner, Member, 1);
        await VoteAsync(firstWinner, Owner, 1);
        await VoteAsync(firstOther, Owner, 1);
        await SeenAsync(firstWinner, Member);
        await SeenAsync(firstOther, Owner);
        await RateAsync(firstWinner, Owner, 8);
        await RateAsync(firstWinner, Member, 6);
        await CloseAsync(first, firstWinner);

        var second = await NightAsync(null, "deuxieme", "2026-11-15", Member, Owner, Guest, Invitee);
        var secondWinner = await ProposeAsync(second, Member, "Sable noir");
        var secondOther = await ProposeAsync(second, Owner, "Tempête de verre");
        await VoteAsync(secondWinner, Owner, 1);
        await VoteAsync(secondWinner, Guest, 1);
        await VoteAsync(secondWinner, Member, 1);
        await VoteAsync(secondOther, Member, -1);
        await SeenAsync(secondWinner, Guest);
        await SeenAsync(secondOther, Owner);
        await RateAsync(secondWinner, Owner, 10);
        await RateAsync(secondWinner, Member, 8);
        await RateAsync(secondWinner, Guest, 6);
        await CloseAsync(second, secondWinner);

        var third = await NightAsync("autre-groupe", "troisieme", "2026-11-18", Owner, Invitee);
        var thirdWinner = await ProposeAsync(third, Owner, "Minuit à Kyoto");
        var thirdOther = await ProposeAsync(third, Invitee, "Les Enfants du phare");
        await VoteAsync(thirdWinner, Invitee, 1);
        await VoteAsync(thirdOther, Owner, 1);
        await RateAsync(thirdWinner, Owner, 9);
        await RateAsync(thirdWinner, Invitee, 7);
        await CloseAsync(third, thirdWinner);

        var strangers = await NightAsync(null, "sans-membre", "2026-11-16", Stranger, Guest);
        await CloseAsync(strangers, await ProposeAsync(strangers, Stranger, "Sable noir"));

        return group;
    }

    [Fact]
    public async Task TheRanking_GivesEachMemberTheFiguresOfAllTheirFinishedNights_WhateverTheGroup()
    {
        var group = await ThreeNightsAsync();

        var ranking = await Kit.RankingHandler().HandleAsync(Member, group.Id);

        Assert.Equal(3, ranking.NightCount);
        Assert.Equal([Owner, Member, Invitee], ranking.Members.Select(member => member.UserId));
        Assert.Equal(
            [(3, 2, 2, (double?)7.5), (2, 1, 1, 8), (1, 0, 0, null)],
            ranking.Members.Select(m => (m.ProposedCount, m.WinningCount, m.RatedWinningCount, m.ProposalsAverageRating)));
        Assert.Equal(
            [(2, 4, 2), (3, 2, 2), (1, 1, 1)],
            ranking.Members.Select(m => (m.UpVotesReceived, m.UpVotesCast, m.UpVotesOnWinner)));
        Assert.Equal([2, 0, 1], ranking.Members.Select(m => m.FreshProposalCount));
        Assert.Equal(
            [(3, 3, 2), (2, 2, 1), (2, 2, 0)],
            ranking.Members.Select(m => (m.NightsAttended, m.NightsSinceJoined, m.NightsHosted)));
        Assert.Equal(
            [(3, (double?)9), (2, 7), (1, 7)],
            ranking.Members.Select(m => (m.RatingsGiven, m.AverageRatingGiven)));
    }

    [Fact]
    public async Task TheRanking_LeavesOutUpcomingNights_AndNightsWithoutFilm()
    {
        var group = await SharedGroupAsync(Member);
        var upcoming = await NightAsync(group.Id, "a-venir", "2026-11-26", Owner, Member);
        await ProposeAsync(upcoming, Member, "Brume");
        await CloseAsync(await NightAsync(null, "sans-film", "2026-11-12", Owner, Member));
        var elsewhere = await NightAsync("famille", "famille", "2026-11-12", Member);
        await CloseAsync(elsewhere, await ProposeAsync(elsewhere, Member, "Sable noir"));

        var ranking = await Kit.RankingHandler().HandleAsync(Owner, group.Id);

        Assert.Equal(1, ranking.NightCount);
        Assert.Equal(
            [(0, 0, 0), (1, 1, 1)],
            ranking.Members.Select(m => (m.ProposedCount, m.WinningCount, m.NightsAttended)));
        Assert.All(ranking.Members, member => Assert.Null(member.ProposalsAverageRating));
    }

    [Fact]
    public async Task TheRanking_ListsOnlyTheCurrentMembers()
    {
        var group = await ThreeNightsAsync();
        await Kit.RemoveMemberHandler().HandleAsync(Owner, group.Id, Member);

        var ranking = await Kit.RankingHandler().HandleAsync(Invitee, group.Id);

        Assert.Equal([Owner, Invitee], ranking.Members.Select(member => member.UserId));
        Assert.Equal(3, ranking.NightCount);
    }

    [Theory]
    [InlineData(Stranger)]
    [InlineData(Invitee)]
    public async Task TheRanking_IsNotFound_ForSomeoneOutsideTheGroup(string outsider)
    {
        var group = await SharedGroupAsync(Member);
        await Kit.InviteAsync(group.Id, Invitee);

        var ex = await Assert.ThrowsAsync<NotFoundException>(() => Kit.RankingHandler().HandleAsync(outsider, group.Id));

        Assert.Equal(ErrorCodes.GroupNotFound, ex.Reason);
    }
}
