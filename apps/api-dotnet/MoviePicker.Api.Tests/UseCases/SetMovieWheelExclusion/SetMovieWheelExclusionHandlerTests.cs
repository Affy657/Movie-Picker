using Moq;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.SetMovieWheelExclusion;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.SetMovieWheelExclusion;

public sealed class SetMovieWheelExclusionHandlerTests
{
    private readonly Mock<IEventRepository> _eventRepo = new();
    private readonly Mock<IMovieRepository> _movieRepo = new();
    private readonly Mock<IHostTokenAccessor> _hostTokenAccessor = new();
    private readonly Mock<ICurrentUserAccessor> _currentUserAccessor = new();
    private readonly SetMovieWheelExclusionHandler _sut;

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

    private static Movie MovieOf(string id, bool excluded = false) => new()
    {
        Id = id,
        EventId = "evt1",
        ParticipantId = "p1",
        TmdbId = 1,
        Title = "Film",
        Year = "2020",
        ExcludedFromWheel = excluded,
        CreatedAt = DateTimeOffset.UtcNow,
        UpdatedAt = DateTimeOffset.UtcNow
    };

    private static SetMovieWheelExclusionRequest Request(bool excluded) => new() { Excluded = excluded };

    public SetMovieWheelExclusionHandlerTests()
    {
        _currentUserAccessor.Setup(c => c.GetUserId()).Returns((string?)null);
        _sut = new SetMovieWheelExclusionHandler(
            _eventRepo.Object,
            _movieRepo.Object,
            _hostTokenAccessor.Object,
            _currentUserAccessor.Object);
    }

    [Fact]
    public async Task HandleAsync_EventNotFound_ThrowsNotFoundException()
    {
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("bad", It.IsAny<CancellationToken>())).ReturnsAsync((Event?)null);

        await Assert.ThrowsAsync<NotFoundException>(() => _sut.HandleAsync("bad", "mov1", Request(true)));
    }

    [Fact]
    public async Task HandleAsync_NotHost_ThrowsForbiddenException()
    {
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(ActiveEvent("real"));
        _hostTokenAccessor.Setup(h => h.GetHostToken()).Returns("wrong");

        var ex = await Assert.ThrowsAsync<ForbiddenException>(() => _sut.HandleAsync("evt1", "mov1", Request(true)));
        Assert.Contains("hôte", ex.Message);
        _movieRepo.Verify(
            r => r.UpdateWheelExclusionAsync(It.IsAny<string>(), It.IsAny<bool>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task HandleAsync_EventFinished_ThrowsConflictException()
    {
        var evt = ActiveEvent() with { ClosedAt = DateTimeOffset.UtcNow };
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _hostTokenAccessor.Setup(h => h.GetHostToken()).Returns("ht1");

        var ex = await Assert.ThrowsAsync<ConflictException>(() => _sut.HandleAsync("evt1", "mov1", Request(true)));
        Assert.Contains("terminée", ex.Message);
    }

    [Fact]
    public async Task HandleAsync_UnknownMovie_ThrowsNotFoundException()
    {
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(ActiveEvent());
        _hostTokenAccessor.Setup(h => h.GetHostToken()).Returns("ht1");
        _movieRepo.Setup(r => r.GetByIdAndEventIdAsync("mov1", "evt1", It.IsAny<CancellationToken>())).ReturnsAsync((Movie?)null);

        await Assert.ThrowsAsync<NotFoundException>(() => _sut.HandleAsync("evt1", "mov1", Request(true)));
    }

    [Fact]
    public async Task HandleAsync_Excludes_PersistsFlag()
    {
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(ActiveEvent());
        _hostTokenAccessor.Setup(h => h.GetHostToken()).Returns("ht1");
        _movieRepo.Setup(r => r.GetByIdAndEventIdAsync("mov1", "evt1", It.IsAny<CancellationToken>())).ReturnsAsync(MovieOf("mov1"));

        await _sut.HandleAsync("evt1", "mov1", Request(true));

        _movieRepo.Verify(r => r.UpdateWheelExclusionAsync("mov1", true, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task HandleAsync_Reintegrates_PersistsFlag()
    {
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(ActiveEvent());
        _hostTokenAccessor.Setup(h => h.GetHostToken()).Returns("ht1");
        _movieRepo.Setup(r => r.GetByIdAndEventIdAsync("mov1", "evt1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(MovieOf("mov1", excluded: true));

        await _sut.HandleAsync("evt1", "mov1", Request(false));

        _movieRepo.Verify(r => r.UpdateWheelExclusionAsync("mov1", false, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task HandleAsync_AlreadyInRequestedState_DoesNotWrite()
    {
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(ActiveEvent());
        _hostTokenAccessor.Setup(h => h.GetHostToken()).Returns("ht1");
        _movieRepo.Setup(r => r.GetByIdAndEventIdAsync("mov1", "evt1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(MovieOf("mov1", excluded: true));

        await _sut.HandleAsync("evt1", "mov1", Request(true));

        _movieRepo.Verify(
            r => r.UpdateWheelExclusionAsync(It.IsAny<string>(), It.IsAny<bool>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task HandleAsync_WheelAlreadyLaunched_StillAllowsExclusion()
    {
        var evt = ActiveEvent() with { WinnerMovieId = "mov9", WinnerPickMethod = WinnerPickMethod.Wheel };
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _hostTokenAccessor.Setup(h => h.GetHostToken()).Returns("ht1");
        _movieRepo.Setup(r => r.GetByIdAndEventIdAsync("mov1", "evt1", It.IsAny<CancellationToken>())).ReturnsAsync(MovieOf("mov1"));

        await _sut.HandleAsync("evt1", "mov1", Request(true));

        _movieRepo.Verify(r => r.UpdateWheelExclusionAsync("mov1", true, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task HandleAsync_CreatorWithoutHostToken_Succeeds()
    {
        var evt = ActiveEvent() with { CreatorUserId = "u1" };
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _hostTokenAccessor.Setup(h => h.GetHostToken()).Returns((string?)null);
        _currentUserAccessor.Setup(c => c.GetUserId()).Returns("u1");
        _movieRepo.Setup(r => r.GetByIdAndEventIdAsync("mov1", "evt1", It.IsAny<CancellationToken>())).ReturnsAsync(MovieOf("mov1"));

        await _sut.HandleAsync("evt1", "mov1", Request(true));

        _movieRepo.Verify(r => r.UpdateWheelExclusionAsync("mov1", true, It.IsAny<CancellationToken>()), Times.Once);
    }
}
