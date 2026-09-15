using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Shared;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.DeleteMoviePitchNote;

public sealed class DeleteMoviePitchNoteHandler : IDeleteMoviePitchNoteHandler
{
    private readonly IEventRepository _eventRepository;
    private readonly IMovieRepository _movieRepository;
    private readonly IParticipantRepository _participantRepository;
    private readonly IHostTokenAccessor _hostTokenAccessor;
    private readonly ICurrentUserAccessor _currentUserAccessor;
    private readonly TimeProvider _clock;

    public DeleteMoviePitchNoteHandler(
        IEventRepository eventRepository,
        IMovieRepository movieRepository,
        IParticipantRepository participantRepository,
        IHostTokenAccessor hostTokenAccessor,
        ICurrentUserAccessor currentUserAccessor,
        TimeProvider clock)
    {
        _eventRepository = eventRepository;
        _movieRepository = movieRepository;
        _participantRepository = participantRepository;
        _hostTokenAccessor = hostTokenAccessor;
        _currentUserAccessor = currentUserAccessor;
        _clock = clock;
    }

    public async Task HandleAsync(string idOrSlug, string movieId, DeleteMoviePitchNoteRequest request, CancellationToken ct = default)
    {
        var (evt, movie, currentUserId, isHost) = await MovieActionContext.ResolveMovieForHostActionAsync(
            _eventRepository,
            _movieRepository,
            _hostTokenAccessor,
            _currentUserAccessor,
            _clock.GetUtcNow(),
            idOrSlug,
            movieId,
            Errors.WheelLocked,
            ct);

        if (!isHost)
        {
            if (string.IsNullOrEmpty(request.ParticipantId))
                throw Errors.PitchNoteDeletionRestricted();

            var participant = await _participantRepository.FindByIdAndEventIdAsync(request.ParticipantId, evt.Id, ct);
            if (participant is null)
                throw Errors.InvalidParticipant();

            if (string.IsNullOrEmpty(currentUserId) || participant.UserId != currentUserId || movie.ParticipantId != participant.Id)
                throw Errors.PitchNoteDeletionRestricted();
        }

        await _movieRepository.UpdatePitchNoteAsync(movieId, null, ct);
    }
}
