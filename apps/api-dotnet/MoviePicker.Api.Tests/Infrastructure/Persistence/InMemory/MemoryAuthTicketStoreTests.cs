using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Http;
using MoviePicker.Api.Infrastructure.Persistence.InMemory;
using MoviePicker.Api.Infrastructure.Web;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Persistence.InMemory;

public sealed class MemoryAuthTicketStoreTests
{
    private readonly MemoryAuthTicketStore _store = new();

    private static AuthenticationTicket Ticket(string name)
    {
        var identity = new ClaimsIdentity([new Claim(ClaimTypes.Name, name)], "test");
        return new AuthenticationTicket(new ClaimsPrincipal(identity), "scheme");
    }

    [Fact]
    public async Task StoreAsync_ReturnsKey_AndRetrievesTicket()
    {
        var key = await _store.StoreAsync(Ticket("alice"));

        var retrieved = await _store.RetrieveAsync(key);
        Assert.NotNull(retrieved);
        Assert.Equal("alice", retrieved!.Principal.Identity!.Name);
    }

    [Fact]
    public async Task RetrieveAsync_ReturnsNull_WhenUnknownKey()
    {
        Assert.Null(await _store.RetrieveAsync("missing"));
    }

    [Fact]
    public async Task RenewAsync_ReplacesTicketForKey()
    {
        var key = await _store.StoreAsync(Ticket("alice"));

        await _store.RenewAsync(key, Ticket("bob"));

        var retrieved = await _store.RetrieveAsync(key);
        Assert.Equal("bob", retrieved!.Principal.Identity!.Name);
    }

    [Fact]
    public async Task RemoveAsync_DeletesTicket()
    {
        var key = await _store.StoreAsync(Ticket("alice"));

        await _store.RemoveAsync(key);

        Assert.Null(await _store.RetrieveAsync(key));
    }

    private static AuthenticationTicket SessionOf(string userId) =>
        new(new ClaimsPrincipal(new ClaimsIdentity([new Claim(ClaimTypes.NameIdentifier, userId)], "test")), "scheme");

    [Fact]
    public async Task RetrieveAsync_ForARequest_RemembersTheSessionKey()
    {
        var key = await _store.StoreAsync(SessionOf("u1"));
        var request = new DefaultHttpContext();

        var ticket = await ((ITicketStore)_store).RetrieveAsync(key, request, CancellationToken.None);

        Assert.NotNull(ticket);
        Assert.Equal(key, AuthSessionKey.Of(request));
    }

    [Fact]
    public async Task RetrieveAsync_ForARequest_OfAnUnknownKey_RemembersNothing()
    {
        var request = new DefaultHttpContext();

        Assert.Null(await ((ITicketStore)_store).RetrieveAsync("missing", request, CancellationToken.None));
        Assert.Null(AuthSessionKey.Of(request));
    }

    [Fact]
    public async Task RemoveAllForUser_RemovesThatUsersTicketsButTheKeptOne()
    {
        var kept = await _store.StoreAsync(SessionOf("u1"));
        var revoked = await _store.StoreAsync(SessionOf("u1"));
        var otherUser = await _store.StoreAsync(SessionOf("u2"));

        Assert.Equal(1L, _store.RemoveAllForUser("u1", kept));

        Assert.NotNull(await _store.RetrieveAsync(kept));
        Assert.Null(await _store.RetrieveAsync(revoked));
        Assert.NotNull(await _store.RetrieveAsync(otherUser));
    }
}
