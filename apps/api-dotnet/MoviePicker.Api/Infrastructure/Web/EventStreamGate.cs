using System.Diagnostics.CodeAnalysis;
using Microsoft.Extensions.Options;
using MoviePicker.Api.Application.UseCases.EventLive;

namespace MoviePicker.Api.Infrastructure.Web;

public interface IEventStreamLease : IDisposable
{
    bool IsReplaced { get; }
}

public sealed class EventStreamGate
{
    private const int MinTabLength = 8;
    private const int MaxTabLength = 64;

    private readonly EventLiveOptions _options;
    private readonly Lock _gate = new();
    private readonly Dictionary<string, int> _openByClient = new(StringComparer.Ordinal);
    private readonly Dictionary<string, Lease> _openByTab = new(StringComparer.Ordinal);
    private int _open;

    public EventStreamGate(IOptions<EventLiveOptions> options)
    {
        _options = options.Value;
    }

    public bool TryEnter(HttpContext context, string? tab, [NotNullWhen(true)] out IEventStreamLease? lease)
    {
        var (client, cap) = context.User.TryGetUserId(out var userId)
            ? ("account:" + userId, _options.MaxStreamsPerAccount)
            : ("address:" + ClientIpPartitionKey.Get(context), _options.MaxAnonymousStreamsPerAddress);
        var tabKey = IsWellFormedTab(tab) ? client + "|" + tab : null;

        lock (_gate)
        {
            if (tabKey is not null && _openByTab.Remove(tabKey, out var previous) && previous.MarkReplaced())
                ReleaseSlot(client);

            var openForClient = _openByClient.GetValueOrDefault(client);
            if (_open >= _options.MaxStreamsPerInstance || openForClient >= cap)
            {
                lease = null;
                return false;
            }

            _open += 1;
            _openByClient[client] = openForClient + 1;
            var entered = new Lease(this, client, tabKey);
            if (tabKey is not null)
                _openByTab[tabKey] = entered;
            lease = entered;
            return true;
        }
    }

    private static bool IsWellFormedTab([NotNullWhen(true)] string? tab) =>
        tab is { Length: >= MinTabLength and <= MaxTabLength }
        && tab.All(c => char.IsAsciiLetterOrDigit(c) || c == '-');

    private void Leave(Lease lease)
    {
        lock (_gate)
        {
            ReleaseSlot(lease.Client);
            if (lease.TabKey is { } tabKey
                && _openByTab.TryGetValue(tabKey, out var current)
                && ReferenceEquals(current, lease))
                _openByTab.Remove(tabKey);
        }
    }

    private void ReleaseSlot(string client)
    {
        _open -= 1;
        var remaining = _openByClient.GetValueOrDefault(client) - 1;
        if (remaining <= 0)
            _openByClient.Remove(client);
        else
            _openByClient[client] = remaining;
    }

    private sealed class Lease(EventStreamGate gate, string client, string? tabKey) : IEventStreamLease
    {
        private int _released;
        private volatile bool _replaced;

        public string Client => client;

        public string? TabKey => tabKey;

        public bool IsReplaced => _replaced;

        public bool MarkReplaced()
        {
            _replaced = true;
            return Interlocked.Exchange(ref _released, 1) == 0;
        }

        public void Dispose()
        {
            if (Interlocked.Exchange(ref _released, 1) == 0)
                gate.Leave(this);
        }
    }
}
