using MongoDB.Bson.Serialization.Attributes;
namespace MoviePicker.Api.Infrastructure.Persistence.Mongo;

[BsonIgnoreExtraElements]
public sealed class SeenMarkDocument : ParticipantScopedDocument;
