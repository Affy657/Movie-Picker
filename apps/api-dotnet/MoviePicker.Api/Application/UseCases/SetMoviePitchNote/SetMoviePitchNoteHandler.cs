using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Shared;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.SetMoviePitchNote;

public sealed class SetMoviePitchNoteHandler : ISetMoviePitchNoteHandler
{
    private readonly IEventRepository _eventRepository;
    private readonly IMovieRepository _movieRepository;
    private readonly IParticipantRepository _participantRepository;
    private readonly ICurrentUserAccessor _currentUserAccessor;
    private readonly TimeProvider _clock;

    public SetMoviePitchNoteHandler(
        IEventRepository eventRepository,
        IMovieRepository movieRepository,
        IParticipantRepository participantRepository,
        ICurrentUserAccessor currentUserAccessor,
        TimeProvider clock)
    {
        _eventRepository = eventRepository;
        _movieRepository = movieRepository;
        _participantRepository = participantRepository;
        _currentUserAccessor = currentUserAccessor;
        _clock = clock;
    }

    public async Task HandleAsync(string idOrSlug, string movieId, SetMoviePitchNoteRequest request, CancellationToken ct = default)
    {
        var (_, movie, participant) = await MovieActionContext.ResolveOwnedMovieAsync(
            _eventRepository,
            _movieRepository,
            _participantRepository,
            _currentUserAccessor,
            _clock.GetUtcNow(),
            idOrSlug,
            movieId,
            request.ParticipantId,
            Errors.PitchNoteEditRestricted,
            ct,
            wheelLockedError: Errors.WheelLocked);

        if (movie.ParticipantId != participant.Id)
            throw Errors.PitchNoteEditRestricted();

        var pitchNote = request.PitchNote.Trim();
        if (pitchNote.Length > 140)
            throw Errors.PitchNoteTooLong(140);
        await _movieRepository.UpdatePitchNoteAsync(movieId, pitchNote, ct);
    }
}
