using MongoDB.Bson;
using MoviePicker.Api.Infrastructure.Persistence.Mongo;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Persistence.Mongo;

public sealed class MongoObjectIdsTests
{
    private static List<ObjectId> GeneratedOneAfterTheOther(int count) =>
        Enumerable.Range(0, count).Select(_ => ObjectId.Parse(MongoObjectIds.NewUntimed())).ToList();

    [Fact]
    public void NewUntimed_IsAValidAndUniqueObjectId()
    {
        var ids = GeneratedOneAfterTheOther(64);

        Assert.Equal(ids.Count, ids.Distinct().Count());
        Assert.All(ids, id => Assert.True(MongoObjectIds.IsValid(id.ToString())));
    }

    [Fact]
    public void NewUntimed_TellsNeitherWhenNorInWhichOrderTheIdsWereMade()
    {
        var ids = GeneratedOneAfterTheOther(32);
        var now = DateTimeOffset.UtcNow.ToUnixTimeSeconds();

        Assert.NotEqual(ids.Order(), ids);
        Assert.NotEqual(ids.Select(id => id.Timestamp).Order(), ids.Select(id => id.Timestamp));
        Assert.False(ids.All(id => Math.Abs(id.Timestamp - now) < 86_400));
        Assert.NotEqual(ids.Select(id => id.ToByteArray()[^1]).Order(), ids.Select(id => id.ToByteArray()[^1]));
    }
}
