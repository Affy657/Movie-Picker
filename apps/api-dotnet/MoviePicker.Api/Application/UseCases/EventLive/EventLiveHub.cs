using System.Threading.Channels;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.UseCases.EventLive;

public sealed class EventLiveHub : IEventLiveFeed
{
    private const string GoneStamp = "gone";
    private const int SubscriberBacklog = 32;

    private readonly IServiceScopeFactory _scopes;
    private readonly TimeProvider _clock;
    private readonly EventLiveOptions _options;
    private readonly ILogger<EventLiveHub> _logger;
    private readonly Lock _gate = new();
    private readonly Dictionary<string, EventWatch> _watches = new(StringComparer.Ordinal);

    public EventLiveHub(
        IServiceScopeFactory scopes,
        TimeProvider clock,
        IOptions<EventLiveOptions> options,
        ILogger<EventLiveHub> logger)
    {
        _scopes = scopes;
        _clock = clock;
        _options = options.Value;
        _logger = logger;
    }

    public EventLiveSubscription Subscribe(string eventId, string slug)
    {
        var channel = Channel.CreateBounded<IEventLiveSignal>(new BoundedChannelOptions(SubscriberBacklog)
        {
            FullMode = BoundedChannelFullMode.DropOldest,
            SingleReader = true,
            SingleWriter = false
        });

        lock (_gate)
        {
            if (!_watches.TryGetValue(eventId, out var watch))
            {
                watch = new EventWatch(eventId, slug);
                _watches[eventId] = watch;
                _ = Task.Run(() => WatchAsync(watch));
            }

            watch.Subscribers.Add(channel);
            if (watch.LastPresence is { } presence)
                channel.Writer.TryWrite(new EventPresenceSignal(presence));
        }

        return new EventLiveSubscription(channel.Reader, () => Release(eventId, channel));
    }

    private void Release(string eventId, Channel<IEventLiveSignal> channel)
    {
        lock (_gate)
        {
            if (_watches.TryGetValue(eventId, out var watch)
                && watch.Subscribers.Remove(channel)
                && watch.Subscribers.Count == 0)
            {
                _watches.Remove(eventId);
                watch.Stop.Cancel();
            }
        }

        channel.Writer.TryComplete();
    }

    private async Task WatchAsync(EventWatch watch)
    {
        var stop = watch.Stop.Token;
        try
        {
            while (!stop.IsCancellationRequested)
            {
                await PollOnceAsync(watch, stop);
                await Task.Delay(_options.PollInterval, _clock, stop);
            }
        }
        catch (OperationCanceledException ex) when (stop.IsCancellationRequested)
        {
            _logger.LogDebug(ex, "Live feed of event {EventId} stopped.", watch.EventId);
        }
    }

    private async Task PollOnceAsync(EventWatch watch, CancellationToken ct)
    {
        try
        {
            using var scope = _scopes.CreateScope();
            var events = scope.ServiceProvider.GetRequiredService<IEventRepository>();
            var presenceRepository = scope.ServiceProvider.GetRequiredService<IEventPresenceRepository>();

            var evt = await events.GetByIdOrSlugAsync(watch.Slug, ct);
            var stamp = evt is null ? GoneStamp : $"{evt.WriteSeq}.{evt.Version}";
            var presence = evt is null
                ? []
                : await presenceRepository.ListActiveAsync(watch.EventId, _clock.GetUtcNow(), ct);

            Publish(watch, stamp, presence);
        }
        catch (Exception ex) when (!ct.IsCancellationRequested)
        {
            _logger.LogWarning(ex, "Live feed poll failed for event {EventId}.", watch.EventId);
        }
    }

    private void Publish(EventWatch watch, string stamp, IReadOnlyList<ParticipantPresence> presence)
    {
        var signals = new List<IEventLiveSignal>(2);
        var presenceKey = PresenceKey(presence);

        lock (_gate)
        {
            if (watch.LastStamp is not null && watch.LastStamp != stamp)
                signals.Add(new EventChangedSignal(stamp));
            watch.LastStamp = stamp;

            if (watch.LastPresenceKey != presenceKey)
            {
                watch.LastPresenceKey = presenceKey;
                watch.LastPresence = presence;
                signals.Add(new EventPresenceSignal(presence));
            }

            foreach (var subscriber in watch.Subscribers)
            {
                foreach (var signal in signals)
                    subscriber.Writer.TryWrite(signal);
            }
        }
    }

    private static string PresenceKey(IReadOnlyList<ParticipantPresence> presence) =>
        string.Join(
            ',',
            presence
                .OrderBy(p => p.ParticipantId, StringComparer.Ordinal)
                .Select(p => p.Proposing ? p.ParticipantId + "+" : p.ParticipantId));

    private sealed class EventWatch(string eventId, string slug)
    {
        public string EventId { get; } = eventId;
        public string Slug { get; } = slug;
        public List<Channel<IEventLiveSignal>> Subscribers { get; } = [];
        public CancellationTokenSource Stop { get; } = new();
        public string? LastStamp { get; set; }
        public string? LastPresenceKey { get; set; }
        public IReadOnlyList<ParticipantPresence>? LastPresence { get; set; }
    }
}
