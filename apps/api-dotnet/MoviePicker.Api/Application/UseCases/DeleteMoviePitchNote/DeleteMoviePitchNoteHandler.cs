using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.DeleteMoviePitchNote;

public sealed class DeleteMoviePitchNoteHandler : IDeleteMoviePitchNoteHandler
{
    private readonly IEventRepository _eventRepository;
    private readonly IMovieRepository _movieRepository;
    private readonly IParticipantRepository _participantRepository;
    private readonly IHostTokenAccessor _hostTokenAccessor;
    private readonly ICurrentUserAccessor _currentUserAccessor;

    public DeleteMoviePitchNoteHandler(
        IEventRepository eventRepository,
        IMovieRepository movieRepository,
        IParticipantRepository participantRepository,
        IHostTokenAccessor hostTokenAccessor,
        ICurrentUserAccessor currentUserAccessor)
    {
        _eventRepository = eventRepository;
        _movieRepository = movieRepository;
        _participantRepository = participantRepository;
        _hostTokenAccessor = hostTokenAccessor;
        _currentUserAccessor = currentUserAccessor;
    }

    public async Task HandleAsync(string idOrSlug, string movieId, DeleteMoviePitchNoteRequest request, CancellationToken ct = default)
    {
        var evt = await _eventRepository.GetRequiredByIdOrSlugAsync(idOrSlug, ct);

        if (evt.IsFinished(DateTimeOffset.UtcNow))
            throw new ConflictException("Soirée terminée. Lecture seule.");

        if (!string.IsNullOrEmpty(evt.WinnerMovieId))
            throw new ConflictException("La roue a déjà été lancée. Lecture seule.");

        var movie = await _movieRepository.GetByIdAndEventIdAsync(movieId, evt.Id, ct);
        if (movie is null)
            throw new NotFoundException("Film introuvable");

        var isHost = EventHost.IsHost(
            evt,
            _hostTokenAccessor.GetHostToken(),
            _currentUserAccessor.GetUserId());

        if (!isHost)
        {
            if (string.IsNullOrEmpty(request.ParticipantId))
                throw new ForbiddenException("Seul le participant qui a proposé ce film ou l'hôte peut supprimer la note");

            var participant = await _participantRepository.FindByIdAndEventIdAsync(request.ParticipantId, evt.Id, ct);
            if (participant is null)
                throw new BadRequestException("Participant invalide pour cette soirée");

            if (movie.ParticipantId != participant.Id)
                throw new ForbiddenException("Seul le participant qui a proposé ce film ou l'hôte peut supprimer la note");
        }

        await _movieRepository.UpdatePitchNoteAsync(movieId, null, ct);
    }
}
