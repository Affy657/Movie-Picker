using MongoDB.Bson.Serialization.Attributes;
using MoviePicker.Api.Application.Ports;

namespace MoviePicker.Api.Infrastructure.Persistence.Mongo;

public sealed class MongoBannerPhotoRepository(MongoCollectionFactory collections)
    : MongoPhotoBlobRepository<BannerPhotoBlobDocument>(collections, CollectionName), IBannerPhotoRepository
{
    public const string CollectionName = "banner_photos";
}

[BsonIgnoreExtraElements]
public sealed class BannerPhotoBlobDocument : PhotoBlobDocument;
