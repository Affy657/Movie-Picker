using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Infrastructure.Persistence.InMemory;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Persistence.InMemory;

public sealed class InMemoryVoteRepositoryTests
{
    private static readonly string[] ExpectedUpVoters = ["p1", "p2"];

    private readonly InMemoryVoteRepository _repo = new();

    private static Vote Mk(
        string id = "",
        string eventId = "evt1",
        string movieId = "mov1",
        string participantId = "p1",
        int value = 1) => new()
        {
            Id = id,
            EventId = eventId,
            MovieId = movieId,
            ParticipantId = participantId,
            Value = value,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };

    [Fact]
    public async Task UpsertAsync_GeneratesId_WhenEmpty()
    {
        var created = await _repo.UpsertAsync(Mk());

        Assert.False(string.IsNullOrEmpty(created.Id));
        Assert.Equal(24, created.Id.Length);
    }

    [Fact]
    public async Task UpsertAsync_ReplacesPreviousVoteOfSameParticipant()
    {
        await _repo.UpsertAsync(Mk(movieId: "mov1", participantId: "p1", value: 1));
        await _repo.UpsertAsync(Mk(movieId: "mov1", participantId: "p1", value: -1));

        var scores = await _repo.AggregateScoresByMovieIdsAsync(["mov1"]);
        Assert.Equal(new VoteScoreAggregate(-1, 0, 1), scores["mov1"]);
    }

    [Fact]
    public async Task AggregateScoresByMovieIdsAsync_ComputesUpDownScore()
    {
        await _repo.UpsertAsync(Mk(movieId: "mov1", participantId: "p1", value: 1));
        await _repo.UpsertAsync(Mk(movieId: "mov1", participantId: "p2", value: 1));
        await _repo.UpsertAsync(Mk(movieId: "mov1", participantId: "p3", value: -1));

        var scores = await _repo.AggregateScoresByMovieIdsAsync(["mov1", "unknown"]);

        Assert.Equal(new VoteScoreAggregate(1, 2, 1), scores["mov1"]);
        Assert.False(scores.ContainsKey("unknown"));
    }

    [Fact]
    public async Task AggregateUpVotersByMovieIdsAsync_CollectsOnlyUpVoters_AndSkipsMoviesWithoutUpVotes()
    {
        await _repo.UpsertAsync(Mk(movieId: "mov1", participantId: "p1", value: 1));
        await _repo.UpsertAsync(Mk(movieId: "mov1", participantId: "p2", value: 1));
        await _repo.UpsertAsync(Mk(movieId: "mov1", participantId: "p3", value: -1));
        await _repo.UpsertAsync(Mk(movieId: "mov2", participantId: "p4", value: -1));

        var upVoters = await _repo.AggregateUpVotersByMovieIdsAsync(["mov1", "mov2", "unknown"]);

        Assert.Equal(ExpectedUpVoters, upVoters["mov1"]);
        Assert.False(upVoters.ContainsKey("mov2"));
        Assert.False(upVoters.ContainsKey("unknown"));
    }

    [Fact]
    public async Task DeleteByMovieIdAsync_RemovesAllVotesForMovie()
    {
        await _repo.UpsertAsync(Mk(movieId: "mov1", participantId: "p1"));
        await _repo.UpsertAsync(Mk(movieId: "mov1", participantId: "p2"));

        await _repo.DeleteByMovieIdAsync("mov1");

        Assert.Equal(0, await _repo.CountByParticipantIdsAsync(["p1", "p2"]));
    }

    [Fact]
    public async Task DeleteByEventIdAsync_RemovesMatching_AndReturnsCount()
    {
        await _repo.UpsertAsync(Mk(eventId: "evt1", movieId: "m1", participantId: "p1"));
        await _repo.UpsertAsync(Mk(eventId: "evt1", movieId: "m2", participantId: "p1"));
        await _repo.UpsertAsync(Mk(eventId: "evt2", movieId: "m3", participantId: "p1"));

        Assert.Equal(0L, await _repo.DeleteByEventIdAsync(" "));
        Assert.Equal(2L, await _repo.DeleteByEventIdAsync("evt1"));
        Assert.Equal(1, await _repo.CountByParticipantIdsAsync(["p1"]));
    }

    [Fact]
    public async Task DeleteByEventAndParticipantAsync_RemovesOnlyThatParticipant()
    {
        await _repo.UpsertAsync(Mk(eventId: "evt1", movieId: "m1", participantId: "p1"));
        await _repo.UpsertAsync(Mk(eventId: "evt1", movieId: "m1", participantId: "p2"));

        await _repo.DeleteByEventAndParticipantAsync("evt1", "p1");

        var scores = await _repo.AggregateScoresByMovieIdsAsync(["m1"]);
        Assert.Equal(1, scores["m1"].Up);
    }

    [Fact]
    public async Task DeleteByMovieAndParticipantAsync_ReturnsFalse_WhenNothingToRemove()
    {
        Assert.False(await _repo.DeleteByMovieAndParticipantAsync("nope", "p1"));

        await _repo.UpsertAsync(Mk(movieId: "mov1", participantId: "p1"));
        Assert.False(await _repo.DeleteByMovieAndParticipantAsync("mov1", "pX"));
    }

    [Fact]
    public async Task DeleteByMovieAndParticipantAsync_ReturnsTrue_WhenRemoved()
    {
        await _repo.UpsertAsync(Mk(movieId: "mov1", participantId: "p1"));

        Assert.True(await _repo.DeleteByMovieAndParticipantAsync("mov1", "p1"));
        Assert.Equal(0, await _repo.CountByParticipantIdsAsync(["p1"]));
    }

    [Fact]
    public async Task GetParticipantVotesByEventAsync_ReturnsMapOfMovieToValue()
    {
        await _repo.UpsertAsync(Mk(eventId: "evt1", movieId: "m1", participantId: "p1", value: 1));
        await _repo.UpsertAsync(Mk(eventId: "evt1", movieId: "m2", participantId: "p1", value: -1));
        await _repo.UpsertAsync(Mk(eventId: "evt1", movieId: "m3", participantId: "p2", value: 1));

        var map = await _repo.GetParticipantVotesByEventAsync("evt1", "p1");

        Assert.Equal(2, map.Count);
        Assert.Equal(1, map["m1"]);
        Assert.Equal(-1, map["m2"]);
    }

    [Fact]
    public async Task CountByParticipantIdsAsync_HandlesEmptyAndBlanks()
    {
        await _repo.UpsertAsync(Mk(participantId: "p1"));

        Assert.Equal(0, await _repo.CountByParticipantIdsAsync([]));
        Assert.Equal(0, await _repo.CountByParticipantIdsAsync(["  "]));
        Assert.Equal(1, await _repo.CountByParticipantIdsAsync(["p1", "p2"]));
    }

    [Fact]
    public async Task ListByParticipantIdsAsync_ReturnsMatching()
    {
        await _repo.UpsertAsync(Mk(movieId: "m1", participantId: "p1"));
        await _repo.UpsertAsync(Mk(movieId: "m2", participantId: "p2"));

        Assert.Empty(await _repo.ListByParticipantIdsAsync([]));
        var byP1 = await _repo.ListByParticipantIdsAsync(["p1"]);
        Assert.Equal("m1", byP1.Single().MovieId);
    }

    [Fact]
    public async Task CountDistinctVotersByEventIdAsync_CountsEachParticipantOnce_AcrossDifferentMovies()
    {
        await _repo.UpsertAsync(Mk(eventId: "evt1", movieId: "m1", participantId: "p1"));
        await _repo.UpsertAsync(Mk(eventId: "evt1", movieId: "m2", participantId: "p1"));
        await _repo.UpsertAsync(Mk(eventId: "evt1", movieId: "m3", participantId: "p1"));

        Assert.Equal(1, await _repo.CountDistinctVotersByEventIdAsync("evt1"));
    }

    [Fact]
    public async Task CountDistinctVotersByEventIdAsync_CountsDistinctParticipantsOnDifferentMovies()
    {
        await _repo.UpsertAsync(Mk(eventId: "evt1", movieId: "m1", participantId: "p1"));
        await _repo.UpsertAsync(Mk(eventId: "evt1", movieId: "m2", participantId: "p2"));

        Assert.Equal(2, await _repo.CountDistinctVotersByEventIdAsync("evt1"));
    }

    [Fact]
    public async Task CountDistinctVotersByEventIdAsync_ExcludesParticipantAfterVoteCleared()
    {
        await _repo.UpsertAsync(Mk(eventId: "evt1", movieId: "m1", participantId: "p1"));
        await _repo.UpsertAsync(Mk(eventId: "evt1", movieId: "m2", participantId: "p2"));

        await _repo.DeleteByMovieAndParticipantAsync("m1", "p1");

        Assert.Equal(1, await _repo.CountDistinctVotersByEventIdAsync("evt1"));
    }
}
