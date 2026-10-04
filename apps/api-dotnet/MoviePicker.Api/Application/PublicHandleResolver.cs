using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application;

internal static class PublicHandleResolver
{
    public static string? Resolve(User? user) =>
        user?.IsProfilePublic == true && !string.IsNullOrEmpty(user.Handle)
            ? user.Handle
            : null;

    public static string? Resolve(UserCard? card) =>
        card?.IsProfilePublic == true && !string.IsNullOrEmpty(card.Handle)
            ? card.Handle
            : null;
}
