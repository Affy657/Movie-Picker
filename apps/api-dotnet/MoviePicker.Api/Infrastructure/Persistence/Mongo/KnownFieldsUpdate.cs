using System.Collections;
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
        var set = new BsonDocument();
        var unset = new BsonArray();
        var rootFields = BsonClassMap.LookupClassMap(typeof(TDocument)).AllMemberMaps
            .Where(member => member.ElementName != IdElement && !incrementedCounters.Contains(member.ElementName));
        CollectFields(rootFields, written, string.Empty, set, unset);
        foreach (var counter in incrementedCounters)
            set[counter] = Incremented(counter);

        var stages = new List<BsonDocument> { new("$set", set) };
        if (unset.Count > 0)
            stages.Add(new BsonDocument("$unset", unset));
        return Builders<TDocument>.Update.Pipeline(stages);
    }

    private static void CollectFields(
        IEnumerable<BsonMemberMap> members,
        BsonDocument written,
        string pathPrefix,
        BsonDocument set,
        BsonArray unset)
    {
        foreach (var member in members)
        {
            var path = pathPrefix + member.ElementName;
            if (!written.TryGetValue(member.ElementName, out var value))
                unset.Add(path);
            else if (value is BsonDocument { ElementCount: > 0 } subDocument && IsMappedSubDocument(member.MemberType))
                CollectFields(BsonClassMap.LookupClassMap(member.MemberType).AllMemberMaps, subDocument, path + ".", set, unset);
            else
                set[path] = new BsonDocument("$literal", value);
        }
    }

    private static bool IsMappedSubDocument(Type memberType) =>
        memberType.IsClass && !typeof(IEnumerable).IsAssignableFrom(memberType);

    private static BsonDocument Incremented(string counter) =>
        new("$add", new BsonArray { new BsonDocument("$ifNull", new BsonArray { "$" + counter, 0L }), 1L });
}
