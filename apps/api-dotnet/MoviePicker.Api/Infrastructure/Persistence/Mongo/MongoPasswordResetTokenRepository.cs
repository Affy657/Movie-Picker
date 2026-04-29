using MongoDB.Bson;
using MongoDB.Driver;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Infrastructure.Persistence.Mongo;

public sealed class MongoPasswordResetTokenRepository : IPasswordResetTokenRepository
{
    private readonly IMongoCollection<PasswordResetTokenDocument> _collection;

    public MongoPasswordResetTokenRepository(IMongoDatabase database)
    {
        _collection = database.GetCollection<PasswordResetTokenDocument>("password_reset_tokens");
    }

    public async Task<PasswordResetToken> AddAsync(PasswordResetToken token, CancellationToken ct = default)
    {
        var doc = PasswordResetTokenDocumentMapper.ToDocument(token);
        if (string.IsNullOrEmpty(doc.Id))
            doc.Id = ObjectId.GenerateNewId().ToString();
        await _collection.InsertOneAsync(doc, cancellationToken: ct);
        return PasswordResetTokenDocumentMapper.ToDomain(doc);
    }

    public async Task<PasswordResetToken?> GetByTokenHashAsync(string tokenHash, CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;
        var doc = await _collection
            .Find(d => d.TokenHash == tokenHash && d.ExpiresAtUtc > now && d.ConsumedAt == null)
            .FirstOrDefaultAsync(ct);
        return doc is null ? null : PasswordResetTokenDocumentMapper.ToDomain(doc);
    }

    public async Task MarkConsumedAsync(string tokenId, DateTimeOffset consumedAt, CancellationToken ct = default)
    {
        await _collection.UpdateOneAsync(
            d => d.Id == tokenId,
            Builders<PasswordResetTokenDocument>.Update.Set(d => d.ConsumedAt, consumedAt.UtcDateTime),
            cancellationToken: ct);
    }

    public async Task InvalidateActiveForUserAsync(string userId, DateTimeOffset consumedAt, CancellationToken ct = default)
    {
        await _collection.UpdateManyAsync(
            d => d.UserId == userId && d.ConsumedAt == null,
            Builders<PasswordResetTokenDocument>.Update.Set(d => d.ConsumedAt, consumedAt.UtcDateTime),
            cancellationToken: ct);
    }

    public async Task<PasswordResetToken?> GetMostRecentForUserAsync(string userId, CancellationToken ct = default)
    {
        var doc = await _collection.Find(d => d.UserId == userId)
            .SortByDescending(d => d.CreatedAt)
            .Limit(1)
            .FirstOrDefaultAsync(ct);
        return doc is null ? null : PasswordResetTokenDocumentMapper.ToDomain(doc);
    }
}
