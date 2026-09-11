using Moq;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.VoteMovie;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using MoviePicker.Api.Tests.Builders;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.VoteMovie;

public sealed class VoteMovieHandlerTests
{
    private const string OwnerUserId = "user-owner";

    private readonly Mock<IEventRepository> _eventRepo;
    private readonly Mock<IMovieRepository> _movieRepo;
    private readonly Mock<IParticipantRepository> _participantRepo;
    private readonly Mock<IVoteRepository> _voteRepo;
    private readonly Mock<ICurrentUserAccessor> _currentUser;
    private readonly VoteMovieHandler _sut;

    private static Event ActiveEvent() =>
        new EventEntityBuilder().WithId("evt1").WithSlug("soiree").WithTitle("Soirée").Build();

    public VoteMovieHandlerTests()
    {
        _eventRepo = new Mock<IEventRepository>();
        _movieRepo = new Mock<IMovieRepository>();
        _participantRepo = new Mock<IParticipantRepository>();
        _voteRepo = new Mock<IVoteRepository>();
        _currentUser = new Mock<ICurrentUserAccessor>();
        _currentUser.Setup(u => u.GetUserId()).Returns(OwnerUserId);
        _sut = new VoteMovieHandler(_eventRepo.Object, _movieRepo.Object, _participantRepo.Object, _voteRepo.Object, _currentUser.Object);
    }

    [Fact]
    public async Task HandleAsync_EventNotFound_ThrowsNotFoundException()
    {
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("bad", It.IsAny<CancellationToken>())).ReturnsAsync((Event?)null);
        var request = new VoteRequest { ParticipantId = "p123456789012345678901234", Value = 1 };

        var ex = await Assert.ThrowsAsync<NotFoundException>(() => _sut.HandleAsync("bad", "mov1", request));
        Assert.Equal("Soirée introuvable", ex.Message);
    }

    [Fact]
    public async Task HandleAsync_EventFinished_ThrowsConflictException()
    {
        var evt = new Event { Id = "evt1", Title = "Soirée", Date = "2000-01-01", Time = "20:00", Slug = "soiree", HostToken = "ht", CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow };
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        var request = new VoteRequest { ParticipantId = "p123456789012345678901234", Value = 1 };

        var ex = await Assert.ThrowsAsync<ConflictException>(() => _sut.HandleAsync("evt1", "mov1", request));
        Assert.Contains("terminée", ex.Message);
    }

    [Fact]
    public async Task HandleAsync_MovieNotFound_ThrowsNotFoundException()
    {
        var evt = ActiveEvent();
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _movieRepo.Setup(r => r.GetByIdAndEventIdAsync("mov1", evt.Id, It.IsAny<CancellationToken>())).ReturnsAsync((Movie?)null);
        var request = new VoteRequest { ParticipantId = "p123456789012345678901234", Value = 1 };

        var ex = await Assert.ThrowsAsync<NotFoundException>(() => _sut.HandleAsync("evt1", "mov1", request));
        Assert.Equal("Film introuvable", ex.Message);
    }

    [Fact]
    public async Task HandleAsync_ParticipantInvalid_ThrowsBadRequestException()
    {
        var evt = ActiveEvent();
        var movie = new Movie { Id = "mov1", EventId = evt.Id, ParticipantId = "p0", TmdbId = 1, Title = "X", Year = "2020", CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow };
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _movieRepo.Setup(r => r.GetByIdAndEventIdAsync("mov1", evt.Id, It.IsAny<CancellationToken>())).ReturnsAsync(movie);
        _participantRepo.Setup(r => r.FindByIdAndEventIdAsync("p123456789012345678901234", evt.Id, It.IsAny<CancellationToken>())).ReturnsAsync((Participant?)null);
        var request = new VoteRequest { ParticipantId = "p123456789012345678901234", Value = 1 };

        var ex = await Assert.ThrowsAsync<BadRequestException>(() => _sut.HandleAsync("evt1", "mov1", request));
        Assert.Contains("Participant", ex.Message);
    }

    [Fact]
    public async Task HandleAsync_UpVote_Success()
    {
        var evt = ActiveEvent();
        var movie = new Movie { Id = "mov1", EventId = evt.Id, ParticipantId = "p0", TmdbId = 1, Title = "X", Year = "2020", CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow };
        var participant = new Participant { Id = "p123456789012345678901234", EventId = evt.Id, Pseudo = "Alice", UserId = OwnerUserId, CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow };
        var savedVote = new Vote { Id = "v1", EventId = evt.Id, MovieId = movie.Id, ParticipantId = participant.Id, Value = 1, CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow };
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _movieRepo.Setup(r => r.GetByIdAndEventIdAsync("mov1", evt.Id, It.IsAny<CancellationToken>())).ReturnsAsync(movie);
        _participantRepo.Setup(r => r.FindByIdAndEventIdAsync(participant.Id, evt.Id, It.IsAny<CancellationToken>())).ReturnsAsync(participant);
        _voteRepo.Setup(r => r.UpsertAsync(It.IsAny<Vote>(), It.IsAny<CancellationToken>())).ReturnsAsync(savedVote);
        var request = new VoteRequest { ParticipantId = participant.Id, Value = 1 };

        var result = await _sut.HandleAsync("evt1", "mov1", request);

        Assert.Equal("v1", result.Id);
        Assert.Equal(1, result.Value);
        Assert.Equal(movie.Id, result.MovieId);
        Assert.Equal(participant.Id, result.ParticipantId);
    }

    [Fact]
    public async Task HandleAsync_DownVote_Success()
    {
        var evt = ActiveEvent();
        var movie = new Movie { Id = "mov1", EventId = evt.Id, ParticipantId = "p0", TmdbId = 1, Title = "X", Year = "2020", CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow };
        var participant = new Participant { Id = "p123456789012345678901234", EventId = evt.Id, Pseudo = "Bob", UserId = OwnerUserId, CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow };
        var savedVote = new Vote { Id = "v2", EventId = evt.Id, MovieId = movie.Id, ParticipantId = participant.Id, Value = -1, CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow };
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _movieRepo.Setup(r => r.GetByIdAndEventIdAsync("mov1", evt.Id, It.IsAny<CancellationToken>())).ReturnsAsync(movie);
        _participantRepo.Setup(r => r.FindByIdAndEventIdAsync(participant.Id, evt.Id, It.IsAny<CancellationToken>())).ReturnsAsync(participant);
        _voteRepo.Setup(r => r.UpsertAsync(It.IsAny<Vote>(), It.IsAny<CancellationToken>())).ReturnsAsync(savedVote);
        var request = new VoteRequest { ParticipantId = participant.Id, Value = -1 };

        var result = await _sut.HandleAsync("evt1", "mov1", request);

        Assert.Equal(-1, result.Value);
    }

    private static Event EventWithVoteLimit(int maxVotes) =>
        new EventEntityBuilder()
            .WithId("evt1")
            .WithSlug("soiree")
            .WithTitle("Soirée")
            .WithConfig(new EventConfig { MaxVotesPerParticipant = maxVotes })
            .Build();

    private void GivenVotableMovie(Event evt, Movie movie, Participant participant, IReadOnlyDictionary<string, int> existingVotes)
    {
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _movieRepo.Setup(r => r.GetByIdAndEventIdAsync(movie.Id, evt.Id, It.IsAny<CancellationToken>())).ReturnsAsync(movie);
        _participantRepo.Setup(r => r.FindByIdAndEventIdAsync(participant.Id, evt.Id, It.IsAny<CancellationToken>())).ReturnsAsync(participant);
        _voteRepo.Setup(r => r.GetParticipantVotesByEventAsync(evt.Id, participant.Id, It.IsAny<CancellationToken>())).ReturnsAsync(existingVotes);
        _voteRepo.Setup(r => r.UpsertAsync(It.IsAny<Vote>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Vote v, CancellationToken _) => v with { Id = "saved" });
    }

    [Fact]
    public async Task HandleAsync_VoteLimitReached_OnUnvotedMovie_ThrowsConflictException()
    {
        var evt = EventWithVoteLimit(2);
        var movie = new Movie { Id = "mov3", EventId = evt.Id, ParticipantId = "p0", TmdbId = 3, Title = "Z", Year = "2020", CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow };
        var participant = new Participant { Id = "p123456789012345678901234", EventId = evt.Id, Pseudo = "Alice", UserId = OwnerUserId, CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow };
        GivenVotableMovie(evt, movie, participant, new Dictionary<string, int> { ["mov1"] = 1, ["mov2"] = -1 });

        var ex = await Assert.ThrowsAsync<ConflictException>(() =>
            _sut.HandleAsync("evt1", "mov3", new VoteRequest { ParticipantId = participant.Id, Value = 1 }));

        Assert.Contains("2 vote(s)", ex.Message);
        _voteRepo.Verify(r => r.UpsertAsync(It.IsAny<Vote>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task HandleAsync_VoteLimitReached_OnAlreadyVotedMovie_StillAllowsChangingTheVote()
    {
        var evt = EventWithVoteLimit(2);
        var movie = new Movie { Id = "mov2", EventId = evt.Id, ParticipantId = "p0", TmdbId = 2, Title = "Y", Year = "2020", CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow };
        var participant = new Participant { Id = "p123456789012345678901234", EventId = evt.Id, Pseudo = "Alice", UserId = OwnerUserId, CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow };
        GivenVotableMovie(evt, movie, participant, new Dictionary<string, int> { ["mov1"] = 1, ["mov2"] = -1 });

        var result = await _sut.HandleAsync("evt1", "mov2", new VoteRequest { ParticipantId = participant.Id, Value = 1 });

        Assert.Equal(1, result.Value);
    }

    [Fact]
    public async Task HandleAsync_UnderVoteLimit_Succeeds()
    {
        var evt = EventWithVoteLimit(2);
        var movie = new Movie { Id = "mov2", EventId = evt.Id, ParticipantId = "p0", TmdbId = 2, Title = "Y", Year = "2020", CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow };
        var participant = new Participant { Id = "p123456789012345678901234", EventId = evt.Id, Pseudo = "Alice", UserId = OwnerUserId, CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow };
        GivenVotableMovie(evt, movie, participant, new Dictionary<string, int> { ["mov1"] = 1 });

        var result = await _sut.HandleAsync("evt1", "mov2", new VoteRequest { ParticipantId = participant.Id, Value = -1 });

        Assert.Equal(-1, result.Value);
    }

    [Fact]
    public async Task HandleAsync_NoVoteLimit_NeverReadsExistingVotes()
    {
        var evt = ActiveEvent();
        var movie = new Movie { Id = "mov1", EventId = evt.Id, ParticipantId = "p0", TmdbId = 1, Title = "X", Year = "2020", CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow };
        var participant = new Participant { Id = "p123456789012345678901234", EventId = evt.Id, Pseudo = "Alice", UserId = OwnerUserId, CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow };
        GivenVotableMovie(evt, movie, participant, new Dictionary<string, int>());

        await _sut.HandleAsync("evt1", "mov1", new VoteRequest { ParticipantId = participant.Id, Value = 1 });

        _voteRepo.Verify(r => r.GetParticipantVotesByEventAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task HandleAsync_ParticipantOwnedByAnotherUser_ThrowsForbiddenException()
    {
        var evt = ActiveEvent();
        var movie = new Movie { Id = "mov1", EventId = evt.Id, ParticipantId = "p0", TmdbId = 1, Title = "X", Year = "2020", CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow };
        var victim = new Participant { Id = "p123456789012345678901234", EventId = evt.Id, Pseudo = "Victim", UserId = "another-user", CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow };
        _eventRepo.Setup(r => r.GetByIdOrSlugAsync("evt1", It.IsAny<CancellationToken>())).ReturnsAsync(evt);
        _movieRepo.Setup(r => r.GetByIdAndEventIdAsync("mov1", evt.Id, It.IsAny<CancellationToken>())).ReturnsAsync(movie);
        _participantRepo.Setup(r => r.FindByIdAndEventIdAsync(victim.Id, evt.Id, It.IsAny<CancellationToken>())).ReturnsAsync(victim);
        var request = new VoteRequest { ParticipantId = victim.Id, Value = 1 };

        await Assert.ThrowsAsync<ForbiddenException>(() => _sut.HandleAsync("evt1", "mov1", request));
        _voteRepo.Verify(r => r.UpsertAsync(It.IsAny<Vote>(), It.IsAny<CancellationToken>()), Times.Never);
    }
}
