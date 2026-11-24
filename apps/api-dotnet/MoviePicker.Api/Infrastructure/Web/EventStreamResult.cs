using System.Diagnostics;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.Mvc;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.EventLive;

namespace MoviePicker.Api.Infrastructure.Web;

public sealed class EventStreamResult : IActionResult
{
    public const string ContentType = "text/event-stream";

    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    private readonly EventStreamAccess _access;
    private readonly IEventLiveFeed _feed;
    private readonly EventLiveOptions _options;
    private readonly IEventStreamLease _lease;

    public EventStreamResult(EventStreamAccess access, IEventLiveFeed feed, EventLiveOptions options, IEventStreamLease lease)
    {
        _access = access;
        _feed = feed;
        _options = options;
        _lease = lease;
    }

    public async Task ExecuteResultAsync(ActionContext context)
    {
        var http = context.HttpContext;
        var ct = http.RequestAborted;
        var logger = http.RequestServices.GetRequiredService<ILogger<EventStreamResult>>();
        try
        {
            await StreamAsync(http, logger, ct);
        }
        catch (Exception ex) when (ct.IsCancellationRequested)
        {
            logger.LogDebug(ex, "Event stream of {EventId} closed by the client.", _access.EventId);
        }
        finally
        {
            _lease.Dispose();
        }
    }

    private async Task StreamAsync(HttpContext http, ILogger logger, CancellationToken ct)
    {
        var response = http.Response;
        response.StatusCode = StatusCodes.Status200OK;
        response.ContentType = ContentType;
        response.Headers.CacheControl = "no-cache, no-transform";
        response.Headers["X-Accel-Buffering"] = "no";
        http.Features.Get<IHttpResponseBodyFeature>()?.DisableBuffering();

        var presence = _access.ParticipantId is null
            ? null
            : new PresenceKeeper(
                http.RequestServices.GetRequiredService<IEventPresenceRepository>(),
                http.RequestServices.GetRequiredService<TimeProvider>(),
                logger,
                _access,
                _options.PresenceTtl);

        using var subscription = _feed.Subscribe(_access.EventId, _access.Slug);
        await TouchAsync(presence, ct);
        await WriteAsync(response, $"retry: {(long)_options.ReconnectDelay.TotalMilliseconds}\n\n", ct);
        await WriteEventAsync(response, "ready", new { }, ct);
        await PumpAsync(response, subscription, presence, ct);
    }

    private async Task PumpAsync(
        HttpResponse response,
        EventLiveSubscription subscription,
        PresenceKeeper? presence,
        CancellationToken ct)
    {
        var elapsed = Stopwatch.StartNew();
        var nextPing = _options.KeepAliveInterval;
        var nextTouch = _options.PresenceRefresh;

        while (elapsed.Elapsed < _options.StreamLifetime && !_lease.IsReplaced)
        {
            if (presence is not null && elapsed.Elapsed >= nextTouch)
            {
                await TouchAsync(presence, ct);
                nextTouch = elapsed.Elapsed + _options.PresenceRefresh;
            }

            if (elapsed.Elapsed >= nextPing)
            {
                await WriteEventAsync(response, "ping", new { }, ct);
                nextPing = elapsed.Elapsed + _options.KeepAliveInterval;
            }

            var deadline = Min(_options.StreamLifetime, nextPing, presence is null ? nextPing : nextTouch);
            var wait = deadline - elapsed.Elapsed;
            if (wait > TimeSpan.Zero && !await WaitForSignalAsync(subscription, wait, ct))
                return;

            while (subscription.Signals.TryRead(out var signal))
                await WriteSignalAsync(response, signal, ct);
        }
    }

    private static async Task<bool> WaitForSignalAsync(EventLiveSubscription subscription, TimeSpan wait, CancellationToken ct)
    {
        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(ct);
        timeout.CancelAfter(wait);
        try
        {
            return await subscription.Signals.WaitToReadAsync(timeout.Token);
        }
        catch (OperationCanceledException) when (!ct.IsCancellationRequested)
        {
            return true;
        }
    }

    private static Task TouchAsync(PresenceKeeper? presence, CancellationToken ct) =>
        presence?.RefreshAsync(ct) ?? Task.CompletedTask;

    private static Task WriteSignalAsync(HttpResponse response, IEventLiveSignal signal, CancellationToken ct) =>
        signal switch
        {
            EventChangedSignal changed => WriteEventAsync(response, "changed", new { stamp = changed.Stamp }, ct),
            EventPresenceSignal presence => WriteEventAsync(
                response,
                "presence",
                new
                {
                    participants = presence.Participants
                        .Select(p => new { participantId = p.ParticipantId, proposing = p.Proposing })
                },
                ct),
            _ => Task.CompletedTask
        };

    private static Task WriteEventAsync(HttpResponse response, string name, object payload, CancellationToken ct) =>
        WriteAsync(response, $"event: {name}\ndata: {JsonSerializer.Serialize(payload, Json)}\n\n", ct);

    private static async Task WriteAsync(HttpResponse response, string text, CancellationToken ct)
    {
        await response.Body.WriteAsync(Encoding.UTF8.GetBytes(text), ct);
        await response.Body.FlushAsync(ct);
    }

    private static TimeSpan Min(TimeSpan a, TimeSpan b, TimeSpan c) =>
        TimeSpan.FromTicks(Math.Min(a.Ticks, Math.Min(b.Ticks, c.Ticks)));

    private sealed class PresenceKeeper(
        IEventPresenceRepository repository,
        TimeProvider clock,
        ILogger logger,
        EventStreamAccess access,
        TimeSpan ttl)
    {
        public async Task RefreshAsync(CancellationToken ct)
        {
            try
            {
                await repository.TouchAsync(access.EventId, access.ParticipantId!, clock.GetUtcNow() + ttl, ct);
            }
            catch (Exception ex) when (!ct.IsCancellationRequested)
            {
                logger.LogWarning(ex, "Presence of {ParticipantId} not refreshed on event {EventId}.", access.ParticipantId, access.EventId);
            }
        }
    }
}
