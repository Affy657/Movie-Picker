using Moq;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.SearchUsers;
using MoviePicker.Api.Domain.Entities;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.SearchUsers;

public sealed class SearchUsersHandlerTests
{
    private readonly Mock<IUserRepository> _users = new();
    private readonly Mock<IFollowRepository> _follows = new();
    private readonly SearchUsersHandler _sut;

    public SearchUsersHandlerTests()
    {
        _sut = new SearchUsersHandler(_users.Object, _follows.Object);
    }

    private static User U(string id, string handle, string displayName) =>
        new() { Id = id, Handle = handle, DisplayName = displayName, IsProfilePublic = true };

    private void SetupSearch(params User[] found) =>
        _users
            .Setup(u => u.SearchPublicAsync(It.IsAny<string>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(found);

    [Theory]
    [InlineData("")]
    [InlineData(" ")]
    [InlineData("a")]
    [InlineData("  a  ")]
    public async Task HandleAsync_QueryTooShort_ReturnsEmptyWithoutHittingRepository(string query)
    {
        var result = await _sut.HandleAsync(query, null);

        Assert.Empty(result.Items);
        _users.Verify(
            u => u.SearchPublicAsync(It.IsAny<string>(), It.IsAny<int>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task HandleAsync_NullQuery_ReturnsEmpty()
    {
        var result = await _sut.HandleAsync(null, null);

        Assert.Empty(result.Items);
    }

    [Fact]
    public async Task HandleAsync_TrimsQueryBeforeSearching()
    {
        SetupSearch(U("u1", "lea_m", "Léa Moreau"));

        await _sut.HandleAsync("  mor  ", null);

        _users.Verify(
            u => u.SearchPublicAsync("mor", It.IsAny<int>(), It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task HandleAsync_Anonymous_LeavesIsFollowedByMeNull()
    {
        SetupSearch(U("u1", "lea_m", "Léa Moreau"));

        var result = await _sut.HandleAsync("mor", null);

        Assert.Null(result.Items.Single().IsFollowedByMe);
        _follows.Verify(
            f => f.GetFollowingIdsAsync(It.IsAny<string>(), It.IsAny<int>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task HandleAsync_Authenticated_SetsIsFollowedByMe()
    {
        SetupSearch(U("u1", "lea_m", "Léa Moreau"), U("u2", "jmorin", "Julien Morin"));
        _follows
            .Setup(f => f.GetFollowingIdsAsync("me", It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(["u2"]);

        var result = await _sut.HandleAsync("mor", "me");

        Assert.False(result.Items.Single(i => i.Handle == "lea_m").IsFollowedByMe);
        Assert.True(result.Items.Single(i => i.Handle == "jmorin").IsFollowedByMe);
    }

    [Fact]
    public async Task HandleAsync_KeepsCurrentUserInResults()
    {
        SetupSearch(U("me", "adrien", "Adrien Morand"));
        _follows
            .Setup(f => f.GetFollowingIdsAsync("me", It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([]);

        var result = await _sut.HandleAsync("mor", "me");

        Assert.Equal("adrien", result.Items.Single().Handle);
    }

    [Fact]
    public async Task HandleAsync_OrdersNameOrHandlePrefixMatchesFirst()
    {
        SetupSearch(
            U("u1", "jmorin", "Julien Morin"),
            U("u2", "sofiamorgane", "Sofia Benali"),
            U("u3", "morgane_b", "Alice Dupuis"),
            U("u4", "lea_m", "Morgane Leroy"));

        var result = await _sut.HandleAsync("mor", null);

        Assert.Equal(["Alice Dupuis", "Morgane Leroy", "Julien Morin", "Sofia Benali"], result.Items.Select(i => i.DisplayName));
    }

    [Fact]
    public async Task HandleAsync_MapsAvatarAndDisplayName()
    {
        SetupSearch(new User
        {
            Id = "u1",
            Handle = "lea_m",
            DisplayName = "Léa Moreau",
            AvatarId = "avatar-7",
            IsProfilePublic = true
        });

        var item = (await _sut.HandleAsync("mor", null)).Items.Single();

        Assert.Equal("lea_m", item.Handle);
        Assert.Equal("Léa Moreau", item.DisplayName);
        Assert.Equal("avatar-7", item.AvatarId);
    }

    [Fact]
    public async Task HandleAsync_NoMatch_ReturnsEmpty()
    {
        SetupSearch();

        var result = await _sut.HandleAsync("zephyrin", "me");

        Assert.Empty(result.Items);
        _follows.Verify(
            f => f.GetFollowingIdsAsync(It.IsAny<string>(), It.IsAny<int>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task HandleAsync_CapsTheNumberOfResultsRequested()
    {
        SetupSearch(U("u1", "lea_m", "Léa Moreau"));

        await _sut.HandleAsync("mor", null);

        _users.Verify(
            u => u.SearchPublicAsync(It.IsAny<string>(), UserSearchPolicy.ResultLimit, It.IsAny<CancellationToken>()),
            Times.Once);
    }
}
