using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using MoviePicker.Api.Infrastructure.Persistence.InMemory;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Persistence.InMemory;

public sealed class InMemoryAuthSessionInvalidatorTests
{
    private readonly MemoryAuthTicketStore _tickets = new();
    private readonly InMemoryAuthSessionInvalidator _invalidator;

    public InMemoryAuthSessionInvalidatorTests()
    {
        _invalidator = new InMemoryAuthSessionInvalidator(_tickets, NullLogger<InMemoryAuthSessionInvalidator>.Instance);
    }

    private static AuthenticationTicket SessionOf(string userId) =>
        new(
            new ClaimsPrincipal(new ClaimsIdentity([new Claim(ClaimTypes.NameIdentifier, userId)], "test")),
            CookieAuthenticationDefaults.AuthenticationScheme);

    [Fact]
    public async Task InvalidateAllForUserAsync_RemovesEverySessionOfThatUserOnly()
    {
        var first = await _tickets.StoreAsync(SessionOf("u1"));
        var second = await _tickets.StoreAsync(SessionOf("u1"));
        var someoneElse = await _tickets.StoreAsync(SessionOf("u2"));

        var count = await _invalidator.InvalidateAllForUserAsync("u1");

        Assert.Equal(2L, count);
        Assert.Null(await _tickets.RetrieveAsync(first));
        Assert.Null(await _tickets.RetrieveAsync(second));
        Assert.NotNull(await _tickets.RetrieveAsync(someoneElse));
    }

    [Fact]
    public async Task InvalidateOthersForUserAsync_KeepsTheCurrentSession()
    {
        var current = await _tickets.StoreAsync(SessionOf("u1"));
        var elsewhere = await _tickets.StoreAsync(SessionOf("u1"));

        var count = await _invalidator.InvalidateOthersForUserAsync("u1", current);

        Assert.Equal(1L, count);
        Assert.NotNull(await _tickets.RetrieveAsync(current));
        Assert.Null(await _tickets.RetrieveAsync(elsewhere));
    }

    [Fact]
    public async Task InvalidateOthersForUserAsync_WithoutAKnownCurrentSession_RemovesThemAll()
    {
        var current = await _tickets.StoreAsync(SessionOf("u1"));
        var elsewhere = await _tickets.StoreAsync(SessionOf("u1"));

        Assert.Equal(2L, await _invalidator.InvalidateOthersForUserAsync("u1", null));
        Assert.Null(await _tickets.RetrieveAsync(current));
        Assert.Null(await _tickets.RetrieveAsync(elsewhere));
    }

    [Theory]
    [InlineData("")]
    [InlineData("  ")]
    public async Task InvalidateAllForUserAsync_OfABlankUserId_RemovesNothing(string userId)
    {
        var anonymous = await _tickets.StoreAsync(
            new AuthenticationTicket(new ClaimsPrincipal(new ClaimsIdentity()), CookieAuthenticationDefaults.AuthenticationScheme));

        Assert.Equal(0L, await _invalidator.InvalidateAllForUserAsync(userId));
        Assert.NotNull(await _tickets.RetrieveAsync(anonymous));
    }

    [Fact]
    public async Task InvalidateAllForUserAsync_OverAnotherTicketStore_RemovesNothing()
    {
        var foreignStore = new Mock<ITicketStore>(MockBehavior.Strict);
        var invalidator = new InMemoryAuthSessionInvalidator(foreignStore.Object, NullLogger<InMemoryAuthSessionInvalidator>.Instance);

        Assert.Equal(0L, await invalidator.InvalidateAllForUserAsync("u1"));
    }
}
