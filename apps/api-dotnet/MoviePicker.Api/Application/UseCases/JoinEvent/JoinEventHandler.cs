using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.JoinEvent;

public sealed class JoinEventHandler : IJoinEventHandler
{
    private readonly IEventRepository _eventRepository;
    private readonly IParticipantRepository _participantRepository;

    public JoinEventHandler(IEventRepository eventRepository, IParticipantRepository participantRepository)
    {
        _eventRepository = eventRepository;
        _participantRepository = participantRepository;
    }

    public async Task<JoinEventResult> HandleAsync(string idOrSlug, JoinEventRequest request, string? authenticatedUserId, CancellationToken ct = default)
    {
        var evt = await _eventRepository.GetRequiredByIdOrSlugAsync(idOrSlug, ct);

        if (evt.IsFinished(DateTimeOffset.UtcNow))
            throw new ConflictException("Soirée terminée. Lecture seule.");

        var userId = string.IsNullOrWhiteSpace(authenticatedUserId) ? null : authenticatedUserId;
        if (userId is not null)
        {
            var alreadyLinked = await _participantRepository.FindByEventAndUserIdAsync(evt.Id, userId, ct);
            if (alreadyLinked is not null)
            {
                return new JoinEventResult
                {
                    Participant = ParticipantResponse.FromDomain(alreadyLinked),
                    IsNew = false,
                    Message = "Déjà inscrit avec ce compte"
                };
            }
        }

        var pseudo = request.Pseudo.Trim();
        var existing = await _participantRepository.FindByEventAndPseudoAsync(evt.Id, pseudo, ct);

        if (existing is not null)
        {
            return new JoinEventResult
            {
                Participant = ParticipantResponse.FromDomain(existing),
                IsNew = false,
                Message = "Déjà inscrit avec ce pseudo"
            };
        }

        // La capacité s'évalue au moment où un nouveau participant serait créé : les requêtes
        // « réinscription » (compte déjà lié, ou pseudo réutilisé) ont déjà été renvoyées plus haut.
        if (evt.Config?.MaxParticipants is { } cap && cap > 0)
        {
            var currentCount = await _participantRepository.CountByEventIdAsync(evt.Id, ct);
            if (currentCount >= cap)
                throw new ConflictException(
                    $"La soirée est complète ({cap} participants maximum).");
        }

        var now = DateTimeOffset.UtcNow;
        var participant = new Participant
        {
            Id = string.Empty,
            EventId = evt.Id,
            Pseudo = pseudo,
            UserId = userId,
            CreatedAt = now,
            UpdatedAt = now
        };

        var created = await _participantRepository.AddAsync(participant, ct);

        return new JoinEventResult
        {
            Participant = ParticipantResponse.FromDomain(created),
            IsNew = true,
            Message = string.Empty
        };
    }

}
