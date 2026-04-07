using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.DeleteMovie;

public sealed class DeleteMovieHandler : IDeleteMovieHandler
{
    private readonly IEventRepository _eventRepository;
    private readonly IMovieRepository _movieRepository;
    private readonly IVoteRepository _voteRepository;
    private readonly IReactionRepository _reactionRepository;

    public DeleteMovieHandler(
        IEventRepository eventRepository,
        IMovieRepository movieRepository,
        IVoteRepository voteRepository,
        IReactionRepository reactionRepository)
    {
        _eventRepository = eventRepository;
        _movieRepository = movieRepository;
        _voteRepository = voteRepository;
        _reactionRepository = reactionRepository;
    }

    public async Task HandleAsync(string idOrSlug, string movieId, string participantId, CancellationToken ct = default)
    {
        var evt = await _eventRepository.GetByIdOrSlugAsync(idOrSlug, ct)
            ?? throw new NotFoundException("Soirée introuvable");

        if (evt.IsFinished(DateTimeOffset.UtcNow))
            throw new ConflictException("Soirée terminée. Lecture seule.");

        if (!string.IsNullOrEmpty(evt.WinnerMovieId))
            throw new ConflictException("La roue a déjà été lancée, suppression impossible");

        var movie = await _movieRepository.GetByIdAndEventIdAsync(movieId, evt.Id, ct);
        if (movie is null)
            throw new NotFoundException("Film introuvable");

        if (movie.ParticipantId != participantId)
            throw new ForbiddenException("Seul le participant qui a proposé peut retirer ce film");

        await _voteRepository.DeleteByMovieIdAsync(movieId, ct);
        await _reactionRepository.DeleteByMovieIdAsync(evt.Id, movieId, ct);
        await _movieRepository.DeleteAsync(movieId, ct);
    }
}
