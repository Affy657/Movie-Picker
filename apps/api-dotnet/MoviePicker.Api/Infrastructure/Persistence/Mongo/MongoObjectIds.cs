using MongoDB.Bson;

namespace MoviePicker.Api.Infrastructure.Persistence.Mongo;

internal static class MongoObjectIds
{
    public static bool IsValid(string? value) => ObjectId.TryParse(value, out _);

    public static BsonArray ParseValid(IEnumerable<string> values)
    {
        var parsed = new BsonArray();
        foreach (var value in values.Distinct(StringComparer.Ordinal))
        {
            if (ObjectId.TryParse(value, out var id))
                parsed.Add(id);
        }

        return parsed;
    }
}
