using Microsoft.Extensions.Logging;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using MoviePicker.Api.Domain.Services;

namespace MoviePicker.Api.Application.UseCases.CreateEvent;

public sealed class CreateEventHandler : ICreateEventHandler
{
    private readonly IEventRepository _eventRepository;
    private readonly IUserRepository _userRepository;
    private readonly IParticipantRepository _participantRepository;
    private readonly ILogger<CreateEventHandler> _logger;

    public CreateEventHandler(
        IEventRepository eventRepository,
        IUserRepository userRepository,
        IParticipantRepository participantRepository,
        ILogger<CreateEventHandler> logger)
    {
        _eventRepository = eventRepository;
        _userRepository = userRepository;
        _participantRepository = participantRepository;
        _logger = logger;
    }

    public async Task<CreateEventResponse> HandleAsync(CreateEventRequest request, string? creatorUserId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(creatorUserId))
            throw new UnauthorizedException("La création d’une soirée nécessite un compte connecté.");

        var slug = SlugGenerator.NewSlug();
        var hostToken = SlugGenerator.NewHostToken();
        var now = DateTimeOffset.UtcNow;
        var ownerId = creatorUserId.Trim();

        var evt = new Event
        {
            Id = string.Empty,
            Title = request.Title.Trim(),
            Date = request.Date,
            Time = request.Time,
            HostToken = hostToken,
            Slug = slug,
            CreatorUserId = ownerId,
            Config = null,
            ClosedAt = null,
            WinnerMovieId = null,
            CreatedAt = now,
            UpdatedAt = now
        };

        var created = await _eventRepository.AddAsync(evt, ct);
        _logger.LogInformation("Event created: {EventId} by user {UserId}", created.Id, ownerId);

        var user = await _userRepository.GetByIdAsync(ownerId, ct)
            ?? throw new NotFoundException("Utilisateur introuvable");
        var pseudo = string.IsNullOrWhiteSpace(user.DisplayName)
            ? user.Email.Split('@')[0]
            : user.DisplayName.Trim();
        if (string.IsNullOrEmpty(pseudo))
            pseudo = "Participant";

        var participant = new Participant
        {
            Id = string.Empty,
            EventId = created.Id,
            Pseudo = pseudo,
            UserId = ownerId,
            CreatedAt = now,
            UpdatedAt = now
        };
        var createdParticipant = await _participantRepository.AddAsync(participant, ct);

        return new CreateEventResponse
        {
            Id = created.Id,
            Title = created.Title,
            Date = created.Date,
            Time = created.Time,
            Slug = created.Slug,
            ShareUrl = $"/s/{created.Slug}",
            CreatedAt = created.CreatedAt,
            UpdatedAt = created.UpdatedAt,
            CreatorParticipant = ParticipantResponse.FromDomain(createdParticipant)
        };
    }
}
