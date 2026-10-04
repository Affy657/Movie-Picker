using System.Security.Cryptography;

namespace MoviePicker.Api.Domain.Entities;

public sealed record AvatarPhoto
{
    public const string AvatarIdPrefix = "photo:";
    private const int KeyByteLength = 16;

    public string Key { get; init; } = string.Empty;
    public bool IsActive { get; init; }
    public DateTimeOffset UpdatedAt { get; init; }

    public string AvatarId => AvatarIdPrefix + Key;

    public static string DisplayedAvatarIdOf(string generatedAvatarId, AvatarPhoto? photo) =>
        photo is { IsActive: true } ? photo.AvatarId : generatedAvatarId;

    public static string NewKey() => Convert.ToHexStringLower(RandomNumberGenerator.GetBytes(KeyByteLength));

    public static bool IsValidKey(string key) =>
        key.Length == KeyByteLength * 2 && key.All(c => char.IsAsciiDigit(c) || c is >= 'a' and <= 'f');
}

public sealed record StoredAvatarPhoto
{
    public string Key { get; init; } = string.Empty;
    public string UserId { get; init; } = string.Empty;
    public string ContentType { get; init; } = string.Empty;
    public byte[] Data { get; init; } = [];
    public DateTimeOffset CreatedAt { get; init; }
}
