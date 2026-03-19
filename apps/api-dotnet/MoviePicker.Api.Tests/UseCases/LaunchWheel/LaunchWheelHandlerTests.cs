using Moq;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.LaunchWheel;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.LaunchWheel;

public sealed class LaunchWheelHandlerTests
{
    private readonly Mock<IEventRepository> _eventRepo;
    private readonly Mock<IMovieRepository> _movieRepo;
    private readonly Mock<IHostTokenAccessor> _hostTokenAccessor;
    private readonly LaunchWheelHandler _sut;

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

    public LaunchWheelHandlerTests()
    {
        _eventRepo = new Mock<IEventRepository>();
        _movieRepo = new Mock<IMovieRepository>();
        _hostTokenAccessor = new Mock<IHostTokenAccessor>();
        _sut = new LaunchWheelHandler(_eventRepo.Object, _movieRepo.Object, _hostTokenAccessor.Object);
    }

    [Fact]
    public async Task HandleAsync_EventNotFound_ThrowsNotFoundException()
    {
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("bad", It.IsAny<CancellationToken>())).ReturnsAsync((Event?)null);

        var ex = await Assert.ThrowsAsync<NotFoundException>(() => _sut.HandleAsync("bad"));
        Assert.Equal("Soirée introuvable", ex.Message);
    }

    [Fact]
    public async Task HandleAsync_NoHostToken_ThrowsForbiddenException()
    {
        var evt = ActiveEvent();
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _hostTokenAccessor.Setup(h => h.GetHostToken()).Returns((string?)null);

        var ex = await Assert.ThrowsAsync<ForbiddenException>(() => _sut.HandleAsync("evt1"));
        Assert.Contains("hôte", ex.Message);
    }

    [Fact]
    public async Task HandleAsync_WrongHostToken_ThrowsForbiddenException()
    {
        var evt = ActiveEvent("real");
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _hostTokenAccessor.Setup(h => h.GetHostToken()).Returns("wrong");

        var ex = await Assert.ThrowsAsync<ForbiddenException>(() => _sut.HandleAsync("evt1"));
        Assert.Contains("hôte", ex.Message);
    }

    [Fact]
    public async Task HandleAsync_EventFinished_ThrowsBadRequestException()
    {
        var evt = new Event { Id = "evt1", Title = "Soirée", Date = "2000-01-01", Time = "20:00", Slug = "soiree", HostToken = "ht1", CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow };
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _hostTokenAccessor.Setup(h => h.GetHostToken()).Returns("ht1");

        var ex = await Assert.ThrowsAsync<BadRequestException>(() => _sut.HandleAsync("evt1"));
        Assert.Contains("terminée", ex.Message);
    }

    [Fact]
    public async Task HandleAsync_EventAlreadyClosed_ThrowsBadRequestException()
    {
        var evt = new Event { Id = "evt1", Title = "Soirée", Date = "2030-01-01", Time = "20:00", Slug = "soiree", HostToken = "ht1", ClosedAt = DateTimeOffset.UtcNow, CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow };
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _hostTokenAccessor.Setup(h => h.GetHostToken()).Returns("ht1");

        var ex = await Assert.ThrowsAsync<BadRequestException>(() => _sut.HandleAsync("evt1"));
        Assert.Contains("terminée", ex.Message);
    }

    [Fact]
    public async Task HandleAsync_NoMovies_ThrowsBadRequestException()
    {
        var evt = ActiveEvent();
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _hostTokenAccessor.Setup(h => h.GetHostToken()).Returns("ht1");
        _movieRepo.Setup(r => r.ListByEventIdAsync(evt.Id, It.IsAny<CancellationToken>())).ReturnsAsync(new List<Movie>());

        var ex = await Assert.ThrowsAsync<BadRequestException>(() => _sut.HandleAsync("evt1"));
        Assert.Contains("Aucun film", ex.Message);
    }

    [Fact]
    public async Task HandleAsync_Success_UpdatesEventWithWinnerAndReturnsResponse()
    {
        var evt = ActiveEvent();
        var movies = new List<Movie>
        {
            new() { Id = "mov1", EventId = evt.Id, ParticipantId = "p1", TmdbId = 1, Title = "Winner", Year = "2020", CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow }
        };
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _hostTokenAccessor.Setup(h => h.GetHostToken()).Returns("ht1");
        _movieRepo.Setup(r => r.ListByEventIdAsync(evt.Id, It.IsAny<CancellationToken>())).ReturnsAsync(movies);
        Event? captured = null;
        _eventRepo.Setup(r => r.UpdateAsync(It.IsAny<Event>(), It.IsAny<CancellationToken>()))
            .Callback<Event, CancellationToken>((e, _) => captured = e)
            .ReturnsAsync((Event e, CancellationToken _) => e);

        var result = await _sut.HandleAsync("evt1");

        Assert.NotNull(result.Winner);
        Assert.Equal("mov1", result.Winner.Id);
        Assert.Equal("Winner", result.Winner.Title);
        Assert.NotNull(captured);
        Assert.Equal("mov1", captured.WinnerMovieId);
        Assert.Contains("gagnant direct", result.Message);
    }
}
