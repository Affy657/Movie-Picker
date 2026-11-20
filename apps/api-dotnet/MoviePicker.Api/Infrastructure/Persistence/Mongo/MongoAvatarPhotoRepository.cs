using MongoDB.Bson.Serialization.Attributes;
using MoviePicker.Api.Application.Ports;

namespace MoviePicker.Api.Infrastructure.Persistence.Mongo;

public sealed class MongoAvatarPhotoRepository(MongoCollectionFactory collections)
    : MongoPhotoBlobRepository<AvatarPhotoBlobDocument>(collections, CollectionName), IAvatarPhotoRepository
{
    public const string CollectionName = "avatar_photos";
}

[BsonIgnoreExtraElements]
public sealed class AvatarPhotoBlobDocument : PhotoBlobDocument;
