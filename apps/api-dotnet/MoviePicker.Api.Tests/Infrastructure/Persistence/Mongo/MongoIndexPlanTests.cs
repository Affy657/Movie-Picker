using MongoDB.Driver;
using Moq;
using MoviePicker.Api.Infrastructure.Persistence.Mongo;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Persistence.Mongo;

public sealed class MongoIndexPlanTests
{
    private static MongoIndexPlan NewPlan() => new(Mock.Of<IMongoDatabase>());

    private static CreateIndexModel<EventDocument> SlugIndex(bool unique = true, string name = "events_slug_unique") =>
        new(
            Builders<EventDocument>.IndexKeys.Ascending(x => x.Slug),
            new CreateIndexOptions { Name = name, Unique = unique });

    [Fact]
    public void MarkerId_IsStableForTheSameSpecification()
    {
        var a = NewPlan();
        a.Create("events", SlugIndex());
        var b = NewPlan();
        b.Create("events", SlugIndex());

        Assert.Equal(a.MarkerId, b.MarkerId);
        Assert.StartsWith(MongoIndexPlan.MarkerPrefix, a.MarkerId);
    }

    [Fact]
    public void MarkerId_ChangesWhenAnIndexOptionChanges()
    {
        var unique = NewPlan();
        unique.Create("events", SlugIndex(unique: true));
        var plain = NewPlan();
        plain.Create("events", SlugIndex(unique: false));

        Assert.NotEqual(unique.MarkerId, plain.MarkerId);
    }

    [Fact]
    public void MarkerId_ChangesWhenAnIndexIsAddedOrDropped()
    {
        var single = NewPlan();
        single.Create("events", SlugIndex());
        var withDrop = NewPlan();
        withDrop.Create("events", SlugIndex());
        withDrop.DropIfExists<EventDocument>("events", "events_legacy");

        Assert.NotEqual(single.MarkerId, withDrop.MarkerId);
        Assert.Equal(2, withDrop.StepCount);
    }

    [Fact]
    public void MarkerId_DependsOnThePartialFilterExpression()
    {
        var partial = NewPlan();
        partial.Create(
            "participants",
            new CreateIndexModel<ParticipantDocument>(
                Builders<ParticipantDocument>.IndexKeys.Ascending(x => x.UserId),
                new CreateIndexOptions<ParticipantDocument>
                {
                    Name = "participants_userId",
                    PartialFilterExpression = Builders<ParticipantDocument>.Filter.Exists(x => x.UserId, true)
                }));
        var full = NewPlan();
        full.Create(
            "participants",
            new CreateIndexModel<ParticipantDocument>(
                Builders<ParticipantDocument>.IndexKeys.Ascending(x => x.UserId),
                new CreateIndexOptions<ParticipantDocument> { Name = "participants_userId" }));

        Assert.NotEqual(partial.MarkerId, full.MarkerId);
    }
}
