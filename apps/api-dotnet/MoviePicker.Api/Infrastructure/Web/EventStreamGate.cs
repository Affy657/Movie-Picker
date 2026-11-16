using System.Diagnostics.CodeAnalysis;
using Microsoft.Extensions.Options;
using MoviePicker.Api.Application.UseCases.EventLive;

namespace MoviePicker.Api.Infrastructure.Web;

public sealed class EventStreamGate
{
    private readonly EventLiveOptions _options;
    private readonly Lock _gate = new();
    private readonly Dictionary<string, int> _openByClient = new(StringComparer.Ordinal);
    private int _open;

    public EventStreamGate(IOptions<EventLiveOptions> options)
    {
        _options = options.Value;
    }

    public bool TryEnter(HttpContext context, [NotNullWhen(true)] out IDisposable? lease)
    {
        var (client, cap) = context.User.TryGetUserId(out var userId)
            ? ("account:" + userId, _options.MaxStreamsPerAccount)
            : ("address:" + ClientIpPartitionKey.Get(context), _options.MaxAnonymousStreamsPerAddress);

        lock (_gate)
        {
            var openForClient = _openByClient.GetValueOrDefault(client);
            if (_open >= _options.MaxStreamsPerInstance || openForClient >= cap)
            {
                lease = null;
                return false;
            }

            _open += 1;
            _openByClient[client] = openForClient + 1;
        }

        lease = new Lease(this, client);
        return true;
    }

    private void Leave(string client)
    {
        lock (_gate)
        {
            _open -= 1;
            var remaining = _openByClient.GetValueOrDefault(client) - 1;
            if (remaining <= 0)
                _openByClient.Remove(client);
            else
                _openByClient[client] = remaining;
        }
    }

    private sealed class Lease(EventStreamGate gate, string client) : IDisposable
    {
        private int _released;

        public void Dispose()
        {
            if (Interlocked.Exchange(ref _released, 1) == 0)
                gate.Leave(client);
        }
    }
}
