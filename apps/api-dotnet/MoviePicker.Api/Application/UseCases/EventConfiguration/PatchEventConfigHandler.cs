using System.Globalization;
using Microsoft.Extensions.Logging;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Shared;
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
    private readonly TimeProvider _clock;

    public PatchEventConfigHandler(
        IEventRepository events,
        IParticipantRepository participants,
        IHostTokenAccessor hostTokenAccessor,
        ICurrentUserAccessor currentUserAccessor,
        IUserRepository userRepository,
        IPushSubscriptionRepository pushSubscriptions,
        IPushNotificationSender pushSender,
        IUserNotificationRepository notifications,
        ILogger<PatchEventConfigHandler> logger,
        TimeProvider clock)
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
        _clock = clock;
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
            throw Errors.HostOnly();

        var hasConfigChange = HasConfigChange(request);
        var hasDateTimeChange = request.Date is not null || request.Time is not null;
        var hasTitleChange = request.Title is not null;
        var hasRecurrenceChange = request.Recurrence.HasValue || request.ClearRecurrence == true;
        var hasWinnerCountChange = request.WinnerCount.HasValue;

        var now = _clock.GetUtcNow();
        EnsurePatchAllowed(evt, now, hasConfigChange, hasDateTimeChange, hasTitleChange, hasRecurrenceChange);

        if (hasWinnerCountChange)
            EnsureWinnerCountAllowed(evt, now, request.WinnerCount!.Value);

        if (!hasConfigChange && !hasDateTimeChange && !hasTitleChange && !hasRecurrenceChange
            && !hasWinnerCountChange)
            return EventConfigResponse.FromEvent(evt);

        var current = evt.Config ?? EventConfig.SavedWithoutSettings;

        var nextConfig = new EventConfig
        {
            Theme = ResolveTheme(request, current.Theme),
            ThemeColor = ResolveThemeColor(request, current.ThemeColor),
            MaxProposalsPerParticipant = ResolveMaxProposals(request, current.MaxProposalsPerParticipant),
            MaxParticipants = await ResolveMaxParticipantsAsync(request, current.MaxParticipants, evt, ct),
            MaxVotesPerParticipant = ResolveMaxVotes(request, current.MaxVotesPerParticipant),
            WheelMode = request.WheelMode ?? current.WheelMode,
            RichSharePreview = request.RichSharePreview ?? current.RichSharePreview,
            AllowSeries = request.AllowSeries ?? current.AllowSeries,
            WinnerCount = request.WinnerCount ?? current.WinnerCount
        };

        var date = ResolveDate(request, evt.Date);
        var time = ResolveTime(request, evt.Time);
        var title = ResolveTitle(request, evt.Title);
        var recurrence = ResolveRecurrence(request, evt.Recurrence);

        var updated = evt with
        {
            Title = title,
            Date = date,
            Time = time,
            Config = nextConfig,
            Recurrence = recurrence,
            RecurrenceAnchorDay = ResolveRecurrenceAnchorDay(evt, recurrence, date),
            UpdatedAt = now
        };

        var saved = await _events.UpdateAsync(updated, ct);

        var dateChanged = date != evt.Date || time != evt.Time;
        if (dateChanged && request.NotifyParticipantsOfDateChange == true)
            await NotifyParticipantsOnDateChangedAsync(saved, userId, CancellationToken.None);

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

                await PushFanOut.SendToAllAsync(
                    _pushSender,
                    subs.Where(s => notifiableIds.Contains(s.UserId)),
                    message,
                    ct);
            }

            var now = _clock.GetUtcNow();
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
            _logger.LogWarning(ex, "Date change notification failed for movie night {EventId}", evt.Id);
        }
    }

    private static bool HasConfigChange(PatchEventConfigRequest request) =>
        request.Theme is not null
        || request.ThemeColor.HasValue
        || request.ClearThemeColor == true
        || request.MaxProposalsPerParticipant.HasValue
        || request.MaxParticipants.HasValue
        || request.MaxVotesPerParticipant.HasValue
        || request.WheelMode.HasValue
        || request.RichSharePreview.HasValue
        || request.AllowSeries.HasValue;

    private static RecurrenceFrequency? ResolveRecurrence(PatchEventConfigRequest request, RecurrenceFrequency? current)
    {
        if (request.ClearRecurrence == true)
            return null;
        return request.Recurrence ?? current;
    }

    private static int? ResolveRecurrenceAnchorDay(Event evt, RecurrenceFrequency? recurrence, string date)
    {
        if (recurrence is null)
            return null;

        if (evt.RecurrenceAnchorDay is { } anchor && recurrence == evt.Recurrence && date == evt.Date)
            return anchor;

        return DateOnly.TryParse(date, CultureInfo.InvariantCulture, DateTimeStyles.None, out var day)
            ? day.Day
            : evt.RecurrenceAnchorDay;
    }

    private static void EnsurePatchAllowed(
        Event evt,
        DateTimeOffset utcNow,
        bool hasConfigChange,
        bool hasDateTimeChange,
        bool hasTitleChange,
        bool hasRecurrenceChange)
    {
        if (hasConfigChange)
        {
            if (evt.IsFinished(utcNow))
                throw Errors.EventConfigLockedFinished();
            if (evt.HasWinner)
                throw Errors.EventConfigLockedWheel();
        }

        if (hasDateTimeChange && (evt.IsFinished(utcNow) || evt.HasWinner))
            throw Errors.EventDateLockedFinished();

        if (hasTitleChange && (evt.IsFinished(utcNow) || evt.HasWinner))
            throw Errors.EventTitleLockedFinished();

        if (hasRecurrenceChange && !string.IsNullOrEmpty(evt.NextOccurrenceEventId))
            throw Errors.RecurrenceNextOccurrenceExists();
    }

    private static string? ResolveTheme(PatchEventConfigRequest request, string? current) =>
        request.Theme is null ? current : EventConfigLimits.NormalizeTheme(request.Theme);

    private static void EnsureWinnerCountAllowed(Event evt, DateTimeOffset utcNow, int winnerCount)
    {
        EventConfigLimits.ResolveWinnerCount(winnerCount);

        if (evt.IsFinished(utcNow))
            throw Errors.WinnerCountLockedFinished();

        if (winnerCount < evt.Winners.Count)
            throw Errors.WinnerCountBelowDrawn(evt.Winners.Count);
    }

    private static int? ResolveThemeColor(PatchEventConfigRequest request, int? current)
    {
        if (request.ClearThemeColor == true)
            return null;
        if (!request.ThemeColor.HasValue)
            return current;

        var hue = request.ThemeColor.Value;
        if (hue < 0 || hue > 359)
            throw Errors.ThemeColorOutOfRange();
        return hue;
    }

    private static int? ResolveMaxProposals(PatchEventConfigRequest request, int? current) =>
        request.MaxProposalsPerParticipant.HasValue
            ? EventConfigLimits.ResolveLimit(
                request.MaxProposalsPerParticipant.Value,
                EventConfig.MaxProposalsPerParticipantCap,
                "maxProposalsPerParticipant")
            : current;

    private static int? ResolveMaxVotes(PatchEventConfigRequest request, int? current) =>
        request.MaxVotesPerParticipant.HasValue
            ? EventConfigLimits.ResolveLimit(request.MaxVotesPerParticipant.Value, null, "maxVotesPerParticipant")
            : current;

    private async Task<int?> ResolveMaxParticipantsAsync(
        PatchEventConfigRequest request,
        int? current,
        Event evt,
        CancellationToken ct)
    {
        if (!request.MaxParticipants.HasValue)
            return current;

        var limit = EventConfigLimits.ResolveLimit(
            request.MaxParticipants.Value,
            EventConfig.MaxParticipantsCap,
            "maxParticipants");

        if (limit.HasValue)
        {
            var currentCount = await _participants.CountByEventIdAsync(evt.Id, ct);
            if (limit.Value < currentCount)
                throw Errors.ParticipantLimitBelowCurrent(limit.Value, currentCount);
        }

        return limit;
    }

    private static string ResolveTitle(PatchEventConfigRequest request, string current)
    {
        if (request.Title is null)
            return current;
        var trimmed = request.Title.Trim();
        if (trimmed.Length == 0)
            throw Errors.EventTitleRequired();
        if (trimmed.Length > 200)
            throw Errors.EventTitleTooLong(200);
        return trimmed;
    }

    private static string ResolveDate(PatchEventConfigRequest request, string current)
    {
        if (request.Date is null)
            return current;
        if (!DatePatternRegex().IsMatch(request.Date)
            || !DateOnly.TryParse(request.Date, System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out _))
            throw Errors.InvalidDateFormat();
        return request.Date;
    }

    private static string ResolveTime(PatchEventConfigRequest request, string current)
    {
        if (request.Time is null)
            return current;
        if (!TimePatternRegex().IsMatch(request.Time)
            || !TimeOnly.TryParse(request.Time, System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out _))
            throw Errors.InvalidTimeFormat();
        return request.Time;
    }

    [System.Text.RegularExpressions.GeneratedRegex(@"^\d{4}-\d{2}-\d{2}$")]
    private static partial System.Text.RegularExpressions.Regex DatePatternRegex();

    [System.Text.RegularExpressions.GeneratedRegex(@"^\d{2}:\d{2}$")]
    private static partial System.Text.RegularExpressions.Regex TimePatternRegex();
}
