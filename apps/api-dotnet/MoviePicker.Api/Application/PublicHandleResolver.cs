using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application;

internal static class PublicHandleResolver
{
    public static string? Resolve(User? user) =>
        user?.IsProfilePublic == true && !string.IsNullOrEmpty(user.Handle)
            ? user.Handle
            : null;
}
