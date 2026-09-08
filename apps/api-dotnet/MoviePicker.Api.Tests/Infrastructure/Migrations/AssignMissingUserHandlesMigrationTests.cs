using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Infrastructure.Migrations;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Migrations;

public sealed class AssignMissingUserHandlesMigrationTests
{
    private readonly Mock<IUserRepository> _users = new();
    private readonly AssignMissingUserHandlesMigration _sut;

    public AssignMissingUserHandlesMigrationTests()
    {
        _users.Setup(r => r.GetByHandleAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((User?)null);
        _users.Setup(r => r.UpdateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((User u, CancellationToken _) => u);

        _sut = new AssignMissingUserHandlesMigration(
            _users.Object,
            NullLogger<AssignMissingUserHandlesMigration>.Instance);
    }

    private static User UserWithoutHandle(string id, string displayName) =>
        new() { Id = id, DisplayName = displayName, Handle = string.Empty };

    private void GivenMissingHandles(params User[] users) =>
        _users.Setup(r => r.ListMissingHandleAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(users);

    [Fact]
    public void Id_IsStableAndDated()
    {
        Assert.Equal("2026-09-05-001-assign-missing-user-handles", _sut.Id);
    }

    [Fact]
    public async Task ExecuteAsync_AssignsHandleDerivedFromDisplayName()
    {
        GivenMissingHandles(UserWithoutHandle("u1", "Alice Martin"));

        var assigned = await _sut.ExecuteAsync();

        Assert.Equal(1, assigned);
        _users.Verify(
            r => r.UpdateAsync(
                It.Is<User>(u => u.Id == "u1" && u.Handle.Length > 0),
                It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task ExecuteAsync_PreservesEveryOtherFieldOfTheUser()
    {
        var original = UserWithoutHandle("u1", "Alice") with
        {
            Email = "alice@example.test",
            Bio = "cinéphile",
            SupporterSince = DateTimeOffset.UnixEpoch
        };
        GivenMissingHandles(original);

        User? written = null;
        _users.Setup(r => r.UpdateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()))
            .Callback((User u, CancellationToken _) => written = u)
            .ReturnsAsync((User u, CancellationToken _) => u);

        await _sut.ExecuteAsync();

        Assert.NotNull(written);
        Assert.Equal(original with { Handle = written!.Handle }, written);
    }

    [Fact]
    public async Task ExecuteAsync_TakenHandle_AllocatesASuffixedOne()
    {
        GivenMissingHandles(UserWithoutHandle("u1", "Alice"));
        _users.Setup(r => r.GetByHandleAsync("alice", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new User { Id = "other", Handle = "alice" });

        await _sut.ExecuteAsync();

        _users.Verify(
            r => r.UpdateAsync(It.Is<User>(u => u.Handle == "alice2"), It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task ExecuteAsync_NothingMissing_WritesNothing()
    {
        GivenMissingHandles();

        var assigned = await _sut.ExecuteAsync();

        Assert.Equal(0, assigned);
        _users.Verify(r => r.UpdateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task ExecuteAsync_ReplayedAfterASuccessfulPass_WritesNothingMore()
    {
        var queue = new Queue<IReadOnlyList<User>>([
            [UserWithoutHandle("u1", "Alice")],
            []
        ]);
        _users.Setup(r => r.ListMissingHandleAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(queue.Dequeue);

        var first = await _sut.ExecuteAsync();
        var second = await _sut.ExecuteAsync();

        Assert.Equal(1, first);
        Assert.Equal(0, second);
        _users.Verify(r => r.UpdateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task ExecuteAsync_OneUserFails_KeepsGoingAndCountsOnlySuccesses()
    {
        GivenMissingHandles(
            UserWithoutHandle("u1", "Alice"),
            UserWithoutHandle("u2", "Bob"),
            UserWithoutHandle("u3", "Carol"));
        _users.Setup(r => r.UpdateAsync(It.Is<User>(u => u.Id == "u2"), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidOperationException("écriture refusée"));

        var assigned = await _sut.ExecuteAsync();

        Assert.Equal(2, assigned);
        _users.Verify(
            r => r.UpdateAsync(It.Is<User>(u => u.Id == "u3"), It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task ExecuteAsync_Cancelled_StopsWithoutSwallowingTheCancellation()
    {
        GivenMissingHandles(UserWithoutHandle("u1", "Alice"), UserWithoutHandle("u2", "Bob"));
        using var cts = new CancellationTokenSource();
        cts.Cancel();

        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => _sut.ExecuteAsync(cts.Token));

        _users.Verify(r => r.UpdateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()), Times.Never);
    }
}
