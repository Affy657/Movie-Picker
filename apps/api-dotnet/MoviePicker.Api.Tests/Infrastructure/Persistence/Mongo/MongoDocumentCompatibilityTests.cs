using System.Reflection;
using MongoDB.Bson;
using MongoDB.Bson.Serialization;
using MongoDB.Bson.Serialization.Attributes;
using MoviePicker.Api.Infrastructure.Persistence.Mongo;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Persistence.Mongo;

public sealed class MongoDocumentCompatibilityTests
{
    private static readonly DateTime StoredAt = new(2026, 11, 1, 20, 30, 0, DateTimeKind.Utc);

    public static TheoryData<Type> StoredDocuments()
    {
        var data = new TheoryData<Type>();
        foreach (var type in typeof(EventDocument).Assembly.GetTypes()
                     .Where(t => t.IsClass
                                 && !t.IsAbstract
                                 && t.Namespace == typeof(EventDocument).Namespace
                                 && t.Name.EndsWith("Document", StringComparison.Ordinal))
                     .OrderBy(t => t.Name, StringComparer.Ordinal))
            data.Add(type);
        return data;
    }

    [Theory]
    [MemberData(nameof(StoredDocuments))]
    public void EveryStoredDocument_IgnoresTheFieldsANewerRevisionAdds(Type document)
    {
        Assert.NotNull(document.GetCustomAttribute<BsonIgnoreExtraElementsAttribute>());
    }

    [Fact]
    public void AParticipantWrittenByANewerRevision_StillReads()
    {
        var bson = new BsonDocument
        {
            { "_id", ObjectId.GenerateNewId() },
            { "eventId", ObjectId.GenerateNewId() },
            { "pseudo", "Alice" },
            { "fieldFromTheFuture", "ignored" },
        };

        var participant = BsonSerializer.Deserialize<ParticipantDocument>(bson);

        Assert.Equal("Alice", participant.Pseudo);
    }

    [Fact]
    public void AWatchedTitleWithEveryField_IsWrittenBackWithEveryStoredElement()
    {
        var stored = new BsonDocument { { "_id", ObjectId.GenerateNewId() }, { "ownerId", ObjectId.GenerateNewId() } }
            .AddRange(TitleWithEveryField())
            .AddRange(new BsonDocument
            {
                { "watchedAt", StoredAt },
                { "rating", 9 },
                { "ratingOrigin", "letterboxd" },
                { "origin", "manual" },
                { "letterboxdSlug", "the-matrix" },
                { "createdAt", StoredAt },
                { "updatedAt", StoredAt.AddDays(1) },
            });

        AssertWrittenBackWithEveryStoredElement<WatchedTitleDocument>(stored);
    }

    [Fact]
    public void AWatchedTitleWithoutItsOptionalFields_IsWrittenBackWithEveryStoredElement()
    {
        var stored = new BsonDocument { { "_id", ObjectId.GenerateNewId() }, { "ownerId", ObjectId.GenerateNewId() } }
            .AddRange(TitleWithoutOptionalFields())
            .AddRange(new BsonDocument
            {
                { "watchedAt", StoredAt },
                { "createdAt", StoredAt },
                { "updatedAt", StoredAt },
            });

        AssertWrittenBackWithEveryStoredElement<WatchedTitleDocument>(stored);
    }

    [Fact]
    public void ASavedListWithItsSnapshot_IsWrittenBackExactlyAsStored()
    {
        var stored = new BsonDocument
        {
            { "_id", ObjectId.GenerateNewId() },
            { "ownerId", ObjectId.GenerateNewId() },
            { "sourceType", "memberList" },
            { "sourceId", ObjectId.GenerateNewId().ToString() },
            { "sourceOwnerId", ObjectId.GenerateNewId() },
            { "name", "Soirées frissons" },
            { "createdAt", StoredAt },
            { "snapshot", new BsonArray { TitleWithEveryField(), TitleWithoutOptionalFields() } },
        };

        AssertWrittenBackExactlyAsStored<SavedListDocument>(stored);
    }

    [Fact]
    public void ASavedListWithoutItsOptionalFields_IsWrittenBackExactlyAsStored()
    {
        var stored = new BsonDocument
        {
            { "_id", ObjectId.GenerateNewId() },
            { "ownerId", ObjectId.GenerateNewId() },
            { "sourceType", "tmdbCollection" },
            { "sourceId", "1241" },
            { "name", "Harry Potter" },
            { "createdAt", StoredAt },
        };

        AssertWrittenBackExactlyAsStored<SavedListDocument>(stored);
    }

    private static BsonDocument TitleWithEveryField() => new()
    {
        { "tmdbId", 603 },
        { "mediaType", "movie" },
        { "title", "The Matrix" },
        { "year", "1999" },
        { "posterPath", "/matrix.jpg" },
        { "voteAverage", 8.2 },
        { "runtimeMinutes", 136 },
        { "genreIds", new BsonArray { 28, 878 } },
    };

    private static BsonDocument TitleWithoutOptionalFields() => new()
    {
        { "tmdbId", 70523 },
        { "mediaType", "tv" },
        { "title", "Dark" },
        { "year", string.Empty },
    };

    private static void AssertWrittenBackExactlyAsStored<TDocument>(BsonDocument stored)
    {
        var document = BsonSerializer.Deserialize<TDocument>(stored);

        Assert.Equal(stored.ToBson(), document.ToBson());
        Assert.Equal(stored.ToBson(), document.ToBson(args: new BsonSerializationArgs { SerializeIdFirst = true }));
    }

    private static void AssertWrittenBackWithEveryStoredElement<TDocument>(BsonDocument stored)
    {
        var written = BsonSerializer.Deserialize<TDocument>(stored).ToBsonDocument();

        Assert.Equal(ByName(stored).ToBson(), ByName(written).ToBson());
    }

    private static BsonDocument ByName(BsonDocument document) =>
        [.. document.Elements.OrderBy(element => element.Name, StringComparer.Ordinal)];
}
