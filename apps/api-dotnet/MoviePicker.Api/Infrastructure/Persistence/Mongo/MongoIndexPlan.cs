using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using MongoDB.Bson;
using MongoDB.Bson.Serialization;
using MongoDB.Driver;

namespace MoviePicker.Api.Infrastructure.Persistence.Mongo;

public sealed class MongoIndexPlan
{
    public const string MarkerPrefix = "indexes-";

    private readonly IMongoDatabase _database;
    private readonly List<string> _descriptions = [];
    private readonly List<Func<CancellationToken, Task>> _steps = [];

    public MongoIndexPlan(IMongoDatabase database)
    {
        _database = database;
    }

    public int StepCount => _steps.Count;

    public string MarkerId
    {
        get
        {
            var payload = string.Join("\n", _descriptions);
            var hash = SHA256.HashData(Encoding.UTF8.GetBytes(payload));
            return MarkerPrefix + Convert.ToHexString(hash, 0, 8).ToLowerInvariant();
        }
    }

    public void Create<TDocument>(string collection, params CreateIndexModel<TDocument>[] models)
    {
        var args = new RenderArgs<TDocument>(
            BsonSerializer.LookupSerializer<TDocument>(),
            BsonSerializer.SerializerRegistry);
        foreach (var model in models)
            _descriptions.Add(Describe(collection, model, args));

        _steps.Add(ct => _database.GetCollection<TDocument>(collection).Indexes.CreateManyAsync(models, ct));
    }

    public void DropIfExists<TDocument>(string collection, string indexName)
    {
        _descriptions.Add($"drop {collection} {indexName}");
        _steps.Add(async ct =>
        {
            try
            {
                await _database.GetCollection<TDocument>(collection).Indexes.DropOneAsync(indexName, ct);
            }
            catch (MongoCommandException ex) when (ex.Code == MongoErrorCodes.IndexNotFound)
            {
            }
        });
    }

    public async Task ExecuteAsync(CancellationToken ct)
    {
        foreach (var step in _steps)
            await step(ct);
    }

    private static string Describe<TDocument>(
        string collection,
        CreateIndexModel<TDocument> model,
        RenderArgs<TDocument> args)
    {
        var options = model.Options;
        var partial = options is CreateIndexOptions<TDocument> { PartialFilterExpression: { } filter }
            ? filter.Render(args).ToJson()
            : string.Empty;
        var expireAfter = options?.ExpireAfter?.TotalSeconds.ToString(CultureInfo.InvariantCulture) ?? string.Empty;
        return string.Join(
            "|",
            collection,
            options?.Name ?? string.Empty,
            model.Keys.Render(args).ToJson(),
            options?.Unique == true ? "unique" : string.Empty,
            options?.Sparse == true ? "sparse" : string.Empty,
            expireAfter,
            partial);
    }
}
