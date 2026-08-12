using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.Profile;

public static class HandleAllocator
{
    private const int MaxHandleAttempts = 5;

    /// <summary>
    /// Allocates a unique handle and persists <paramref name="buildDraft"/>'s user, retrying with a
    /// fresh handle on a concurrent handle collision. Any other <see cref="ConflictException"/>
    /// (e.g. a race on a different unique index) propagates to the caller unchanged.
    /// </summary>
    public static async Task<User> CreateWithUniqueHandleAsync(
        IUserRepository users,
        string? displayName,
        Func<string, User> buildDraft,
        CancellationToken ct = default)
    {
        for (var attempt = 1; attempt <= MaxHandleAttempts; attempt++)
        {
            var handle = await AllocateFromDisplayNameAsync(users, displayName, ct);
            try
            {
                return await users.AddAsync(buildDraft(handle), ct);
            }
            catch (ConflictException ex) when (ex.Message == "handle_conflict" && attempt < MaxHandleAttempts)
            {
                // Another concurrent registration claimed the same handle — retry with a fresh one.
            }
        }

        throw new ConflictException("Impossible d'allouer un handle unique. Réessayez.");
    }

    /// <summary>
    /// Produces a unique, valid handle derived from <paramref name="displayName"/>,
    /// appending a numeric suffix on collision (jean, jean2, jean3, …).
    /// </summary>
    public static async Task<string> AllocateFromDisplayNameAsync(
        IUserRepository users,
        string? displayName,
        CancellationToken ct = default)
    {
        var baseSlug = HandlePolicy.SlugifyBase(displayName);

        if (await users.GetByHandleAsync(baseSlug, ct) is null)
            return baseSlug;

        for (var suffix = 2; suffix <= 9999; suffix++)
        {
            var suffixStr = suffix.ToString(System.Globalization.CultureInfo.InvariantCulture);
            var trimmed = baseSlug.Length + suffixStr.Length > HandlePolicy.MaxLength
                ? baseSlug[..(HandlePolicy.MaxLength - suffixStr.Length)]
                : baseSlug;
            var candidate = trimmed + suffixStr;
            if (await users.GetByHandleAsync(candidate, ct) is null)
                return candidate;
        }

        // Extremely unlikely fallback: a slug + 24-hex never collides in practice.
        return ("u" + Guid.NewGuid().ToString("N"))[..HandlePolicy.MaxLength];
    }
}
