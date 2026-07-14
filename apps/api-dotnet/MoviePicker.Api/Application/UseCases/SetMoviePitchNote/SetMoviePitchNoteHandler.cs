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

    public SetMoviePitchNoteHandler(
        IEventRepository eventRepository,
        IMovieRepository movieRepository,
        IParticipantRepository participantRepository,
        ICurrentUserAccessor currentUserAccessor)
    {
        _eventRepository = eventRepository;
        _movieRepository = movieRepository;
        _participantRepository = participantRepository;
        _currentUserAccessor = currentUserAccessor;
    }

    public async Task HandleAsync(string idOrSlug, string movieId, SetMoviePitchNoteRequest request, CancellationToken ct = default)
    {
        var (_, movie, participant) = await MovieActionContext.ResolveOwnedMovieAsync(
            _eventRepository,
            _movieRepository,
            _participantRepository,
            _currentUserAccessor,
            idOrSlug,
            movieId,
            request.ParticipantId,
            "Seul le participant qui a proposé ce film peut modifier sa note",
            ct,
            wheelLockedError: "La roue a déjà été lancée. Lecture seule.");

        if (movie.ParticipantId != participant.Id)
            throw new ForbiddenException("Seul le participant qui a proposé ce film peut modifier sa note");

        var pitchNote = request.PitchNote.Trim();
        if (pitchNote.Length > 140)
            throw new BadRequestException("La note de pitch ne peut pas dépasser 140 caractères.");
        await _movieRepository.UpdatePitchNoteAsync(movieId, pitchNote, ct);
    }
}
