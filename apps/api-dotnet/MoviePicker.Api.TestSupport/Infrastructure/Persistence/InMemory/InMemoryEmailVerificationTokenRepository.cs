using System.Collections.Concurrent;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Infrastructure.Persistence.InMemory;

public sealed class InMemoryEmailVerificationTokenRepository : IEmailVerificationTokenRepository
{
    private readonly ConcurrentDictionary<string, EmailVerificationToken> _tokens = new();

    public Task<EmailVerificationToken> AddAsync(EmailVerificationToken token, CancellationToken ct = default)
    {
        var stored = token with { Id = Guid.NewGuid().ToString("N") };
        _tokens[stored.Id] = stored;
        return Task.FromResult(stored);
    }

    public Task<EmailVerificationToken?> FindUnexpiredAsync(string tokenHash, DateTimeOffset now, CancellationToken ct = default) =>
        Task.FromResult(_tokens.Values.FirstOrDefault(t => t.TokenHash == tokenHash && t.ExpiresAtUtc > now));

    public Task<EmailVerificationToken?> GetLatestForUserAsync(string userId, CancellationToken ct = default) =>
        Task.FromResult(_tokens.Values
            .Where(t => t.UserId == userId)
            .OrderByDescending(t => t.CreatedAt)
            .FirstOrDefault());

    public Task ConsumeAllForUserAsync(string userId, DateTimeOffset consumedAt, CancellationToken ct = default)
    {
        foreach (var id in _tokens.Keys)
        {
            _tokens.SwapIfPresent(id, token => token.UserId == userId && token.ConsumedAt is null
                ? token with { ConsumedAt = consumedAt }
                : null);
        }

        return Task.CompletedTask;
    }

    public Task<long> DeleteByUserIdAsync(string userId, CancellationToken ct = default)
    {
        long removed = _tokens.Values
            .Where(t => t.UserId == userId)
            .Count(t => _tokens.TryRemove(t.Id, out _));
        return Task.FromResult(removed);
    }
}
