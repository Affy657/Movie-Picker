using System.Net;
using MongoDB.Bson;
using MongoDB.Driver;
using MongoDB.Driver.Core.Clusters;
using MongoDB.Driver.Core.Connections;
using MongoDB.Driver.Core.Servers;
using MoviePicker.Api.Infrastructure.Persistence.Mongo;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Persistence.Mongo;

public sealed class MongoUnitOfWorkTests
{
    private static MongoCommandException CommandException(int code, string message) =>
        new(
            new ConnectionId(new ServerId(new ClusterId(1), new DnsEndPoint("localhost", 27017))),
            message,
            new BsonDocument("insert", "events"),
            new BsonDocument { { "ok", 0 }, { "code", code }, { "errmsg", message } });

    [Fact]
    public void ShouldRunWithoutTransaction_StandaloneServerInDevelopment_True()
    {
        var ex = CommandException(20, "Transaction numbers are only allowed on a replica set member or mongos");

        Assert.True(MongoUnitOfWork.ShouldRunWithoutTransaction(ex, isDevelopment: true));
    }

    [Fact]
    public void ShouldRunWithoutTransaction_StandaloneServerInProduction_False()
    {
        var ex = CommandException(20, "Transaction numbers are only allowed on a replica set member or mongos");

        Assert.False(MongoUnitOfWork.ShouldRunWithoutTransaction(ex, isDevelopment: false));
    }

    [Fact]
    public void ShouldRunWithoutTransaction_SaturatedConnectionPool_False()
    {
        var ex = new MongoWaitQueueFullException("The wait queue for acquiring a connection is full.");

        Assert.False(MongoUnitOfWork.ShouldRunWithoutTransaction(ex, isDevelopment: true));
    }

    [Fact]
    public void ShouldRunWithoutTransaction_OtherCommandError_False()
    {
        var ex = CommandException(112, "WriteConflict");

        Assert.False(MongoUnitOfWork.ShouldRunWithoutTransaction(ex, isDevelopment: true));
    }
}
