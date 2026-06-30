using MoviePicker.Api.Infrastructure.Persistence.InMemory;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Persistence.InMemory;

public sealed class InMemoryFollowRepositoryTests
{
    private readonly InMemoryFollowRepository _repo = new();

    [Fact]
    public async Task FollowAsync_ReturnsTrueOnce_ThenFalseForDuplicate()
    {
        Assert.True(await _repo.FollowAsync("a", "b"));
        Assert.False(await _repo.FollowAsync("a", "b"));
    }

    [Fact]
    public async Task IsFollowingAsync_ReflectsFollowState()
    {
        await _repo.FollowAsync("a", "b");

        Assert.True(await _repo.IsFollowingAsync("a", "b"));
        Assert.False(await _repo.IsFollowingAsync("b", "a"));
    }

    [Fact]
    public async Task UnfollowAsync_RemovesRelation()
    {
        await _repo.FollowAsync("a", "b");

        await _repo.UnfollowAsync("a", "b");

        Assert.False(await _repo.IsFollowingAsync("a", "b"));
    }

    [Fact]
    public async Task GetFollowingIdsAsync_ReturnsFollowees()
    {
        await _repo.FollowAsync("a", "b");
        await _repo.FollowAsync("a", "c");

        var ids = await _repo.GetFollowingIdsAsync("a");

        Assert.Equal(2, ids.Count);
        Assert.Contains("b", ids);
        Assert.Contains("c", ids);
    }

    [Fact]
    public async Task GetFollowerIdsAsync_ReturnsFollowers()
    {
        await _repo.FollowAsync("a", "target");
        await _repo.FollowAsync("b", "target");

        var ids = await _repo.GetFollowerIdsAsync("target");

        Assert.Equal(2, ids.Count);
    }

    [Fact]
    public async Task GetCountsAsync_ReturnsFollowingAndFollowers()
    {
        await _repo.FollowAsync("me", "x");
        await _repo.FollowAsync("me", "y");
        await _repo.FollowAsync("fan", "me");

        var (following, followers) = await _repo.GetCountsAsync("me");

        Assert.Equal(2, following);
        Assert.Equal(1, followers);
    }

    [Fact]
    public async Task DeleteAllForUserAsync_RemovesBothDirections()
    {
        await _repo.FollowAsync("me", "x");
        await _repo.FollowAsync("fan", "me");
        await _repo.FollowAsync("other", "x");

        var removed = await _repo.DeleteAllForUserAsync("me");

        Assert.Equal(2L, removed);
        var (following, followers) = await _repo.GetCountsAsync("me");
        Assert.Equal(0, following);
        Assert.Equal(0, followers);
    }
}
