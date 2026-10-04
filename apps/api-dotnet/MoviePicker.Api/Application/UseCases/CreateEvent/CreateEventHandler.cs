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
    private readonly IUnitOfWork _unitOfWork;
    private readonly ILogger<CreateEventHandler> _logger;
    private readonly TimeProvider _clock;

    public CreateEventHandler(
        IEventRepository eventRepository,
        IUserRepository userRepository,
        IParticipantRepository participantRepository,
        IUnitOfWork unitOfWork,
        ILogger<CreateEventHandler> logger,
        TimeProvider clock)
    {
        _eventRepository = eventRepository;
        _userRepository = userRepository;
        _participantRepository = participantRepository;
        _unitOfWork = unitOfWork;
        _logger = logger;
        _clock = clock;
    }

    public async Task<CreateEventResponse> HandleAsync(CreateEventRequest request, string? creatorUserId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(creatorUserId))
            throw Errors.AccountRequired();

        if (!DateOnly.TryParse(request.Date, System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out _))
            throw Errors.InvalidDateFormat();
        if (!TimeOnly.TryParse(request.Time, System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out _))
            throw Errors.InvalidTimeFormat();

        var ownerId = creatorUserId.Trim();
        var requestId = string.IsNullOrWhiteSpace(request.ClientRequestId) ? null : request.ClientRequestId.Trim();
        if (requestId is not null && await FindReplayAsync(ownerId, requestId, ct) is { } replayed)
            return replayed;

        var slug = SlugGenerator.NewSlug();
        var hostToken = SlugGenerator.NewHostToken();
        var now = _clock.GetUtcNow();

        var evt = new Event
        {
            Id = string.Empty,
            Title = request.Title.Trim(),
            Date = request.Date,
            Time = request.Time,
            HostToken = hostToken,
            Slug = slug,
            CreatorUserId = ownerId,
            CreationRequestId = requestId,
            Config = new EventConfig
            {
                RichSharePreview = true
            },
            ClosedAt = null,
            CreatedAt = now,
            UpdatedAt = now
        };

        var user = await _userRepository.GetByIdAsync(ownerId, ct)
            ?? throw Errors.UserNotFound();
        var pseudo = string.IsNullOrWhiteSpace(user.DisplayName)
            ? user.Email.Split('@')[0]
            : user.DisplayName.Trim();
        if (string.IsNullOrEmpty(pseudo))
            pseudo = "Participant";

        Event created = null!;
        Participant createdParticipant = null!;

        try
        {
            await _unitOfWork.ExecuteAsync(
                async token =>
                {
                    created = await _eventRepository.AddAsync(evt, token);
                    createdParticipant = await _participantRepository.AddAsync(
                        new Participant
                        {
                            Id = string.Empty,
                            EventId = created.Id,
                            Pseudo = pseudo,
                            UserId = ownerId,
                            CreatedAt = now,
                            UpdatedAt = now
                        },
                        token);
                },
                ct);
        }
        catch (EventCreationReplayedException) when (requestId is not null)
        {
            return await FindReplayAsync(ownerId, requestId, ct) ?? throw Errors.ConcurrentUpdate();
        }

        _logger.LogInformation("Event created: {EventId} by user {UserId}", created.Id, ownerId);

        return ToResponse(created, createdParticipant);
    }

    private async Task<CreateEventResponse?> FindReplayAsync(string ownerId, string requestId, CancellationToken ct)
    {
        var existing = await _eventRepository.FindByCreationRequestAsync(ownerId, requestId, ct);
        if (existing is null)
            return null;

        var creator = await _participantRepository.FindByEventAndUserIdAsync(existing.Id, ownerId, ct);
        return creator is null ? null : ToResponse(existing, creator);
    }

    private static CreateEventResponse ToResponse(Event created, Participant creator) => new()
    {
        Id = created.Id,
        Title = created.Title,
        Date = created.Date,
        Time = created.Time,
        Slug = created.Slug,
        ShareUrl = $"/e/{created.Slug}",
        CreatedAt = created.CreatedAt,
        UpdatedAt = created.UpdatedAt,
        CreatorParticipant = ParticipantResponse.FromDomain(creator)
    };
}
