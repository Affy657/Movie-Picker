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
    private readonly IParticipantRepository _participantRepository;
    private readonly IHostTokenAccessor _hostTokenAccessor;
    private readonly ICurrentUserAccessor _currentUserAccessor;

    public DeleteMovieHandler(
        IEventRepository eventRepository,
        IMovieRepository movieRepository,
        IVoteRepository voteRepository,
        ISeenMarkRepository seenMarkRepository,
        IParticipantRepository participantRepository,
        IHostTokenAccessor hostTokenAccessor,
        ICurrentUserAccessor currentUserAccessor)
    {
        _eventRepository = eventRepository;
        _movieRepository = movieRepository;
        _voteRepository = voteRepository;
        _seenMarkRepository = seenMarkRepository;
        _participantRepository = participantRepository;
        _hostTokenAccessor = hostTokenAccessor;
        _currentUserAccessor = currentUserAccessor;
    }

    public async Task HandleAsync(string idOrSlug, string movieId, string participantId, CancellationToken ct = default)
    {
        var (evt, movie, currentUserId, isHost) = await MovieActionContext.ResolveMovieForHostActionAsync(
            _eventRepository,
            _movieRepository,
            _hostTokenAccessor,
            _currentUserAccessor,
            idOrSlug,
            movieId,
            "La roue a déjà été lancée, suppression impossible",
            ct);

        var isProposer = false;
        if (!isHost)
        {
            var participant = await _participantRepository.FindByIdAndEventIdAsync(participantId, evt.Id, ct);
            isProposer = participant is not null
                && !string.IsNullOrEmpty(currentUserId)
                && participant.UserId == currentUserId
                && movie.ParticipantId == participant.Id;
        }

        if (!isProposer && !isHost)
            throw new ForbiddenException("Seul le participant qui a proposé ou l'hôte peut retirer ce film");

        await _voteRepository.DeleteByMovieIdAsync(movieId, ct);
        await _seenMarkRepository.DeleteByMovieIdAsync(evt.Id, movieId, ct);
        await _movieRepository.DeleteAsync(movieId, ct);
    }
}
