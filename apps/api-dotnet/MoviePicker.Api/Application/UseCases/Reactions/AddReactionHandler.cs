using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.Reactions;

public sealed class AddReactionHandler : IAddReactionHandler
{
    private readonly IEventRepository _eventRepository;
    private readonly IMovieRepository _movieRepository;
    private readonly IParticipantRepository _participantRepository;
    private readonly IReactionRepository _reactionRepository;

    public AddReactionHandler(
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

    public async Task<ReactionResponse> HandleAsync(
        string idOrSlug,
        string movieId,
        AddReactionRequest request,
        CancellationToken ct = default)
    {
        var evt = await _eventRepository.GetRequiredByIdOrSlugAsync(idOrSlug, ct);

        if (evt.IsFinished(DateTimeOffset.UtcNow))
            throw new ConflictException("Soirée terminée. Lecture seule.");

        var movie = await _movieRepository.GetByIdAndEventIdAsync(movieId, evt.Id, ct);
        if (movie is null)
            throw new NotFoundException("Film introuvable");

        var rid = request.ReactionId.Trim();
        if (!ReactionCatalog.IsKnown(rid))
            throw new BadRequestException("Identifiant de réaction inconnu.");

        if (!ReactionPolicy.IsAllowed(evt.Config, rid))
            throw new BadRequestException("Réaction non autorisée pour cette soirée.");

        var participant = await _participantRepository.FindByIdAndEventIdAsync(request.ParticipantId, evt.Id, ct);
        if (participant is null)
            throw new BadRequestException("Participant invalide pour cette soirée");

        var now = DateTimeOffset.UtcNow;
        var saved = await _reactionRepository.AddAsync(
            new Reaction
            {
                Id = string.Empty,
                EventId = evt.Id,
                MovieId = movie.Id,
                ParticipantId = participant.Id,
                ReactionId = rid,
                CreatedAt = now,
                UpdatedAt = now
            },
            ct);

        return new ReactionResponse
        {
            Id = saved.Id,
            EventId = saved.EventId,
            MovieId = saved.MovieId,
            ParticipantId = saved.ParticipantId,
            ReactionId = saved.ReactionId,
            CreatedAt = saved.CreatedAt,
            UpdatedAt = saved.UpdatedAt
        };
    }
}
