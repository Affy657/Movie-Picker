using MongoDB.Driver;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Infrastructure.Persistence.Mongo;

public sealed class MongoEmailVerificationTokenRepository : IEmailVerificationTokenRepository
{
    public const string CollectionName = "email_verification_tokens";

    private readonly TransactionalCollection<EmailVerificationTokenDocument> _tokens;

    public MongoEmailVerificationTokenRepository(MongoCollectionFactory collections)
    {
        _tokens = collections.GetCollection<EmailVerificationTokenDocument>(CollectionName);
    }

    public async Task<EmailVerificationToken> AddAsync(EmailVerificationToken token, CancellationToken ct = default)
    {
        var document = EmailVerificationTokenDocument.From(token);
        await _tokens.InsertOneAsync(document, cancellationToken: ct);
        return document.ToDomain();
    }

    public async Task<EmailVerificationToken?> FindUnexpiredAsync(string tokenHash, DateTimeOffset now, CancellationToken ct = default)
    {
        var expiresAfter = now.UtcDateTime;
        var document = await _tokens
            .Find(t => t.TokenHash == tokenHash && t.ExpiresAtUtc > expiresAfter)
            .FirstOrDefaultAsync(ct);
        return document?.ToDomain();
    }

    public async Task<EmailVerificationToken?> GetLatestForUserAsync(string userId, CancellationToken ct = default)
    {
        var document = await _tokens
            .Find(t => t.UserId == userId)
            .SortByDescending(t => t.CreatedAt)
            .FirstOrDefaultAsync(ct);
        return document?.ToDomain();
    }

    public Task ConsumeAllForUserAsync(string userId, DateTimeOffset consumedAt, CancellationToken ct = default) =>
        _tokens.UpdateManyAsync(
            t => t.UserId == userId && t.ConsumedAt == null,
            Builders<EmailVerificationTokenDocument>.Update.Set(t => t.ConsumedAt, consumedAt.UtcDateTime),
            cancellationToken: ct);

    public async Task<long> DeleteByUserIdAsync(string userId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(userId))
            return 0;
        var deleted = await _tokens.DeleteManyAsync(t => t.UserId == userId, ct);
        return deleted.DeletedCount;
    }
}
