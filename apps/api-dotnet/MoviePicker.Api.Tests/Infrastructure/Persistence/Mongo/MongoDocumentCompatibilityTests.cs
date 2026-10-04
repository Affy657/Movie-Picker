using System.Reflection;
using MongoDB.Bson;
using MongoDB.Bson.Serialization;
using MongoDB.Bson.Serialization.Attributes;
using MoviePicker.Api.Infrastructure.Persistence.Mongo;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Persistence.Mongo;

public sealed class MongoDocumentCompatibilityTests
{
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
}
