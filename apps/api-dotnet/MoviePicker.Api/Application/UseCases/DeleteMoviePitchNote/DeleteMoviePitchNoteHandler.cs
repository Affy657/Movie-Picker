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
        var (evt, movie, currentUserId, isHost) = await MovieActionContext.ResolveMovieForHostActionAsync(
            _eventRepository,
            _movieRepository,
            _hostTokenAccessor,
            _currentUserAccessor,
            idOrSlug,
            movieId,
            "La roue a déjà été lancée. Lecture seule.",
            ct);

        if (!isHost)
        {
            if (string.IsNullOrEmpty(request.ParticipantId))
                throw new ForbiddenException("Seul le participant qui a proposé ce film ou l'hôte peut supprimer la note");

            var participant = await _participantRepository.FindByIdAndEventIdAsync(request.ParticipantId, evt.Id, ct);
            if (participant is null)
                throw new BadRequestException("Participant invalide pour cette soirée");

            if (string.IsNullOrEmpty(currentUserId) || participant.UserId != currentUserId || movie.ParticipantId != participant.Id)
                throw new ForbiddenException("Seul le participant qui a proposé ce film ou l'hôte peut supprimer la note");
        }

        await _movieRepository.UpdatePitchNoteAsync(movieId, null, ct);
    }
}
