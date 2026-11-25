using MoviePicker.Api.Application.Ports;
using Xunit;

namespace MoviePicker.Api.Tests.Application;

public sealed class CatalogLanguageTests
{
    [Theory]
    [InlineData("fr-FR", CatalogLanguage.French)]
    [InlineData("fr", CatalogLanguage.French)]
    [InlineData("fr-CA", CatalogLanguage.French)]
    [InlineData("en-US", CatalogLanguage.English)]
    [InlineData("en", CatalogLanguage.English)]
    [InlineData(" EN-gb ", CatalogLanguage.English)]
    public void FromTag_ReadsALanguageOfTheClosedList(string tag, CatalogLanguage expected) =>
        Assert.Equal(expected, CatalogLanguages.FromTag(tag));

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("*")]
    [InlineData("de-DE")]
    [InlineData("english")]
    [InlineData("es")]
    public void FromTag_LeavesAnyOtherTagUnread(string? tag) =>
        Assert.Null(CatalogLanguages.FromTag(tag));

    [Fact]
    public void FirstSupported_TakesTheFirstPreferenceOfTheClosedList() =>
        Assert.Equal(CatalogLanguage.English, CatalogLanguages.FirstSupported(["de-DE", "en-GB", "fr-FR"]));

    [Fact]
    public void FirstSupported_FallsBackToFrenchWhenNoPreferenceIsSupported() =>
        Assert.Equal(CatalogLanguage.French, CatalogLanguages.FirstSupported(["de-DE", "*"]));

    [Fact]
    public void FirstSupported_FallsBackToFrenchWithoutAnyPreference() =>
        Assert.Equal(CatalogLanguage.French, CatalogLanguages.FirstSupported([]));

    [Fact]
    public void Default_IsFrench() => Assert.Equal(CatalogLanguage.French, default);

    [Theory]
    [InlineData(CatalogLanguage.French, "fr-FR", "fr")]
    [InlineData(CatalogLanguage.English, "en-US", "en")]
    public void Codes_NameTheLanguageForTmdb(CatalogLanguage language, string tmdbCode, string isoCode)
    {
        Assert.Equal(tmdbCode, language.TmdbCode());
        Assert.Equal(isoCode, language.IsoCode());
    }
}
