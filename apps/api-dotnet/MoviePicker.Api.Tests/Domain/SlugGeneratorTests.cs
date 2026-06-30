using MoviePicker.Api.Domain.Services;
using Xunit;

namespace MoviePicker.Api.Tests.Domain;

public sealed class SlugGeneratorTests
{
    private const string UrlSafeAlphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_";

    [Fact]
    public void NewSlug_DefaultLength_Is10()
    {
        Assert.Equal(10, SlugGenerator.NewSlug().Length);
    }

    [Theory]
    [InlineData(1)]
    [InlineData(8)]
    [InlineData(64)]
    public void NewSlug_CustomLength_MatchesRequested(int length)
    {
        Assert.Equal(length, SlugGenerator.NewSlug(length).Length);
    }

    [Fact]
    public void NewHostToken_DefaultLength_Is32()
    {
        Assert.Equal(32, SlugGenerator.NewHostToken().Length);
    }

    [Fact]
    public void NewSlug_UsesOnlyUrlSafeAlphabet()
    {
        var slug = SlugGenerator.NewSlug(256);

        Assert.All(slug, c => Assert.Contains(c, UrlSafeAlphabet));
    }

    [Fact]
    public void NewSlug_SuccessiveCalls_ProduceDistinctValues()
    {
        Assert.NotEqual(SlugGenerator.NewSlug(), SlugGenerator.NewSlug());
    }
}
