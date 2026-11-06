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
    private readonly IUnitOfWork _unitOfWork;
    private readonly TimeProvider _clock;

    public MarkAsSeenHandler(
        IEventRepository eventRepository,
        IMovieRepository movieRepository,
        IParticipantRepository participantRepository,
        ISeenMarkRepository seenMarkRepository,
        ICurrentUserAccessor currentUserAccessor,
        IUnitOfWork unitOfWork,
        TimeProvider clock)
    {
        _eventRepository = eventRepository;
        _movieRepository = movieRepository;
        _participantRepository = participantRepository;
        _seenMarkRepository = seenMarkRepository;
        _currentUserAccessor = currentUserAccessor;
        _unitOfWork = unitOfWork;
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
        var mark = new SeenMark
        {
            Id = string.Empty,
            EventId = evt.Id,
            MovieId = movie.Id,
            ParticipantId = participant.Id,
            CreatedAt = now,
            UpdatedAt = now
        };

        var saved = mark;
        await _unitOfWork.ExecuteAsync(
            async token =>
            {
                await _eventRepository.LockForWriteAsync(evt.Id, token);
                await MovieActionContext.EnsureMovieAndParticipantRemainAsync(
                    _movieRepository, _participantRepository, evt.Id, movie.Id, participant.Id, token);
                saved = await _seenMarkRepository.AddAsync(mark, token);
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
