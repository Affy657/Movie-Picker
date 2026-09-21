using System.Net;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using Moq.Protected;
using MoviePicker.Api.Configuration;
using MoviePicker.Api.Infrastructure.Web;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Web;

public sealed class HttpWebShellSourceTests
{
    private const string Shell = "<html><head></head><body><div id=\"root\"></div></body></html>";

    private readonly List<Uri> _requests = [];
    private Func<Task<HttpResponseMessage>> _respond = () =>
        Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent(Shell) });

    private HttpWebShellSource CreateSut()
    {
        var handler = new Mock<HttpMessageHandler>();
        handler.Protected()
            .Setup<Task<HttpResponseMessage>>("SendAsync", ItExpr.IsAny<HttpRequestMessage>(), ItExpr.IsAny<CancellationToken>())
            .Returns((HttpRequestMessage req, CancellationToken _) =>
            {
                _requests.Add(req.RequestUri!);
                return _respond();
            });
        var factory = new Mock<IHttpClientFactory>();
        factory.Setup(f => f.CreateClient(HttpWebShellSource.HttpClientName)).Returns(() => new HttpClient(handler.Object));
        return new HttpWebShellSource(
            factory.Object,
            new MemoryCache(new MemoryCacheOptions()),
            Options.Create(new MoviePickerOptions { PublicWebBaseUrl = "https://web.example/" }),
            NullLogger<HttpWebShellSource>.Instance);
    }

    [Fact]
    public async Task GetShellAsync_FetchesTheShellOfThePublicSite()
    {
        var sut = CreateSut();

        var shell = await sut.GetShellAsync();

        Assert.Contains("id=\"root\"", shell);
        Assert.Equal(new Uri("https://web.example/index.html"), Assert.Single(_requests));
    }

    [Fact]
    public async Task GetShellAsync_ServesTheSecondCallFromMemory()
    {
        var sut = CreateSut();

        await sut.GetShellAsync();
        await sut.GetShellAsync();

        Assert.Single(_requests);
    }

    [Fact]
    public async Task GetShellAsync_ConcurrentCalls_ShareOneFetch()
    {
        var sut = CreateSut();
        var gate = new TaskCompletionSource<HttpResponseMessage>();
        _respond = () => gate.Task;

        var first = sut.GetShellAsync();
        var second = sut.GetShellAsync();
        var third = sut.GetShellAsync();
        gate.SetResult(new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent(Shell) });

        Assert.All(await Task.WhenAll(first, second, third), shell => Assert.Contains("id=\"root\"", shell));
        Assert.Single(_requests);
    }

    [Fact]
    public async Task GetShellAsync_UpstreamError_ReturnsNullAndDoesNotCacheIt()
    {
        var sut = CreateSut();
        _respond = () => Task.FromResult(new HttpResponseMessage(HttpStatusCode.BadGateway));

        Assert.Null(await sut.GetShellAsync());

        _respond = () => Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent(Shell) });
        Assert.NotNull(await sut.GetShellAsync());
        Assert.Equal(2, _requests.Count);
    }

    [Fact]
    public async Task GetShellAsync_NetworkFailure_ReturnsNull()
    {
        var sut = CreateSut();
        _respond = () => throw new HttpRequestException("down");

        Assert.Null(await sut.GetShellAsync());
    }

    [Fact]
    public async Task GetShellAsync_CallerCancelled_LetsTheFetchFinishForTheOthers()
    {
        var sut = CreateSut();
        var gate = new TaskCompletionSource<HttpResponseMessage>();
        _respond = () => gate.Task;
        using var cancelled = new CancellationTokenSource();

        var impatient = sut.GetShellAsync(cancelled.Token);
        var patient = sut.GetShellAsync();
        cancelled.Cancel();
        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => impatient);
        gate.SetResult(new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent(Shell) });

        Assert.Contains("id=\"root\"", await patient);
        Assert.Single(_requests);
    }

    [Fact]
    public async Task GetShellAsync_DocumentWithoutRoot_IsNotAShell()
    {
        var sut = CreateSut();
        _respond = () => Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent("<html><body>maintenance</body></html>") });

        Assert.Null(await sut.GetShellAsync());
    }
}
