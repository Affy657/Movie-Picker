using MongoDB.Bson;
using MongoDB.Driver;
using Moq;
using MoviePicker.Api.Infrastructure.Persistence.Mongo;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Persistence.Mongo;

public sealed class TransactionalCollectionTests
{
    public sealed class TestDocument
    {
        public string Id { get; set; } = string.Empty;
        public int Value { get; set; }
    }

    private readonly Mock<IMongoCollection<TestDocument>> _inner = new();
    private readonly Mock<IClientSessionHandle> _session = new();
    private readonly MongoSessionAccessor _sessions = new();
    private readonly TransactionalCollection<TestDocument> _sut;

    public TransactionalCollectionTests()
    {
        _sut = new TransactionalCollection<TestDocument>(_inner.Object, _sessions);
    }

    private void OpenSession() => _sessions.Session = _session.Object;

    private IClientSessionHandle Session => _session.Object;

    private static readonly FilterDefinition<TestDocument> AnyFilter =
        Builders<TestDocument>.Filter.Empty;

    private static readonly UpdateDefinition<TestDocument> AnyUpdate =
        Builders<TestDocument>.Update.Set(d => d.Value, 1);

    [Fact]
    public void Indexes_DelegatesToTheInnerCollection()
    {
        var indexes = new Mock<IMongoIndexManager<TestDocument>>().Object;
        _inner.SetupGet(c => c.Indexes).Returns(indexes);

        Assert.Same(indexes, _sut.Indexes);
    }

    [Fact]
    public async Task InsertOneAsync_NoSession_WritesOutsideAnyTransaction()
    {
        var doc = new TestDocument { Id = "d1" };

        await _sut.InsertOneAsync(doc);

        _inner.Verify(c => c.InsertOneAsync(doc, null, It.IsAny<CancellationToken>()), Times.Once);
        _inner.Verify(
            c => c.InsertOneAsync(It.IsAny<IClientSessionHandle>(), It.IsAny<TestDocument>(), It.IsAny<InsertOneOptions>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task InsertOneAsync_SessionOpen_JoinsTheTransaction()
    {
        OpenSession();
        var doc = new TestDocument { Id = "d1" };

        await _sut.InsertOneAsync(doc);

        _inner.Verify(c => c.InsertOneAsync(Session, doc, null, It.IsAny<CancellationToken>()), Times.Once);
        _inner.Verify(
            c => c.InsertOneAsync(It.IsAny<TestDocument>(), It.IsAny<InsertOneOptions>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task UpdateOneAsync_SessionOpen_JoinsTheTransaction()
    {
        OpenSession();

        await _sut.UpdateOneAsync(AnyFilter, AnyUpdate);

        _inner.Verify(
            c => c.UpdateOneAsync(Session, AnyFilter, AnyUpdate, null, It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task UpdateOneAsync_NoSession_WritesOutsideAnyTransaction()
    {
        await _sut.UpdateOneAsync(AnyFilter, AnyUpdate);

        _inner.Verify(
            c => c.UpdateOneAsync(AnyFilter, AnyUpdate, null, It.IsAny<CancellationToken>()),
            Times.Once);
        _inner.Verify(
            c => c.UpdateOneAsync(It.IsAny<IClientSessionHandle>(), It.IsAny<FilterDefinition<TestDocument>>(), It.IsAny<UpdateDefinition<TestDocument>>(), It.IsAny<UpdateOptions>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task UpdateOneAsync_ExpressionFilterWithSession_JoinsTheTransaction()
    {
        OpenSession();

        await _sut.UpdateOneAsync(d => d.Id == "d1", AnyUpdate);

        _inner.Verify(
            c => c.UpdateOneAsync(Session, It.IsAny<FilterDefinition<TestDocument>>(), AnyUpdate, null, It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task UpdateManyAsync_SessionOpen_JoinsTheTransaction()
    {
        OpenSession();

        await _sut.UpdateManyAsync(AnyFilter, AnyUpdate);

        _inner.Verify(
            c => c.UpdateManyAsync(Session, AnyFilter, AnyUpdate, null, It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task UpdateManyAsync_NoSession_WritesOutsideAnyTransaction()
    {
        await _sut.UpdateManyAsync(AnyFilter, AnyUpdate);

        _inner.Verify(
            c => c.UpdateManyAsync(AnyFilter, AnyUpdate, null, It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task UpdateManyAsync_ExpressionFilterWithSession_JoinsTheTransaction()
    {
        OpenSession();

        await _sut.UpdateManyAsync(d => d.Value > 0, AnyUpdate);

        _inner.Verify(
            c => c.UpdateManyAsync(Session, It.IsAny<FilterDefinition<TestDocument>>(), AnyUpdate, null, It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task ReplaceOneAsync_SessionOpen_JoinsTheTransaction()
    {
        OpenSession();
        var doc = new TestDocument { Id = "d1" };

        await _sut.ReplaceOneAsync(d => d.Id == "d1", doc);

        _inner.Verify(
            c => c.ReplaceOneAsync(Session, It.IsAny<FilterDefinition<TestDocument>>(), doc, (ReplaceOptions?)null, It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task ReplaceOneAsync_NoSession_WritesOutsideAnyTransaction()
    {
        var doc = new TestDocument { Id = "d1" };

        await _sut.ReplaceOneAsync(d => d.Id == "d1", doc);

        _inner.Verify(
            c => c.ReplaceOneAsync(It.IsAny<FilterDefinition<TestDocument>>(), doc, (ReplaceOptions?)null, It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public void ReplaceOne_SessionOpen_JoinsTheTransaction()
    {
        OpenSession();
        var doc = new TestDocument { Id = "d1" };

        _sut.ReplaceOne(d => d.Id == "d1", doc, new ReplaceOptions { IsUpsert = true });

        _inner.Verify(
            c => c.ReplaceOne(Session, It.IsAny<FilterDefinition<TestDocument>>(), doc, It.Is<ReplaceOptions>(o => o.IsUpsert), It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public void ReplaceOne_NoSession_WritesOutsideAnyTransaction()
    {
        var doc = new TestDocument { Id = "d1" };

        _sut.ReplaceOne(d => d.Id == "d1", doc, new ReplaceOptions { IsUpsert = true });

        _inner.Verify(
            c => c.ReplaceOne(It.IsAny<FilterDefinition<TestDocument>>(), doc, It.Is<ReplaceOptions>(o => o.IsUpsert), It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task DeleteOneAsync_SessionOpen_JoinsTheTransaction()
    {
        OpenSession();

        await _sut.DeleteOneAsync(AnyFilter);

        _inner.Verify(
            c => c.DeleteOneAsync(Session, AnyFilter, null, It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task DeleteOneAsync_NoSession_WritesOutsideAnyTransaction()
    {
        await _sut.DeleteOneAsync(AnyFilter);

        _inner.Verify(c => c.DeleteOneAsync(AnyFilter, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task DeleteOneAsync_ExpressionFilterWithSession_JoinsTheTransaction()
    {
        OpenSession();

        await _sut.DeleteOneAsync(d => d.Id == "d1");

        _inner.Verify(
            c => c.DeleteOneAsync(Session, It.IsAny<FilterDefinition<TestDocument>>(), null, It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task DeleteManyAsync_SessionOpen_JoinsTheTransaction()
    {
        OpenSession();

        await _sut.DeleteManyAsync(AnyFilter);

        _inner.Verify(
            c => c.DeleteManyAsync(Session, AnyFilter, null, It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task DeleteManyAsync_NoSession_WritesOutsideAnyTransaction()
    {
        await _sut.DeleteManyAsync(AnyFilter);

        _inner.Verify(c => c.DeleteManyAsync(AnyFilter, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task DeleteManyAsync_ExpressionFilterWithSession_JoinsTheTransaction()
    {
        OpenSession();

        await _sut.DeleteManyAsync(d => d.Value == 0);

        _inner.Verify(
            c => c.DeleteManyAsync(Session, It.IsAny<FilterDefinition<TestDocument>>(), null, It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task CountDocumentsAsync_SessionOpen_ReadsInsideTheTransaction()
    {
        OpenSession();

        await _sut.CountDocumentsAsync(AnyFilter);

        _inner.Verify(
            c => c.CountDocumentsAsync(Session, AnyFilter, null, It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task CountDocumentsAsync_NoSession_ReadsOutsideAnyTransaction()
    {
        await _sut.CountDocumentsAsync(AnyFilter);

        _inner.Verify(
            c => c.CountDocumentsAsync(AnyFilter, null, It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task CountDocumentsAsync_ExpressionFilterWithSession_ReadsInsideTheTransaction()
    {
        OpenSession();

        await _sut.CountDocumentsAsync(d => d.Value > 0);

        _inner.Verify(
            c => c.CountDocumentsAsync(Session, It.IsAny<FilterDefinition<TestDocument>>(), null, It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task FindOneAndUpdateAsync_SessionOpen_JoinsTheTransaction()
    {
        OpenSession();

        await _sut.FindOneAndUpdateAsync(AnyFilter, AnyUpdate);

        _inner.Verify(
            c => c.FindOneAndUpdateAsync(Session, AnyFilter, AnyUpdate, (FindOneAndUpdateOptions<TestDocument, TestDocument>?)null, It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task FindOneAndUpdateAsync_NoSession_WritesOutsideAnyTransaction()
    {
        await _sut.FindOneAndUpdateAsync(AnyFilter, AnyUpdate);

        _inner.Verify(
            c => c.FindOneAndUpdateAsync(AnyFilter, AnyUpdate, (FindOneAndUpdateOptions<TestDocument, TestDocument>?)null, It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task DistinctAsync_SessionOpen_ReadsInsideTheTransaction()
    {
        OpenSession();

        await _sut.DistinctAsync(d => d.Id, AnyFilter);

        _inner.Verify(
            c => c.DistinctAsync(Session, It.IsAny<FieldDefinition<TestDocument, string>>(), AnyFilter, null, It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task DistinctAsync_NoSession_ReadsOutsideAnyTransaction()
    {
        await _sut.DistinctAsync(d => d.Id, AnyFilter);

        _inner.Verify(
            c => c.DistinctAsync(It.IsAny<FieldDefinition<TestDocument, string>>(), AnyFilter, null, It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task AggregateAsync_SessionOpen_ReadsInsideTheTransaction()
    {
        OpenSession();
        var pipeline = PipelineDefinition<TestDocument, BsonDocument>.Create(
            new[] { new BsonDocument("$match", new BsonDocument()) });

        await _sut.AggregateAsync(pipeline);

        _inner.Verify(
            c => c.AggregateAsync(Session, pipeline, null, It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task AggregateAsync_NoSession_ReadsOutsideAnyTransaction()
    {
        var pipeline = PipelineDefinition<TestDocument, BsonDocument>.Create(
            new[] { new BsonDocument("$match", new BsonDocument()) });

        await _sut.AggregateAsync(pipeline);

        _inner.Verify(c => c.AggregateAsync(pipeline, null, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task SessionClearedAfterTheTransaction_GoesBackToWritingDirectly()
    {
        OpenSession();
        await _sut.InsertOneAsync(new TestDocument { Id = "d1" });

        _sessions.Session = null;
        await _sut.InsertOneAsync(new TestDocument { Id = "d2" });

        _inner.Verify(
            c => c.InsertOneAsync(Session, It.IsAny<TestDocument>(), null, It.IsAny<CancellationToken>()),
            Times.Once);
        _inner.Verify(
            c => c.InsertOneAsync(It.IsAny<TestDocument>(), null, It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task MongoCollectionFactory_ForwardsTheRequestedCollectionName()
    {
        var database = new Mock<IMongoDatabase>();
        database
            .Setup(d => d.GetCollection<TestDocument>(It.IsAny<string>(), It.IsAny<MongoCollectionSettings>()))
            .Returns(_inner.Object);
        var factory = new MongoCollectionFactory(database.Object, _sessions);

        await factory.GetCollection<TestDocument>("data_protection_keys")
            .InsertOneAsync(new TestDocument { Id = "d1" });

        database.Verify(
            d => d.GetCollection<TestDocument>("data_protection_keys", It.IsAny<MongoCollectionSettings>()),
            Times.Once);
        _inner.Verify(
            c => c.InsertOneAsync(It.IsAny<TestDocument>(), null, It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task TwoCollectionsFromTheSameFactory_ShareTheOpenSession()
    {
        var otherInner = new Mock<IMongoCollection<TestDocument>>();
        var database = new Mock<IMongoDatabase>();
        database.Setup(d => d.GetCollection<TestDocument>("a", It.IsAny<MongoCollectionSettings>()))
            .Returns(_inner.Object);
        database.Setup(d => d.GetCollection<TestDocument>("b", It.IsAny<MongoCollectionSettings>()))
            .Returns(otherInner.Object);
        var factory = new MongoCollectionFactory(database.Object, _sessions);
        OpenSession();

        await factory.GetCollection<TestDocument>("a").InsertOneAsync(new TestDocument { Id = "d1" });
        await factory.GetCollection<TestDocument>("b").InsertOneAsync(new TestDocument { Id = "d2" });

        _inner.Verify(
            c => c.InsertOneAsync(Session, It.IsAny<TestDocument>(), null, It.IsAny<CancellationToken>()),
            Times.Once);
        otherInner.Verify(
            c => c.InsertOneAsync(Session, It.IsAny<TestDocument>(), null, It.IsAny<CancellationToken>()),
            Times.Once);
    }
}
