using MongoDB.Bson;
using MongoDB.Bson.Serialization;
using MongoDB.Driver;

namespace MoviePicker.Api.Infrastructure.Persistence.Mongo;

internal static class KnownFieldsUpdate
{
    private const string IdElement = "_id";

    public static UpdateDefinition<TDocument> From<TDocument>(TDocument document)
    {
        var written = document.ToBsonDocument();
        written.Remove(IdElement);

        var absentKnownFields = BsonClassMap.LookupClassMap(typeof(TDocument)).AllMemberMaps
            .Select(member => member.ElementName)
            .Where(name => name != IdElement && !written.Contains(name))
            .Select(name => new BsonElement(name, 1));

        var update = new BsonDocument("$set", written);
        var unset = new BsonDocument(absentKnownFields);
        if (unset.ElementCount > 0)
            update.Add("$unset", unset);
        return update;
    }
}
