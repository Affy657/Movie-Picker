using Moq;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Auth;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.Auth;

public sealed class GetUserProfileHandlerTests
{
    [Fact]
    public async Task HandleAsync_UnknownUser_ThrowsNotFound()
    {
        var users = new Mock<IUserRepository>();
        users.Setup(x => x.GetByIdAsync("missing", It.IsAny<CancellationToken>())).ReturnsAsync((User?)null);
        var handler = new GetUserProfileHandler(users.Object);

        await Assert.ThrowsAsync<NotFoundException>(() => handler.HandleAsync("missing"));
    }

    [Fact]
    public async Task HandleAsync_ReturnsMaskedEmail()
    {
        var user = new User
        {
            Id = "id1",
            Email = "bob@example.com",
            PasswordHash = "h",
            DisplayName = "Bob",
            UiTheme = UiThemePreference.Dark,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };
        var users = new Mock<IUserRepository>();
        users.Setup(x => x.GetByIdAsync("id1", It.IsAny<CancellationToken>())).ReturnsAsync(user);
        var handler = new GetUserProfileHandler(users.Object);

        var res = await handler.HandleAsync("id1");

        Assert.Equal("id1", res.UserId);
        Assert.Equal("Bob", res.DisplayName);
        Assert.Equal(UiThemePreference.Dark, res.UiTheme);
        Assert.Contains("***", res.EmailMasked, StringComparison.Ordinal);
        Assert.DoesNotContain("bob@", res.EmailMasked, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task HandleAsync_ReturnsLetterboxdUsername()
    {
        var user = new User
        {
            Id = "id1",
            Email = "bob@example.com",
            PasswordHash = "h",
            DisplayName = "Bob",
            LetterboxdUsername = "affy657",
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };
        var users = new Mock<IUserRepository>();
        users.Setup(x => x.GetByIdAsync("id1", It.IsAny<CancellationToken>())).ReturnsAsync(user);
        var handler = new GetUserProfileHandler(users.Object);

        var res = await handler.HandleAsync("id1");

        Assert.Equal("affy657", res.LetterboxdUsername);
    }
}
