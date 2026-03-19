using Moq;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.CloseEvent;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.CloseEvent;

public sealed class CloseEventHandlerTests
{
    private readonly Mock<IEventRepository> _eventRepo;
    private readonly Mock<IHostTokenAccessor> _hostTokenAccessor;
    private readonly CloseEventHandler _sut;

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

    public CloseEventHandlerTests()
    {
        _eventRepo = new Mock<IEventRepository>();
        _hostTokenAccessor = new Mock<IHostTokenAccessor>();
        _sut = new CloseEventHandler(_eventRepo.Object, _hostTokenAccessor.Object);
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
    public async Task HandleAsync_AlreadyClosed_ReturnsMessageWithoutUpdating()
    {
        var now = DateTimeOffset.UtcNow;
        var evt = new Event { Id = "evt1", Title = "Soirée", Date = "2030-01-01", Time = "20:00", Slug = "soiree", HostToken = "ht1", ClosedAt = now, CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow };
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _hostTokenAccessor.Setup(h => h.GetHostToken()).Returns("ht1");

        var result = await _sut.HandleAsync("evt1");

        Assert.Equal("Soirée déjà clôturée", result.Message);
        Assert.Equal(now, result.ClosedAt);
        _eventRepo.Verify(r => r.UpdateAsync(It.IsAny<Event>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task HandleAsync_Success_UpdatesEventWithClosedAt()
    {
        var evt = ActiveEvent();
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _hostTokenAccessor.Setup(h => h.GetHostToken()).Returns("ht1");
        Event? captured = null;
        _eventRepo.Setup(r => r.UpdateAsync(It.IsAny<Event>(), It.IsAny<CancellationToken>()))
            .Callback<Event, CancellationToken>((e, _) => captured = e)
            .ReturnsAsync((Event e, CancellationToken _) => e);

        var result = await _sut.HandleAsync("evt1");

        Assert.Equal("Soirée clôturée.", result.Message);
        Assert.NotNull(captured);
        Assert.NotNull(captured.ClosedAt);
    }
}
