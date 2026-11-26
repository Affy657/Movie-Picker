using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Domain;

public static class EventHost
{
    public static bool IsHost(Event evt, string? currentUserId) => evt.IsHostedBy(currentUserId);

    public static bool IsCreator(Event evt, string? currentUserId) => evt.IsCreatedBy(currentUserId);
}
