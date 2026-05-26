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

        if (evt.IsFinished(DateTimeOffset.UtcNow))
            throw new ConflictException("La soirée est terminée : la configuration ne peut plus être modifiée.");

        if (!string.IsNullOrEmpty(evt.WinnerMovieId))
            throw new ConflictException("La roue a déjà été lancée : la configuration ne peut plus être modifiée.");

        var hasChange =
            request.Theme is not null
            || request.ThemeColor.HasValue
            || request.ClearThemeColor
            || request.EndDate is not null
            || request.MaxProposalsPerParticipant.HasValue
            || request.MaxParticipants.HasValue
            || request.WheelMode.HasValue
            || request.RichSharePreview.HasValue
            || request.AllowSeries.HasValue;

        if (!hasChange)
            return EventConfigResponse.FromEvent(evt);

        var current = evt.Config ?? new EventConfig();

        var theme = current.Theme;
        if (request.Theme is not null)
            theme = string.IsNullOrWhiteSpace(request.Theme) ? null : request.Theme.Trim();

        int? themeColor = current.ThemeColor;
        if (request.ClearThemeColor)
            themeColor = null;
        else if (request.ThemeColor.HasValue)
        {
            var hue = request.ThemeColor.Value;
            if (hue < 0 || hue > 359)
                throw new BadRequestException("themeColor doit être une teinte entre 0 et 359.");
            themeColor = hue;
        }

        DateTimeOffset? endDate = current.EndDate;
        if (request.EndDate is not null)
        {
            if (request.EndDate.Length == 0)
                endDate = null;
            else if (!DateTimeOffset.TryParse(request.EndDate, null, System.Globalization.DateTimeStyles.RoundtripKind, out var parsed))
                throw new BadRequestException("endDate doit être une date ISO 8601 valide ou une chaîne vide pour effacer.");
            else
                endDate = parsed.ToUniversalTime();
        }

        int? maxProp = current.MaxProposalsPerParticipant;
        if (request.MaxProposalsPerParticipant.HasValue)
        {
            var v = request.MaxProposalsPerParticipant.Value;
            if (v < 0 || v > EventConfig.MaxProposalsPerParticipantCap)
                throw new BadRequestException(
                    $"maxProposalsPerParticipant doit être entre 0 (pas de limite) et {EventConfig.MaxProposalsPerParticipantCap}.");
            maxProp = v == 0 ? null : v;
        }

        int? maxParticipants = current.MaxParticipants;
        if (request.MaxParticipants.HasValue)
        {
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

            maxParticipants = v == 0 ? null : v;
        }

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
            ThemeColor = themeColor,
            EndDate = endDate,
            MaxProposalsPerParticipant = maxProp,
            MaxParticipants = maxParticipants,
            WheelMode = wheelMode,
            RichSharePreview = richShare,
            AllowSeries = allowSeries
        };

        var now = DateTimeOffset.UtcNow;
        var updated = evt with { Config = nextConfig, UpdatedAt = now };

        var saved = await _events.UpdateAsync(updated, ct);
        return EventConfigResponse.FromEvent(saved);
    }
}
