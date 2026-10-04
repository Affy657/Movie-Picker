using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Caching.Memory;
using Moq;
using MoviePicker.Api.Infrastructure.Web;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Web;

public sealed class CachedAuthTicketStoreTests
{
    private static AuthenticationTicket Ticket(string userId) =>
        new(
            new ClaimsPrincipal(new ClaimsIdentity(
                [new Claim(ClaimTypes.NameIdentifier, userId)],
                CookieAuthenticationDefaults.AuthenticationScheme)),
            new AuthenticationProperties { IsPersistent = true },
            CookieAuthenticationDefaults.AuthenticationScheme);

    private static (CachedAuthTicketStore Store, Mock<ITicketStore> Inner, AuthTicketCache Cache) Build(TimeSpan? ttl = null)
    {
        var inner = new Mock<ITicketStore>();
        var cache = new AuthTicketCache(new MemoryCache(new MemoryCacheOptions()), ttl ?? TimeSpan.FromSeconds(30));
        return (new CachedAuthTicketStore(inner.Object, cache), inner, cache);
    }

    [Fact]
    public async Task RetrieveAsync_ReadsTheInnerStoreOnce_ThenServesFromCache()
    {
        var (store, inner, _) = Build();
        inner.Setup(s => s.RetrieveAsync("k1")).ReturnsAsync(Ticket("u1"));

        var first = await store.RetrieveAsync("k1");
        var second = await store.RetrieveAsync("k1");

        Assert.NotNull(first);
        Assert.Equal("u1", second!.Principal.FindFirstValue(ClaimTypes.NameIdentifier));
        inner.Verify(s => s.RetrieveAsync("k1"), Times.Once);
    }

    [Fact]
    public async Task RetrieveAsync_ReplayedDeadSession_IsLookedUpOncePerTtl()
    {
        var (store, inner, _) = Build();
        inner.Setup(s => s.RetrieveAsync("missing")).ReturnsAsync((AuthenticationTicket?)null);

        Assert.Null(await store.RetrieveAsync("missing"));
        Assert.Null(await store.RetrieveAsync("missing"));

        inner.Verify(s => s.RetrieveAsync("missing"), Times.Once);
    }

    [Fact]
    public async Task RenewAsync_AfterAMiss_ServesTheRenewedTicket()
    {
        var (store, inner, _) = Build();
        inner.Setup(s => s.RetrieveAsync("k1")).ReturnsAsync((AuthenticationTicket?)null);
        await store.RetrieveAsync("k1");

        await store.RenewAsync("k1", Ticket("u1"));

        Assert.Equal("u1", (await store.RetrieveAsync("k1"))!.Principal.FindFirstValue(ClaimTypes.NameIdentifier));
    }

    [Fact]
    public async Task RemoveAsync_EvictsTheKey()
    {
        var (store, inner, _) = Build();
        inner.Setup(s => s.RetrieveAsync("k1")).ReturnsAsync(Ticket("u1"));
        await store.RetrieveAsync("k1");

        await store.RemoveAsync("k1");
        await store.RetrieveAsync("k1");

        inner.Verify(s => s.RemoveAsync("k1"), Times.Once);
        inner.Verify(s => s.RetrieveAsync("k1"), Times.Exactly(2));
    }

    [Fact]
    public async Task RenewAsync_RefreshesTheCachedTicket()
    {
        var (store, inner, _) = Build();
        inner.Setup(s => s.RetrieveAsync("k1")).ReturnsAsync(Ticket("u1"));
        await store.RetrieveAsync("k1");
        var renewed = Ticket("u1");
        renewed.Properties.ExpiresUtc = new DateTimeOffset(2030, 1, 1, 0, 0, 0, TimeSpan.Zero);

        await store.RenewAsync("k1", renewed);
        var cached = await store.RetrieveAsync("k1");

        inner.Verify(s => s.RenewAsync("k1", renewed), Times.Once);
        Assert.Equal(renewed.Properties.ExpiresUtc, cached!.Properties.ExpiresUtc);
        inner.Verify(s => s.RetrieveAsync("k1"), Times.Once);
    }

    [Fact]
    public async Task InvalidatingAUser_DropsEveryCachedTicketOfThatUserOnly()
    {
        var (store, inner, cache) = Build();
        inner.Setup(s => s.RetrieveAsync("a")).ReturnsAsync(Ticket("u1"));
        inner.Setup(s => s.RetrieveAsync("b")).ReturnsAsync(Ticket("u1"));
        inner.Setup(s => s.RetrieveAsync("c")).ReturnsAsync(Ticket("u2"));
        await store.RetrieveAsync("a");
        await store.RetrieveAsync("b");
        await store.RetrieveAsync("c");

        cache.InvalidateUser("u1");
        await store.RetrieveAsync("a");
        await store.RetrieveAsync("b");
        await store.RetrieveAsync("c");

        inner.Verify(s => s.RetrieveAsync("a"), Times.Exactly(2));
        inner.Verify(s => s.RetrieveAsync("b"), Times.Exactly(2));
        inner.Verify(s => s.RetrieveAsync("c"), Times.Once);
    }

    [Fact]
    public async Task CachedTickets_ExpireAfterTheTtl()
    {
        var (store, inner, _) = Build(TimeSpan.FromMilliseconds(40));
        inner.Setup(s => s.RetrieveAsync("k1")).ReturnsAsync(Ticket("u1"));
        await store.RetrieveAsync("k1");

        await Task.Delay(120);
        await store.RetrieveAsync("k1");

        inner.Verify(s => s.RetrieveAsync("k1"), Times.Exactly(2));
    }

    [Fact]
    public async Task RetrieveAsync_ForARequest_RemembersTheSessionTheRequestIsSignedInWith()
    {
        var (store, inner, _) = Build();
        inner.Setup(s => s.RetrieveAsync("k1")).ReturnsAsync(Ticket("u1"));
        var request = new DefaultHttpContext();

        var ticket = await ((ITicketStore)store).RetrieveAsync("k1", request, CancellationToken.None);

        Assert.NotNull(ticket);
        Assert.Equal("k1", AuthSessionKey.Of(request));
    }

    [Fact]
    public async Task RetrieveAsync_ForARequestOnADeadSession_RemembersNoSession()
    {
        var (store, inner, _) = Build();
        inner.Setup(s => s.RetrieveAsync("gone")).ReturnsAsync((AuthenticationTicket?)null);
        var request = new DefaultHttpContext();

        var ticket = await ((ITicketStore)store).RetrieveAsync("gone", request, CancellationToken.None);

        Assert.Null(ticket);
        Assert.Null(AuthSessionKey.Of(request));
    }

    [Fact]
    public async Task StoreAsync_DelegatesAndPrimesTheCache()
    {
        var (store, inner, _) = Build();
        var ticket = Ticket("u1");
        inner.Setup(s => s.StoreAsync(ticket)).ReturnsAsync("new-key");

        var key = await store.StoreAsync(ticket);
        var cached = await store.RetrieveAsync(key);

        Assert.Equal("new-key", key);
        Assert.NotNull(cached);
        inner.Verify(s => s.RetrieveAsync(It.IsAny<string>()), Times.Never);
    }
}
