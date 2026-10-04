using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.Profile;

public static class HandleAllocator
{
    private const int MaxHandleAttempts = 5;

    public static async Task<User> CreateWithUniqueHandleAsync(
        IUserRepository users,
        string? displayName,
        Func<string, User> buildDraft,
        CancellationToken ct = default)
    {
        for (var attempt = 1; attempt < MaxHandleAttempts; attempt++)
        {
            var created = await TryCreateAsync(users, displayName, buildDraft, ct);
            if (created is not null)
                return created;
        }

        var handle = await AllocateFromDisplayNameAsync(users, displayName, ct);
        return await users.AddAsync(buildDraft(handle), ct);
    }

    private static async Task<User?> TryCreateAsync(
        IUserRepository users,
        string? displayName,
        Func<string, User> buildDraft,
        CancellationToken ct)
    {
        var handle = await AllocateFromDisplayNameAsync(users, displayName, ct);
        try
        {
            return await users.AddAsync(buildDraft(handle), ct);
        }
        catch (ConflictException ex) when (ex.Reason == ErrorCodes.HandleTaken)
        {
            return null;
        }
    }

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

        return ("u" + Guid.NewGuid().ToString("N"))[..HandlePolicy.MaxLength];
    }
}
