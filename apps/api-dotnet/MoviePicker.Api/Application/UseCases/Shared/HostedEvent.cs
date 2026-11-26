using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.Shared;

internal static class HostedEvent
{
    public static bool IsHost(Event evt, string? userId) => EventHost.IsHost(evt, userId);

    public static bool IsCreator(Event evt, string? userId) => EventHost.IsCreator(evt, userId);

    public static Task<Event> LoadForHostAsync(
        IEventRepository events,
        string? userId,
        string slug,
        DateTimeOffset utcNow,
        CancellationToken ct) =>
        LoadAsync(events, userId, slug, utcNow, ct);

    public static Task<Event> LoadForHostEvenFinishedAsync(
        IEventRepository events,
        string? userId,
        string slug,
        CancellationToken ct) =>
        LoadAsync(events, userId, slug, refuseFinishedAt: null, ct);

    private static async Task<Event> LoadAsync(
        IEventRepository events,
        string? userId,
        string slug,
        DateTimeOffset? refuseFinishedAt,
        CancellationToken ct)
    {
        var evt = await events.GetRequiredBySlugAsync(slug, ct);

        if (!IsHost(evt, userId))
            throw Errors.HostOnly();

        if (refuseFinishedAt is { } now && evt.IsFinished(now))
            throw Errors.EventFinished();

        return evt;
    }
}
