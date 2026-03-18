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

    public async Task<JoinEventResult> HandleAsync(string idOrSlug, JoinEventRequest request, CancellationToken ct = default)
    {
        var evt = await _eventRepository.GetByIdOrSlugAsync(idOrSlug, ct)
            ?? throw new NotFoundException("Soirée introuvable");

        if (evt.IsFinished(DateTimeOffset.UtcNow))
            throw new BadRequestException("Soirée terminée. Lecture seule.");

        var pseudo = request.Pseudo.Trim();
        var existing = await _participantRepository.FindByEventAndPseudoAsync(evt.Id, pseudo, ct);

        if (existing is not null)
        {
            return new JoinEventResult
            {
                Participant = Map(existing),
                IsNew = false,
                Message = "Déjà inscrit avec ce pseudo"
            };
        }

        var now = DateTimeOffset.UtcNow;
        var participant = new Participant
        {
            Id = string.Empty,
            EventId = evt.Id,
            Pseudo = pseudo,
            CreatedAt = now,
            UpdatedAt = now
        };

        var created = await _participantRepository.AddAsync(participant, ct);

        return new JoinEventResult
        {
            Participant = Map(created),
            IsNew = true,
            Message = string.Empty
        };
    }

    private static ParticipantResponse Map(Participant p) => new()
    {
        Id = p.Id,
        EventId = p.EventId,
        Pseudo = p.Pseudo,
        CreatedAt = p.CreatedAt,
        UpdatedAt = p.UpdatedAt
    };
}
