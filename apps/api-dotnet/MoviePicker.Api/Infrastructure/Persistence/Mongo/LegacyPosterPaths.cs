using MongoDB.Bson;

namespace MoviePicker.Api.Infrastructure.Persistence.Mongo;

internal static class LegacyPosterPaths
{
    public static readonly BsonRegularExpression Pattern = new("^/api/v1/posters/[0-9a-f]{64}$");
}
