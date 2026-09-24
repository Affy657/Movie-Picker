using System.Collections.Concurrent;
using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using MoviePicker.Api.Infrastructure.Web;

namespace MoviePicker.Api.Infrastructure.Persistence.InMemory;

public sealed class MemoryAuthTicketStore : ITicketStore
{
    private readonly ConcurrentDictionary<string, AuthenticationTicket> _tickets = new();

    public Task<string> StoreAsync(AuthenticationTicket ticket)
    {
        var key = Guid.NewGuid().ToString("N");
        _tickets[key] = ticket;
        return Task.FromResult(key);
    }

    public Task RenewAsync(string key, AuthenticationTicket ticket)
    {
        _tickets[key] = ticket;
        return Task.CompletedTask;
    }

    public Task<AuthenticationTicket?> RetrieveAsync(string key) =>
        Task.FromResult(_tickets.TryGetValue(key, out var t) ? t : null);

    public async Task<AuthenticationTicket?> RetrieveAsync(string key, HttpContext httpContext, CancellationToken cancellationToken)
    {
        var ticket = await RetrieveAsync(key);
        if (ticket is not null)
            AuthSessionKey.Remember(httpContext, key);
        return ticket;
    }

    public Task RemoveAsync(string key)
    {
        _tickets.TryRemove(key, out _);
        return Task.CompletedTask;
    }

    public long RemoveAllForUser(string userId, string? keptKey)
    {
        long removed = 0;
        foreach (var (key, ticket) in _tickets)
        {
            if (key != keptKey
                && ticket.Principal.FindFirstValue(ClaimTypes.NameIdentifier) == userId
                && _tickets.TryRemove(key, out _))
                removed++;
        }

        return removed;
    }
}
