using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Infrastructure.Persistence.InMemory;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Persistence.InMemory;

public sealed class InMemorySeenMarkRepositoryTests
{
    private readonly InMemorySeenMarkRepository _repo = new();

    private static SeenMark Mk(
        string eventId = "evt1",
        string movieId = "mov1",
        string participantId = "p1") => new()
        {
            EventId = eventId,
            MovieId = movieId,
            ParticipantId = participantId
        };

    [Fact]
    public async Task AddAsync_AssignsIdAndTimestamps()
    {
        var added = await _repo.AddAsync(Mk());

        Assert.False(string.IsNullOrEmpty(added.Id));
        Assert.NotEqual(default, added.CreatedAt);
        Assert.Equal(added.CreatedAt, added.UpdatedAt);
    }

    [Fact]
    public async Task AddAsync_IsIdempotentOnSameKey()
    {
        var first = await _repo.AddAsync(Mk(participantId: "p1"));
        var second = await _repo.AddAsync(Mk(participantId: "p1"));

        Assert.Equal(first.Id, second.Id);
        var agg = await _repo.AggregateByMovieIdsAsync("evt1", ["mov1"]);
        Assert.Equal(1, agg["mov1"].Count);
    }

    [Fact]
    public async Task DeleteAsync_RemovesByKey()
    {
        await _repo.AddAsync(Mk());

        Assert.True(await _repo.DeleteAsync("evt1", "mov1", "p1"));
        Assert.False(await _repo.DeleteAsync("evt1", "mov1", "p1"));
    }

    [Fact]
    public async Task DeleteByMovieIdAsync_RemovesAllParticipantsForMovie()
    {
        await _repo.AddAsync(Mk(movieId: "mov1", participantId: "p1"));
        await _repo.AddAsync(Mk(movieId: "mov1", participantId: "p2"));
        await _repo.AddAsync(Mk(movieId: "mov2", participantId: "p1"));

        await _repo.DeleteByMovieIdAsync("evt1", "mov1");

        var agg = await _repo.AggregateByMovieIdsAsync("evt1", ["mov1", "mov2"]);
        Assert.False(agg.ContainsKey("mov1"));
        Assert.Equal(1, agg["mov2"].Count);
    }

    [Fact]
    public async Task DeleteByEventAndParticipantAsync_RemovesOnlyThatParticipant()
    {
        await _repo.AddAsync(Mk(participantId: "p1"));
        await _repo.AddAsync(Mk(participantId: "p2"));

        await _repo.DeleteByEventAndParticipantAsync("evt1", "p1");

        var agg = await _repo.AggregateByMovieIdsAsync("evt1", ["mov1"]);
        Assert.Equal(["p2"], agg["mov1"].ParticipantIds);
    }

    [Fact]
    public async Task DeleteByEventIdAsync_RemovesAll_AndReturnsCount()
    {
        await _repo.AddAsync(Mk(movieId: "mov1", participantId: "p1"));
        await _repo.AddAsync(Mk(movieId: "mov2", participantId: "p1"));

        Assert.Equal(0L, await _repo.DeleteByEventIdAsync(""));
        Assert.Equal(2L, await _repo.DeleteByEventIdAsync("evt1"));
    }

    [Fact]
    public async Task AggregateByMovieIdsAsync_CountsDistinctParticipants()
    {
        await _repo.AddAsync(Mk(movieId: "mov1", participantId: "p1"));
        await _repo.AddAsync(Mk(movieId: "mov1", participantId: "p2"));

        var agg = await _repo.AggregateByMovieIdsAsync("evt1", ["mov1"]);

        Assert.Equal(2, agg["mov1"].Count);
        Assert.Equal(2, agg["mov1"].ParticipantIds.Count);
    }

    [Fact]
    public async Task CountByParticipantIdsAsync_HandlesEmptyAndBlanks()
    {
        await _repo.AddAsync(Mk(participantId: "p1"));

        Assert.Equal(0, await _repo.CountByParticipantIdsAsync([]));
        Assert.Equal(0, await _repo.CountByParticipantIdsAsync(["   "]));
        Assert.Equal(1, await _repo.CountByParticipantIdsAsync(["p1"]));
    }

    [Fact]
    public async Task ListByParticipantIdsAsync_ReturnsMatching()
    {
        await _repo.AddAsync(Mk(movieId: "mov1", participantId: "p1"));
        await _repo.AddAsync(Mk(movieId: "mov2", participantId: "p2"));

        Assert.Empty(await _repo.ListByParticipantIdsAsync([]));
        var byP1 = await _repo.ListByParticipantIdsAsync(["p1"]);
        Assert.Equal("mov1", byP1.Single().MovieId);
    }
}
