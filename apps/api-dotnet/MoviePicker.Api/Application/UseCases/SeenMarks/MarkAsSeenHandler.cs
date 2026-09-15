using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Shared;
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
    private readonly TimeProvider _clock;

    public MarkAsSeenHandler(
        IEventRepository eventRepository,
        IMovieRepository movieRepository,
        IParticipantRepository participantRepository,
        ISeenMarkRepository seenMarkRepository,
        ICurrentUserAccessor currentUserAccessor,
        TimeProvider clock)
    {
        _eventRepository = eventRepository;
        _movieRepository = movieRepository;
        _participantRepository = participantRepository;
        _seenMarkRepository = seenMarkRepository;
        _currentUserAccessor = currentUserAccessor;
        _clock = clock;
    }

    public async Task<SeenMarkResponse> HandleAsync(
        string idOrSlug,
        string movieId,
        MarkAsSeenRequest request,
        CancellationToken ct = default)
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
            Errors.SeenMarkOwnParticipationOnly,
            ct);

        var now = _clock.GetUtcNow();
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
