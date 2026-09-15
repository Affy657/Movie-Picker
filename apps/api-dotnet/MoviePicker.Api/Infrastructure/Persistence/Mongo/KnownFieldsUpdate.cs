using MongoDB.Bson;
using MongoDB.Bson.Serialization;
using MongoDB.Driver;

namespace MoviePicker.Api.Infrastructure.Persistence.Mongo;

internal static class KnownFieldsUpdate
{
    private const string IdElement = "_id";

    public static UpdateDefinition<TDocument> From<TDocument>(TDocument document, params string[] incrementedCounters)
    {
        var written = document.ToBsonDocument();
        written.Remove(IdElement);
        foreach (var counter in incrementedCounters)
            written.Remove(counter);

        var absentKnownFields = BsonClassMap.LookupClassMap(typeof(TDocument)).AllMemberMaps
            .Select(member => member.ElementName)
            .Where(name => name != IdElement && !written.Contains(name) && !incrementedCounters.Contains(name))
            .Select(name => new BsonElement(name, 1));

        var update = new BsonDocument("$set", written);
        var unset = new BsonDocument(absentKnownFields);
        if (unset.ElementCount > 0)
            update.Add("$unset", unset);
        if (incrementedCounters.Length > 0)
            update.Add("$inc", new BsonDocument(incrementedCounters.Select(name => new BsonElement(name, 1L))));
        return update;
    }
}
