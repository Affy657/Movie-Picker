using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Auth;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using MoviePicker.Api.Infrastructure.Persistence.InMemory;
using MoviePicker.Api.Tests.Logging;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.Auth;

public sealed class LoginUserHandlerTests
{
    private const string Email = "a@b.co";
    private const string RightPassword = "abcd1234";

    private readonly InMemoryRateLimitCounterStore _counters = new();
    private readonly Mock<IUserRepository> _users = new();
    private readonly Mock<IPasswordHasher> _hasher = new();
    private string _address = "203.0.113.1";

    public LoginUserHandlerTests()
    {
        _users.Setup(x => x.GetByEmailAsync(It.IsAny<string>(), It.IsAny<CancellationToken>())).ReturnsAsync(SampleUser());
        _hasher.Setup(x => x.Verify(It.IsAny<string>(), It.IsAny<string>())).Returns(PasswordVerification.Failed);
        _hasher.Setup(x => x.Verify("HASHED", RightPassword)).Returns(PasswordVerification.Success);
    }

    private static User SampleUser(string id = "u1", string email = Email) =>
        new()
        {
            Id = id,
            Email = email,
            PasswordHash = "HASHED",
            DisplayName = "Alice",
            UiTheme = UiThemePreference.System,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };

    private LoginUserHandler Build(ILogger<LoginUserHandler>? logger = null)
    {
        var address = new Mock<IClientAddressAccessor>();
        address.Setup(a => a.GetClientAddress()).Returns(() => _address);
        return new LoginUserHandler(
            _users.Object,
            _hasher.Object,
            _counters,
            address.Object,
            TimeProvider.System,
            logger ?? NullLogger<LoginUserHandler>.Instance);
    }

    private Task<LoginResponse> SignIn(string password, string email = Email) =>
        Build().HandleAsync(new LoginRequest { Email = email, Password = password });

    private async Task FailTimes(int times)
    {
        for (var i = 0; i < times; i++)
            await Assert.ThrowsAsync<UnauthorizedException>(() => SignIn("wrong"));
    }

    [Fact]
    public async Task HandleAsync_UnknownEmail_ThrowsUnauthorizedAfterTheDecoyCheck()
    {
        _users.Setup(x => x.GetByEmailAsync(It.IsAny<string>(), It.IsAny<CancellationToken>())).ReturnsAsync((User?)null);

        await Assert.ThrowsAsync<UnauthorizedException>(() => SignIn(RightPassword, "x@y.z"));

        _hasher.Verify(x => x.Verify(LoginUserHandler.UnknownUserDecoyHash, RightPassword), Times.Once);
    }

    [Fact]
    public async Task HandleAsync_WrongPassword_ThrowsUnauthorized()
    {
        await Assert.ThrowsAsync<UnauthorizedException>(() => SignIn("wrong"));
    }

    [Fact]
    public async Task HandleAsync_RightPassword_SignsIn()
    {
        var response = await SignIn(RightPassword);

        Assert.Equal("u1", response.UserId);
        Assert.Equal("Alice", response.DisplayName);
    }

    [Fact]
    public async Task HandleAsync_TooManyFailuresFromOneAddress_RefusesBeforeCheckingThePassword()
    {
        await FailTimes(LoginUserHandler.MaxFailuresPerAccountAndAddress);
        _hasher.Invocations.Clear();

        var ex = await Assert.ThrowsAsync<TooManyRequestsException>(() => SignIn(RightPassword));

        Assert.Equal(ErrorCodes.RateLimited, ex.Reason);
        _hasher.Verify(x => x.Verify(It.IsAny<string>(), It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task HandleAsync_FailuresCountForTheAccountWhateverTheEmailCase()
    {
        for (var i = 0; i < LoginUserHandler.MaxFailuresPerAccountAndAddress; i++)
            await Assert.ThrowsAsync<UnauthorizedException>(() => SignIn("wrong", i % 2 == 0 ? Email : " A@B.CO "));

        await Assert.ThrowsAsync<TooManyRequestsException>(() => SignIn(RightPassword));
    }

    [Fact]
    public async Task HandleAsync_UnknownEmail_CountsAFailureLikeAWrongPassword()
    {
        _users.Setup(x => x.GetByEmailAsync(It.IsAny<string>(), It.IsAny<CancellationToken>())).ReturnsAsync((User?)null);
        for (var i = 0; i < LoginUserHandler.MaxFailuresPerAccountAndAddress; i++)
            await Assert.ThrowsAsync<UnauthorizedException>(() => SignIn("wrong", "ghost@b.co"));

        await Assert.ThrowsAsync<TooManyRequestsException>(() => SignIn("wrong", "ghost@b.co"));
    }

    [Fact]
    public async Task HandleAsync_SuccessfulSignIn_IsNotCountedAsAFailure()
    {
        await FailTimes(LoginUserHandler.MaxFailuresPerAccountAndAddress - 1);
        await SignIn(RightPassword);

        await Assert.ThrowsAsync<UnauthorizedException>(() => SignIn("wrong"));
    }

    [Fact]
    public async Task HandleAsync_ParallelGuesses_NeverReachThePasswordCheckPastTheLimit()
    {
        var attempts = Enumerable.Range(0, 40).Select(_ => Task.Run(async () =>
        {
            try
            {
                await SignIn("wrong");
            }
            catch (MoviePickerException)
            {
            }
        }));

        await Task.WhenAll(attempts);

        _hasher.Verify(x => x.Verify(It.IsAny<string>(), It.IsAny<string>()), Times.Exactly(LoginUserHandler.MaxFailuresPerAccountAndAddress));
    }

    [Fact]
    public async Task HandleAsync_AnotherAddressLockedOut_LeavesTheOwnerFreeToSignIn()
    {
        _address = "198.51.100.66";
        await FailTimes(LoginUserHandler.MaxFailuresPerAccountAndAddress);
        for (var i = 0; i < 50; i++)
            await Assert.ThrowsAsync<TooManyRequestsException>(() => SignIn("wrong"));

        _address = "203.0.113.1";
        var response = await SignIn(RightPassword);

        Assert.Equal("u1", response.UserId);
    }

    [Fact]
    public async Task HandleAsync_FailuresSpreadOverManyAddresses_HitTheAccountCeiling()
    {
        for (var source = 0; source < LoginUserHandler.MaxFailuresPerAccountWindow / LoginUserHandler.MaxFailuresPerAccountAndAddress; source++)
        {
            _address = $"198.51.100.{source}";
            await FailTimes(LoginUserHandler.MaxFailuresPerAccountAndAddress);
        }

        _address = "203.0.113.200";
        await Assert.ThrowsAsync<TooManyRequestsException>(() => SignIn(RightPassword));
    }

    [Fact]
    public async Task HandleAsync_Throttled_IsLoggedForTheThrottlingAlertWithoutTheEmail()
    {
        await FailTimes(LoginUserHandler.MaxFailuresPerAccountAndAddress);
        var logger = new CapturingLogger<LoginUserHandler>();

        await Assert.ThrowsAsync<TooManyRequestsException>(() =>
            Build(logger).HandleAsync(new LoginRequest { Email = Email, Password = RightPassword }));

        var entry = Assert.Single(logger.Entries);
        Assert.Equal(LogLevel.Warning, entry.Level);
        Assert.DoesNotContain(Email, entry.Message);
        Assert.Contains(logger.States[0], pair => pair.Key == "{OriginalFormat}" && Equals(pair.Value, LoginUserHandler.AccountThrottledLogTemplate));
    }
}
