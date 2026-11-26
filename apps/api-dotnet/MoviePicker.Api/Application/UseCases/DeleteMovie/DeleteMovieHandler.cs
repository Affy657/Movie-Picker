using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Shared;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.DeleteMovie;

public sealed class DeleteMovieHandler : IDeleteMovieHandler
{
    private readonly IEventRepository _eventRepository;
    private readonly IMovieRepository _movieRepository;
    private readonly IVoteRepository _voteRepository;
    private readonly ISeenMarkRepository _seenMarkRepository;
    private readonly IMovieRatingRepository _ratingRepository;
    private readonly IParticipantRepository _participantRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly TimeProvider _clock;

    public DeleteMovieHandler(
        IEventRepository eventRepository,
        IMovieRepository movieRepository,
        IVoteRepository voteRepository,
        ISeenMarkRepository seenMarkRepository,
        IMovieRatingRepository ratingRepository,
        IParticipantRepository participantRepository,
        IUnitOfWork unitOfWork,
        TimeProvider clock)
    {
        _eventRepository = eventRepository;
        _movieRepository = movieRepository;
        _voteRepository = voteRepository;
        _seenMarkRepository = seenMarkRepository;
        _ratingRepository = ratingRepository;
        _participantRepository = participantRepository;
        _unitOfWork = unitOfWork;
        _clock = clock;
    }

    public async Task HandleAsync(
        string userId,
        string slug,
        string movieId,
        string participantId,
        CancellationToken ct = default)
    {
        var (evt, movie, isHost) = await MovieActionContext.ResolveMovieForHostActionAsync(
            _eventRepository,
            _movieRepository,
            userId,
            _clock.GetUtcNow(),
            slug,
            movieId,
            Errors.WheelLockedDelete,
            ct);

        var isProposer = false;
        if (!isHost)
        {
            var participant = await _participantRepository.FindByIdAndEventIdAsync(participantId, evt.Id, ct);
            isProposer = participant is not null
                && participant.UserId == userId
                && movie.ParticipantId == participant.Id;
        }

        if (!isProposer && !isHost)
            throw Errors.MovieRemovalRestricted();

        await _unitOfWork.ExecuteAsync(
            async token =>
            {
                var current = await _eventRepository.GetRequiredBySlugAsync(slug, token);
                if (current.HasWinner)
                    throw Errors.WheelLockedDelete();
                if (!isProposer && !HostedEvent.IsHost(current, userId))
                    throw Errors.MovieRemovalRestricted();

                await EventChildData.PurgeMoviesAsync(
                    _voteRepository,
                    _seenMarkRepository,
                    _ratingRepository,
                    _movieRepository,
                    evt.Id,
                    [movieId],
                    token);
                await _eventRepository.UpdateAsync(current with { UpdatedAt = _clock.GetUtcNow() }, token);
            },
            ct);
    }
}
