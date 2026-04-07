using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.Reactions;

public sealed class GetMovieReactionsHandler : IGetMovieReactionsHandler
{
    private readonly IEventRepository _eventRepository;
    private readonly IMovieRepository _movieRepository;
    private readonly IParticipantRepository _participantRepository;
    private readonly IReactionRepository _reactionRepository;

    public GetMovieReactionsHandler(
        IEventRepository eventRepository,
        IMovieRepository movieRepository,
        IParticipantRepository participantRepository,
        IReactionRepository reactionRepository)
    {
        _eventRepository = eventRepository;
        _movieRepository = movieRepository;
        _participantRepository = participantRepository;
        _reactionRepository = reactionRepository;
    }

    public async Task<MovieReactionsResponse> HandleAsync(string idOrSlug, string movieId, CancellationToken ct = default)
    {
        var evt = await _eventRepository.GetByIdOrSlugAsync(idOrSlug, ct)
            ?? throw new NotFoundException("Soirée introuvable");

        var movie = await _movieRepository.GetByIdAndEventIdAsync(movieId, evt.Id, ct);
        if (movie is null)
            throw new NotFoundException("Film introuvable");

        var agg = await _reactionRepository.AggregateByMovieIdsAsync(evt.Id, new[] { movie.Id }, ct);
        if (!agg.TryGetValue(movie.Id, out var rows) || rows.Count == 0)
        {
            return new MovieReactionsResponse { MovieId = movie.Id, Reactions = Array.Empty<MovieReactionAggregateResponse>() };
        }

        var pids = rows.SelectMany(r => r.ParticipantIds).Distinct().ToList();
        var pseudos = await _participantRepository.GetPseudosByIdsAsync(pids, ct);
        var reactions = ReactionAggregateMapper.ToMovieReactionResponses(rows, pseudos);

        return new MovieReactionsResponse { MovieId = movie.Id, Reactions = reactions };
    }
}
