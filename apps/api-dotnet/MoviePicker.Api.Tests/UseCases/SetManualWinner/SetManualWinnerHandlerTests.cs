using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.SetManualWinner;
using MoviePicker.Api.Application.UseCases.Shared;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.SetManualWinner;

public sealed class SetManualWinnerHandlerTests
{
    private readonly Mock<IEventRepository> _eventRepo = new();
    private readonly Mock<IMovieRepository> _movieRepo = new();
    private readonly Mock<IHostTokenAccessor> _hostTokenAccessor = new();
    private readonly Mock<ICurrentUserAccessor> _currentUserAccessor = new();
    private readonly Mock<IPosterImageStore> _posterStore = new();
    private readonly Mock<IWinnerAnnouncer> _winnerAnnouncer = new();
    private readonly SetManualWinnerHandler _sut;

    private static Event ActiveEvent(string hostToken = "ht1") => new()
    {
        Id = "evt1",
        Title = "Soirée",
        Date = "2030-01-01",
        Time = "20:00",
        Slug = "soiree",
        HostToken = hostToken,
        CreatedAt = DateTimeOffset.UtcNow,
        UpdatedAt = DateTimeOffset.UtcNow
    };

    private static Movie MovieOf(string id, string eventId, string title = "Choisi") => new()
    {
        Id = id,
        EventId = eventId,
        ParticipantId = "p1",
        TmdbId = 1,
        Title = title,
        Year = "2020",
        CreatedAt = DateTimeOffset.UtcNow,
        UpdatedAt = DateTimeOffset.UtcNow
    };

    private static SetManualWinnerRequest Request(string movieId) => new() { MovieId = movieId };

    public SetManualWinnerHandlerTests()
    {
        _currentUserAccessor.Setup(c => c.GetUserId()).Returns((string?)null);
        _posterStore.Setup(s => s.ToPublicPosterPath(It.IsAny<string?>())).Returns((string? u) => u);
        _posterStore.Setup(s => s.RegisterTmdbSourceAsync(It.IsAny<string>(), It.IsAny<CancellationToken>())).Returns(Task.CompletedTask);
        _eventRepo.Setup(r => r.UpdateAsync(It.IsAny<Event>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Event e, CancellationToken _) => e);
        _sut = new SetManualWinnerHandler(
            _eventRepo.Object,
            _movieRepo.Object,
            _hostTokenAccessor.Object,
            _currentUserAccessor.Object,
            _posterStore.Object,
            _winnerAnnouncer.Object,
            NullLogger<SetManualWinnerHandler>.Instance);
    }

    [Fact]
    public async Task HandleAsync_EventNotFound_ThrowsNotFoundException()
    {
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("bad", It.IsAny<CancellationToken>())).ReturnsAsync((Event?)null);

        await Assert.ThrowsAsync<NotFoundException>(() => _sut.HandleAsync("bad", Request("mov1")));
    }

    [Fact]
    public async Task HandleAsync_NotHost_ThrowsForbiddenException()
    {
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(ActiveEvent("real"));
        _hostTokenAccessor.Setup(h => h.GetHostToken()).Returns("wrong");

        var ex = await Assert.ThrowsAsync<ForbiddenException>(() => _sut.HandleAsync("evt1", Request("mov1")));
        Assert.Contains("hôte", ex.Message);
    }

    [Fact]
    public async Task HandleAsync_EventFinished_ThrowsConflictException()
    {
        var evt = ActiveEvent() with { ClosedAt = DateTimeOffset.UtcNow };
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _hostTokenAccessor.Setup(h => h.GetHostToken()).Returns("ht1");

        var ex = await Assert.ThrowsAsync<ConflictException>(() => _sut.HandleAsync("evt1", Request("mov1")));
        Assert.Contains("terminée", ex.Message);
    }

    [Fact]
    public async Task HandleAsync_UnknownMovie_ThrowsNotFoundException()
    {
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(ActiveEvent());
        _hostTokenAccessor.Setup(h => h.GetHostToken()).Returns("ht1");
        _movieRepo.Setup(r => r.GetByIdAsync("mov1", It.IsAny<CancellationToken>())).ReturnsAsync((Movie?)null);

        await Assert.ThrowsAsync<NotFoundException>(() => _sut.HandleAsync("evt1", Request("mov1")));
        _eventRepo.Verify(r => r.UpdateAsync(It.IsAny<Event>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task HandleAsync_MovieFromAnotherEvent_ThrowsNotFoundException()
    {
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(ActiveEvent());
        _hostTokenAccessor.Setup(h => h.GetHostToken()).Returns("ht1");
        _movieRepo.Setup(r => r.GetByIdAsync("mov1", It.IsAny<CancellationToken>())).ReturnsAsync(MovieOf("mov1", "otherEvent"));

        await Assert.ThrowsAsync<NotFoundException>(() => _sut.HandleAsync("evt1", Request("mov1")));
        _eventRepo.Verify(r => r.UpdateAsync(It.IsAny<Event>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task HandleAsync_Success_StoresManualWinnerAndAnnounces()
    {
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(ActiveEvent());
        _hostTokenAccessor.Setup(h => h.GetHostToken()).Returns("ht1");
        _movieRepo.Setup(r => r.GetByIdAsync("mov1", It.IsAny<CancellationToken>())).ReturnsAsync(MovieOf("mov1", "evt1"));
        Event? captured = null;
        _eventRepo.Setup(r => r.UpdateAsync(It.IsAny<Event>(), It.IsAny<CancellationToken>()))
            .Callback<Event, CancellationToken>((e, _) => captured = e)
            .ReturnsAsync((Event e, CancellationToken _) => e);

        var result = await _sut.HandleAsync("evt1", Request("mov1"));

        Assert.Equal("mov1", result.Winner.Id);
        Assert.NotNull(captured);
        Assert.Equal("mov1", captured.WinnerMovieId);
        Assert.Equal(WinnerPickMethod.Manual, captured.WinnerPickMethod);
        _winnerAnnouncer.Verify(
            a => a.AnnounceAsync(It.IsAny<Event>(), "Choisi", WinnerPickMethod.Manual, It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task HandleAsync_PreviousWinnerCanBePickedAgain()
    {
        var evt = ActiveEvent() with { WinnerMovieId = "mov1", WinnerPickMethod = WinnerPickMethod.Wheel };
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _hostTokenAccessor.Setup(h => h.GetHostToken()).Returns("ht1");
        _movieRepo.Setup(r => r.GetByIdAsync("mov1", It.IsAny<CancellationToken>())).ReturnsAsync(MovieOf("mov1", "evt1"));

        var result = await _sut.HandleAsync("evt1", Request("mov1"));

        Assert.Equal("mov1", result.Winner.Id);
    }

    [Fact]
    public async Task HandleAsync_CreatorWithoutHostToken_Succeeds()
    {
        var evt = ActiveEvent() with { CreatorUserId = "u1" };
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _hostTokenAccessor.Setup(h => h.GetHostToken()).Returns((string?)null);
        _currentUserAccessor.Setup(c => c.GetUserId()).Returns("u1");
        _movieRepo.Setup(r => r.GetByIdAsync("mov1", It.IsAny<CancellationToken>())).ReturnsAsync(MovieOf("mov1", "evt1"));

        var result = await _sut.HandleAsync("evt1", Request("mov1"));

        Assert.Equal("mov1", result.Winner.Id);
    }
}
