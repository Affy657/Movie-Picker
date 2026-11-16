namespace MoviePicker.Api.Application.UseCases.EventLive;

public sealed class EventLiveOptions
{
    public TimeSpan PollInterval { get; set; } = TimeSpan.FromSeconds(1);

    public TimeSpan KeepAliveInterval { get; set; } = TimeSpan.FromSeconds(15);

    public TimeSpan StreamLifetime { get; set; } = TimeSpan.FromSeconds(270);

    public TimeSpan PresenceTtl { get; set; } = TimeSpan.FromSeconds(30);

    public TimeSpan PresenceRefresh { get; set; } = TimeSpan.FromSeconds(10);

    public TimeSpan ReconnectDelay { get; set; } = TimeSpan.FromSeconds(2);

    public int MaxStreamsPerInstance { get; set; } = 60;

    public int MaxStreamsPerAccount { get; set; } = 6;

    public int MaxAnonymousStreamsPerAddress { get; set; } = 20;
}
