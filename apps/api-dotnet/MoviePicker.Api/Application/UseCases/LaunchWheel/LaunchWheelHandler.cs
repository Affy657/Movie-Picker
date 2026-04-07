using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
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

    public LaunchWheelHandler(
        IEventRepository eventRepository,
        IMovieRepository movieRepository,
        IVoteRepository voteRepository,
        IHostTokenAccessor hostTokenAccessor,
        ICurrentUserAccessor currentUserAccessor)
    {
        _eventRepository = eventRepository;
        _movieRepository = movieRepository;
        _voteRepository = voteRepository;
        _hostTokenAccessor = hostTokenAccessor;
        _currentUserAccessor = currentUserAccessor;
    }

    public async Task<WheelResponse> HandleAsync(string idOrSlug, CancellationToken ct = default)
    {
        var evt = await _eventRepository.GetByIdOrSlugAsync(idOrSlug, ct)
            ?? throw new NotFoundException("Soirée introuvable");

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
        var updated = new Event
        {
            Id = evt.Id,
            Title = evt.Title,
            Date = evt.Date,
            Time = evt.Time,
            HostToken = evt.HostToken,
            Slug = evt.Slug,
            CreatorUserId = evt.CreatorUserId,
            Config = evt.Config,
            ClosedAt = evt.ClosedAt,
            WinnerMovieId = winner.Id,
            CreatedAt = evt.CreatedAt,
            UpdatedAt = now
        };

        await _eventRepository.UpdateAsync(updated, ct);

        var message = movies.Count == 1
            ? "Un seul film proposé : gagnant direct."
            : "Roue lancée.";

        return new WheelResponse
        {
            Winner = new WinnerMovieResponse
            {
                Id = winner.Id,
                EventId = winner.EventId,
                ParticipantId = winner.ParticipantId,
                TmdbId = winner.TmdbId,
                Title = winner.Title,
                Year = winner.Year,
                PosterPath = winner.PosterPath,
                CreatedAt = winner.CreatedAt,
                UpdatedAt = winner.UpdatedAt
            },
            Message = message
        };
    }
}
