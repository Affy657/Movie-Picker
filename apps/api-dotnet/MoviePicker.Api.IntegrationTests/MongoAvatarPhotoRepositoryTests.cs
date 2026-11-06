using Microsoft.Extensions.DependencyInjection;
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

    private static StoredAvatarPhoto Photo(string key) => new()
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
}
