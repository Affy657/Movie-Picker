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

    [Fact]
    public void ToPublicPosterPath_TmdbUrl_MapsToTheStatelessTmdbRoute()
    {
        Assert.Equal(
            "/api/v1/posters/tmdb/w500/kqjL17yufvn9OVLyXYpvtyrFfak.jpg",
            TmdbPosterUrlNormalizer.ToPublicPosterPath("https://image.tmdb.org/t/p/w500/kqjL17yufvn9OVLyXYpvtyrFfak.jpg?x=1"));
    }

    [Fact]
    public void ToPublicPosterPath_LegacyKeyPath_IsKept()
    {
        var legacy = TmdbPosterUrlNormalizer.ApiPosterPathPrefix + new string('b', 64);

        Assert.Equal(legacy, TmdbPosterUrlNormalizer.ToPublicPosterPath(legacy));
    }

    [Fact]
    public void ToPublicPosterPath_StatelessRoute_IsKept()
    {
        const string route = "/api/v1/posters/tmdb/w500/abc.png";

        Assert.Equal(route, TmdbPosterUrlNormalizer.ToPublicPosterPath(route));
    }

    [Fact]
    public void ToPublicPosterPath_TmdbUrlWithoutPosterFileShape_IsReturnedUnchanged()
    {
        const string url = "https://image.tmdb.org/t/p/w500/nested/abc.jpg";

        Assert.Equal(url, TmdbPosterUrlNormalizer.ToPublicPosterPath(url));
    }

    [Theory]
    [InlineData("w500", "abc.jpg", "https://image.tmdb.org/t/p/w500/abc.jpg")]
    [InlineData("w500", "A-b_9.png", "https://image.tmdb.org/t/p/w500/A-b_9.png")]
    [InlineData("w500", "x.webp", "https://image.tmdb.org/t/p/w500/x.webp")]
    public void TryResolveTmdbRoute_ValidSegments_BuildTheTmdbUrl(string size, string file, string expected)
    {
        Assert.True(TmdbPosterUrlNormalizer.TryResolveTmdbRoute(size, file, out var url));
        Assert.Equal(expected, url);
    }

    [Theory]
    [InlineData("x500", "abc.jpg")]
    [InlineData("w5", "abc.jpg")]
    [InlineData("w0500", "abc.jpg")]
    [InlineData("w185", "abc.jpg")]
    [InlineData("original", "abc.jpg")]
    [InlineData("w\u0665\u0660\u0660", "abc.jpg")]
    [InlineData("w500", "\u212Aabc.jpg")]
    [InlineData("w500", "abc.JPG")]
    [InlineData("w500", "abc.gif")]
    [InlineData("w500", "..%2Fabc.jpg")]
    [InlineData("w500", "../abc.jpg")]
    [InlineData("w500", ".jpg")]
    [InlineData("w500", "")]
    [InlineData("", "abc.jpg")]
    public void TryResolveTmdbRoute_InvalidSegments_AreRejected(string size, string file)
    {
        Assert.False(TmdbPosterUrlNormalizer.TryResolveTmdbRoute(size, file, out _));
    }

    [Fact]
    public void TryResolveTmdbRoute_OverlongFileName_IsRejected()
    {
        Assert.False(TmdbPosterUrlNormalizer.TryResolveTmdbRoute("w500", new string('a', 101) + ".jpg", out _));
    }

    [Fact]
    public void TryParseTmdbRoutePath_RoundTripsThroughToPublicPosterPath()
    {
        const string source = "https://image.tmdb.org/t/p/w500/abc.jpg";
        var route = TmdbPosterUrlNormalizer.ToPublicPosterPath(source);

        Assert.True(TmdbPosterUrlNormalizer.TryParseTmdbRoutePath(route, out var parsed));
        Assert.Equal(source, parsed);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("/api/v1/posters/tmdb/w500")]
    [InlineData("/api/v1/posters/tmdb/w500/abc.jpg/extra")]
    [InlineData("/api/v1/posters/tmdb/bad/abc.jpg")]
    public void TryParseTmdbRoutePath_Malformed_IsRejected(string? path)
    {
        Assert.False(TmdbPosterUrlNormalizer.TryParseTmdbRoutePath(path, out _));
    }

    [Theory]
    [InlineData("https://image.tmdb.org/t/p/w185/abc.jpg")]
    [InlineData("https://image.tmdb.org/t/p/original/abc.jpg")]
    [InlineData("https://image.tmdb.org/t/p/w92/abc.jpg")]
    public void ToPublicPosterPath_AnyStoredTmdbSize_PointsAtTheOnlySizeTheServerFetches(string stored)
    {
        Assert.Equal("/api/v1/posters/tmdb/w500/abc.jpg", TmdbPosterUrlNormalizer.ToPublicPosterPath(stored));
    }
}
