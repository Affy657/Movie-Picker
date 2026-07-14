using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Shared;
using MoviePicker.Api.Domain.Entities;

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
        var (evt, movie, participant) = await MovieActionContext.ResolveOwnedMovieAsync(
            _eventRepository,
            _movieRepository,
            _participantRepository,
            _currentUserAccessor,
            idOrSlug,
            movieId,
            request.ParticipantId,
            "Vous ne pouvez marquer un film que pour votre propre participation.",
            ct);

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
