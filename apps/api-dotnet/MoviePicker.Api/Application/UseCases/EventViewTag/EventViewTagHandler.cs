using System.Buffers.Binary;
using System.Security.Cryptography;
using System.Text;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Shared;

namespace MoviePicker.Api.Application.UseCases.EventViewTag;

public sealed class EventViewTagHandler : IEventViewTagHandler
{
    public static readonly TimeSpan FreshnessWindow = TimeSpan.FromMinutes(1);

    private readonly IEventRepository _eventRepository;
    private readonly ICurrentUserAccessor _currentUserAccessor;
    private readonly TimeProvider _clock;

    public EventViewTagHandler(
        IEventRepository eventRepository,
        ICurrentUserAccessor currentUserAccessor,
        TimeProvider clock)
    {
        _eventRepository = eventRepository;
        _currentUserAccessor = currentUserAccessor;
        _clock = clock;
    }

    public async Task<string?> HandleAsync(string slug, CatalogLanguage language, CancellationToken ct = default)
    {
        var evt = await _eventRepository.GetBySlugAsync(slug, ct);
        if (evt is null)
            return null;

        var currentUserId = _currentUserAccessor.GetUserId();
        var isHost = HostedEvent.IsHost(evt, currentUserId);
        var digest = ViewerDigest(currentUserId, isHost, language);
        var windowSeconds = (long)FreshnessWindow.TotalSeconds;
        var viewerOffsetSeconds = BinaryPrimitives.ReadUInt16BigEndian(digest.AsSpan(6, 2)) % windowSeconds;
        var freshnessBucket = (_clock.GetUtcNow().ToUnixTimeSeconds() + viewerOffsetSeconds) / windowSeconds;
        var viewer = Convert.ToHexString(digest, 0, 6).ToLowerInvariant();

        return $"W/\"{evt.WriteSeq}.{evt.Version}.{freshnessBucket}.{viewer}\"";
    }

    private static byte[] ViewerDigest(string? currentUserId, bool isHost, CatalogLanguage language)
    {
        var identity = $"{currentUserId ?? string.Empty}|{(isHost ? "host" : "guest")}|{language.TmdbCode()}";
        return SHA256.HashData(Encoding.UTF8.GetBytes(identity));
    }
}
