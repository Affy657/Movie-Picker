using MoviePicker.Api.Application;
using MoviePicker.Api.Application.Ports;
using Xunit;

namespace MoviePicker.Api.Tests.Application;

public sealed class WatchProviderMappingTests
{
    [Fact]
    public void ToDto_MapsEachField()
    {
        var offers = new[]
        {
            new TmdbWatchProviderOffer(8, "Netflix", "/logo.png", "flatrate"),
            new TmdbWatchProviderOffer(119, "Prime", null, "rent"),
        };

        var dtos = WatchProviderMapping.ToDto(offers);

        Assert.Equal(2, dtos.Count);
        Assert.Equal(8, dtos[0].ProviderId);
        Assert.Equal("Netflix", dtos[0].Name);
        Assert.Equal("/logo.png", dtos[0].LogoPath);
        Assert.Equal("flatrate", dtos[0].Type);
        Assert.Null(dtos[1].LogoPath);
        Assert.Equal("rent", dtos[1].Type);
    }

    [Fact]
    public void ToDto_EmptyInput_ReturnsEmpty()
    {
        Assert.Empty(WatchProviderMapping.ToDto([]));
    }
}
