using Microsoft.Extensions.Logging;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.Posters;
using MoviePicker.Api.Application.UseCases.Shared;
using MoviePicker.Api.Domain;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.SetManualWinner;

public sealed class SetManualWinnerHandler : ISetManualWinnerHandler
{
    private readonly IEventRepository _eventRepository;
    private readonly IMovieRepository _movieRepository;
    private readonly IHostTokenAccessor _hostTokenAccessor;
    private readonly ICurrentUserAccessor _currentUserAccessor;
    private readonly IPosterImageStore _posterImageStore;
    private readonly IWinnerAnnouncer _winnerAnnouncer;
    private readonly ILogger<SetManualWinnerHandler> _logger;

    public SetManualWinnerHandler(
        IEventRepository eventRepository,
        IMovieRepository movieRepository,
        IHostTokenAccessor hostTokenAccessor,
        ICurrentUserAccessor currentUserAccessor,
        IPosterImageStore posterImageStore,
        IWinnerAnnouncer winnerAnnouncer,
        ILogger<SetManualWinnerHandler> logger)
    {
        _eventRepository = eventRepository;
        _movieRepository = movieRepository;
        _hostTokenAccessor = hostTokenAccessor;
        _currentUserAccessor = currentUserAccessor;
        _posterImageStore = posterImageStore;
        _winnerAnnouncer = winnerAnnouncer;
        _logger = logger;
    }

    public async Task<WheelResponse> HandleAsync(string idOrSlug, SetManualWinnerRequest request, CancellationToken ct = default)
    {
        var evt = await _eventRepository.GetRequiredByIdOrSlugAsync(idOrSlug, ct);

        var token = _hostTokenAccessor.GetHostToken();
        var userId = _currentUserAccessor.GetUserId();
        if (!EventHost.IsHost(evt, token, userId))
            throw new ForbiddenException("Réservé à l'hôte de la soirée");

        if (evt.IsFinished(DateTimeOffset.UtcNow))
            throw new ConflictException("Soirée terminée. Lecture seule.");

        var winner = await _movieRepository.GetByIdAsync(request.MovieId, ct);
        if (winner is null || winner.EventId != evt.Id)
            throw new NotFoundException("Film introuvable dans cette soirée");

        var now = DateTimeOffset.UtcNow;
        var updated = evt with
        {
            WinnerMovieId = winner.Id,
            WinnerPickMethod = WinnerPickMethod.Manual,
            UpdatedAt = now
        };

        await _eventRepository.UpdateAsync(updated, ct);
        _logger.LogInformation("Manual winner set for event {EventId}, winner: {MovieId}", evt.Id, winner.Id);

        _ = _winnerAnnouncer.AnnounceAsync(evt, winner.Title, WinnerPickMethod.Manual, CancellationToken.None);

        if (winner.PosterPath is not null &&
            TmdbPosterUrlNormalizer.TryNormalizeToHttpsTmdb(winner.PosterPath, out var normalizedPoster))
            await _posterImageStore.RegisterTmdbSourceAsync(normalizedPoster, ct);
        var winnerPoster = _posterImageStore.ToPublicPosterPath(winner.PosterPath);

        return new WheelResponse
        {
            Winner = WinnerMovieResponse.FromDomain(winner, winnerPoster),
            Message = "Film choisi par l'hôte."
        };
    }
}
