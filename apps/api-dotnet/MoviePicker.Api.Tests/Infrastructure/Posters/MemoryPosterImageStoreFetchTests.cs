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
    public async Task GetOrFetchAsync_FetchesAndReturnsImage()
    {
        var bytes = new byte[] { 1, 2, 3, 4 };
        var store = Build(StubHandler(_ => Image(bytes, "image/jpeg")).Object);

        var blob = await store.GetOrFetchAsync(Source);

        Assert.NotNull(blob);
        Assert.Equal(bytes, blob!.Data);
        Assert.Equal("image/jpeg", blob.ContentType);
    }

    [Fact]
    public async Task GetOrFetchAsync_SecondCall_ServedFromCacheWithoutRefetch()
    {
        var handler = StubHandler(_ => Image(new byte[] { 9 }, "image/png"));
        var store = Build(handler.Object);

        await store.GetOrFetchAsync(Source);
        var second = await store.GetOrFetchAsync(Source);

        Assert.NotNull(second);
        handler.Protected().Verify(
            "SendAsync", Times.Once(), ItExpr.IsAny<HttpRequestMessage>(), ItExpr.IsAny<CancellationToken>());
    }

    [Fact]
    public async Task GetOrFetchAsync_ConcurrentColdRequests_FetchOnce()
    {
        var release = new TaskCompletionSource<HttpResponseMessage>();
        var mock = new Mock<HttpMessageHandler>();
        mock.Protected()
            .Setup<Task<HttpResponseMessage>>("SendAsync", ItExpr.IsAny<HttpRequestMessage>(), ItExpr.IsAny<CancellationToken>())
            .Returns(() => release.Task);
        var store = Build(mock.Object);

        var first = store.GetOrFetchAsync(Source);
        var second = store.GetOrFetchAsync(Source);
        release.SetResult(Image(new byte[] { 7 }, "image/jpeg"));
        await Task.WhenAll(first, second);

        mock.Protected().Verify(
            "SendAsync", Times.Once(), ItExpr.IsAny<HttpRequestMessage>(), ItExpr.IsAny<CancellationToken>());
    }

    [Fact]
    public async Task GetOrFetchAsync_NonTmdbUrl_ReturnsNullWithoutFetching()
    {
        var handler = StubHandler(_ => Image(new byte[] { 1 }, "image/jpeg"));
        var store = Build(handler.Object);

        Assert.Null(await store.GetOrFetchAsync("https://evil.example/t/p/w500/abc.jpg"));
        handler.Protected().Verify(
            "SendAsync", Times.Never(), ItExpr.IsAny<HttpRequestMessage>(), ItExpr.IsAny<CancellationToken>());
    }

    [Fact]
    public async Task GetOrFetchAsync_DisallowedContentType_ReturnsNull()
    {
        var store = Build(StubHandler(_ => Image(new byte[] { 1 }, "text/html")).Object);

        Assert.Null(await store.GetOrFetchAsync(Source));
    }

    [Fact]
    public async Task GetOrFetchAsync_HttpError_ReturnsNull()
    {
        var store = Build(StubHandler(_ => new HttpResponseMessage(HttpStatusCode.NotFound)).Object);

        Assert.Null(await store.GetOrFetchAsync(Source));
    }

    [Fact]
    public async Task GetOrFetchAsync_ExceedsMaxBytes_ReturnsNull()
    {
        var store = Build(
            StubHandler(_ => Image(new byte[] { 1, 2, 3, 4, 5, 6 }, "image/jpeg")).Object,
            new MoviePickerOptions { PosterCacheMaxBytes = 2 });

        Assert.Null(await store.GetOrFetchAsync(Source));
    }

    [Fact]
    public async Task GetOrFetchAsync_FetchThrows_ReturnsNull()
    {
        var mock = new Mock<HttpMessageHandler>();
        mock.Protected()
            .Setup<Task<HttpResponseMessage>>("SendAsync", ItExpr.IsAny<HttpRequestMessage>(), ItExpr.IsAny<CancellationToken>())
            .ThrowsAsync(new HttpRequestException("boom"));
        var store = Build(mock.Object);

        Assert.Null(await store.GetOrFetchAsync(Source));
    }

    [Fact]
    public async Task GetByKeyAsync_AfterAStatelessFetch_ServesTheLegacyKeyOfTheSameSource()
    {
        var bytes = new byte[] { 5, 6 };
        var store = Build(StubHandler(_ => Image(bytes, "image/jpeg")).Object);
        await store.GetOrFetchAsync(Source);

        var blob = await store.GetByKeyAsync(Key);

        Assert.NotNull(blob);
        Assert.Equal(bytes, blob!.Data);
    }

    [Fact]
    public async Task FindSourceUrlAsync_KnownKey_ReturnsTheTmdbSource()
    {
        var store = Build(StubHandler(_ => Image(new byte[] { 1 }, "image/jpeg")).Object);
        await store.GetOrFetchAsync(Source);

        Assert.Equal(Source, await store.FindSourceUrlAsync(Key));
    }

    [Fact]
    public async Task FindSourceUrlAsync_UnknownKey_ReturnsNull()
    {
        var store = Build(StubHandler(_ => Image(new byte[] { 1 }, "image/jpeg")).Object);

        Assert.Null(await store.FindSourceUrlAsync(Key));
    }

    [Fact]
    public async Task GetOrFetchAsync_CacheFull_ServesTheImageWithoutKeepingIt()
    {
        var handler = StubHandler(_ => Image(new byte[] { 7 }, "image/jpeg"));
        var store = Build(handler.Object, new MoviePickerOptions { PosterCacheMaxEntries = 1 });
        const string other = "https://image.tmdb.org/t/p/w500/other.jpg";

        await store.GetOrFetchAsync(Source);
        var served = await store.GetOrFetchAsync(other);

        Assert.NotNull(served);
        Assert.Null(await store.FindSourceUrlAsync(TmdbPosterUrlNormalizer.ComputeKey(other)));
        Assert.NotNull(await store.FindSourceUrlAsync(Key));
    }
}
