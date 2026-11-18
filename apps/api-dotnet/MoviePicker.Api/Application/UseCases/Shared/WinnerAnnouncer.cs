using System.Globalization;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.UseCases.Shared;

public sealed class WinnerAnnouncer : IWinnerAnnouncer
{
    private static readonly CultureInfo FrCulture = new("fr-FR");

    private readonly EventAudienceNotifier _audience;
    private readonly TimeProvider _clock;

    public WinnerAnnouncer(EventAudienceNotifier audience, TimeProvider clock)
    {
        _audience = audience;
        _clock = clock;
    }

    public Task AnnounceAsync(Event evt, string winnerTitle, WinnerPickMethod method, CancellationToken ct = default)
    {
        var message = new EventAudienceMessage(
            evt.Id,
            new UserNotification
            {
                Type = method == WinnerPickMethod.Manual
                    ? UserNotificationType.MoviePickedManually
                    : UserNotificationType.MoviePicked,
                EventId = evt.Id,
                EventSlug = evt.Slug,
                EventTitle = evt.Title,
                MovieTitle = winnerTitle
            },
            new PushMessage(
                Title: method == WinnerPickMethod.Manual ? ServerCopy.Push.WinnerPickedByHostTitle : ServerCopy.Push.WinnerDrawnTitle,
                Body: PushBody(evt, winnerTitle),
                Tag: $"wheel-{evt.Id}",
                Url: FrontRoutes.EventDetail(evt.Slug)));

        return _audience.NotifyParticipantsAsync(message, ct: ct);
    }

    private string PushBody(Event evt, string winnerTitle)
    {
        var programme = ServerCopy.Push.WinnerProgramme(winnerTitle, evt.Title);
        if (!DateOnly.TryParse(evt.Date, CultureInfo.InvariantCulture, DateTimeStyles.None, out var night))
            return programme;

        if (night == EventRecurrence.TodayInParis(_clock.GetUtcNow()))
            return ServerCopy.Push.WinnerProgrammeOn(ServerCopy.Push.Tonight, programme);

        var day = night.ToString("dddd d MMMM", FrCulture);
        return ServerCopy.Push.WinnerProgrammeOn($"{char.ToUpper(day[0], FrCulture)}{day[1..]}", programme);
    }
}
