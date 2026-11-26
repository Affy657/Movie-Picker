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
    private readonly TimeProvider _clock;

    public DeleteMoviePitchNoteHandler(
        IEventRepository eventRepository,
        IMovieRepository movieRepository,
        IParticipantRepository participantRepository,
        TimeProvider clock)
    {
        _eventRepository = eventRepository;
        _movieRepository = movieRepository;
        _participantRepository = participantRepository;
        _clock = clock;
    }

    public async Task HandleAsync(string userId, string idOrSlug, string movieId, DeleteMoviePitchNoteRequest request, CancellationToken ct = default)
    {
        var (evt, movie, isHost) = await MovieActionContext.ResolveMovieForHostActionAsync(
            _eventRepository,
            _movieRepository,
            userId,
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

            if (participant.UserId != userId || movie.ParticipantId != participant.Id)
                throw Errors.PitchNoteDeletionRestricted();
        }

        await _movieRepository.UpdatePitchNoteAsync(movieId, null, ct);
        await _eventRepository.MarkChangedAsync(evt.Id, ct);
    }
}
