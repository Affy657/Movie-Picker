using MongoDB.Driver;

namespace MoviePicker.Api.Infrastructure.Persistence.Mongo;

public sealed class MongoSessionAccessor
{
    private readonly AsyncLocal<IClientSessionHandle?> _ambient = new();

    public IClientSessionHandle? Session
    {
        get => _ambient.Value;
        set => _ambient.Value = value;
    }
}
