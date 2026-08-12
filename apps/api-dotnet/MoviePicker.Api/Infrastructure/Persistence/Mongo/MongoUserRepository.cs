using MongoDB.Bson;
using MongoDB.Driver;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;

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
            return [];
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

    public async Task<User?> GetByHandleAsync(string handle, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(handle))
            return null;
        var normalized = handle.Trim().ToLowerInvariant();
        var doc = await _collection.Find(x => x.Handle == normalized).FirstOrDefaultAsync(ct);
        return doc is null ? null : UserDocumentMapper.ToDomain(doc);
    }

    public async Task<User?> GetByIdentityAsync(string provider, string subject, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(provider) || string.IsNullOrWhiteSpace(subject))
            return null;
        var filter = Builders<UserDocument>.Filter.ElemMatch(
            x => x.Identities,
            Builders<UserIdentityDocument>.Filter.And(
                Builders<UserIdentityDocument>.Filter.Eq(i => i.Provider, provider),
                Builders<UserIdentityDocument>.Filter.Eq(i => i.Subject, subject)));
        var doc = await _collection.Find(filter).FirstOrDefaultAsync(ct);
        return doc is null ? null : UserDocumentMapper.ToDomain(doc);
    }

    public async Task<IReadOnlyList<User>> ListMissingHandleAsync(CancellationToken ct = default)
    {
        var filter = Builders<UserDocument>.Filter.Or(
            Builders<UserDocument>.Filter.Exists(x => x.Handle, false),
            Builders<UserDocument>.Filter.Eq(x => x.Handle, null),
            Builders<UserDocument>.Filter.Eq(x => x.Handle, string.Empty));
        var docs = await _collection.Find(filter).ToListAsync(ct);
        return docs.ConvertAll(UserDocumentMapper.ToDomain);
    }

    public async Task<IReadOnlyList<User>> ListWithLetterboxdSyncEnabledAsync(CancellationToken ct = default)
    {
        var filter = Builders<UserDocument>.Filter.And(
            Builders<UserDocument>.Filter.Ne(x => x.LetterboxdUsername, null),
            Builders<UserDocument>.Filter.Ne(x => x.LetterboxdUsername, string.Empty));
        var docs = await _collection.Find(filter).ToListAsync(ct);
        return docs.ConvertAll(UserDocumentMapper.ToDomain);
    }

    public async Task SetLetterboxdSyncStatusAsync(
        string userId,
        DateTimeOffset syncedAt,
        string? error,
        CancellationToken ct = default)
    {
        var update = Builders<UserDocument>.Update
            .Set(x => x.LetterboxdLastSyncAt, syncedAt.UtcDateTime)
            .Set(x => x.LetterboxdLastSyncError, error);
        await _collection.UpdateOneAsync(x => x.Id == userId, update, cancellationToken: ct);
    }

    public async Task<IReadOnlyList<PublicProfileRef>> ListPublicProfilesAsync(int limit, CancellationToken ct = default)
    {
        var filter = Builders<UserDocument>.Filter.And(
            Builders<UserDocument>.Filter.Ne(x => x.IsProfilePublic, false),
            Builders<UserDocument>.Filter.Ne(x => x.Handle, null),
            Builders<UserDocument>.Filter.Ne(x => x.Handle, string.Empty));
        IFindFluent<UserDocument, UserDocument> find =
            _collection.Find(filter).SortByDescending(x => x.UpdatedAt);
        if (limit > 0)
            find = find.Limit(limit);
        var docs = await find.ToListAsync(ct);
        return docs
            .Where(d => !string.IsNullOrWhiteSpace(d.Handle))
            .Select(d => new PublicProfileRef(
                d.Handle!,
                new DateTimeOffset(DateTime.SpecifyKind(d.UpdatedAt, DateTimeKind.Utc))))
            .ToList();
    }

    public async Task<User> AddAsync(User user, CancellationToken ct = default)
    {
        var doc = UserDocumentMapper.ToDocument(user);
        if (string.IsNullOrEmpty(doc.Id))
            doc.Id = ObjectId.GenerateNewId().ToString();
        doc.Email = NormalizeEmail(doc.Email) ?? doc.Email;
        doc.Handle = NormalizeHandle(doc.Handle);
        var now = DateTime.UtcNow;
        doc.CreatedAt = now;
        doc.UpdatedAt = now;
        try
        {
            await _collection.InsertOneAsync(doc, cancellationToken: ct);
        }
        catch (MongoWriteException ex) when (ex.WriteError?.Category == ServerErrorCategory.DuplicateKey)
        {
            ThrowTypedDuplicateKey(ex);
        }
        return UserDocumentMapper.ToDomain(doc);
    }

    public async Task<User> UpdateAsync(User user, CancellationToken ct = default)
    {
        var doc = UserDocumentMapper.ToDocument(user);
        doc.Email = NormalizeEmail(doc.Email) ?? doc.Email;
        doc.Handle = NormalizeHandle(doc.Handle);
        doc.UpdatedAt = DateTime.UtcNow;
        try
        {
            await _collection.ReplaceOneAsync(x => x.Id == user.Id, doc, cancellationToken: ct);
        }
        catch (MongoWriteException ex) when (ex.WriteError?.Category == ServerErrorCategory.DuplicateKey)
        {
            ThrowTypedDuplicateKey(ex);
        }
        return UserDocumentMapper.ToDomain(doc);
    }

    public async Task<bool> DeleteAsync(string id, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(id))
            return false;
        var result = await _collection.DeleteOneAsync(x => x.Id == id, ct);
        return result.IsAcknowledged && result.DeletedCount > 0;
    }

    /// <summary>
    /// Rethrows a duplicate-key error as a <see cref="ConflictException"/> with a message
    /// that indicates whether the collision is on the handle index or the email index.
    /// This lets callers distinguish the two cases without depending on MongoDB internals.
    /// </summary>
    private static void ThrowTypedDuplicateKey(MongoWriteException ex)
    {
        var msg = ex.WriteError?.Message ?? string.Empty;
        if (msg.Contains("users_handle_unique", StringComparison.OrdinalIgnoreCase))
            throw new ConflictException("handle_conflict");
        if (msg.Contains("users_identities_provider_subject_unique", StringComparison.OrdinalIgnoreCase))
            throw new ConflictException("identity_conflict");
        throw new ConflictException("Un compte existe déjà pour cette adresse e-mail.");
    }

    private static string? NormalizeHandle(string? handle)
    {
        if (string.IsNullOrWhiteSpace(handle))
            return null;
        return handle.Trim().ToLowerInvariant();
    }

    private static string? NormalizeEmail(string? email)
    {
        if (string.IsNullOrWhiteSpace(email))
            return null;
        return email.Trim().ToLowerInvariant();
    }
}
