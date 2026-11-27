using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using MongoDB.Bson;
using MongoDB.Driver;
using MoviePicker.Api.Infrastructure.Web;

namespace MoviePicker.Api.Infrastructure.Persistence.Mongo;

public sealed class MongoAuthTicketStore : ITicketStore
{
    public const int MaxUserAgentLength = 512;
    public static readonly TimeSpan LastSeenTouchInterval = TimeSpan.FromHours(1);

    private readonly TransactionalCollection<AuthSessionDocument> _collection;

    public MongoAuthTicketStore(MongoCollectionFactory collections)
    {
        _collection = collections.GetCollection<AuthSessionDocument>("auth_sessions");
    }

    public Task<string> StoreAsync(AuthenticationTicket ticket) => StoreAsync(ticket, userAgent: null);

    public Task<string> StoreAsync(AuthenticationTicket ticket, HttpContext httpContext, CancellationToken cancellationToken) =>
        StoreAsync(ticket, UserAgentOf(httpContext));

    private async Task<string> StoreAsync(AuthenticationTicket ticket, string? userAgent)
    {
        var id = ObjectId.GenerateNewId().ToString();
        var now = DateTime.UtcNow;
        var expires = ticket.Properties.ExpiresUtc?.UtcDateTime ?? now.Add(AuthConstants.SessionLifetime);
        var doc = new AuthSessionDocument
        {
            Id = id,
            UserId = ticket.Principal.FindFirstValue(ClaimTypes.NameIdentifier) ?? string.Empty,
            Claims = ticket.Principal.Claims.Select(c => new StoredClaim { Type = c.Type, Value = c.Value }).ToList(),
            ExpiresAtUtc = expires,
            CreatedAtUtc = now,
            UserAgent = userAgent,
            LastSeenAtUtc = userAgent is null ? null : now
        };
        await _collection.InsertOneAsync(doc);
        return id;
    }

    public async Task RenewAsync(string key, AuthenticationTicket ticket)
    {
        var expires = ticket.Properties.ExpiresUtc?.UtcDateTime ?? DateTime.UtcNow.Add(AuthConstants.SessionLifetime);
        var claims = ticket.Principal.Claims.Select(c => new StoredClaim { Type = c.Type, Value = c.Value }).ToList();
        var userId = ticket.Principal.FindFirstValue(ClaimTypes.NameIdentifier) ?? string.Empty;
        await _collection.UpdateOneAsync(
            x => x.Id == key,
            Builders<AuthSessionDocument>.Update
                .Set(x => x.ExpiresAtUtc, expires)
                .Set(x => x.Claims, claims)
                .Set(x => x.UserId, userId));
    }

    public Task<AuthenticationTicket?> RetrieveAsync(string key) => RetrieveAsync(key, userAgent: null);

    public Task<AuthenticationTicket?> RetrieveAsync(string key, HttpContext httpContext, CancellationToken cancellationToken) =>
        RetrieveAsync(key, UserAgentOf(httpContext));

    private async Task<AuthenticationTicket?> RetrieveAsync(string key, string? userAgent)
    {
        var doc = await _collection.Find(x => x.Id == key).FirstOrDefaultAsync();
        if (doc is null)
            return null;

        var createdAt = new DateTimeOffset(DateTime.SpecifyKind(doc.CreatedAtUtc, DateTimeKind.Utc));
        var expiresAt = new DateTimeOffset(DateTime.SpecifyKind(doc.ExpiresAtUtc, DateTimeKind.Utc));
        if (SessionWindow.IsExpired(createdAt, expiresAt, DateTimeOffset.UtcNow))
        {
            await _collection.DeleteOneAsync(x => x.Id == key);
            return null;
        }

        await TouchAsync(doc, userAgent);

        var identity = new ClaimsIdentity(
            doc.Claims.Select(c => new Claim(c.Type, c.Value)),
            CookieAuthenticationDefaults.AuthenticationScheme);
        var principal = new ClaimsPrincipal(identity);
        var props = new AuthenticationProperties
        {
            IsPersistent = true,
            ExpiresUtc = expiresAt,
            IssuedUtc = SessionWindow.IssuedAt(createdAt, expiresAt)
        };
        return new AuthenticationTicket(principal, props, CookieAuthenticationDefaults.AuthenticationScheme);
    }

    private async Task TouchAsync(AuthSessionDocument doc, string? userAgent)
    {
        var now = DateTime.UtcNow;
        var update = Builders<AuthSessionDocument>.Update;
        var changes = new List<UpdateDefinition<AuthSessionDocument>>();
        if (doc.LastSeenAtUtc is not { } lastSeen || now - lastSeen >= LastSeenTouchInterval)
            changes.Add(update.Set(x => x.LastSeenAtUtc, now));
        if (doc.UserAgent is null && userAgent is not null)
            changes.Add(update.Set(x => x.UserAgent, userAgent));
        if (changes.Count == 0)
            return;
        await _collection.UpdateOneAsync(x => x.Id == doc.Id, update.Combine(changes));
    }

    private static string? UserAgentOf(HttpContext httpContext)
    {
        var userAgent = httpContext.Request.Headers.UserAgent.ToString();
        if (string.IsNullOrWhiteSpace(userAgent))
            return null;
        return userAgent.Length <= MaxUserAgentLength ? userAgent : userAgent[..MaxUserAgentLength];
    }

    public Task RemoveAsync(string key) =>
        _collection.DeleteOneAsync(x => x.Id == key);
}
