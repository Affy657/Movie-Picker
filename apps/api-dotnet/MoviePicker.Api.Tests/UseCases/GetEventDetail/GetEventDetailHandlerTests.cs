using Moq;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.GetEventDetail;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.GetEventDetail;

public sealed class GetEventDetailHandlerTests
{
    private readonly Mock<IEventRepository> _eventRepo;
    private readonly Mock<IMovieRepository> _movieRepo;
    private readonly Mock<IHostTokenAccessor> _hostTokenAccessor;
    private readonly GetEventDetailHandler _sut;

    private static Event Event(string hostToken = "ht1") => new()
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

    public GetEventDetailHandlerTests()
    {
        _eventRepo = new Mock<IEventRepository>();
        _movieRepo = new Mock<IMovieRepository>();
        _hostTokenAccessor = new Mock<IHostTokenAccessor>();
        _sut = new GetEventDetailHandler(_eventRepo.Object, _movieRepo.Object, _hostTokenAccessor.Object);
    }

    [Fact]
    public async Task HandleAsync_EventNotFound_ThrowsNotFoundException()
    {
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("bad", It.IsAny<CancellationToken>())).ReturnsAsync((Event?)null);

        var ex = await Assert.ThrowsAsync<NotFoundException>(() => _sut.HandleAsync("bad"));
        Assert.Equal("Soirée introuvable", ex.Message);
    }

    [Fact]
    public async Task HandleAsync_WithMatchingHostToken_SetsIsHostTrue()
    {
        var evt = Event("secret");
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _hostTokenAccessor.Setup(h => h.GetHostToken()).Returns("secret");

        var result = await _sut.HandleAsync("evt1");

        Assert.True(result.IsHost);
        Assert.Equal(evt.Id, result.Id);
        Assert.Equal(evt.Title, result.Title);
        Assert.Equal(evt.Slug, result.Slug);
    }

    [Fact]
    public async Task HandleAsync_WithoutHostToken_SetsIsHostFalse()
    {
        var evt = Event();
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _hostTokenAccessor.Setup(h => h.GetHostToken()).Returns((string?)null);

        var result = await _sut.HandleAsync("evt1");

        Assert.False(result.IsHost);
    }

    [Fact]
    public async Task HandleAsync_WrongHostToken_SetsIsHostFalse()
    {
        var evt = Event("real");
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _hostTokenAccessor.Setup(h => h.GetHostToken()).Returns("wrong");

        var result = await _sut.HandleAsync("evt1");

        Assert.False(result.IsHost);
    }

    [Fact]
    public async Task HandleAsync_WithWinnerMovieId_LoadsWinnerMovie()
    {
        var evt = new Event { Id = "evt1", Title = "Soirée", Date = "2030-01-01", Time = "20:00", Slug = "soiree", HostToken = "ht1", WinnerMovieId = "mov1", CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow };
        var winnerMovie = new Movie { Id = "mov1", EventId = evt.Id, Title = "Inception", TmdbId = 27205, Year = "2010", CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow };
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _hostTokenAccessor.Setup(h => h.GetHostToken()).Returns((string?)null);
        _movieRepo.Setup(r => r.GetByIdAsync("mov1", It.IsAny<CancellationToken>())).ReturnsAsync(winnerMovie);

        var result = await _sut.HandleAsync("evt1");

        Assert.NotNull(result.WinnerMovie);
        Assert.Equal("mov1", result.WinnerMovie.Id);
        Assert.Equal("Inception", result.WinnerMovie.Title);
    }
}
