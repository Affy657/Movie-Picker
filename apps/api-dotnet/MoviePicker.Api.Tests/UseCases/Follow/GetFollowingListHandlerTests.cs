using Moq;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Follow;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.Follow;

public sealed class GetFollowingListHandlerTests
{
    private readonly Mock<IFollowRepository> _follows = new();
    private readonly Mock<IUserRepository> _users = new();
    private readonly GetFollowingListHandler _sut;

    public GetFollowingListHandlerTests()
    {
        _sut = new GetFollowingListHandler(_follows.Object, _users.Object);
    }

    private static User U(string id, string handle) => new() { Id = id, Handle = handle, DisplayName = handle, IsProfilePublic = true };

    [Fact]
    public async Task HandleAsync_ProfileNotFound_Throws()
    {
        _users.Setup(u => u.GetByHandleAsync("alice", It.IsAny<CancellationToken>())).ReturnsAsync((User?)null);

        await Assert.ThrowsAsync<NotFoundException>(() => _sut.HandleAsync("alice", null));
    }

    [Fact]
    public async Task HandleAsync_NoFollowing_ReturnsEmpty()
    {
        _users.Setup(u => u.GetByHandleAsync("alice", It.IsAny<CancellationToken>())).ReturnsAsync(U("target", "alice"));
        _follows.Setup(f => f.GetFollowingIdsAsync("target", It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([]);

        var result = await _sut.HandleAsync("alice", null);

        Assert.Empty(result.Items);
    }

    [Fact]
    public async Task HandleAsync_Authenticated_SetsIsFollowedByMe()
    {
        _users.Setup(u => u.GetByHandleAsync("alice", It.IsAny<CancellationToken>())).ReturnsAsync(U("target", "alice"));
        _follows.Setup(f => f.GetFollowingIdsAsync("target", It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(["u1", "u2"]);
        _users.Setup(u => u.ListByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([U("u1", "carla"), U("u2", "bob")]);
        _follows.Setup(f => f.GetFollowingIdsAsync("me", It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(["u2"]);

        var result = await _sut.HandleAsync("alice", "me");

        Assert.False(result.Items.Single(i => i.Handle == "carla").IsFollowedByMe);
        Assert.True(result.Items.Single(i => i.Handle == "bob").IsFollowedByMe);
    }
}
