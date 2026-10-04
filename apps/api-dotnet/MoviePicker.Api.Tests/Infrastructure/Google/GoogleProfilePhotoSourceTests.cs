using System.Net;
using System.Net.Http.Headers;
using System.Text;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Moq.Protected;
using MoviePicker.Api.Application.Avatars;
using MoviePicker.Api.Infrastructure.Google;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Google;

public sealed class GoogleProfilePhotoSourceTests
{
    private const string AccessToken = "ya29.token";
    private const string PhotoUrl = "https://lh3.googleusercontent.com/a/ACg8ocJ=s100";

    private readonly List<HttpRequestMessage> _requests = [];

    private GoogleProfilePhotoSource Build(Func<HttpRequestMessage, HttpResponseMessage> route, TimeSpan? budget = null)
    {
        var handler = new Mock<HttpMessageHandler>();
        handler.Protected()
            .Setup<Task<HttpResponseMessage>>("SendAsync", ItExpr.IsAny<HttpRequestMessage>(), ItExpr.IsAny<CancellationToken>())
            .Returns<HttpRequestMessage, CancellationToken>((request, _) =>
            {
                _requests.Add(request);
                return Task.FromResult(route(request));
            });
        var factory = new Mock<IHttpClientFactory>();
        factory.Setup(f => f.CreateClient(GoogleProfilePhotoSource.HttpClientName)).Returns(() => new HttpClient(handler.Object));
        return new GoogleProfilePhotoSource(
            factory.Object,
            NullLogger<GoogleProfilePhotoSource>.Instance,
            budget ?? GoogleProfilePhotoSource.Budget);
    }

    private static HttpResponseMessage People(string json) =>
        new(HttpStatusCode.OK) { Content = new StringContent(json, Encoding.UTF8, "application/json") };

    private static HttpResponseMessage Image(byte[] bytes)
    {
        var content = new ByteArrayContent(bytes);
        content.Headers.ContentType = new MediaTypeHeaderValue("image/jpeg");
        return new HttpResponseMessage(HttpStatusCode.OK) { Content = content };
    }

    private static string PhotosJson(string url, bool isDefault) =>
        $$"""{"photos":[{"metadata":{"primary":true},"url":"{{url}}"{{(isDefault ? ",\"default\":true" : "")}}}]}""";

    [Fact]
    public async Task PersonalPhoto_IsDownloadedAt256PixelsWithTheAccessToken()
    {
        var bytes = new byte[] { 0xFF, 0xD8, 0xFF, 0x01 };
        var source = Build(request => request.RequestUri!.Host == "people.googleapis.com"
            ? People(PhotosJson(PhotoUrl, isDefault: false))
            : Image(bytes));

        var photo = await source.FetchAsync(AccessToken);

        Assert.Equal(bytes, photo);
        Assert.Equal("Bearer", _requests[0].Headers.Authorization?.Scheme);
        Assert.Equal(AccessToken, _requests[0].Headers.Authorization?.Parameter);
        Assert.Equal("https://lh3.googleusercontent.com/a/ACg8ocJ=s256-c", _requests[1].RequestUri!.ToString());
        Assert.Null(_requests[1].Headers.Authorization);
    }

    [Fact]
    public async Task DefaultLetterPhoto_IsIgnored()
    {
        var source = Build(_ => People(PhotosJson(PhotoUrl, isDefault: true)));

        Assert.Null(await source.FetchAsync(AccessToken));
        Assert.Single(_requests);
    }

    [Fact]
    public async Task NoPhoto_IsIgnored()
    {
        var source = Build(_ => People("{}"));

        Assert.Null(await source.FetchAsync(AccessToken));
    }

    [Fact]
    public async Task PhotoOutsideGoogleHosts_IsNeverDownloaded()
    {
        var source = Build(_ => People(PhotosJson("https://evil.example.com/a.jpg", isDefault: false)));

        Assert.Null(await source.FetchAsync(AccessToken));
        Assert.Single(_requests);
    }

    [Fact]
    public async Task PeopleApiRefusal_IsIgnored()
    {
        var source = Build(_ => new HttpResponseMessage(HttpStatusCode.Forbidden));

        Assert.Null(await source.FetchAsync(AccessToken));
    }

    [Fact]
    public async Task NonTextualUrl_IsIgnored()
    {
        var source = Build(_ => People("""{"photos":[{"metadata":{"primary":true},"url":42}]}"""));

        Assert.Null(await source.FetchAsync(AccessToken));
        Assert.Single(_requests);
    }

    [Fact(Timeout = 5000)]
    public async Task StalledImageBody_IsAbandonedOnceTheBudgetIsSpent()
    {
        var source = Build(
            request => request.RequestUri!.Host == "people.googleapis.com"
                ? People(PhotosJson(PhotoUrl, isDefault: false))
                : new HttpResponseMessage(HttpStatusCode.OK) { Content = new StreamContent(new StalledStream()) },
            budget: TimeSpan.FromMilliseconds(50));

        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => source.FetchAsync(AccessToken));
    }

    [Fact]
    public async Task OversizedImage_IsIgnored()
    {
        var source = Build(request => request.RequestUri!.Host == "people.googleapis.com"
            ? People(PhotosJson(PhotoUrl, isDefault: false))
            : Image(new byte[AvatarPhotoImage.MaxBytes + 1]));

        Assert.Null(await source.FetchAsync(AccessToken));
    }

    private sealed class StalledStream : Stream
    {
        public override bool CanRead => true;
        public override bool CanSeek => false;
        public override bool CanWrite => false;
        public override long Length => throw new NotSupportedException();

        public override long Position
        {
            get => throw new NotSupportedException();
            set => throw new NotSupportedException();
        }

        public override async ValueTask<int> ReadAsync(Memory<byte> buffer, CancellationToken cancellationToken = default)
        {
            await Task.Delay(Timeout.Infinite, cancellationToken);
            return 0;
        }

        public override Task<int> ReadAsync(byte[] buffer, int offset, int count, CancellationToken cancellationToken) =>
            ReadAsync(buffer.AsMemory(offset, count), cancellationToken).AsTask();

        public override int Read(byte[] buffer, int offset, int count) => throw new NotSupportedException();
        public override void Flush() => throw new NotSupportedException();
        public override long Seek(long offset, SeekOrigin origin) => throw new NotSupportedException();
        public override void SetLength(long value) => throw new NotSupportedException();
        public override void Write(byte[] buffer, int offset, int count) => throw new NotSupportedException();
    }
}
