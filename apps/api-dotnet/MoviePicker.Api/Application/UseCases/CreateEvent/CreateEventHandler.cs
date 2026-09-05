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

    public CreateEventHandler(
        IEventRepository eventRepository,
        IUserRepository userRepository,
        IParticipantRepository participantRepository,
        IUnitOfWork unitOfWork,
        ILogger<CreateEventHandler> logger)
    {
        _eventRepository = eventRepository;
        _userRepository = userRepository;
        _participantRepository = participantRepository;
        _unitOfWork = unitOfWork;
        _logger = logger;
    }

    public async Task<CreateEventResponse> HandleAsync(CreateEventRequest request, string? creatorUserId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(creatorUserId))
            throw new UnauthorizedException("La création d’une soirée nécessite un compte connecté.");

        if (!DateOnly.TryParse(request.Date, System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out _))
            throw new BadRequestException("date doit être au format YYYY-MM-DD.");
        if (!TimeOnly.TryParse(request.Time, System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out _))
            throw new BadRequestException("time doit être au format HH:mm.");

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
            Config = new EventConfig
            {
                RichSharePreview = true
            },
            ClosedAt = null,
            WinnerMovieId = null,
            CreatedAt = now,
            UpdatedAt = now
        };

        var user = await _userRepository.GetByIdAsync(ownerId, ct)
            ?? throw new NotFoundException("Utilisateur introuvable");
        var pseudo = string.IsNullOrWhiteSpace(user.DisplayName)
            ? user.Email.Split('@')[0]
            : user.DisplayName.Trim();
        if (string.IsNullOrEmpty(pseudo))
            pseudo = "Participant";

        Event created = null!;
        Participant createdParticipant = null!;

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

        _logger.LogInformation("Event created: {EventId} by user {UserId}", created.Id, ownerId);

        return new CreateEventResponse
        {
            Id = created.Id,
            Title = created.Title,
            Date = created.Date,
            Time = created.Time,
            Slug = created.Slug,
            ShareUrl = $"/e/{created.Slug}",
            CreatedAt = created.CreatedAt,
            UpdatedAt = created.UpdatedAt,
            CreatorParticipant = ParticipantResponse.FromDomain(createdParticipant)
        };
    }
}
