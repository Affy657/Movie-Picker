using System.Net;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using MoviePicker.Api.Application.Caching;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.GetMovieShowcase;
using MoviePicker.Api.Configuration;
using MoviePicker.Api.Domain.Exceptions;
using MoviePicker.Api.Infrastructure.Persistence.InMemory;
using MoviePicker.Api.Infrastructure.Tmdb;
using MoviePicker.Api.Infrastructure.Web;
using MoviePicker.Api.Tests.Builders;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.GetMovieShowcase;

public sealed class ShowcaseTmdbStallTests
{
    private sealed class TmdbStallingOnceAfterItsHeaders : HttpMessageHandler
    {
        private int _calls;

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            if (Interlocked.Increment(ref _calls) == 1)
                return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK) { Content = new StalledContent() });

            var results = request.RequestUri!.Query.Contains("page=1", StringComparison.Ordinal)
                ? """[{"id":27205,"title":"Inception","release_date":"2010-07-16"}]"""
                : "[]";
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent($$"""{"results":{{results}}}""")
            });
        }
    }

    [Fact]
    public async Task HandleAsync_TmdbStallingAfterItsHeaders_FailsFastAndTheNextRequestLoadsAgain()
    {
        var options = Options.Create(new MoviePickerOptions { TmdbApiKey = "key", MovieShowcaseEnrichedCount = 0 });
        var tmdb = new TmdbMovieSearch(
            new HttpClient(new RequestTimeoutHandler(TimeSpan.FromMilliseconds(100)) { InnerHandler = new TmdbStallingOnceAfterItsHeaders() }),
            options,
            new MemoryCache(new MemoryCacheOptions()),
            new InMemorySharedCache(),
            NullLogger<TmdbMovieSearch>.Instance);
        var handler = new GetMovieShowcaseHandler(
            tmdb,
            Mock.Of<IMovieRepository>(),
            new SharedCacheReadThrough(new MemoryCache(new MemoryCacheOptions()), new InMemorySharedCache(), new SingleFlight()),
            options);
        var trending = new MovieShowcaseQuery(MovieShowcaseSections.Trending);
        using var patience = new CancellationTokenSource(TimeSpan.FromSeconds(5));

        await Assert.ThrowsAsync<ServiceUnavailableException>(() => handler.HandleAsync(trending).WaitAsync(patience.Token));
        var retried = await handler.HandleAsync(trending).WaitAsync(patience.Token);

        Assert.Equal("Inception", Assert.Single(retried.Items).Title);
    }
}
