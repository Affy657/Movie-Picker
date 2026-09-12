using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.RemoveWinner;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using MoviePicker.Api.Tests.Builders;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.RemoveWinner;

public sealed class RemoveWinnerHandlerTests
{
    private readonly Mock<IEventRepository> _events = new();
    private readonly Mock<IHostTokenAccessor> _hostToken = new();
    private readonly Mock<ICurrentUserAccessor> _currentUser = new();
    private readonly RemoveWinnerHandler _sut;

    public RemoveWinnerHandlerTests()
    {
        _sut = new RemoveWinnerHandler(
            _events.Object,
            _hostToken.Object,
            _currentUser.Object,
            NullLogger<RemoveWinnerHandler>.Instance);
        _events.Setup(e => e.UpdateAsync(It.IsAny<Event>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Event e, CancellationToken _) => e);
    }

    private static Event Evt(DateTimeOffset? closedAt = null, params string[] winners) => new()
    {
        Id = "evt1",
        HostToken = "ht",
        CreatorUserId = "host",
        Date = "2030-01-01",
        Time = "20:00",
        Winners = TestWinners.Won(winners),
        ClosedAt = closedAt
    };

    private void GivenEvent(Event evt) =>
        _events.Setup(e => e.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);

    private void AsHost() => _currentUser.Setup(c => c.GetUserId()).Returns("host");

    [Fact]
    public async Task HandleAsync_EventNotFound_Throws()
    {
        _events.Setup(e => e.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync((Event?)null);

        await Assert.ThrowsAsync<NotFoundException>(() => _sut.HandleAsync("evt1", "m1"));
    }

    [Fact]
    public async Task HandleAsync_NotHost_Throws()
    {
        GivenEvent(Evt(null, "m1"));
        _currentUser.Setup(c => c.GetUserId()).Returns("intruder");
        _hostToken.Setup(h => h.GetHostToken()).Returns((string?)null);

        await Assert.ThrowsAsync<ForbiddenException>(() => _sut.HandleAsync("evt1", "m1"));
    }

    [Fact]
    public async Task HandleAsync_FinishedEvent_Throws()
    {
        GivenEvent(Evt(DateTimeOffset.UtcNow.AddDays(-1), "m1"));
        AsHost();

        await Assert.ThrowsAsync<ConflictException>(() => _sut.HandleAsync("evt1", "m1"));
    }

    [Fact]
    public async Task HandleAsync_MovieIsNotAWinner_Throws()
    {
        GivenEvent(Evt(null, "m1", "m2"));
        AsHost();

        await Assert.ThrowsAsync<NotFoundException>(() => _sut.HandleAsync("evt1", "m9"));
    }

    [Fact]
    public async Task HandleAsync_RemovesOnlyThatMovie_AndKeepsTheDrawOrder()
    {
        GivenEvent(Evt(null, "m1", "m2", "m3"));
        AsHost();
        Event? saved = null;
        _events.Setup(e => e.UpdateAsync(It.IsAny<Event>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Event e, CancellationToken _) => e)
            .Callback((Event e, CancellationToken _) => saved = e);

        await _sut.HandleAsync("evt1", "m2");

        Assert.NotNull(saved);
        Assert.Equal(new[] { "m1", "m3" }, saved!.WinnerMovieIds);
    }

    [Fact]
    public async Task HandleAsync_LastWinnerRemoved_LeavesTheEventWithoutWinner()
    {
        GivenEvent(Evt(null, "m1"));
        AsHost();
        Event? saved = null;
        _events.Setup(e => e.UpdateAsync(It.IsAny<Event>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Event e, CancellationToken _) => e)
            .Callback((Event e, CancellationToken _) => saved = e);

        await _sut.HandleAsync("evt1", "m1");

        Assert.NotNull(saved);
        Assert.False(saved!.HasWinner);
    }

    [Fact]
    public async Task HandleAsync_ReportsWhatItDid()
    {
        GivenEvent(Evt(null, "m1"));
        AsHost();

        var result = await _sut.HandleAsync("evt1", "m1");

        Assert.Equal("Film retiré du palmarès.", result.Message);
    }
}
