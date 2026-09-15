using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Shared;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.VoteMovie;

public sealed class VoteMovieHandler : IVoteMovieHandler
{
    public const string VoteLimitReachedReason = ErrorCodes.VoteLimitReached;

    private readonly IEventRepository _eventRepository;
    private readonly IMovieRepository _movieRepository;
    private readonly IParticipantRepository _participantRepository;
    private readonly IVoteRepository _voteRepository;
    private readonly ICurrentUserAccessor _currentUserAccessor;
    private readonly IUnitOfWork _unitOfWork;
    private readonly TimeProvider _clock;

    public VoteMovieHandler(
        IEventRepository eventRepository,
        IMovieRepository movieRepository,
        IParticipantRepository participantRepository,
        IVoteRepository voteRepository,
        ICurrentUserAccessor currentUserAccessor,
        IUnitOfWork unitOfWork,
        TimeProvider clock)
    {
        _eventRepository = eventRepository;
        _movieRepository = movieRepository;
        _participantRepository = participantRepository;
        _voteRepository = voteRepository;
        _currentUserAccessor = currentUserAccessor;
        _unitOfWork = unitOfWork;
        _clock = clock;
    }

    public async Task<VoteResponse> HandleAsync(string idOrSlug, string movieId, VoteRequest request, CancellationToken ct = default)
    {
        var (evt, movie, participant) = await MovieActionContext.ResolveOwnedMovieAsync(
            _eventRepository,
            _movieRepository,
            _participantRepository,
            _currentUserAccessor,
            _clock.GetUtcNow(),
            idOrSlug,
            movieId,
            request.ParticipantId,
            Errors.VoteOwnParticipationOnly,
            ct);

        var vote = new Vote
        {
            Id = string.Empty,
            EventId = evt.Id,
            MovieId = movie.Id,
            ParticipantId = participant.Id,
            Value = request.Value,
            CreatedAt = default,
            UpdatedAt = default
        };

        var saved = await UpsertWithinVoteLimitAsync(evt, movie, participant, vote, ct);

        return new VoteResponse
        {
            Id = saved.Id,
            EventId = saved.EventId,
            MovieId = saved.MovieId,
            ParticipantId = saved.ParticipantId,
            Value = saved.Value,
            CreatedAt = saved.CreatedAt,
            UpdatedAt = saved.UpdatedAt
        };
    }

    private async Task<Vote> UpsertWithinVoteLimitAsync(
        Event evt,
        Movie movie,
        Participant participant,
        Vote vote,
        CancellationToken ct)
    {
        var maxVotes = evt.Config?.MaxVotesPerParticipant;
        if (maxVotes is not > 0)
            return await _voteRepository.UpsertAsync(vote, ct);

        Vote saved = vote;
        await _unitOfWork.ExecuteAsync(
            async token =>
            {
                await _eventRepository.LockForWriteAsync(evt.Id, token);
                var votes = await _voteRepository.GetParticipantVotesByEventAsync(evt.Id, participant.Id, token);
                if (!votes.ContainsKey(movie.Id) && votes.Count >= maxVotes)
                    throw Errors.VoteLimitReached(maxVotes.Value);
                saved = await _voteRepository.UpsertAsync(vote, token);
            },
            ct);
        return saved;
    }
}
