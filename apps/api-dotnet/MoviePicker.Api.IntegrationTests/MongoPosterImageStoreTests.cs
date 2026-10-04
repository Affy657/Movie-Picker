using System.Net;
using System.Net.Http.Headers;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using MongoDB.Bson;
using MongoDB.Driver;
using MoviePicker.Api.Application.Posters;
using MoviePicker.Api.Configuration;
using MoviePicker.Api.Infrastructure.Posters;
using Xunit;

namespace MoviePicker.Api.IntegrationTests;

public sealed class MongoPosterImageStoreTests : IClassFixture<MoviePickerApplicationFactory>
{
    private readonly MoviePickerApplicationFactory _factory;

    public MongoPosterImageStoreTests(MoviePickerApplicationFactory factory)
    {
        _factory = factory;
        _ = _factory.CreateClient();
    }

    private sealed class TmdbImages : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            var content = new ByteArrayContent([1, 2, 3]);
            content.Headers.ContentType = new MediaTypeHeaderValue("image/jpeg");
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK) { Content = content });
        }
    }

    private sealed class SingleClientFactory : IHttpClientFactory
    {
        public HttpClient CreateClient(string name) => new(new TmdbImages());
    }

    [MongoFact]
    public async Task GetOrFetchAsync_CacheFull_ServesThePosterWithoutKeepingIt()
    {
        using var scope = _factory.Services.CreateScope();
        var database = scope.ServiceProvider.GetRequiredService<IMongoDatabase>();
        var stored = await database.GetCollection<BsonDocument>(MongoPosterImageStore.CollectionName).EstimatedDocumentCountAsync();
        var store = new MongoPosterImageStore(
            database,
            new SingleClientFactory(),
            Options.Create(new MoviePickerOptions { PosterCacheMaxEntries = (int)stored + 1 }),
            NullLogger<MongoPosterImageStore>.Instance);
        var kept = $"https://image.tmdb.org/t/p/w500/kept{Guid.NewGuid():N}.jpg";
        var overflow = $"https://image.tmdb.org/t/p/w500/overflow{Guid.NewGuid():N}.jpg";

        Assert.NotNull(await store.GetOrFetchAsync(kept));
        Assert.NotNull(await store.GetOrFetchAsync(overflow));

        Assert.NotNull(await store.FindSourceUrlAsync(TmdbPosterUrlNormalizer.ComputeKey(kept)));
        Assert.Null(await store.FindSourceUrlAsync(TmdbPosterUrlNormalizer.ComputeKey(overflow)));
    }
}
