using System.Threading.Channels;

namespace MoviePicker.Api.Application.UseCases.EventLive;

public interface IEventLiveFeed
{
    EventLiveSubscription Subscribe(string eventId, string slug);
}

public sealed class EventLiveSubscription : IDisposable
{
    private readonly Action _release;
    private int _released;

    public EventLiveSubscription(ChannelReader<IEventLiveSignal> signals, Action release)
    {
        Signals = signals;
        _release = release;
    }

    public ChannelReader<IEventLiveSignal> Signals { get; }

    public void Dispose()
    {
        if (Interlocked.Exchange(ref _released, 1) == 0)
            _release();
    }
}
