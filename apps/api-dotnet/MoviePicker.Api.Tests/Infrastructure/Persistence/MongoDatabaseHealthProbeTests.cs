using Microsoft.Extensions.Logging.Abstractions;
using MongoDB.Bson;
using MongoDB.Driver;
using Moq;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Infrastructure.Persistence.Mongo;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Persistence;

public sealed class MongoDatabaseHealthProbeTests
{
    private static MongoDatabaseHealthProbe CreateProbe(Mock<IMongoDatabase> database)
        => new(database.Object, NullLogger<MongoDatabaseHealthProbe>.Instance);

    [Fact]
    public async Task CheckAsync_WhenPingSucceeds_ReturnsHealthy()
    {
        var database = new Mock<IMongoDatabase>();
        database
            .Setup(d => d.RunCommandAsync(
                It.IsAny<Command<BsonDocument>>(),
                It.IsAny<ReadPreference>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new BsonDocument("ok", 1));

        var result = await CreateProbe(database).CheckAsync();

        Assert.Equal(DatabaseProbeStatus.Healthy, result.Status);
        Assert.True(result.DurationMs >= 0);
    }

    [Fact]
    public async Task CheckAsync_WhenDriverThrows_ReturnsUnavailable()
    {
        var database = new Mock<IMongoDatabase>();
        database
            .Setup(d => d.RunCommandAsync(
                It.IsAny<Command<BsonDocument>>(),
                It.IsAny<ReadPreference>(),
                It.IsAny<CancellationToken>()))
            .ThrowsAsync(new MongoException("cluster injoignable"));

        var result = await CreateProbe(database).CheckAsync();

        Assert.Equal(DatabaseProbeStatus.Unavailable, result.Status);
    }

    [Fact]
    public async Task CheckAsync_WhenCancelled_ReturnsUnavailable()
    {
        var database = new Mock<IMongoDatabase>();
        database
            .Setup(d => d.RunCommandAsync(
                It.IsAny<Command<BsonDocument>>(),
                It.IsAny<ReadPreference>(),
                It.IsAny<CancellationToken>()))
            .ThrowsAsync(new OperationCanceledException());

        var result = await CreateProbe(database).CheckAsync();

        Assert.Equal(DatabaseProbeStatus.Unavailable, result.Status);
    }
}
