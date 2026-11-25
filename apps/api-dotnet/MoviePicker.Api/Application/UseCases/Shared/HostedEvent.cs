using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.Shared;

internal static class HostedEvent
{
    public static bool IsHost(Event evt, IHostTokenAccessor hostTokens, string? userId) =>
        EventHost.IsHost(evt, hostTokens.GetHostToken(), userId);

    public static bool IsCreator(Event evt, IHostTokenAccessor hostTokens, string? userId) =>
        EventHost.IsCreator(evt, hostTokens.GetHostToken(), userId);

    public static bool IsHostAccount(Event evt, string? userId) =>
        EventHost.IsHost(evt, hostToken: null, userId);

    public static Task<Event> LoadForHostAsync(
        IEventRepository events,
        IHostTokenAccessor hostTokens,
        string? userId,
        string idOrSlug,
        DateTimeOffset utcNow,
        CancellationToken ct) =>
        LoadAsync(events, hostTokens, userId, idOrSlug, utcNow, ct);

    public static Task<Event> LoadForHostEvenFinishedAsync(
        IEventRepository events,
        IHostTokenAccessor hostTokens,
        string? userId,
        string idOrSlug,
        CancellationToken ct) =>
        LoadAsync(events, hostTokens, userId, idOrSlug, refuseFinishedAt: null, ct);

    private static async Task<Event> LoadAsync(
        IEventRepository events,
        IHostTokenAccessor hostTokens,
        string? userId,
        string idOrSlug,
        DateTimeOffset? refuseFinishedAt,
        CancellationToken ct)
    {
        var evt = await events.GetRequiredByIdOrSlugAsync(idOrSlug, ct);

        if (!IsHost(evt, hostTokens, userId))
            throw Errors.HostOnly();

        if (refuseFinishedAt is { } now && evt.IsFinished(now))
            throw Errors.EventFinished();

        return evt;
    }
}
