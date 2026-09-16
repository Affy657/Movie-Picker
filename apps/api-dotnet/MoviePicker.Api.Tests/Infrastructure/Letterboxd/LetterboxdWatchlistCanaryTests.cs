using Microsoft.Extensions.Logging.Abstractions;
using MoviePicker.Api.Infrastructure.Letterboxd;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Letterboxd;

public sealed class CanaryFactAttribute : FactAttribute
{
    public const string UsernameVariable = "LETTERBOXD_CANARY_USERNAME";

    public CanaryFactAttribute()
    {
        if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable(UsernameVariable)))
            Skip = $"{UsernameVariable} not set: this test reads a live Letterboxd page.";
    }
}

[Trait("Category", "Canary")]
public sealed class LetterboxdWatchlistCanaryTests
{
    [CanaryFact]
    public async Task TheLiveWatchlistMarkup_IsStillReadByTheRealClient()
    {
        var username = Environment.GetEnvironmentVariable(CanaryFactAttribute.UsernameVariable)!;
        using var http = new HttpClient();
        LetterboxdWatchlistClient.ConfigureHttpClient(http);
        var sut = new LetterboxdWatchlistClient(http, NullLogger<LetterboxdWatchlistClient>.Instance);

        var snapshot = await sut.GetWatchlistAsync(username);

        Assert.True(snapshot.IsComplete, $"the watchlist of {username} could not be read completely");
        Assert.NotEmpty(snapshot.Films);
    }
}
