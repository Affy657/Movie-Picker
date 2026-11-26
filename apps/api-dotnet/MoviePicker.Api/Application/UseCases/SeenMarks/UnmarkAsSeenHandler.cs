using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Shared;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.SeenMarks;

public sealed class UnmarkAsSeenHandler : IUnmarkAsSeenHandler
{
    private readonly IEventRepository _eventRepository;
    private readonly IMovieRepository _movieRepository;
    private readonly IParticipantRepository _participantRepository;
    private readonly ISeenMarkRepository _seenMarkRepository;
    private readonly TimeProvider _clock;

    public UnmarkAsSeenHandler(
        IEventRepository eventRepository,
        IMovieRepository movieRepository,
        IParticipantRepository participantRepository,
        ISeenMarkRepository seenMarkRepository,
        TimeProvider clock)
    {
        _eventRepository = eventRepository;
        _movieRepository = movieRepository;
        _participantRepository = participantRepository;
        _seenMarkRepository = seenMarkRepository;
        _clock = clock;
    }

    public async Task HandleAsync(
        string userId,
        string slug,
        string movieId,
        string participantId,
        CancellationToken ct = default)
    {
        var (evt, movie, participant) = await MovieActionContext.ResolveOwnedMovieAsync(
            _eventRepository,
            _movieRepository,
            _participantRepository,
            userId,
            _clock.GetUtcNow(),
            slug,
            movieId,
            participantId,
            Errors.SeenMarkOwnOnly,
            ct);

        var deleted = await _seenMarkRepository.DeleteAsync(evt.Id, movie.Id, participant.Id, ct);
        if (!deleted)
            throw Errors.SeenMarkNotFound();
        await _eventRepository.MarkChangedAsync(evt.Id, ct);
    }
}
