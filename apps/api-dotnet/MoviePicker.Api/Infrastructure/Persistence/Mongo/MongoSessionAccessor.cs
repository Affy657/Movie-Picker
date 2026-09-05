using MongoDB.Driver;

namespace MoviePicker.Api.Infrastructure.Persistence.Mongo;

public sealed class MongoSessionAccessor
{
    private static readonly AsyncLocal<IClientSessionHandle?> Ambient = new();

    public IClientSessionHandle? Session
    {
        get => Ambient.Value;
        set => Ambient.Value = value;
    }
}
