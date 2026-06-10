using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.EventConfiguration;

public sealed class PatchEventConfigHandler : IPatchEventConfigHandler
{
    private readonly IEventRepository _events;
    private readonly IParticipantRepository _participants;
    private readonly IHostTokenAccessor _hostTokenAccessor;
    private readonly ICurrentUserAccessor _currentUserAccessor;

    public PatchEventConfigHandler(
        IEventRepository events,
        IParticipantRepository participants,
        IHostTokenAccessor hostTokenAccessor,
        ICurrentUserAccessor currentUserAccessor)
    {
        _events = events;
        _participants = participants;
        _hostTokenAccessor = hostTokenAccessor;
        _currentUserAccessor = currentUserAccessor;
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

        EnsurePatchAllowed(evt, hasConfigChange, hasDateTimeChange);

        if (!hasConfigChange && !hasDateTimeChange)
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
            EndDate = ResolveEndDate(request, current.EndDate),
            MaxProposalsPerParticipant = ResolveMaxProposals(request, current.MaxProposalsPerParticipant),
            MaxParticipants = await ResolveMaxParticipantsAsync(request, current.MaxParticipants, evt, ct),
            WheelMode = wheelMode,
            RichSharePreview = richShare,
            AllowSeries = allowSeries
        };

        var date = ResolveDate(request, evt.Date);
        var time = ResolveTime(request, evt.Time);

        var now = DateTimeOffset.UtcNow;
        var updated = evt with { Date = date, Time = time, Config = nextConfig, UpdatedAt = now };

        var saved = await _events.UpdateAsync(updated, ct);
        return EventConfigResponse.FromEvent(saved);
    }

    private static bool HasConfigChange(PatchEventConfigRequest request) =>
        request.Theme is not null
        || request.ThemeColor.HasValue
        || request.ClearThemeColor == true
        || request.EndDate is not null
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

        if (hasDateTimeChange && (evt.ClosedAt.HasValue || !string.IsNullOrEmpty(evt.WinnerMovieId)))
            throw new ConflictException("La soirée est définitivement clôturée : la date ne peut plus être modifiée.");
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

    private static DateTimeOffset? ResolveEndDate(PatchEventConfigRequest request, DateTimeOffset? current)
    {
        if (request.EndDate is null)
            return current;
        if (request.EndDate.Length == 0)
            return null;
        if (!DateTimeOffset.TryParse(request.EndDate, System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.RoundtripKind, out var parsed))
            throw new BadRequestException("endDate doit être une date ISO 8601 valide ou une chaîne vide pour effacer.");
        return parsed.ToUniversalTime();
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

    private static string ResolveDate(PatchEventConfigRequest request, string current)
    {
        if (request.Date is null)
            return current;
        if (!System.Text.RegularExpressions.Regex.IsMatch(request.Date, @"^\d{4}-\d{2}-\d{2}$")
            || !DateOnly.TryParse(request.Date, System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out _))
            throw new BadRequestException("date doit être au format YYYY-MM-DD.");
        return request.Date;
    }

    private static string ResolveTime(PatchEventConfigRequest request, string current)
    {
        if (request.Time is null)
            return current;
        if (!System.Text.RegularExpressions.Regex.IsMatch(request.Time, @"^\d{2}:\d{2}$")
            || !TimeOnly.TryParse(request.Time, System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out _))
            throw new BadRequestException("time doit être au format HH:mm.");
        return request.Time;
    }
}
