using System.Security.Cryptography;
using System.Text;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain;

namespace MoviePicker.Api.Application.UseCases.EventViewTag;

public sealed class EventViewTagHandler : IEventViewTagHandler
{
    public static readonly TimeSpan FreshnessWindow = TimeSpan.FromMinutes(1);

    private readonly IEventRepository _eventRepository;
    private readonly IHostTokenAccessor _hostTokenAccessor;
    private readonly ICurrentUserAccessor _currentUserAccessor;
    private readonly TimeProvider _clock;

    public EventViewTagHandler(
        IEventRepository eventRepository,
        IHostTokenAccessor hostTokenAccessor,
        ICurrentUserAccessor currentUserAccessor,
        TimeProvider clock)
    {
        _eventRepository = eventRepository;
        _hostTokenAccessor = hostTokenAccessor;
        _currentUserAccessor = currentUserAccessor;
        _clock = clock;
    }

    public async Task<string?> HandleAsync(string idOrSlug, CancellationToken ct = default)
    {
        var evt = await _eventRepository.GetByIdOrSlugAsync(idOrSlug, ct);
        if (evt is null)
            return null;

        var currentUserId = _currentUserAccessor.GetUserId();
        var isHost = EventHost.IsHost(evt, _hostTokenAccessor.GetHostToken(), currentUserId);
        var freshnessBucket = _clock.GetUtcNow().ToUnixTimeSeconds() / (long)FreshnessWindow.TotalSeconds;
        var viewer = ViewerFingerprint(currentUserId, isHost);

        return $"W/\"{evt.WriteSeq}.{evt.Version}.{freshnessBucket}.{viewer}\"";
    }

    private static string ViewerFingerprint(string? currentUserId, bool isHost)
    {
        var identity = $"{currentUserId ?? string.Empty}|{(isHost ? "host" : "guest")}";
        var digest = SHA256.HashData(Encoding.UTF8.GetBytes(identity));
        return Convert.ToHexString(digest, 0, 6).ToLowerInvariant();
    }
}
