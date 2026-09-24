using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Infrastructure.Migrations;
using MoviePicker.Api.Tests.Builders;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Migrations;

public sealed class BackfillEventStartAtMigrationTests
{
    private readonly Mock<IEventRepository> _events = new();
    private readonly BackfillEventStartAtMigration _sut;

    public BackfillEventStartAtMigrationTests()
    {
        _sut = new BackfillEventStartAtMigration(_events.Object, NullLogger<BackfillEventStartAtMigration>.Instance);
    }

    [Fact]
    public void Id_IsDatedAndStable()
    {
        Assert.Equal("2026-09-15-004-backfill-event-start-at", _sut.Id);
    }

    [Fact]
    public async Task ExecuteAsync_RewritesEveryEventWithoutStartAt_ThenStops()
    {
        var a = new EventEntityBuilder().WithId("a").WithSlug("a").Build();
        var b = new EventEntityBuilder().WithId("b").WithSlug("b").Build();
        _events.SetupSequence(r => r.ListMissingStartAtAsync(It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([a, b])
            .ReturnsAsync([]);
        _events.Setup(r => r.UpdateAsync(It.IsAny<Event>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Event e, CancellationToken _) => e with { Version = e.Version + 1 });

        var affected = await _sut.ExecuteAsync();

        Assert.Equal(2, affected);
        _events.Verify(r => r.UpdateAsync(a, It.IsAny<CancellationToken>()), Times.Once);
        _events.Verify(r => r.UpdateAsync(b, It.IsAny<CancellationToken>()), Times.Once);
    }
}
