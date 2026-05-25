using MongoDB.Bson;
using MongoDB.Driver;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Infrastructure.Persistence.Mongo;

public sealed class MongoUserRepository : IUserRepository
{
    private readonly IMongoCollection<UserDocument> _collection;

    public MongoUserRepository(IMongoDatabase database)
    {
        _collection = database.GetCollection<UserDocument>("users");
    }

    public async Task<User?> GetByIdAsync(string id, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(id))
            return null;
        var doc = await _collection.Find(x => x.Id == id).FirstOrDefaultAsync(ct);
        return doc is null ? null : UserDocumentMapper.ToDomain(doc);
    }

    public async Task<IReadOnlyList<User>> ListByIdsAsync(IReadOnlyCollection<string> ids, CancellationToken ct = default)
    {
        if (ids.Count == 0)
            return Array.Empty<User>();
        var filter = Builders<UserDocument>.Filter.In(x => x.Id, ids);
        var docs = await _collection.Find(filter).ToListAsync(ct);
        return docs.ConvertAll(UserDocumentMapper.ToDomain);
    }

    public async Task<User?> GetByEmailAsync(string email, CancellationToken ct = default)
    {
        var normalized = NormalizeEmail(email);
        if (normalized is null)
            return null;
        var doc = await _collection.Find(x => x.Email == normalized).FirstOrDefaultAsync(ct);
        return doc is null ? null : UserDocumentMapper.ToDomain(doc);
    }

    public async Task<User> AddAsync(User user, CancellationToken ct = default)
    {
        var doc = UserDocumentMapper.ToDocument(user);
        if (string.IsNullOrEmpty(doc.Id))
            doc.Id = ObjectId.GenerateNewId().ToString();
        doc.Email = NormalizeEmail(doc.Email) ?? doc.Email;
        var now = DateTime.UtcNow;
        doc.CreatedAt = now;
        doc.UpdatedAt = now;
        await _collection.InsertOneAsync(doc, cancellationToken: ct);
        return UserDocumentMapper.ToDomain(doc);
    }

    public async Task<User> UpdateAsync(User user, CancellationToken ct = default)
    {
        var doc = UserDocumentMapper.ToDocument(user);
        doc.Email = NormalizeEmail(doc.Email) ?? doc.Email;
        doc.UpdatedAt = DateTime.UtcNow;
        await _collection.ReplaceOneAsync(x => x.Id == user.Id, doc, cancellationToken: ct);
        return UserDocumentMapper.ToDomain(doc);
    }

    private static string? NormalizeEmail(string? email)
    {
        if (string.IsNullOrWhiteSpace(email))
            return null;
        return email.Trim().ToLowerInvariant();
    }
}
