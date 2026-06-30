using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using MoviePicker.Api.Infrastructure.Persistence.InMemory;
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
}
