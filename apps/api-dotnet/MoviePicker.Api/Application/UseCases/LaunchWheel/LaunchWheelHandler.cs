using Microsoft.Extensions.Logging;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.Posters;
using MoviePicker.Api.Domain;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.LaunchWheel;

public sealed class LaunchWheelHandler : ILaunchWheelHandler
{
    private readonly IEventRepository _eventRepository;
    private readonly IMovieRepository _movieRepository;
    private readonly IVoteRepository _voteRepository;
    private readonly IHostTokenAccessor _hostTokenAccessor;
    private readonly ICurrentUserAccessor _currentUserAccessor;
    private readonly IPosterImageStore _posterImageStore;
    private readonly ILogger<LaunchWheelHandler> _logger;

    public LaunchWheelHandler(
        IEventRepository eventRepository,
        IMovieRepository movieRepository,
        IVoteRepository voteRepository,
        IHostTokenAccessor hostTokenAccessor,
        ICurrentUserAccessor currentUserAccessor,
        IPosterImageStore posterImageStore,
        ILogger<LaunchWheelHandler> logger)
    {
        _eventRepository = eventRepository;
        _movieRepository = movieRepository;
        _voteRepository = voteRepository;
        _hostTokenAccessor = hostTokenAccessor;
        _currentUserAccessor = currentUserAccessor;
        _posterImageStore = posterImageStore;
        _logger = logger;
    }

    public async Task<WheelResponse> HandleAsync(string idOrSlug, CancellationToken ct = default)
    {
        var evt = await _eventRepository.GetRequiredByIdOrSlugAsync(idOrSlug, ct);

        var token = _hostTokenAccessor.GetHostToken();
        var userId = _currentUserAccessor.GetUserId();
        if (!EventHost.IsHost(evt, token, userId))
            throw new ForbiddenException("Réservé à l'hôte de la soirée");

        if (evt.IsFinished(DateTimeOffset.UtcNow))
            throw new ConflictException("Soirée terminée. Lecture seule.");

        var movies = await _movieRepository.ListByEventIdAsync(evt.Id, ct);
        if (movies.Count == 0)
            throw new BadRequestException("Aucun film proposé. Proposez au moins un film pour lancer la roue.");

        var mode = evt.Config?.WheelMode ?? WheelMode.StrictRandom;
        var scores = await _voteRepository.AggregateScoresByMovieIdsAsync(
            movies.Select(m => m.Id).ToList(),
            ct);

        var winner = WheelWinnerPicker.Pick(
            movies,
            id => scores.TryGetValue(id, out var a) ? a.Score : 0,
            mode,
            Random.Shared);

        var now = DateTimeOffset.UtcNow;
        var updated = evt with { WinnerMovieId = winner.Id, UpdatedAt = now };

        await _eventRepository.UpdateAsync(updated, ct);
        _logger.LogInformation("Wheel launched for event {EventId}, winner: {MovieId} (mode: {WheelMode})", evt.Id, winner.Id, mode);

        var message = movies.Count == 1
            ? "Un seul film proposé : gagnant direct."
            : "Roue lancée.";

        if (winner.PosterPath is not null &&
            TmdbPosterUrlNormalizer.TryNormalizeToHttpsTmdb(winner.PosterPath, out var wNorm))
            await _posterImageStore.RegisterTmdbSourceAsync(wNorm, ct);
        var winnerPoster = _posterImageStore.ToPublicPosterPath(winner.PosterPath);
        return new WheelResponse
        {
            Winner = WinnerMovieResponse.FromDomain(winner, winnerPoster),
            Message = message
        };
    }
}
