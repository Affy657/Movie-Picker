using Microsoft.Extensions.Logging;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.Posters;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.AddMovie;

public sealed class AddMovieHandler : IAddMovieHandler
{
    private readonly IEventRepository _eventRepository;
    private readonly IMovieRepository _movieRepository;
    private readonly IParticipantRepository _participantRepository;
    private readonly IPosterImageStore _posterImageStore;
    private readonly IUserRepository _userRepository;
    private readonly IPushSubscriptionRepository _pushSubscriptions;
    private readonly IPushNotificationSender _pushSender;
    private readonly ILogger<AddMovieHandler> _logger;

    public AddMovieHandler(
        IEventRepository eventRepository,
        IMovieRepository movieRepository,
        IParticipantRepository participantRepository,
        IPosterImageStore posterImageStore,
        IUserRepository userRepository,
        IPushSubscriptionRepository pushSubscriptions,
        IPushNotificationSender pushSender,
        ILogger<AddMovieHandler> logger)
    {
        _eventRepository = eventRepository;
        _movieRepository = movieRepository;
        _participantRepository = participantRepository;
        _posterImageStore = posterImageStore;
        _userRepository = userRepository;
        _pushSubscriptions = pushSubscriptions;
        _pushSender = pushSender;
        _logger = logger;
    }

    public async Task<MovieWithScoreResponse> HandleAsync(string idOrSlug, AddMovieRequest request, CancellationToken ct = default)
    {
        var evt = await _eventRepository.GetRequiredByIdOrSlugAsync(idOrSlug, ct);

        if (evt.IsFinished(DateTimeOffset.UtcNow))
            throw new ConflictException("Soirée terminée. Lecture seule.");

        if (request.MediaType == MovieMediaType.Tv && evt.Config?.AllowSeries != true)
            throw new ConflictException("Cette soirée n'autorise pas les séries TV.");

        var poster = string.IsNullOrWhiteSpace(request.PosterPath) ? null : request.PosterPath.Trim();
        if (poster is not null && !IsAcceptablePosterPath(poster))
            throw new BadRequestException("posterPath doit être une URL https absolue, un chemin /api/v1/posters/… ou null");

        if (poster is not null && TmdbPosterUrlNormalizer.TryNormalizeToHttpsTmdb(poster, out var norm))
            await _posterImageStore.RegisterTmdbSourceAsync(norm, ct);
        poster = _posterImageStore.ToPublicPosterPath(poster);

        var participant = await _participantRepository.FindByIdAndEventIdAsync(request.ParticipantId, evt.Id, ct);
        if (participant is null)
            throw new BadRequestException("Participant invalide pour cette soirée");

        if (await _movieRepository.ExistsByEventAndTmdbIdAsync(evt.Id, request.TmdbId, request.MediaType, ct))
            throw new ConflictException("Ce film a déjà été proposé (même id TMDB)");

        if (await _movieRepository.ExistsByEventAndTitleCaseInsensitiveAsync(evt.Id, request.Title.Trim(), ct))
            throw new ConflictException("Un film avec ce titre a déjà été proposé");

        var maxProp = evt.Config?.MaxProposalsPerParticipant;
        if (maxProp is > 0)
        {
            var count = await _movieRepository.CountByEventAndParticipantAsync(evt.Id, participant.Id, ct);
            if (count >= maxProp)
                throw new ConflictException($"Limite de {maxProp} proposition(s) par participant atteinte.");
        }

        var now = DateTimeOffset.UtcNow;
        var pitchNote = string.IsNullOrWhiteSpace(request.PitchNote) ? null : request.PitchNote.Trim();

        var movie = new Movie
        {
            Id = string.Empty,
            EventId = evt.Id,
            ParticipantId = participant.Id,
            TmdbId = request.TmdbId,
            MediaType = request.MediaType,
            Title = request.Title.Trim(),
            Year = request.Year,
            PosterPath = poster,
            PitchNote = pitchNote,
            CreatedAt = now,
            UpdatedAt = now
        };

        var created = await _movieRepository.InsertAsync(movie, ct);

        _ = NotifyParticipantsOnMovieAddedAsync(evt, created.Title, participant.UserId, CancellationToken.None);

        return new MovieWithScoreResponse
        {
            Id = created.Id,
            EventId = created.EventId,
            ParticipantId = created.ParticipantId,
            TmdbId = created.TmdbId,
            MediaType = created.MediaType,
            Title = created.Title,
            Year = created.Year,
            PosterPath = created.PosterPath,
            PitchNote = created.PitchNote,
            CreatedAt = created.CreatedAt,
            UpdatedAt = created.UpdatedAt,
            ProposerPseudo = participant.Pseudo,
            Score = 0,
            Up = 0,
            Down = 0,
            SeenCount = 0,
            SeenByPseudos = Array.Empty<string>()
        };
    }

    private async Task NotifyParticipantsOnMovieAddedAsync(Event evt, string movieTitle, string? proposerUserId, CancellationToken ct)
    {
        try
        {
            var participants = await _participantRepository.ListByEventIdAsync(evt.Id, ct);
            var userIds = participants
                .Where(p => !string.IsNullOrEmpty(p.UserId) && p.UserId != proposerUserId)
                .Select(p => p.UserId!)
                .Distinct()
                .ToList();
            if (userIds.Count == 0)
                return;

            var users = await _userRepository.ListByIdsAsync(userIds, ct);
            var notifiableIds = users.Where(u => u.NotifyOnMovieAdded).Select(u => u.Id).ToHashSet();
            if (notifiableIds.Count == 0)
                return;

            var subs = await _pushSubscriptions.ListByUserIdsAsync(notifiableIds, ct);
            if (subs.Count == 0)
                return;

            var message = new PushMessage(
                Title: "🎬 Nouveau film proposé",
                Body: $"« {movieTitle} » a été ajouté à « {evt.Title} »",
                Tag: $"movie-add-{evt.Id}",
                Url: $"/events/{evt.Slug}"
            );

            foreach (var sub in subs.Where(s => notifiableIds.Contains(s.UserId)))
                await _pushSender.SendAsync(sub, message, ct);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Échec de la notification film proposé pour la soirée {EventId}", evt.Id);
        }
    }

    private static bool IsAcceptablePosterPath(string p)
    {
        if (Uri.TryCreate(p, UriKind.Absolute, out var u) && u.Scheme == Uri.UriSchemeHttps)
            return true;
        return TmdbPosterUrlNormalizer.TryParsePosterKey(p, out _);
    }
}
