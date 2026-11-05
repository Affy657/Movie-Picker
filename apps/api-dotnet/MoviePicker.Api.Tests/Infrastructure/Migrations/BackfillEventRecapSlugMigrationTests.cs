using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Infrastructure.Migrations;
using MoviePicker.Api.Tests.Builders;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Migrations;

public sealed class BackfillEventRecapSlugMigrationTests
{
    private readonly Mock<IEventRepository> _events = new();
    private readonly BackfillEventRecapSlugMigration _sut;

    public BackfillEventRecapSlugMigrationTests()
    {
        _sut = new BackfillEventRecapSlugMigration(_events.Object, NullLogger<BackfillEventRecapSlugMigration>.Instance);
    }

    [Fact]
    public void Id_IsDatedAndStable()
    {
        Assert.Equal("2026-10-14-001-backfill-event-recap-slug", _sut.Id);
    }

    [Fact]
    public async Task ExecuteAsync_GivesEveryNightWithoutOneARecapLinkOfItsOwn_ThenStops()
    {
        var a = new EventEntityBuilder().WithId("a").WithSlug("slug-a").Build();
        var b = new EventEntityBuilder().WithId("b").WithSlug("slug-b").Build();
        _events.SetupSequence(r => r.ListMissingRecapSlugAsync(It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([a, b])
            .ReturnsAsync([]);
        var saved = new List<Event>();
        _events.Setup(r => r.UpdateAsync(It.IsAny<Event>(), It.IsAny<CancellationToken>()))
            .Callback<Event, CancellationToken>((e, _) => saved.Add(e))
            .ReturnsAsync((Event e, CancellationToken _) => e with { Version = e.Version + 1 });

        var affected = await _sut.ExecuteAsync();

        Assert.Equal(2, affected);
        Assert.Equal(["a", "b"], saved.Select(e => e.Id));
        Assert.All(saved, e => Assert.Equal(10, e.RecapSlug?.Length));
        Assert.All(saved, e => Assert.NotEqual(e.Slug, e.RecapSlug));
        Assert.NotEqual(saved[0].RecapSlug, saved[1].RecapSlug);
    }
}
