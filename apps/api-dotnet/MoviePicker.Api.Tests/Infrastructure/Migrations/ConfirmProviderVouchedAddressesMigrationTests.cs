using Moq;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Infrastructure.Migrations;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Migrations;

public sealed class ConfirmProviderVouchedAddressesMigrationTests
{
    private static readonly DateTimeOffset LinkedAt = new(2026, 10, 1, 9, 0, 0, TimeSpan.Zero);

    private readonly Mock<IUserRepository> _users = new();

    public ConfirmProviderVouchedAddressesMigrationTests()
    {
        _users.Setup(r => r.MarkEmailVerifiedAsync(It.IsAny<string>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);
    }

    private ConfirmProviderVouchedAddressesMigration Sut() => new(_users.Object);

    private static User SignedUpWithGoogle(string id, string email, string providerEmail) => new()
    {
        Id = id,
        Email = email,
        DisplayName = id,
        Handle = id,
        Identities = [new LinkedIdentity { Provider = "google", Subject = "g-" + id, Email = providerEmail, LinkedAt = LinkedAt }]
    };

    private void GivenUnconfirmedPasswordless(params User[] users) =>
        _users.Setup(r => r.ListUnconfirmedPasswordlessAsync(It.IsAny<CancellationToken>())).ReturnsAsync(users);

    [Fact]
    public void Id_IsStableAndDated()
    {
        Assert.Equal("2026-11-26-001-confirm-provider-vouched-addresses", Sut().Id);
    }

    [Fact]
    public async Task ExecuteAsync_ConfirmsTheAddressTheProviderVouchedForAtSignUp_OnTheDayItWasLinked()
    {
        GivenUnconfirmedPasswordless(SignedUpWithGoogle("u1", "neo@example.com", " Neo@Example.com"));

        var confirmed = await Sut().ExecuteAsync();

        Assert.Equal(1, confirmed);
        _users.Verify(r => r.MarkEmailVerifiedAsync("u1", LinkedAt, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task ExecuteAsync_LeavesAnAccountWhoseAddressNoProviderVouchedFor()
    {
        GivenUnconfirmedPasswordless(
            SignedUpWithGoogle("u1", "changed@example.com", "neo@example.com"),
            SignedUpWithGoogle("u2", "bare@example.com", "bare@example.com") with { Identities = [] });

        var confirmed = await Sut().ExecuteAsync();

        Assert.Equal(0, confirmed);
        _users.Verify(
            r => r.MarkEmailVerifiedAsync(It.IsAny<string>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }
}
