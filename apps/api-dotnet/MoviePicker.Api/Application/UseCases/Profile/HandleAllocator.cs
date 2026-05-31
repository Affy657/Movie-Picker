using MoviePicker.Api.Application.Ports;

namespace MoviePicker.Api.Application.UseCases.Profile;

public static class HandleAllocator
{
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
