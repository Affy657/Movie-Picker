using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.ListMovies;

public sealed class ListMoviesForEventHandler : IListMoviesForEventHandler
{
    private readonly IEventRepository _eventRepository;
    private readonly IMovieRepository _movieRepository;
    private readonly IVoteRepository _voteRepository;
    private readonly IParticipantRepository _participantRepository;

    public ListMoviesForEventHandler(
        IEventRepository eventRepository,
        IMovieRepository movieRepository,
        IVoteRepository voteRepository,
        IParticipantRepository participantRepository)
    {
        _eventRepository = eventRepository;
        _movieRepository = movieRepository;
        _voteRepository = voteRepository;
        _participantRepository = participantRepository;
    }

    public async Task<IReadOnlyList<MovieWithScoreResponse>> HandleAsync(string idOrSlug, CancellationToken ct = default)
    {
        var evt = await _eventRepository.GetByIdOrSlugAsync(idOrSlug, ct)
            ?? throw new NotFoundException("Soirée introuvable");

        var movies = await _movieRepository.ListByEventIdAsync(evt.Id, ct);
        var movieIds = movies.Select(m => m.Id).ToList();
        var scores = await _voteRepository.AggregateScoresByMovieIdsAsync(movieIds, ct);
        var participantIds = movies.Select(m => m.ParticipantId).Distinct().ToList();
        var pseudos = await _participantRepository.GetPseudosByIdsAsync(participantIds, ct);

        return movies.Select(m =>
        {
            scores.TryGetValue(m.Id, out var s);
            pseudos.TryGetValue(m.ParticipantId, out var pseudo);
            return new MovieWithScoreResponse
            {
                Id = m.Id,
                EventId = m.EventId,
                ParticipantId = m.ParticipantId,
                TmdbId = m.TmdbId,
                Title = m.Title,
                Year = m.Year,
                PosterPath = m.PosterPath,
                CreatedAt = m.CreatedAt,
                UpdatedAt = m.UpdatedAt,
                ProposerPseudo = pseudo ?? string.Empty,
                Score = s.Score,
                Up = s.Up,
                Down = s.Down
            };
        }).ToList();
    }
}
