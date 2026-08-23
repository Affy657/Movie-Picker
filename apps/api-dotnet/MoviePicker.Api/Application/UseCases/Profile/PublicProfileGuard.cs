using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.Profile;

public static class PublicProfileGuard
{
    /// <summary>
    /// Resolves a handle to its public user, or throws 404 (not 403) for both "unknown"
    /// and "private" so a caller can never distinguish the two and enumerate accounts.
    /// </summary>
    public static async Task<User> RequirePublicUserAsync(
        IUserRepository users, string? handle, CancellationToken ct = default)
    {
        var normalized = HandlePolicy.Normalize(handle);
        var user = await users.GetByHandleAsync(normalized, ct);

        if (user is null || !user.IsProfilePublic)
            throw new NotFoundException("Profil introuvable");

        return user;
    }
}
