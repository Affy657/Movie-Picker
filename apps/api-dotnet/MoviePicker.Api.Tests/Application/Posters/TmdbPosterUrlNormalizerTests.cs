using MoviePicker.Api.Application.Posters;
using Xunit;

namespace MoviePicker.Api.Tests.Application.Posters;

public sealed class TmdbPosterUrlNormalizerTests
{
    [Fact]
    public void TryNormalizeToHttpsTmdb_StripsQueryAndLowercasesHost()
    {
        Assert.True(
            TmdbPosterUrlNormalizer.TryNormalizeToHttpsTmdb(
                "https://IMAGE.TMDB.ORG/t/p/w154/x.jpg?foo=1",
                out var n));
        Assert.Equal("https://image.tmdb.org/t/p/w154/x.jpg", n);
    }

    [Fact]
    public void TryNormalizeToHttpsTmdb_RejectsNonTmdbHost()
    {
        Assert.False(TmdbPosterUrlNormalizer.TryNormalizeToHttpsTmdb("https://evil.com/t/p/w154/x.jpg", out _));
    }

    [Fact]
    public void ComputeKey_IsDeterministic()
    {
        var k1 = TmdbPosterUrlNormalizer.ComputeKey("https://image.tmdb.org/t/p/w154/a.jpg");
        var k2 = TmdbPosterUrlNormalizer.ComputeKey("https://image.tmdb.org/t/p/w154/a.jpg");
        Assert.Equal(k1, k2);
        Assert.Equal(64, k1.Length);
        Assert.True(TmdbPosterUrlNormalizer.IsValidPosterKey(k1));
    }

    [Fact]
    public void TryParsePosterKey_AcceptsValidPath()
    {
        var key = new string('a', 64);
        Assert.True(TmdbPosterUrlNormalizer.TryParsePosterKey(TmdbPosterUrlNormalizer.ApiPosterPathPrefix + key, out var parsed));
        Assert.Equal(key, parsed);
    }

    [Theory]
    [InlineData("https://image.tmdb.org/t/p/w154/x.jpg")]
    [InlineData("https://image.tmdb.org/t/p/w92/x.jpg")]
    [InlineData("https://image.tmdb.org/t/p/original/x.jpg")]
    public void UpgradeTmdbSize_RewritesSizeSegmentToTarget(string url)
    {
        Assert.Equal(
            "https://image.tmdb.org/t/p/w500/x.jpg",
            TmdbPosterUrlNormalizer.UpgradeTmdbSize(url, "w500"));
    }

    [Fact]
    public void UpgradeTmdbSize_LeavesUrlWithoutSizeSegmentUnchanged()
    {
        const string url = "https://image.tmdb.org/other/x.jpg";
        Assert.Equal(url, TmdbPosterUrlNormalizer.UpgradeTmdbSize(url, "w500"));
    }
}
