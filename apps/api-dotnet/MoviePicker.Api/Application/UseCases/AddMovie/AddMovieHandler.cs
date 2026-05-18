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

    public AddMovieHandler(
        IEventRepository eventRepository,
        IMovieRepository movieRepository,
        IParticipantRepository participantRepository,
        IPosterImageStore posterImageStore)
    {
        _eventRepository = eventRepository;
        _movieRepository = movieRepository;
        _participantRepository = participantRepository;
        _posterImageStore = posterImageStore;
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
            CreatedAt = now,
            UpdatedAt = now
        };

        var created = await _movieRepository.InsertAsync(movie, ct);

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

    private static bool IsAcceptablePosterPath(string p)
    {
        if (Uri.TryCreate(p, UriKind.Absolute, out var u) && u.Scheme == Uri.UriSchemeHttps)
            return true;
        return TmdbPosterUrlNormalizer.TryParsePosterKey(p, out _);
    }
}
