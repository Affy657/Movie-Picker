using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.ResetWheel;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.ResetWheel;

public sealed class ResetWheelHandlerTests
{
    private readonly Mock<IEventRepository> _events = new();
    private readonly Mock<IHostTokenAccessor> _hostToken = new();
    private readonly Mock<ICurrentUserAccessor> _currentUser = new();
    private readonly ResetWheelHandler _sut;

    public ResetWheelHandlerTests()
    {
        _sut = new ResetWheelHandler(
            _events.Object, _hostToken.Object, _currentUser.Object, NullLogger<ResetWheelHandler>.Instance);
    }

    private static Event Evt(string? winnerMovieId = null, DateTimeOffset? closedAt = null) => new()
    {
        Id = "evt1",
        HostToken = "ht",
        CreatorUserId = "host",
        WinnerMovieId = winnerMovieId,
        ClosedAt = closedAt
    };

    private void AsHost() => _currentUser.Setup(c => c.GetUserId()).Returns("host");

    [Fact]
    public async Task HandleAsync_EventNotFound_Throws()
    {
        _events.Setup(e => e.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync((Event?)null);

        await Assert.ThrowsAsync<NotFoundException>(() => _sut.HandleAsync("evt1"));
    }

    [Fact]
    public async Task HandleAsync_NotHost_Throws()
    {
        _events.Setup(e => e.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(Evt(winnerMovieId: "m1"));
        _currentUser.Setup(c => c.GetUserId()).Returns("intruder");
        _hostToken.Setup(h => h.GetHostToken()).Returns((string?)null);

        await Assert.ThrowsAsync<ForbiddenException>(() => _sut.HandleAsync("evt1"));
    }

    [Fact]
    public async Task HandleAsync_FinishedEvent_Throws()
    {
        _events.Setup(e => e.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(Evt(winnerMovieId: "m1", closedAt: DateTimeOffset.UtcNow.AddDays(-1)));
        AsHost();

        await Assert.ThrowsAsync<ConflictException>(() => _sut.HandleAsync("evt1"));
    }

    [Fact]
    public async Task HandleAsync_NoWinner_ReturnsNothingToCancel()
    {
        _events.Setup(e => e.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(Evt(winnerMovieId: null));
        AsHost();

        var result = await _sut.HandleAsync("evt1");

        Assert.Equal("Aucun tirage à annuler.", result.Message);
        _events.Verify(e => e.UpdateAsync(It.IsAny<Event>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task HandleAsync_WithWinner_ClearsWinnerAndReturnsCancelled()
    {
        _events.Setup(e => e.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(Evt(winnerMovieId: "m1"));
        AsHost();
        _events.Setup(e => e.UpdateAsync(It.IsAny<Event>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Event e, CancellationToken _) => e);

        var result = await _sut.HandleAsync("evt1");

        Assert.Equal("Tirage annulé.", result.Message);
        _events.Verify(e => e.UpdateAsync(It.Is<Event>(x => x.WinnerMovieId == null), It.IsAny<CancellationToken>()), Times.Once);
    }
}
