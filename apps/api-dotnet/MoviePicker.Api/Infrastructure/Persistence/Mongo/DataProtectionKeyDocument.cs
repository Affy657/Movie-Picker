using MongoDB.Bson.Serialization.Attributes;

namespace MoviePicker.Api.Infrastructure.Persistence.Mongo;

[BsonIgnoreExtraElements]
public sealed class DataProtectionKeyDocument
{
    [BsonId]
    public string Id { get; set; } = string.Empty;

    [BsonElement("xml")]
    public string Xml { get; set; } = string.Empty;
}
