using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using MongoDB.Bson;
using MongoDB.Driver;

namespace MoviePicker.Api.Infrastructure.Persistence.Mongo;

/// <summary>Sessions auth côté serveur (cookie = clé uniquement). Aligné roadmap V1 § 1 / § 3.</summary>
public sealed class MongoAuthTicketStore : ITicketStore
{
    private readonly IMongoCollection<AuthSessionDocument> _collection;

    public MongoAuthTicketStore(IMongoDatabase database)
    {
        _collection = database.GetCollection<AuthSessionDocument>("auth_sessions");
    }

    public async Task<string> StoreAsync(AuthenticationTicket ticket)
    {
        var id = ObjectId.GenerateNewId().ToString();
        var now = DateTime.UtcNow;
        var expires = ticket.Properties.ExpiresUtc?.UtcDateTime ?? now.AddDays(14);
        var doc = new AuthSessionDocument
        {
            Id = id,
            UserId = ticket.Principal.FindFirstValue(ClaimTypes.NameIdentifier) ?? string.Empty,
            Claims = ticket.Principal.Claims.Select(c => new StoredClaim { Type = c.Type, Value = c.Value }).ToList(),
            ExpiresAtUtc = expires,
            CreatedAtUtc = now
        };
        await _collection.InsertOneAsync(doc);
        return id;
    }

    public async Task RenewAsync(string key, AuthenticationTicket ticket)
    {
        var expires = ticket.Properties.ExpiresUtc?.UtcDateTime ?? DateTime.UtcNow.AddDays(14);
        var claims = ticket.Principal.Claims.Select(c => new StoredClaim { Type = c.Type, Value = c.Value }).ToList();
        var userId = ticket.Principal.FindFirstValue(ClaimTypes.NameIdentifier) ?? string.Empty;
        await _collection.UpdateOneAsync(
            x => x.Id == key,
            Builders<AuthSessionDocument>.Update
                .Set(x => x.ExpiresAtUtc, expires)
                .Set(x => x.Claims, claims)
                .Set(x => x.UserId, userId));
    }

    public async Task<AuthenticationTicket?> RetrieveAsync(string key)
    {
        var doc = await _collection.Find(x => x.Id == key).FirstOrDefaultAsync();
        if (doc is null)
            return null;
        if (doc.ExpiresAtUtc < DateTime.UtcNow)
        {
            await _collection.DeleteOneAsync(x => x.Id == key);
            return null;
        }

        var identity = new ClaimsIdentity(
            doc.Claims.Select(c => new Claim(c.Type, c.Value)),
            CookieAuthenticationDefaults.AuthenticationScheme);
        var principal = new ClaimsPrincipal(identity);
        var props = new AuthenticationProperties
        {
            IsPersistent = true,
            ExpiresUtc = new DateTimeOffset(DateTime.SpecifyKind(doc.ExpiresAtUtc, DateTimeKind.Utc)),
            IssuedUtc = new DateTimeOffset(DateTime.SpecifyKind(doc.CreatedAtUtc, DateTimeKind.Utc))
        };
        return new AuthenticationTicket(principal, props, CookieAuthenticationDefaults.AuthenticationScheme);
    }

    public Task RemoveAsync(string key) =>
        _collection.DeleteOneAsync(x => x.Id == key);
}
