using Moq;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Follow;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.Follow;

public sealed class GetFollowersListHandlerTests
{
    private readonly Mock<IFollowRepository> _follows = new();
    private readonly Mock<IUserRepository> _users = new();
    private readonly GetFollowersListHandler _sut;

    public GetFollowersListHandlerTests()
    {
        _sut = new GetFollowersListHandler(_follows.Object, _users.Object);
    }

    private static User U(string id, string handle) => new() { Id = id, Handle = handle, DisplayName = handle, IsProfilePublic = true };

    [Fact]
    public async Task HandleAsync_ProfileNotFound_Throws()
    {
        _users.Setup(u => u.GetByHandleAsync("alice", It.IsAny<CancellationToken>())).ReturnsAsync((User?)null);

        await Assert.ThrowsAsync<NotFoundException>(() => _sut.HandleAsync("alice", null));
    }

    [Fact]
    public async Task HandleAsync_PrivateProfile_Throws()
    {
        _users.Setup(u => u.GetByHandleAsync("alice", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new User { Id = "target", Handle = "alice", IsProfilePublic = false });

        await Assert.ThrowsAsync<NotFoundException>(() => _sut.HandleAsync("alice", null));
    }

    [Fact]
    public async Task HandleAsync_NoFollowers_ReturnsEmpty()
    {
        _users.Setup(u => u.GetByHandleAsync("alice", It.IsAny<CancellationToken>())).ReturnsAsync(U("target", "alice"));
        _follows.Setup(f => f.GetFollowerIdsAsync("target", It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([]);

        var result = await _sut.HandleAsync("alice", null);

        Assert.Empty(result.Items);
    }

    [Fact]
    public async Task HandleAsync_Anonymous_LeavesIsFollowedByMeNull_AndPreservesOrder()
    {
        _users.Setup(u => u.GetByHandleAsync("alice", It.IsAny<CancellationToken>())).ReturnsAsync(U("target", "alice"));
        _follows.Setup(f => f.GetFollowerIdsAsync("target", It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(["u1", "u2"]);
        _users.Setup(u => u.ListByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([U("u2", "bob"), U("u1", "carla")]);

        var result = await _sut.HandleAsync("alice", null);

        Assert.Equal(["carla", "bob"], result.Items.Select(i => i.Handle));
        Assert.All(result.Items, i => Assert.Null(i.IsFollowedByMe));
    }

    [Fact]
    public async Task HandleAsync_Authenticated_SetsIsFollowedByMe()
    {
        _users.Setup(u => u.GetByHandleAsync("alice", It.IsAny<CancellationToken>())).ReturnsAsync(U("target", "alice"));
        _follows.Setup(f => f.GetFollowerIdsAsync("target", It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(["u1", "u2"]);
        _users.Setup(u => u.ListByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([U("u1", "carla"), U("u2", "bob")]);
        _follows.Setup(f => f.GetFollowingIdsAsync("me", It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(["u1"]);

        var result = await _sut.HandleAsync("alice", "me");

        Assert.True(result.Items.Single(i => i.Handle == "carla").IsFollowedByMe);
        Assert.False(result.Items.Single(i => i.Handle == "bob").IsFollowedByMe);
    }
}
