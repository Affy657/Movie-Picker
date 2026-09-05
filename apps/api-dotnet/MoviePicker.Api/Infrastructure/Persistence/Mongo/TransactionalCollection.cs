using System.Linq.Expressions;
using MongoDB.Driver;

namespace MoviePicker.Api.Infrastructure.Persistence.Mongo;

public sealed class TransactionalCollection<TDocument>
{
    private readonly IMongoCollection<TDocument> _inner;
    private readonly MongoSessionAccessor _sessions;

    public TransactionalCollection(IMongoCollection<TDocument> inner, MongoSessionAccessor sessions)
    {
        _inner = inner;
        _sessions = sessions;
    }

    private IClientSessionHandle? Session => _sessions.Session;

    public IMongoIndexManager<TDocument> Indexes => _inner.Indexes;

    public IFindFluent<TDocument, TDocument> Find(
        Expression<Func<TDocument, bool>> filter,
        FindOptions? options = null) =>
        Session is { } session ? _inner.Find(session, filter, options) : _inner.Find(filter, options);

    public IFindFluent<TDocument, TDocument> Find(
        FilterDefinition<TDocument> filter,
        FindOptions? options = null) =>
        Session is { } session ? _inner.Find(session, filter, options) : _inner.Find(filter, options);

    public IAggregateFluent<TDocument> Aggregate(AggregateOptions? options = null) =>
        Session is { } session ? _inner.Aggregate(session, options) : _inner.Aggregate(options);

    public Task<IAsyncCursor<TField>> DistinctAsync<TField>(
        Expression<Func<TDocument, TField>> field,
        FilterDefinition<TDocument> filter,
        DistinctOptions? options = null,
        CancellationToken cancellationToken = default) =>
        Session is { } session
            ? _inner.DistinctAsync(session, field, filter, options, cancellationToken)
            : _inner.DistinctAsync(field, filter, options, cancellationToken);

    public Task<long> CountDocumentsAsync(
        Expression<Func<TDocument, bool>> filter,
        CountOptions? options = null,
        CancellationToken cancellationToken = default) =>
        Session is { } session
            ? _inner.CountDocumentsAsync(session, filter, options, cancellationToken)
            : _inner.CountDocumentsAsync(filter, options, cancellationToken);

    public Task<long> CountDocumentsAsync(
        FilterDefinition<TDocument> filter,
        CountOptions? options = null,
        CancellationToken cancellationToken = default) =>
        Session is { } session
            ? _inner.CountDocumentsAsync(session, filter, options, cancellationToken)
            : _inner.CountDocumentsAsync(filter, options, cancellationToken);

    public Task InsertOneAsync(
        TDocument document,
        InsertOneOptions? options = null,
        CancellationToken cancellationToken = default) =>
        Session is { } session
            ? _inner.InsertOneAsync(session, document, options, cancellationToken)
            : _inner.InsertOneAsync(document, options, cancellationToken);

    public Task<UpdateResult> UpdateOneAsync(
        Expression<Func<TDocument, bool>> filter,
        UpdateDefinition<TDocument> update,
        UpdateOptions? options = null,
        CancellationToken cancellationToken = default) =>
        Session is { } session
            ? _inner.UpdateOneAsync(session, filter, update, options, cancellationToken)
            : _inner.UpdateOneAsync(filter, update, options, cancellationToken);

    public Task<UpdateResult> UpdateOneAsync(
        FilterDefinition<TDocument> filter,
        UpdateDefinition<TDocument> update,
        UpdateOptions? options = null,
        CancellationToken cancellationToken = default) =>
        Session is { } session
            ? _inner.UpdateOneAsync(session, filter, update, options, cancellationToken)
            : _inner.UpdateOneAsync(filter, update, options, cancellationToken);

    public Task<UpdateResult> UpdateManyAsync(
        Expression<Func<TDocument, bool>> filter,
        UpdateDefinition<TDocument> update,
        UpdateOptions? options = null,
        CancellationToken cancellationToken = default) =>
        Session is { } session
            ? _inner.UpdateManyAsync(session, filter, update, options, cancellationToken)
            : _inner.UpdateManyAsync(filter, update, options, cancellationToken);

    public Task<UpdateResult> UpdateManyAsync(
        FilterDefinition<TDocument> filter,
        UpdateDefinition<TDocument> update,
        UpdateOptions? options = null,
        CancellationToken cancellationToken = default) =>
        Session is { } session
            ? _inner.UpdateManyAsync(session, filter, update, options, cancellationToken)
            : _inner.UpdateManyAsync(filter, update, options, cancellationToken);

    public Task<ReplaceOneResult> ReplaceOneAsync(
        Expression<Func<TDocument, bool>> filter,
        TDocument replacement,
        ReplaceOptions? options = null,
        CancellationToken cancellationToken = default) =>
        Session is { } session
            ? _inner.ReplaceOneAsync(session, filter, replacement, options, cancellationToken)
            : _inner.ReplaceOneAsync(filter, replacement, options, cancellationToken);

    public ReplaceOneResult ReplaceOne(
        Expression<Func<TDocument, bool>> filter,
        TDocument replacement,
        ReplaceOptions? options = null,
        CancellationToken cancellationToken = default) =>
        Session is { } session
            ? _inner.ReplaceOne(session, filter, replacement, options, cancellationToken)
            : _inner.ReplaceOne(filter, replacement, options, cancellationToken);

    public Task<DeleteResult> DeleteOneAsync(
        Expression<Func<TDocument, bool>> filter,
        CancellationToken cancellationToken = default) =>
        Session is { } session
            ? _inner.DeleteOneAsync(session, filter, null, cancellationToken)
            : _inner.DeleteOneAsync(filter, cancellationToken);

    public Task<DeleteResult> DeleteManyAsync(
        Expression<Func<TDocument, bool>> filter,
        CancellationToken cancellationToken = default) =>
        Session is { } session
            ? _inner.DeleteManyAsync(session, filter, null, cancellationToken)
            : _inner.DeleteManyAsync(filter, cancellationToken);

    public Task<DeleteResult> DeleteManyAsync(
        FilterDefinition<TDocument> filter,
        CancellationToken cancellationToken = default) =>
        Session is { } session
            ? _inner.DeleteManyAsync(session, filter, null, cancellationToken)
            : _inner.DeleteManyAsync(filter, cancellationToken);

    public Task<DeleteResult> DeleteOneAsync(
        FilterDefinition<TDocument> filter,
        CancellationToken cancellationToken = default) =>
        Session is { } session
            ? _inner.DeleteOneAsync(session, filter, null, cancellationToken)
            : _inner.DeleteOneAsync(filter, cancellationToken);

    public Task<IAsyncCursor<TResult>> AggregateAsync<TResult>(
        PipelineDefinition<TDocument, TResult> pipeline,
        AggregateOptions? options = null,
        CancellationToken cancellationToken = default) =>
        Session is { } session
            ? _inner.AggregateAsync(session, pipeline, options, cancellationToken)
            : _inner.AggregateAsync(pipeline, options, cancellationToken);

    public Task<TDocument> FindOneAndUpdateAsync(
        FilterDefinition<TDocument> filter,
        UpdateDefinition<TDocument> update,
        FindOneAndUpdateOptions<TDocument>? options = null,
        CancellationToken cancellationToken = default) =>
        Session is { } session
            ? _inner.FindOneAndUpdateAsync(session, filter, update, options, cancellationToken)
            : _inner.FindOneAndUpdateAsync(filter, update, options, cancellationToken);
}

public sealed class MongoCollectionFactory
{
    private readonly IMongoDatabase _database;
    private readonly MongoSessionAccessor _sessions;

    public MongoCollectionFactory(IMongoDatabase database, MongoSessionAccessor sessions)
    {
        _database = database;
        _sessions = sessions;
    }

    public TransactionalCollection<TDocument> GetCollection<TDocument>(string name) =>
        new(_database.GetCollection<TDocument>(name), _sessions);
}
