using System.Collections.Concurrent;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Infrastructure.Persistence.InMemory;

public sealed class InMemoryPasswordResetTokenRepository : IPasswordResetTokenRepository
{
    private readonly ConcurrentDictionary<string, PasswordResetToken> _byId = new();

    public Task<PasswordResetToken> AddAsync(PasswordResetToken token, CancellationToken ct = default)
    {
        var id = Guid.NewGuid().ToString("N");
        var created = token with { Id = id };
        _byId[id] = created;
        return Task.FromResult(created);
    }

    public Task<PasswordResetToken?> GetByTokenHashAsync(string tokenHash, CancellationToken ct = default)
    {
        var now = DateTimeOffset.UtcNow;
        foreach (var kv in _byId)
        {
            var t = kv.Value;
            if (t.TokenHash == tokenHash && t.ExpiresAtUtc > now && t.ConsumedAt is null)
                return Task.FromResult<PasswordResetToken?>(t);
        }

        return Task.FromResult<PasswordResetToken?>(null);
    }

    public Task MarkConsumedAsync(string tokenId, DateTimeOffset consumedAt, CancellationToken ct = default)
    {
        if (_byId.TryGetValue(tokenId, out var token))
            _byId[tokenId] = token with { ConsumedAt = consumedAt };
        return Task.CompletedTask;
    }

    public Task InvalidateActiveForUserAsync(string userId, DateTimeOffset consumedAt, CancellationToken ct = default)
    {
        foreach (var kv in _byId)
        {
            var t = kv.Value;
            if (t.UserId == userId && t.ConsumedAt is null)
                _byId[kv.Key] = t with { ConsumedAt = consumedAt };
        }

        return Task.CompletedTask;
    }

    public Task<PasswordResetToken?> GetMostRecentForUserAsync(string userId, CancellationToken ct = default)
    {
        PasswordResetToken? best = null;
        foreach (var kv in _byId)
        {
            var t = kv.Value;
            if (t.UserId != userId)
                continue;
            if (best is null || t.CreatedAt > best.CreatedAt)
                best = t;
        }

        return Task.FromResult(best);
    }
}
