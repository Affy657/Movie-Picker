using Microsoft.Extensions.Logging;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Shared;
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
    private readonly TimeProvider _clock;

    public LaunchWheelHandler(
        IEventRepository eventRepository,
        IMovieRepository movieRepository,
        IVoteRepository voteRepository,
        IHostTokenAccessor hostTokenAccessor,
        ICurrentUserAccessor currentUserAccessor,
        IPosterImageStore posterImageStore,
        ILogger<LaunchWheelHandler> logger,
        TimeProvider clock)
    {
        _eventRepository = eventRepository;
        _movieRepository = movieRepository;
        _voteRepository = voteRepository;
        _hostTokenAccessor = hostTokenAccessor;
        _currentUserAccessor = currentUserAccessor;
        _posterImageStore = posterImageStore;
        _logger = logger;
        _clock = clock;
    }

    public async Task<WheelResponse> HandleAsync(string idOrSlug, int? expectedWinnerCount = null, CancellationToken ct = default)
    {
        var evt = await _eventRepository.GetRequiredByIdOrSlugAsync(idOrSlug, ct);

        var token = _hostTokenAccessor.GetHostToken();
        var userId = _currentUserAccessor.GetUserId();
        if (!EventHost.IsHost(evt, token, userId))
            throw Errors.HostOnly();

        if (evt.IsFinished(_clock.GetUtcNow()))
            throw Errors.EventFinished();

        if (expectedWinnerCount is { } expected && evt.Winners.Count > expected
            && await ReplayLatestDrawAsync(evt, ct) is { } replayed)
            return replayed;

        if (evt.RemainingWinnerSlots == 0)
            throw Errors.WinnersAllDrawn(evt.TargetWinnerCount);

        var movies = await _movieRepository.ListByEventIdAsync(evt.Id, ct);
        if (movies.Count == 0)
            throw Errors.NoMovieProposed();

        var eligibleCount = movies.Count(m => !m.ExcludedFromWheel);
        if (eligibleCount == 0)
            throw Errors.AllMoviesExcluded();

        var alreadyPicked = evt.GetWinnerMovieIds();
        var drawableCount = movies.Count(m => !m.ExcludedFromWheel && !alreadyPicked.Contains(m.Id));
        if (drawableCount == 0)
            throw Errors.NothingLeftToDraw();

        var mode = evt.Config?.WheelMode ?? WheelMode.StrictRandom;
        var scores = await _voteRepository.AggregateScoresByMovieIdsAsync(
            movies.Select(m => m.Id).ToList(),
            ct);

        var winner = WheelWinnerPicker.Pick(
            movies,
            id => scores.TryGetValue(id, out var a) ? a.Score : 0,
            mode,
            Random.Shared,
            excludedMovieIds: alreadyPicked);

        var now = _clock.GetUtcNow();
        var updated = evt with
        {
            Winners = [.. evt.Winners, new EventWinner
            {
                MovieId = winner.Id,
                Method = WinnerPickMethod.Wheel,
                PickedAt = now
            }],
            UpdatedAt = now
        };

        await _eventRepository.UpdateAsync(updated, ct);
        _logger.LogInformation("Wheel launched for event {EventId}, winner: {MovieId} (mode: {WheelMode})", evt.Id, winner.Id, mode);


        var message = drawableCount == 1
            ? "Only one movie in the draw: direct winner"
            : "Wheel spun";

        var winnerPoster = _posterImageStore.ToPublicPosterPath(winner.PosterPath);
        return new WheelResponse
        {
            Winner = WinnerMovieResponse.FromDomain(winner, winnerPoster),
            Message = message
        };
    }

    private async Task<WheelResponse?> ReplayLatestDrawAsync(Event evt, CancellationToken ct)
    {
        var latest = await _movieRepository.GetByIdAsync(evt.Winners[^1].MovieId, ct);
        if (latest is null)
            return null;

        return new WheelResponse
        {
            Winner = WinnerMovieResponse.FromDomain(latest, _posterImageStore.ToPublicPosterPath(latest.PosterPath)),
            Message = "Wheel already spun"
        };
    }
}
