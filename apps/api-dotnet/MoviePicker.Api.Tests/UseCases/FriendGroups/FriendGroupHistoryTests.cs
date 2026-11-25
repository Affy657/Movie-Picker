using MoviePicker.Api.Application.UseCases.FriendGroups;
using MoviePicker.Api.Domain.Entities;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.FriendGroups;

public sealed class FriendGroupHistoryTests
{
    private static readonly DateTimeOffset At = new(2026, 11, 1, 20, 0, 0, TimeSpan.Zero);

    [Fact]
    public void StatsOf_LeavesOutWhatTheMemberProposedInAnonymousNights()
    {
        var open = new Event { Id = "open", Winners = [new EventWinner { MovieId = "m-open", PickedAt = At }] };
        var anonymous = new Event
        {
            Id = "anon",
            Config = new EventConfig { AnonymousProposals = true },
            Winners = [new EventWinner { MovieId = "m-anon", PickedAt = At }]
        };
        Participant[] participants =
        [
            new() { Id = "p-open", EventId = "open", UserId = "member", Pseudo = "Léa" },
            new() { Id = "p-anon", EventId = "anon", UserId = "member", Pseudo = "Léa" },
            new() { Id = "p-friend", EventId = "anon", UserId = "friend", Pseudo = "Tom" }
        ];
        Movie[] movies =
        [
            new() { Id = "m-open", EventId = "open", ParticipantId = "p-open", Title = "Ouvert" },
            new() { Id = "m-anon", EventId = "anon", ParticipantId = "p-anon", Title = "Secret" }
        ];
        Vote[] votes = [new() { MovieId = "m-anon", ParticipantId = "p-friend", Value = 1 }];
        var history = new FriendGroupHistory([open, anonymous], participants, movies, votes, [], []);

        var stats = history.StatsOf(new FriendGroupMember("member", At));

        Assert.Equal(1, stats.ProposedCount);
        Assert.Equal(1, stats.WinningCount);
        Assert.Equal(0, stats.UpVotesReceived);
        Assert.Equal(2, stats.NightsAttended);
    }
}
