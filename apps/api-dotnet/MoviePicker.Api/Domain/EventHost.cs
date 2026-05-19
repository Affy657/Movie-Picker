using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Domain;

public static class EventHost
{
    public static bool IsHost(Event evt, string? hostToken, string? currentUserId) =>
        (!string.IsNullOrEmpty(hostToken) && hostToken == evt.HostToken)
        || (!string.IsNullOrEmpty(currentUserId) && currentUserId == evt.CreatorUserId);
}
