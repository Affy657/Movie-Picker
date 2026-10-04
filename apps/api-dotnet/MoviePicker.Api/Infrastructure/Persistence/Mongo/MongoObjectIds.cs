using MongoDB.Bson;

namespace MoviePicker.Api.Infrastructure.Persistence.Mongo;

internal static class MongoObjectIds
{
    public static bool IsValid(string? value) => ObjectId.TryParse(value, out _);
}
