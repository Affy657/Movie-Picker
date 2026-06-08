using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.AddMovie;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.AddMovie;

public sealed class AddMovieHandlerTests
{
    private const string OwnerUserId = "user-owner";

    private readonly Mock<IEventRepository> _eventRepo;
    private readonly Mock<IMovieRepository> _movieRepo;
    private readonly Mock<IParticipantRepository> _participantRepo;
    private readonly Mock<IPosterImageStore> _posterStore;
    private readonly Mock<IUserRepository> _userRepo;
    private readonly Mock<IPushSubscriptionRepository> _pushSubRepo;
    private readonly Mock<IPushNotificationSender> _pushSender;
    private readonly Mock<ICurrentUserAccessor> _currentUser;
    private readonly Mock<ITmdbMovieSearch> _tmdb;
    private readonly AddMovieHandler _sut;

    private static Event ActiveEvent(bool allowSeries = false) => new()
    {
        Id = "evt1",
        Title = "Soirée",
        Date = "2030-01-01",
        Time = "20:00",
        Slug = "soiree",
        HostToken = "ht",
        Config = new EventConfig { AllowSeries = allowSeries },
        CreatedAt = DateTimeOffset.UtcNow,
        UpdatedAt = DateTimeOffset.UtcNow
    };

    private static AddMovieRequest Request(
        string participantId = "p123456789012345678901234",
        MovieMediaType mediaType = MovieMediaType.Movie) => new()
        {
            TmdbId = 27205,
            MediaType = mediaType,
            Title = " Inception ",
            Year = "2010",
            PosterPath = "https://image.tmdb.org/t/p/w154/abc.jpg",
            ParticipantId = participantId
        };

    public AddMovieHandlerTests()
    {
        _eventRepo = new Mock<IEventRepository>();
        _movieRepo = new Mock<IMovieRepository>();
        _participantRepo = new Mock<IParticipantRepository>();
        _posterStore = new Mock<IPosterImageStore>();
        _userRepo = new Mock<IUserRepository>();
        _pushSubRepo = new Mock<IPushSubscriptionRepository>();
        _pushSender = new Mock<IPushNotificationSender>();
        _currentUser = new Mock<ICurrentUserAccessor>();
        _currentUser.Setup(u => u.GetUserId()).Returns(OwnerUserId);
        _tmdb = new Mock<ITmdbMovieSearch>();
        _tmdb
            .Setup(t => t.GetDetailsAsync(It.IsAny<int>(), It.IsAny<MovieMediaType>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((TmdbMovieDetails?)null);
        _posterStore.Setup(s => s.ToPublicPosterPath(It.IsAny<string?>())).Returns((string? u) => u);
        _posterStore.Setup(s => s.RegisterTmdbSourceAsync(It.IsAny<string>(), It.IsAny<CancellationToken>())).Returns(Task.CompletedTask);
        _posterStore
            .Setup(s => s.RegisterTmdbSourcesAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        _participantRepo
            .Setup(r => r.ListByEventIdAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Participant>());
        _sut = new AddMovieHandler(
            _eventRepo.Object,
            _movieRepo.Object,
            _participantRepo.Object,
            _posterStore.Object,
            _userRepo.Object,
            _pushSubRepo.Object,
            _pushSender.Object,
            Mock.Of<IUserNotificationRepository>(),
            _currentUser.Object,
            _tmdb.Object,
            NullLogger<AddMovieHandler>.Instance);
    }

    [Fact]
    public async Task HandleAsync_EventNotFound_ThrowsNotFoundException()
    {
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("bad", It.IsAny<CancellationToken>())).ReturnsAsync((Event?)null);

        var ex = await Assert.ThrowsAsync<NotFoundException>(() => _sut.HandleAsync("bad", Request(), null));
        Assert.Equal("Soirée introuvable", ex.Message);
    }

    [Fact]
    public async Task HandleAsync_EventFinished_ThrowsConflictException()
    {
        var evt = new Event { Id = "evt1", Title = "Soirée", Date = "2000-01-01", Time = "20:00", Slug = "soiree", HostToken = "ht", CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow };
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);

        var ex = await Assert.ThrowsAsync<ConflictException>(() => _sut.HandleAsync("evt1", Request(), null));
        Assert.Contains("terminée", ex.Message);
    }

    [Fact]
    public async Task HandleAsync_TvSeriesNotAllowed_ThrowsConflictException()
    {
        var evt = ActiveEvent(allowSeries: false);
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);

        var ex = await Assert.ThrowsAsync<ConflictException>(
            () => _sut.HandleAsync("evt1", Request(mediaType: MovieMediaType.Tv), null));
        Assert.Contains("séries", ex.Message);
    }

    [Fact]
    public async Task HandleAsync_ParticipantInvalid_ThrowsBadRequestException()
    {
        var evt = ActiveEvent();
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _participantRepo.Setup(r => r.FindByIdAndEventIdAsync(It.IsAny<string>(), evt.Id, It.IsAny<CancellationToken>())).ReturnsAsync((Participant?)null);

        var ex = await Assert.ThrowsAsync<BadRequestException>(() => _sut.HandleAsync("evt1", Request(), null));
        Assert.Contains("Participant", ex.Message);
    }

    [Fact]
    public async Task HandleAsync_DuplicateTmdbId_ThrowsConflictException()
    {
        var evt = ActiveEvent();
        var participant = new Participant { Id = "p123456789012345678901234", EventId = evt.Id, Pseudo = "Alice", UserId = OwnerUserId, CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow };
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _participantRepo.Setup(r => r.FindByIdAndEventIdAsync(participant.Id, evt.Id, It.IsAny<CancellationToken>())).ReturnsAsync(participant);
        _movieRepo.Setup(r => r.ExistsByEventAndTmdbIdAsync(evt.Id, 27205, MovieMediaType.Movie, It.IsAny<CancellationToken>())).ReturnsAsync(true);

        var ex = await Assert.ThrowsAsync<ConflictException>(() => _sut.HandleAsync("evt1", Request(participant.Id), null));
        Assert.Contains("TMDB", ex.Message);
    }

    [Fact]
    public async Task HandleAsync_SameTmdbIdDifferentMediaType_IsAllowed()
    {
        var evt = ActiveEvent(allowSeries: true);
        var participant = new Participant { Id = "p123456789012345678901234", EventId = evt.Id, Pseudo = "Alice", UserId = OwnerUserId, CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow };
        var created = new Movie { Id = "mov1", EventId = evt.Id, ParticipantId = participant.Id, TmdbId = 42, MediaType = MovieMediaType.Tv, Title = "Breaking Bad", Year = "2008", CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow };

        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _participantRepo.Setup(r => r.FindByIdAndEventIdAsync(participant.Id, evt.Id, It.IsAny<CancellationToken>())).ReturnsAsync(participant);
        _movieRepo.Setup(r => r.ExistsByEventAndTmdbIdAsync(evt.Id, 42, MovieMediaType.Movie, It.IsAny<CancellationToken>())).ReturnsAsync(true);
        _movieRepo.Setup(r => r.ExistsByEventAndTmdbIdAsync(evt.Id, 42, MovieMediaType.Tv, It.IsAny<CancellationToken>())).ReturnsAsync(false);
        _movieRepo.Setup(r => r.ExistsByEventAndTitleCaseInsensitiveAsync(evt.Id, "Breaking Bad", It.IsAny<CancellationToken>())).ReturnsAsync(false);
        _movieRepo.Setup(r => r.InsertAsync(It.IsAny<Movie>(), It.IsAny<CancellationToken>())).ReturnsAsync(created);

        var request = new AddMovieRequest
        {
            TmdbId = 42,
            MediaType = MovieMediaType.Tv,
            Title = "Breaking Bad",
            Year = "2008",
            PosterPath = null,
            ParticipantId = participant.Id
        };

        var result = await _sut.HandleAsync("evt1", request, null);
        Assert.Equal(MovieMediaType.Tv, result.MediaType);
    }

    [Fact]
    public async Task HandleAsync_PersistsTmdbGenreIds_OnAddedMovie()
    {
        var evt = ActiveEvent();
        var participant = new Participant { Id = "p123456789012345678901234", EventId = evt.Id, Pseudo = "Alice", UserId = OwnerUserId, CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow };
        Movie? inserted = null;
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _participantRepo.Setup(r => r.FindByIdAndEventIdAsync(participant.Id, evt.Id, It.IsAny<CancellationToken>())).ReturnsAsync(participant);
        _movieRepo.Setup(r => r.ExistsByEventAndTmdbIdAsync(It.IsAny<string>(), It.IsAny<int>(), It.IsAny<MovieMediaType>(), It.IsAny<CancellationToken>())).ReturnsAsync(false);
        _movieRepo.Setup(r => r.ExistsByEventAndTitleCaseInsensitiveAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>())).ReturnsAsync(false);
        _movieRepo
            .Setup(r => r.InsertAsync(It.IsAny<Movie>(), It.IsAny<CancellationToken>()))
            .Callback<Movie, CancellationToken>((m, _) => inserted = m)
            .ReturnsAsync((Movie m, CancellationToken _) => m with { Id = "mov1" });
        _tmdb
            .Setup(t => t.GetDetailsAsync(27205, MovieMediaType.Movie, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new TmdbMovieDetails(27205, "Inception", null, null, null, Array.Empty<string>(), 148, new[] { "Action" }, new[] { 28, 878 }, "2010-07-16"));

        await _sut.HandleAsync("evt1", Request(participant.Id), null);

        Assert.NotNull(inserted);
        Assert.Equal(new[] { 28, 878 }, inserted!.GenreIds);
    }

    [Fact]
    public async Task HandleAsync_TmdbFails_AddsMovieWithoutGenres()
    {
        var evt = ActiveEvent();
        var participant = new Participant { Id = "p123456789012345678901234", EventId = evt.Id, Pseudo = "Alice", UserId = OwnerUserId, CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow };
        Movie? inserted = null;
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _participantRepo.Setup(r => r.FindByIdAndEventIdAsync(participant.Id, evt.Id, It.IsAny<CancellationToken>())).ReturnsAsync(participant);
        _movieRepo.Setup(r => r.ExistsByEventAndTmdbIdAsync(It.IsAny<string>(), It.IsAny<int>(), It.IsAny<MovieMediaType>(), It.IsAny<CancellationToken>())).ReturnsAsync(false);
        _movieRepo.Setup(r => r.ExistsByEventAndTitleCaseInsensitiveAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>())).ReturnsAsync(false);
        _movieRepo
            .Setup(r => r.InsertAsync(It.IsAny<Movie>(), It.IsAny<CancellationToken>()))
            .Callback<Movie, CancellationToken>((m, _) => inserted = m)
            .ReturnsAsync((Movie m, CancellationToken _) => m with { Id = "mov1" });
        _tmdb
            .Setup(t => t.GetDetailsAsync(It.IsAny<int>(), It.IsAny<MovieMediaType>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidOperationException("TMDB indisponible"));

        var result = await _sut.HandleAsync("evt1", Request(participant.Id), null);

        Assert.NotNull(inserted);
        Assert.Empty(inserted!.GenreIds);
        Assert.Equal("mov1", result.Id);
    }

    [Fact]
    public async Task HandleAsync_SameTmdbIdSameMediaType_StillRejected()
    {
        var evt = ActiveEvent(allowSeries: true);
        var participant = new Participant { Id = "p123456789012345678901234", EventId = evt.Id, Pseudo = "Alice", UserId = OwnerUserId, CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow };
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _participantRepo.Setup(r => r.FindByIdAndEventIdAsync(participant.Id, evt.Id, It.IsAny<CancellationToken>())).ReturnsAsync(participant);
        _movieRepo.Setup(r => r.ExistsByEventAndTmdbIdAsync(evt.Id, 42, MovieMediaType.Tv, It.IsAny<CancellationToken>())).ReturnsAsync(true);

        var request = new AddMovieRequest
        {
            TmdbId = 42,
            MediaType = MovieMediaType.Tv,
            Title = "Breaking Bad",
            Year = "2008",
            ParticipantId = participant.Id
        };

        await Assert.ThrowsAsync<ConflictException>(() => _sut.HandleAsync("evt1", request, null));
    }

    [Fact]
    public async Task HandleAsync_DuplicateTitle_ThrowsConflictException()
    {
        var evt = ActiveEvent();
        var participant = new Participant { Id = "p123456789012345678901234", EventId = evt.Id, Pseudo = "Alice", UserId = OwnerUserId, CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow };
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _participantRepo.Setup(r => r.FindByIdAndEventIdAsync(participant.Id, evt.Id, It.IsAny<CancellationToken>())).ReturnsAsync(participant);
        _movieRepo.Setup(r => r.ExistsByEventAndTmdbIdAsync(evt.Id, 27205, MovieMediaType.Movie, It.IsAny<CancellationToken>())).ReturnsAsync(false);
        _movieRepo.Setup(r => r.ExistsByEventAndTitleCaseInsensitiveAsync(evt.Id, "Inception", It.IsAny<CancellationToken>())).ReturnsAsync(true);

        var ex = await Assert.ThrowsAsync<ConflictException>(() => _sut.HandleAsync("evt1", Request(participant.Id), null));
        Assert.Contains("titre", ex.Message);
    }

    [Fact]
    public async Task HandleAsync_InvalidPosterPath_ThrowsBadRequestException()
    {
        var evt = ActiveEvent();
        var participant = new Participant { Id = "p123456789012345678901234", EventId = evt.Id, Pseudo = "Alice", UserId = OwnerUserId, CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow };
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _participantRepo.Setup(r => r.FindByIdAndEventIdAsync(participant.Id, evt.Id, It.IsAny<CancellationToken>())).ReturnsAsync(participant);
        _movieRepo.Setup(r => r.ExistsByEventAndTmdbIdAsync(evt.Id, 27205, MovieMediaType.Movie, It.IsAny<CancellationToken>())).ReturnsAsync(false);
        _movieRepo.Setup(r => r.ExistsByEventAndTitleCaseInsensitiveAsync(evt.Id, "Inception", It.IsAny<CancellationToken>())).ReturnsAsync(false);
        var req = new AddMovieRequest { TmdbId = 27205, Title = "Inception", Year = "2010", PosterPath = "not-a-valid-absolute-uri", ParticipantId = participant.Id };

        var ex = await Assert.ThrowsAsync<BadRequestException>(() => _sut.HandleAsync("evt1", req, null));
        Assert.Contains("posterPath", ex.Message);
    }

    [Fact]
    public async Task HandleAsync_MaxProposalsPerParticipant_RejectsWhenAtLimit()
    {
        var evt = new Event
        {
            Id = "evt1",
            Title = "Soirée",
            Date = "2030-01-01",
            Time = "20:00",
            Slug = "soiree",
            HostToken = "ht",
            Config = new EventConfig { MaxProposalsPerParticipant = 1 },
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };
        var participant = new Participant { Id = "p123456789012345678901234", EventId = evt.Id, Pseudo = "Alice", UserId = OwnerUserId, CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow };
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _participantRepo.Setup(r => r.FindByIdAndEventIdAsync(participant.Id, evt.Id, It.IsAny<CancellationToken>())).ReturnsAsync(participant);
        _movieRepo.Setup(r => r.ExistsByEventAndTmdbIdAsync(evt.Id, 27205, MovieMediaType.Movie, It.IsAny<CancellationToken>())).ReturnsAsync(false);
        _movieRepo.Setup(r => r.ExistsByEventAndTitleCaseInsensitiveAsync(evt.Id, "Inception", It.IsAny<CancellationToken>())).ReturnsAsync(false);
        _movieRepo.Setup(r => r.CountByEventAndParticipantAsync(evt.Id, participant.Id, It.IsAny<CancellationToken>())).ReturnsAsync(1);

        var ex = await Assert.ThrowsAsync<ConflictException>(() => _sut.HandleAsync("evt1", Request(participant.Id), null));
        Assert.Contains("Limite", ex.Message);
    }

    [Fact]
    public async Task HandleAsync_Success_ReturnsMovieWithScoreZero()
    {
        var evt = ActiveEvent();
        var participant = new Participant { Id = "p123456789012345678901234", EventId = evt.Id, Pseudo = "Alice", UserId = OwnerUserId, CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow };
        var createdMovie = new Movie { Id = "mov1", EventId = evt.Id, ParticipantId = participant.Id, TmdbId = 27205, Title = "Inception", Year = "2010", PosterPath = "https://image.tmdb.org/t/p/w154/abc.jpg", CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow };
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _participantRepo.Setup(r => r.FindByIdAndEventIdAsync(participant.Id, evt.Id, It.IsAny<CancellationToken>())).ReturnsAsync(participant);
        _movieRepo.Setup(r => r.ExistsByEventAndTmdbIdAsync(evt.Id, 27205, MovieMediaType.Movie, It.IsAny<CancellationToken>())).ReturnsAsync(false);
        _movieRepo.Setup(r => r.ExistsByEventAndTitleCaseInsensitiveAsync(evt.Id, "Inception", It.IsAny<CancellationToken>())).ReturnsAsync(false);
        _movieRepo.Setup(r => r.InsertAsync(It.IsAny<Movie>(), It.IsAny<CancellationToken>())).ReturnsAsync(createdMovie);

        var result = await _sut.HandleAsync("evt1", Request(participant.Id), null);

        Assert.Equal("mov1", result.Id);
        Assert.Equal("Inception", result.Title);
        Assert.Equal(27205, result.TmdbId);
        Assert.Equal(participant.Pseudo, result.ProposerPseudo);
        Assert.Equal(0, result.Score);
        Assert.Equal(0, result.Up);
        Assert.Equal(0, result.Down);
    }
}
