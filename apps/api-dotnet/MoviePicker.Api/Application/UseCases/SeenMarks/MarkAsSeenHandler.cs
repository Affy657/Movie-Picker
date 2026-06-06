using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.SeenMarks;

public sealed class MarkAsSeenHandler : IMarkAsSeenHandler
{
    private readonly IEventRepository _eventRepository;
    private readonly IMovieRepository _movieRepository;
    private readonly IParticipantRepository _participantRepository;
    private readonly ISeenMarkRepository _seenMarkRepository;
    private readonly ICurrentUserAccessor _currentUserAccessor;

    public MarkAsSeenHandler(
        IEventRepository eventRepository,
        IMovieRepository movieRepository,
        IParticipantRepository participantRepository,
        ISeenMarkRepository seenMarkRepository,
        ICurrentUserAccessor currentUserAccessor)
    {
        _eventRepository = eventRepository;
        _movieRepository = movieRepository;
        _participantRepository = participantRepository;
        _seenMarkRepository = seenMarkRepository;
        _currentUserAccessor = currentUserAccessor;
    }

    public async Task<SeenMarkResponse> HandleAsync(
        string idOrSlug,
        string movieId,
        MarkAsSeenRequest request,
        CancellationToken ct = default)
    {
        var evt = await _eventRepository.GetRequiredByIdOrSlugAsync(idOrSlug, ct);

        if (evt.IsFinished(DateTimeOffset.UtcNow))
            throw new ConflictException("Soirée terminée. Lecture seule.");

        var movie = await _movieRepository.GetByIdAndEventIdAsync(movieId, evt.Id, ct);
        if (movie is null)
            throw new NotFoundException("Film introuvable");

        var participant = await _participantRepository.FindByIdAndEventIdAsync(request.ParticipantId, evt.Id, ct);
        if (participant is null)
            throw new BadRequestException("Participant invalide pour cette soirée");

        var currentUserId = _currentUserAccessor.GetUserId();
        if (string.IsNullOrEmpty(currentUserId) || participant.UserId != currentUserId)
            throw new ForbiddenException("Vous ne pouvez marquer un film que pour votre propre participation.");

        var now = DateTimeOffset.UtcNow;
        var saved = await _seenMarkRepository.AddAsync(
            new SeenMark
            {
                Id = string.Empty,
                EventId = evt.Id,
                MovieId = movie.Id,
                ParticipantId = participant.Id,
                CreatedAt = now,
                UpdatedAt = now
            },
            ct);

        return new SeenMarkResponse
        {
            Id = saved.Id,
            EventId = saved.EventId,
            MovieId = saved.MovieId,
            ParticipantId = saved.ParticipantId,
            CreatedAt = saved.CreatedAt,
            UpdatedAt = saved.UpdatedAt
        };
    }
}
