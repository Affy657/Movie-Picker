using Microsoft.Extensions.DependencyInjection;
using MongoDB.Bson;
using MongoDB.Driver;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Infrastructure.Persistence.Mongo;
using Xunit;

namespace MoviePicker.Api.IntegrationTests;

public sealed class MongoAvatarPhotoRepositoryTests : IClassFixture<MoviePickerApplicationFactory>
{
    private readonly MoviePickerApplicationFactory _factory;

    public MongoAvatarPhotoRepositoryTests(MoviePickerApplicationFactory factory)
    {
        _factory = factory;
        _ = _factory.CreateClient();
    }

    private static StoredPhoto Photo(string key) => new()
    {
        Key = key,
        UserId = "owner",
        ContentType = "image/webp",
        Data = [1, 2, 3],
        CreatedAt = DateTimeOffset.UtcNow
    };

    [MongoFact]
    public async Task EstimatedCount_ReadsTheCollectionEvenInsideATransaction()
    {
        using var scope = _factory.Services.CreateScope();
        var photos = scope.ServiceProvider.GetRequiredService<IAvatarPhotoRepository>();
        Assert.IsType<MongoAvatarPhotoRepository>(photos);
        var before = await photos.EstimatedCountAsync();
        await photos.SaveAsync(Photo(AvatarPhoto.NewKey()));
        await photos.SaveAsync(Photo(AvatarPhoto.NewKey()));

        long counted = 0;
        await scope.ServiceProvider.GetRequiredService<IUnitOfWork>().ExecuteAsync(async token =>
            counted = await photos.EstimatedCountAsync(token));

        Assert.Equal(before + 2, counted);
    }

    [MongoFact]
    public async Task ScheduleDeletion_StampsTheDateTheTtlIndexReadsAndKeepsServingThePhoto()
    {
        using var scope = _factory.Services.CreateScope();
        var photos = scope.ServiceProvider.GetRequiredService<IAvatarPhotoRepository>();
        var raw = scope.ServiceProvider.GetRequiredService<IMongoDatabase>()
            .GetCollection<BsonDocument>(MongoAvatarPhotoRepository.CollectionName);
        var key = AvatarPhoto.NewKey();
        var deleteAt = new DateTimeOffset(2030, 1, 1, 12, 0, 0, TimeSpan.Zero);
        await photos.SaveAsync(Photo(key));
        Assert.False((await raw.Find(new BsonDocument("_id", key)).SingleAsync()).Contains("expiresAt"));

        await photos.ScheduleDeletionAsync(key, deleteAt);

        Assert.NotNull(await photos.GetByKeyAsync(key));
        var stored = await raw.Find(new BsonDocument("_id", key)).SingleAsync();
        Assert.Equal(deleteAt.UtcDateTime, stored["expiresAt"].ToUniversalTime());
    }
}
