using Microsoft.Extensions.Logging;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Shared;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.SetManualWinner;

public sealed class SetManualWinnerHandler : ISetManualWinnerHandler
{
    private readonly IEventRepository _eventRepository;
    private readonly IMovieRepository _movieRepository;
    private readonly ICurrentUserAccessor _currentUserAccessor;
    private readonly IPosterImageStore _posterImageStore;
    private readonly IWinnerAnnouncer _winnerAnnouncer;
    private readonly ILogger<SetManualWinnerHandler> _logger;
    private readonly TimeProvider _clock;

    public SetManualWinnerHandler(
        IEventRepository eventRepository,
        IMovieRepository movieRepository,
        ICurrentUserAccessor currentUserAccessor,
        IPosterImageStore posterImageStore,
        IWinnerAnnouncer winnerAnnouncer,
        ILogger<SetManualWinnerHandler> logger,
        TimeProvider clock)
    {
        _eventRepository = eventRepository;
        _movieRepository = movieRepository;
        _currentUserAccessor = currentUserAccessor;
        _posterImageStore = posterImageStore;
        _winnerAnnouncer = winnerAnnouncer;
        _logger = logger;
        _clock = clock;
    }

    public async Task<WheelResponse> HandleAsync(string idOrSlug, SetManualWinnerRequest request, CancellationToken ct = default)
    {
        var userId = _currentUserAccessor.GetUserId();
        var evt = await HostedEvent.LoadForHostAsync(
            _eventRepository,
            userId,
            idOrSlug,
            _clock.GetUtcNow(),
            ct);

        if (evt.RemainingWinnerSlots == 0)
            throw Errors.WinnersAllDrawn(evt.TargetWinnerCount);

        var winner = await _movieRepository.GetByIdAsync(request.MovieId, ct);
        if (winner is null || winner.EventId != evt.Id)
            throw Errors.MovieNotInEvent();

        if (winner.ExcludedFromWheel)
            throw Errors.MovieExcludedFromWheel();

        if (evt.GetWinnerMovieIds().Contains(winner.Id))
            throw Errors.MovieAlreadyAWinner();

        var now = _clock.GetUtcNow();
        var updated = evt with
        {
            Winners = [.. evt.Winners, new EventWinner
            {
                MovieId = winner.Id,
                Method = WinnerPickMethod.Manual,
                PickedAt = now
            }],
            UpdatedAt = now
        };

        await _eventRepository.UpdateAsync(updated, ct);
        _logger.LogInformation("Manual winner set for event {EventId}, winner: {MovieId}", evt.Id, winner.Id);

        await _winnerAnnouncer.AnnounceAsync(evt, winner.Title, WinnerPickMethod.Manual, userId, CancellationToken.None);

        var winnerPoster = _posterImageStore.ToPublicPosterPath(winner.PosterPath);

        return new WheelResponse
        {
            Winner = WinnerMovieResponse.Of(evt, winner, winnerPoster),
            Message = "Movie picked by the host"
        };
    }
}
