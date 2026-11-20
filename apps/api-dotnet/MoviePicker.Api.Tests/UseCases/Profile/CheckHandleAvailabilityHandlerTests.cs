using Moq;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Profile;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.Profile;

public sealed class CheckHandleAvailabilityHandlerTests
{
    private static User Member(string id, string handle) => new()
    {
        Id = id,
        Email = $"{id}@test.local",
        PasswordHash = "h",
        DisplayName = id,
        Handle = handle,
        CreatedAt = DateTimeOffset.UtcNow,
        UpdatedAt = DateTimeOffset.UtcNow
    };

    private static (Mock<IUserRepository>, CheckHandleAvailabilityHandler) Build()
    {
        var users = new Mock<IUserRepository>();
        users.Setup(x => x.GetByIdAsync("me", It.IsAny<CancellationToken>())).ReturnsAsync(Member("me", "lea"));
        return (users, new CheckHandleAvailabilityHandler(users.Object));
    }

    [Fact]
    public async Task HandleAsync_FreeHandle_IsAvailableAndComesBackNormalized()
    {
        var (_, handler) = Build();

        var res = await handler.HandleAsync("me", "  Lea_Moreau ");

        Assert.True(res.Available);
        Assert.Equal("lea_moreau", res.Handle);
        Assert.Null(res.Reason);
    }

    [Fact]
    public async Task HandleAsync_HandleOfAnotherMember_IsTaken()
    {
        var (users, handler) = Build();
        users.Setup(x => x.GetByHandleAsync("sam", It.IsAny<CancellationToken>())).ReturnsAsync(Member("other", "sam"));

        var res = await handler.HandleAsync("me", "sam");

        Assert.False(res.Available);
        Assert.Equal(ErrorCodes.HandleTaken, res.Reason);
    }

    [Fact]
    public async Task HandleAsync_MyOwnHandle_StaysAvailable()
    {
        var (users, handler) = Build();
        users.Setup(x => x.GetByHandleAsync("lea", It.IsAny<CancellationToken>())).ReturnsAsync(Member("me", "lea"));

        var res = await handler.HandleAsync("me", "Lea");

        Assert.True(res.Available);
    }

    [Theory]
    [InlineData("ab")]
    [InlineData("léa moreau")]
    [InlineData("")]
    public async Task HandleAsync_HandleTheRulesRefuse_SaysWhyWithoutLookingItUp(string handle)
    {
        var (users, handler) = Build();

        var ex = await Assert.ThrowsAsync<BadRequestException>(() => handler.HandleAsync("me", handle));

        Assert.Equal(HandlePolicy.Validate(handle)!.Reason, ex.Reason);
        users.Verify(x => x.GetByHandleAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }
}
