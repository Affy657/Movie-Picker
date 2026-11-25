namespace MoviePicker.Api.Domain.Entities;

public sealed record StoredPhoto
{
    public static readonly TimeSpan ReplacedPhotoLifetime = TimeSpan.FromMinutes(10);

    public string Key { get; init; } = string.Empty;
    public string UserId { get; init; } = string.Empty;
    public string ContentType { get; init; } = string.Empty;
    public byte[] Data { get; init; } = [];
    public DateTimeOffset CreatedAt { get; init; }

    public static StoredPhoto Create(string key, string userId, string contentType, byte[] data, DateTimeOffset createdAt) =>
        new() { Key = key, UserId = userId, ContentType = contentType, Data = data, CreatedAt = createdAt };
}
