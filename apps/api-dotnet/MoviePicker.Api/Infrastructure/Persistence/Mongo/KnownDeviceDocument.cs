using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using MoviePicker.Api.Domain;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Infrastructure.Persistence.Mongo;

[BsonIgnoreExtraElements]
public sealed class KnownDeviceDocument
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;

    [BsonElement("userId")]
    public string UserId { get; set; } = string.Empty;

    [BsonElement("tokenHash")]
    public string TokenHash { get; set; } = string.Empty;

    [BsonElement("browser")]
    public string? Browser { get; set; }

    [BsonElement("operatingSystem")]
    public string? OperatingSystem { get; set; }

    [BsonElement("kind")]
    [BsonRepresentation(BsonType.String)]
    public DeviceKind Kind { get; set; }

    [BsonElement("firstSeenAtUtc")]
    public DateTime FirstSeenAtUtc { get; set; }

    [BsonElement("lastSeenAtUtc")]
    public DateTime LastSeenAtUtc { get; set; }

    [BsonElement("expiresAtUtc")]
    public DateTime ExpiresAtUtc { get; set; }

    public static KnownDeviceDocument From(KnownDevice device) => new()
    {
        Id = string.IsNullOrEmpty(device.Id) ? ObjectId.GenerateNewId().ToString() : device.Id,
        UserId = device.UserId,
        TokenHash = device.TokenHash,
        Browser = device.Browser,
        OperatingSystem = device.OperatingSystem,
        Kind = device.Kind,
        FirstSeenAtUtc = device.FirstSeenAt.UtcDateTime,
        LastSeenAtUtc = device.LastSeenAt.UtcDateTime,
        ExpiresAtUtc = device.ForgottenAt.UtcDateTime
    };

    public KnownDevice ToDomain() => new()
    {
        Id = Id,
        UserId = UserId,
        TokenHash = TokenHash,
        Browser = Browser,
        OperatingSystem = OperatingSystem,
        Kind = Kind,
        FirstSeenAt = AsUtc(FirstSeenAtUtc),
        LastSeenAt = AsUtc(LastSeenAtUtc)
    };

    private static DateTimeOffset AsUtc(DateTime value) => new(DateTime.SpecifyKind(value, DateTimeKind.Utc));
}
