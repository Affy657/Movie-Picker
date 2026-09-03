using Microsoft.Extensions.Logging;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.EventConfiguration;

public sealed partial class PatchEventConfigHandler : IPatchEventConfigHandler
{
    private readonly IEventRepository _events;
    private readonly IParticipantRepository _participants;
    private readonly IHostTokenAccessor _hostTokenAccessor;
    private readonly ICurrentUserAccessor _currentUserAccessor;
    private readonly IUserRepository _userRepository;
    private readonly IPushSubscriptionRepository _pushSubscriptions;
    private readonly IPushNotificationSender _pushSender;
    private readonly IUserNotificationRepository _notifications;
    private readonly ILogger<PatchEventConfigHandler> _logger;

    public PatchEventConfigHandler(
        IEventRepository events,
        IParticipantRepository participants,
        IHostTokenAccessor hostTokenAccessor,
        ICurrentUserAccessor currentUserAccessor,
        IUserRepository userRepository,
        IPushSubscriptionRepository pushSubscriptions,
        IPushNotificationSender pushSender,
        IUserNotificationRepository notifications,
        ILogger<PatchEventConfigHandler> logger)
    {
        _events = events;
        _participants = participants;
        _hostTokenAccessor = hostTokenAccessor;
        _currentUserAccessor = currentUserAccessor;
        _userRepository = userRepository;
        _pushSubscriptions = pushSubscriptions;
        _pushSender = pushSender;
        _notifications = notifications;
        _logger = logger;
    }

    public async Task<EventConfigResponse> HandleAsync(
        string idOrSlug,
        PatchEventConfigRequest request,
        CancellationToken ct = default)
    {
        var evt = await _events.GetRequiredByIdOrSlugAsync(idOrSlug, ct);

        var token = _hostTokenAccessor.GetHostToken();
        var userId = _currentUserAccessor.GetUserId();
        if (!EventHost.IsHost(evt, token, userId))
            throw new ForbiddenException("Réservé à l'hôte de la soirée");

        var hasConfigChange = HasConfigChange(request);
        var hasDateTimeChange = request.Date is not null || request.Time is not null;
        var hasTitleChange = request.Title is not null;

        EnsurePatchAllowed(evt, hasConfigChange, hasDateTimeChange);

        if (hasTitleChange && (evt.IsFinished(DateTimeOffset.UtcNow) || !string.IsNullOrEmpty(evt.WinnerMovieId)))
            throw new ConflictException("La soirée est terminée : le nom ne peut plus être modifié.");

        if (!hasConfigChange && !hasDateTimeChange && !hasTitleChange)
            return EventConfigResponse.FromEvent(evt);

        var current = evt.Config ?? new EventConfig();

        var theme = current.Theme;
        if (request.Theme is not null)
            theme = string.IsNullOrWhiteSpace(request.Theme) ? null : request.Theme.Trim();

        var wheelMode = request.WheelMode ?? current.WheelMode;

        var richShare = current.RichSharePreview;
        if (request.RichSharePreview.HasValue)
            richShare = request.RichSharePreview.Value;

        var allowSeries = current.AllowSeries;
        if (request.AllowSeries.HasValue)
            allowSeries = request.AllowSeries.Value;

        var nextConfig = new EventConfig
        {
            Theme = theme,
            ThemeColor = ResolveThemeColor(request, current.ThemeColor),
            MaxProposalsPerParticipant = ResolveMaxProposals(request, current.MaxProposalsPerParticipant),
            MaxParticipants = await ResolveMaxParticipantsAsync(request, current.MaxParticipants, evt, ct),
            WheelMode = wheelMode,
            RichSharePreview = richShare,
            AllowSeries = allowSeries
        };

        var date = ResolveDate(request, evt.Date);
        var time = ResolveTime(request, evt.Time);
        var title = ResolveTitle(request, evt.Title);

        var now = DateTimeOffset.UtcNow;
        var updated = evt with { Title = title, Date = date, Time = time, Config = nextConfig, UpdatedAt = now };

        var saved = await _events.UpdateAsync(updated, ct);

        var dateChanged = date != evt.Date || time != evt.Time;
        if (dateChanged && request.NotifyParticipantsOfDateChange == true)
            _ = NotifyParticipantsOnDateChangedAsync(saved, userId, CancellationToken.None);

        return EventConfigResponse.FromEvent(saved);
    }

    private async Task NotifyParticipantsOnDateChangedAsync(Event evt, string? actingUserId, CancellationToken ct)
    {
        try
        {
            var participants = await _participants.ListByEventIdAsync(evt.Id, ct);
            var userIds = participants
                .Where(p => !string.IsNullOrEmpty(p.UserId) && p.UserId != actingUserId)
                .Select(p => p.UserId!)
                .Distinct()
                .ToList();
            if (userIds.Count == 0)
                return;

            var users = await _userRepository.ListByIdsAsync(userIds, ct);
            var notifiableIds = users.Where(u => u.NotifiesOn(UserNotificationType.EventDateChanged)).Select(u => u.Id).ToHashSet();
            if (notifiableIds.Count == 0)
                return;

            var subs = await _pushSubscriptions.ListByUserIdsAsync(notifiableIds, ct);
            if (subs.Count > 0)
            {
                var message = new PushMessage(
                    Title: "Nouvelle date pour la soirée 📅",
                    Body: $"{evt.Title} a été reprogrammée.",
                    Tag: $"event-date-changed-{evt.Id}",
                    Url: $"/e/{evt.Slug}"
                );

                foreach (var sub in subs.Where(s => notifiableIds.Contains(s.UserId)))
                    await _pushSender.SendAsync(sub, message, ct);
            }

            var now = DateTimeOffset.UtcNow;
            foreach (var userId in notifiableIds)
            {
                await _notifications.AddAsync(new UserNotification
                {
                    UserId = userId,
                    Type = UserNotificationType.EventDateChanged,
                    EventId = evt.Id,
                    EventSlug = evt.Slug,
                    EventTitle = evt.Title,
                    IsRead = false,
                    CreatedAt = now
                }, ct);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Échec de la notification changement de date pour la soirée {EventId}", evt.Id);
        }
    }

    private static bool HasConfigChange(PatchEventConfigRequest request) =>
        request.Theme is not null
        || request.ThemeColor.HasValue
        || request.ClearThemeColor == true
        || request.MaxProposalsPerParticipant.HasValue
        || request.MaxParticipants.HasValue
        || request.WheelMode.HasValue
        || request.RichSharePreview.HasValue
        || request.AllowSeries.HasValue;

    private static void EnsurePatchAllowed(Event evt, bool hasConfigChange, bool hasDateTimeChange)
    {
        if (hasConfigChange)
        {
            if (evt.IsFinished(DateTimeOffset.UtcNow))
                throw new ConflictException("La soirée est terminée : la configuration ne peut plus être modifiée.");
            if (!string.IsNullOrEmpty(evt.WinnerMovieId))
                throw new ConflictException("La roue a déjà été lancée : la configuration ne peut plus être modifiée.");
        }

        if (hasDateTimeChange && (evt.IsFinished(DateTimeOffset.UtcNow) || !string.IsNullOrEmpty(evt.WinnerMovieId)))
            throw new ConflictException("La soirée est terminée : la date ne peut plus être modifiée.");
    }

    private static int? ResolveThemeColor(PatchEventConfigRequest request, int? current)
    {
        if (request.ClearThemeColor == true)
            return null;
        if (!request.ThemeColor.HasValue)
            return current;

        var hue = request.ThemeColor.Value;
        if (hue < 0 || hue > 359)
            throw new BadRequestException("themeColor doit être une teinte entre 0 et 359.");
        return hue;
    }

    private static int? ResolveMaxProposals(PatchEventConfigRequest request, int? current)
    {
        if (!request.MaxProposalsPerParticipant.HasValue)
            return current;

        var v = request.MaxProposalsPerParticipant.Value;
        if (v < 0 || v > EventConfig.MaxProposalsPerParticipantCap)
            throw new BadRequestException(
                $"maxProposalsPerParticipant doit être entre 0 (pas de limite) et {EventConfig.MaxProposalsPerParticipantCap}.");
        return v == 0 ? null : v;
    }

    private async Task<int?> ResolveMaxParticipantsAsync(
        PatchEventConfigRequest request,
        int? current,
        Event evt,
        CancellationToken ct)
    {
        if (!request.MaxParticipants.HasValue)
            return current;

        var v = request.MaxParticipants.Value;
        if (v < 0 || v > EventConfig.MaxParticipantsCap)
            throw new BadRequestException(
                $"maxParticipants doit être entre 0 (pas de limite) et {EventConfig.MaxParticipantsCap}.");

        if (v > 0)
        {
            var currentCount = await _participants.CountByEventIdAsync(evt.Id, ct);
            if (v < currentCount)
                throw new ConflictException(
                    $"La limite ({v}) est inférieure au nombre de participants déjà inscrits ({currentCount}).");
        }

        return v == 0 ? null : v;
    }

    private static string ResolveTitle(PatchEventConfigRequest request, string current)
    {
        if (request.Title is null)
            return current;
        var trimmed = request.Title.Trim();
        if (trimmed.Length == 0)
            throw new BadRequestException("Le titre de la soirée ne peut pas être vide.");
        if (trimmed.Length > 200)
            throw new BadRequestException("Le titre de la soirée ne peut pas dépasser 200 caractères.");
        return trimmed;
    }

    private static string ResolveDate(PatchEventConfigRequest request, string current)
    {
        if (request.Date is null)
            return current;
        if (!DatePatternRegex().IsMatch(request.Date)
            || !DateOnly.TryParse(request.Date, System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out _))
            throw new BadRequestException("date doit être au format YYYY-MM-DD.");
        return request.Date;
    }

    private static string ResolveTime(PatchEventConfigRequest request, string current)
    {
        if (request.Time is null)
            return current;
        if (!TimePatternRegex().IsMatch(request.Time)
            || !TimeOnly.TryParse(request.Time, System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out _))
            throw new BadRequestException("time doit être au format HH:mm.");
        return request.Time;
    }

    [System.Text.RegularExpressions.GeneratedRegex(@"^\d{4}-\d{2}-\d{2}$")]
    private static partial System.Text.RegularExpressions.Regex DatePatternRegex();

    [System.Text.RegularExpressions.GeneratedRegex(@"^\d{2}:\d{2}$")]
    private static partial System.Text.RegularExpressions.Regex TimePatternRegex();
}
