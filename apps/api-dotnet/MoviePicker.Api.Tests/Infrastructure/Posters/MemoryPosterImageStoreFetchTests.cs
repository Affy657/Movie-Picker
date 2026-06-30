using System.Net;
using System.Net.Http.Headers;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using Moq.Protected;
using MoviePicker.Api.Application.Posters;
using MoviePicker.Api.Configuration;
using MoviePicker.Api.Infrastructure.Posters;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Posters;

public sealed class MemoryPosterImageStoreFetchTests
{
    private const string Source = "https://image.tmdb.org/t/p/w500/abc.jpg";

    private static string Key => TmdbPosterUrlNormalizer.ComputeKey(Source);

    private static Mock<HttpMessageHandler> StubHandler(Func<HttpRequestMessage, HttpResponseMessage> route)
    {
        var mock = new Mock<HttpMessageHandler>();
        mock.Protected()
            .Setup<Task<HttpResponseMessage>>("SendAsync", ItExpr.IsAny<HttpRequestMessage>(), ItExpr.IsAny<CancellationToken>())
            .Returns<HttpRequestMessage, CancellationToken>((req, _) => Task.FromResult(route(req)));
        return mock;
    }

    private static HttpResponseMessage Image(byte[] data, string contentType)
    {
        var content = new ByteArrayContent(data);
        content.Headers.ContentType = new MediaTypeHeaderValue(contentType);
        return new HttpResponseMessage(HttpStatusCode.OK) { Content = content };
    }

    private static MemoryPosterImageStore Build(HttpMessageHandler handler, MoviePickerOptions? options = null)
    {
        var factory = new Mock<IHttpClientFactory>();
        factory.Setup(f => f.CreateClient(It.IsAny<string>())).Returns(() => new HttpClient(handler));
        return new MemoryPosterImageStore(
            factory.Object,
            Options.Create(options ?? new MoviePickerOptions()),
            NullLogger<MemoryPosterImageStore>.Instance);
    }

    [Fact]
    public async Task GetByKeyAsync_RegisteredSource_FetchesAndReturnsImage()
    {
        var bytes = new byte[] { 1, 2, 3, 4 };
        var store = Build(StubHandler(_ => Image(bytes, "image/jpeg")).Object);
        await store.RegisterTmdbSourceAsync(Source);

        var blob = await store.GetByKeyAsync(Key);

        Assert.NotNull(blob);
        Assert.Equal(bytes, blob!.Data);
        Assert.Equal("image/jpeg", blob.ContentType);
    }

    [Fact]
    public async Task GetByKeyAsync_SecondCall_ServedFromCacheWithoutRefetch()
    {
        var handler = StubHandler(_ => Image(new byte[] { 9 }, "image/png"));
        var store = Build(handler.Object);
        await store.RegisterTmdbSourceAsync(Source);

        await store.GetByKeyAsync(Key);
        var second = await store.GetByKeyAsync(Key);

        Assert.NotNull(second);
        handler.Protected().Verify(
            "SendAsync", Times.Once(), ItExpr.IsAny<HttpRequestMessage>(), ItExpr.IsAny<CancellationToken>());
    }

    [Fact]
    public async Task GetByKeyAsync_DisallowedContentType_ReturnsNull()
    {
        var store = Build(StubHandler(_ => Image(new byte[] { 1 }, "text/html")).Object);
        await store.RegisterTmdbSourceAsync(Source);

        Assert.Null(await store.GetByKeyAsync(Key));
    }

    [Fact]
    public async Task GetByKeyAsync_HttpError_ReturnsNull()
    {
        var store = Build(StubHandler(_ => new HttpResponseMessage(HttpStatusCode.NotFound)).Object);
        await store.RegisterTmdbSourceAsync(Source);

        Assert.Null(await store.GetByKeyAsync(Key));
    }

    [Fact]
    public async Task GetByKeyAsync_ExceedsMaxBytes_ReturnsNull()
    {
        var store = Build(
            StubHandler(_ => Image(new byte[] { 1, 2, 3, 4, 5, 6 }, "image/jpeg")).Object,
            new MoviePickerOptions { PosterCacheMaxBytes = 2 });
        await store.RegisterTmdbSourceAsync(Source);

        Assert.Null(await store.GetByKeyAsync(Key));
    }

    [Fact]
    public async Task GetByKeyAsync_FetchThrows_ReturnsNull()
    {
        var mock = new Mock<HttpMessageHandler>();
        mock.Protected()
            .Setup<Task<HttpResponseMessage>>("SendAsync", ItExpr.IsAny<HttpRequestMessage>(), ItExpr.IsAny<CancellationToken>())
            .ThrowsAsync(new HttpRequestException("boom"));
        var store = Build(mock.Object);
        await store.RegisterTmdbSourceAsync(Source);

        Assert.Null(await store.GetByKeyAsync(Key));
    }
}
