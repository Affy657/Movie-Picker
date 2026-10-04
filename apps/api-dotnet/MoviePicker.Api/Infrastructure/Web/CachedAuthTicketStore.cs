using System.Collections.Concurrent;
using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.Extensions.Caching.Memory;

namespace MoviePicker.Api.Infrastructure.Web;

public sealed class AuthTicketCache
{
    public static readonly TimeSpan DefaultTtl = TimeSpan.FromSeconds(30);

    private readonly IMemoryCache _cache;
    private readonly TimeSpan _ttl;
    private readonly ConcurrentDictionary<string, long> _userGenerations = new();

    public AuthTicketCache(IMemoryCache cache, TimeSpan? ttl = null)
    {
        _cache = cache;
        _ttl = ttl ?? DefaultTtl;
    }

    public AuthenticationTicket? TryGet(string key)
    {
        if (!_cache.TryGetValue(CacheKey(key), out CachedTicket? entry) || entry is null)
            return null;
        if (entry.Generation != GenerationOf(entry.UserId))
        {
            _cache.Remove(CacheKey(key));
            return null;
        }
        return Clone(entry.Ticket);
    }

    public void Set(string key, AuthenticationTicket ticket)
    {
        var userId = UserIdOf(ticket);
        var entry = new CachedTicket(Clone(ticket), userId, GenerationOf(userId));
        _cache.Set(CacheKey(key), entry, _ttl);
    }

    public bool IsKnownMissing(string key) =>
        _cache.TryGetValue(CacheKey(key), out object? entry) && entry is MissingTicket;

    public void SetMissing(string key) => _cache.Set(CacheKey(key), MissingTicket.Instance, _ttl);

    public void Remove(string key) => _cache.Remove(CacheKey(key));

    public void InvalidateUser(string userId)
    {
        if (string.IsNullOrEmpty(userId))
            return;
        _userGenerations.AddOrUpdate(userId, 1, (_, current) => current + 1);
    }

    private long GenerationOf(string userId) =>
        _userGenerations.TryGetValue(userId, out var generation) ? generation : 0;

    private static string CacheKey(string key) => "auth-ticket:" + key;

    private static string UserIdOf(AuthenticationTicket ticket) =>
        ticket.Principal.FindFirstValue(ClaimTypes.NameIdentifier) ?? string.Empty;

    private static AuthenticationTicket Clone(AuthenticationTicket ticket) =>
        new(ticket.Principal, ticket.Properties.Clone(), ticket.AuthenticationScheme);

    private sealed record CachedTicket(AuthenticationTicket Ticket, string UserId, long Generation);

    private sealed class MissingTicket
    {
        public static readonly MissingTicket Instance = new();
    }
}

public sealed class CachedAuthTicketStore : ITicketStore
{
    private readonly ITicketStore _inner;
    private readonly AuthTicketCache _cache;

    public CachedAuthTicketStore(ITicketStore inner, AuthTicketCache cache)
    {
        _inner = inner;
        _cache = cache;
    }

    public async Task<string> StoreAsync(AuthenticationTicket ticket)
    {
        var key = await _inner.StoreAsync(ticket);
        _cache.Set(key, ticket);
        return key;
    }

    public async Task RenewAsync(string key, AuthenticationTicket ticket)
    {
        await _inner.RenewAsync(key, ticket);
        _cache.Set(key, ticket);
    }

    public async Task<AuthenticationTicket?> RetrieveAsync(string key, HttpContext httpContext, CancellationToken cancellationToken)
    {
        var ticket = await RetrieveAsync(key);
        if (ticket is not null)
            AuthSessionKey.Remember(httpContext, key);
        return ticket;
    }

    public async Task<AuthenticationTicket?> RetrieveAsync(string key)
    {
        var cached = _cache.TryGet(key);
        if (cached is not null)
            return cached;
        if (_cache.IsKnownMissing(key))
            return null;

        var ticket = await _inner.RetrieveAsync(key);
        if (ticket is not null)
            _cache.Set(key, ticket);
        else
            _cache.SetMissing(key);
        return ticket;
    }

    public async Task RemoveAsync(string key)
    {
        _cache.Remove(key);
        await _inner.RemoveAsync(key);
    }
}
