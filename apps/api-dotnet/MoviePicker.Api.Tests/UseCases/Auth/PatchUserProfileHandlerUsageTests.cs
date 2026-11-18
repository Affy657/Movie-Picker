using Moq;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.UseCases.Auth;
using MoviePicker.Api.Application.UseCases.UsageCounts;
using MoviePicker.Api.Domain;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Infrastructure.Persistence.InMemory;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.Auth;

public sealed class PatchUserProfileHandlerUsageTests
{
    private readonly InMemoryUserRepository _users = new();
    private readonly Mock<IUsageRecorder> _usage = new();
    private readonly PatchUserProfileHandler _sut;

    public PatchUserProfileHandlerUsageTests()
    {
        _sut = new PatchUserProfileHandler(
            _users, new InMemoryUserNotificationRepository(), new InMemoryUnitOfWork(), _usage.Object, TimeProvider.System);
    }

    private async Task<User> UserAsync(string? letterboxdUsername) =>
        await _users.AddAsync(new User
        {
            Email = $"{Guid.NewGuid():N}@test.local",
            DisplayName = "Léa",
            Handle = "lea" + Guid.NewGuid().ToString("N")[..8],
            LetterboxdUsername = letterboxdUsername,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        });

    private void VerifyLinked(string variant) =>
        _usage.Verify(
            x => x.RecordAsync(
                It.Is<UsageCount>(c => c.Metric == UsageCount.LetterboxdLinkedMetric && c.Variant == variant),
                It.IsAny<CancellationToken>()),
            Times.Once);

    private void VerifyNothingCounted() =>
        _usage.Verify(x => x.RecordAsync(It.IsAny<UsageCount>(), It.IsAny<CancellationToken>()), Times.Never);

    [Fact]
    public async Task HandleAsync_FirstLetterboxdUsername_CountsAConnection()
    {
        var user = await UserAsync(null);

        await _sut.HandleAsync(user.Id, new PatchUserProfileRequest { LetterboxdUsername = "cinephile" });

        VerifyLinked("connected");
    }

    [Fact]
    public async Task HandleAsync_AnotherLetterboxdUsername_CountsAConnection()
    {
        var user = await UserAsync("cinephile");

        await _sut.HandleAsync(user.Id, new PatchUserProfileRequest { LetterboxdUsername = "autre_compte" });

        VerifyLinked("connected");
    }

    [Fact]
    public async Task HandleAsync_EmptyLetterboxdUsername_CountsADisconnection()
    {
        var user = await UserAsync("cinephile");

        await _sut.HandleAsync(user.Id, new PatchUserProfileRequest { LetterboxdUsername = "  " });

        VerifyLinked("disconnected");
    }

    [Fact]
    public async Task HandleAsync_SameLetterboxdUsernameInAnotherCase_CountsNothing()
    {
        var user = await UserAsync("cinephile");

        await _sut.HandleAsync(user.Id, new PatchUserProfileRequest { LetterboxdUsername = "Cinephile" });

        VerifyNothingCounted();
    }

    [Fact]
    public async Task HandleAsync_PatchWithoutLetterboxd_CountsNothing()
    {
        var user = await UserAsync("cinephile");

        await _sut.HandleAsync(user.Id, new PatchUserProfileRequest { DisplayName = "Léa M." });

        VerifyNothingCounted();
    }
}
