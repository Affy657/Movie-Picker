using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.AddMovie;

public sealed class AddMovieHandler : IAddMovieHandler
{
    private readonly IEventRepository _eventRepository;
    private readonly IMovieRepository _movieRepository;
    private readonly IParticipantRepository _participantRepository;

    public AddMovieHandler(
        IEventRepository eventRepository,
        IMovieRepository movieRepository,
        IParticipantRepository participantRepository)
    {
        _eventRepository = eventRepository;
        _movieRepository = movieRepository;
        _participantRepository = participantRepository;
    }

    public async Task<MovieWithScoreResponse> HandleAsync(string idOrSlug, AddMovieRequest request, CancellationToken ct = default)
    {
        var evt = await _eventRepository.GetByIdOrSlugAsync(idOrSlug, ct)
            ?? throw new NotFoundException("Soirée introuvable");

        if (evt.IsFinished(DateTimeOffset.UtcNow))
            throw new BadRequestException("Soirée terminée. Lecture seule.");

        var poster = string.IsNullOrWhiteSpace(request.PosterPath) ? null : request.PosterPath.Trim();
        if (poster is not null && !Uri.TryCreate(poster, UriKind.Absolute, out _))
            throw new BadRequestException("posterPath doit être une URL absolue ou null");

        var participant = await _participantRepository.FindByIdAndEventIdAsync(request.ParticipantId, evt.Id, ct);
        if (participant is null)
            throw new BadRequestException("Participant invalide pour cette soirée");

        if (await _movieRepository.ExistsByEventAndTmdbIdAsync(evt.Id, request.TmdbId, ct))
            throw new ConflictException("Ce film a déjà été proposé (même id TMDB)");

        if (await _movieRepository.ExistsByEventAndTitleCaseInsensitiveAsync(evt.Id, request.Title.Trim(), ct))
            throw new ConflictException("Un film avec ce titre a déjà été proposé");

        var now = DateTimeOffset.UtcNow;
        var movie = new Movie
        {
            Id = string.Empty,
            EventId = evt.Id,
            ParticipantId = participant.Id,
            TmdbId = request.TmdbId,
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
            Title = created.Title,
            Year = created.Year,
            PosterPath = created.PosterPath,
            CreatedAt = created.CreatedAt,
            UpdatedAt = created.UpdatedAt,
            ProposerPseudo = participant.Pseudo,
            Score = 0,
            Up = 0,
            Down = 0
        };
    }
}
