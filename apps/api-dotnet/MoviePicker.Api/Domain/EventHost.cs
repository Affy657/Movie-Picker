using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Domain;

/// <summary>Reconnaissance hôte : jeton MVP ou compte créateur (V1 §4).</summary>
public static class EventHost
{
    public static bool IsHost(Event evt, string? hostToken, string? currentUserId) =>
        (!string.IsNullOrEmpty(hostToken) && hostToken == evt.HostToken)
        || (!string.IsNullOrEmpty(currentUserId) && currentUserId == evt.CreatorUserId);
}
