using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.LetterboxdImport;
using MoviePicker.Api.Domain.Entities;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.LetterboxdImport;

public sealed class LetterboxdTmdbMatcherTests
{
    private static TmdbSearchItem Item(int id, string title, string? originalTitle = null) =>
        new(id, MovieMediaType.Movie, title, "2004", null, 7.0, originalTitle);

    private static TmdbSearchItem Item(int id, MovieMediaType mediaType, string title, string year) =>
        new(id, mediaType, title, year, null, 7.0, title);

    [Fact]
    public void SelectConfident_SingleCandidateMatchingOriginalTitle_IsConfident()
    {
        var candidates = new[] { Item(5255, "Le Pôle express", "The Polar Express") };

        var chosen = LetterboxdTmdbMatcher.SelectConfident("The Polar Express", "2004", candidates);

        Assert.NotNull(chosen);
        Assert.Equal(5255, chosen.Id);
    }

    [Fact]
    public void SelectConfident_MatchesLocalizedTitleToo()
    {
        var candidates = new[] { Item(1, "Le Pôle express", "Something Else") };

        var chosen = LetterboxdTmdbMatcher.SelectConfident("le pole express", "2004", candidates);

        Assert.NotNull(chosen);
        Assert.Equal(1, chosen.Id);
    }

    [Fact]
    public void SelectConfident_IgnoresCaseAccentsAndPunctuation()
    {
        var candidates = new[] { Item(1, "Titre FR", "Spider-Man: No Way Home") };

        var chosen = LetterboxdTmdbMatcher.SelectConfident("spider man no way home", "2021", candidates);

        Assert.NotNull(chosen);
    }

    [Fact]
    public void SelectConfident_NoCandidateMatchesTitle_IsAmbiguous()
    {
        var candidates = new[]
        {
            Item(1, "Sermons de minuit", "Midnight Mass Something"),
            Item(2, "The Manson Brothers", "The Manson Brothers")
        };

        Assert.Null(LetterboxdTmdbMatcher.SelectConfident("Midnight Mass", "2021", candidates));
    }

    [Fact]
    public void SelectConfident_SeveralCandidatesShareTheTitle_IsAmbiguous()
    {
        var candidates = new[] { Item(1, "Akira", "Akira"), Item(2, "Akira", "Akira") };

        Assert.Null(LetterboxdTmdbMatcher.SelectConfident("Akira", "", candidates));
    }

    [Fact]
    public void SelectConfident_ExactTitleOnlyOnASeries_IsAmbiguous()
    {
        var candidates = new[]
        {
            Item(334511, MovieMediaType.Tv, "Come and See", "1985"),
            Item(25237, MovieMediaType.Movie, "Requiem pour un massacre", "1985"),
            Item(9, MovieMediaType.Movie, "The Story of the Film 'Come and See'", "1985")
        };

        Assert.Null(LetterboxdTmdbMatcher.SelectConfident("Come and See", "1985", candidates));
    }

    [Fact]
    public void SelectConfident_MovieWinsOverSeriesSharingTheTitle()
    {
        var candidates = new[]
        {
            Item(1, MovieMediaType.Tv, "Akira", "1988"),
            Item(2, MovieMediaType.Movie, "Akira", "1988")
        };

        var chosen = LetterboxdTmdbMatcher.SelectConfident("Akira", "1988", candidates);

        Assert.NotNull(chosen);
        Assert.Equal(2, chosen.Id);
    }

    [Fact]
    public void SelectConfident_SeveralMoviesShareTheTitle_TheOnlyOneOfThatYearWins()
    {
        var candidates = new[]
        {
            Item(426063, MovieMediaType.Movie, "Nosferatu", "2024"),
            Item(7, MovieMediaType.Movie, "Nosferatu", "2025")
        };

        var chosen = LetterboxdTmdbMatcher.SelectConfident("Nosferatu", "2024", candidates);

        Assert.NotNull(chosen);
        Assert.Equal(426063, chosen.Id);
    }

    [Theory]
    [InlineData("2023")]
    [InlineData("")]
    public void SelectConfident_SeveralMoviesShareTheTitle_WithoutAYearToDecide_IsAmbiguous(string year)
    {
        var candidates = new[]
        {
            Item(1, MovieMediaType.Movie, "Nosferatu", "2024"),
            Item(2, MovieMediaType.Movie, "Nosferatu", "2025")
        };

        Assert.Null(LetterboxdTmdbMatcher.SelectConfident("Nosferatu", year, candidates));
    }

    [Fact]
    public void SelectConfident_SeveralMoviesShareTitleAndYear_IsAmbiguous()
    {
        var candidates = new[]
        {
            Item(1, MovieMediaType.Movie, "Nosferatu", "2024"),
            Item(2, MovieMediaType.Movie, "Nosferatu", "2024")
        };

        Assert.Null(LetterboxdTmdbMatcher.SelectConfident("Nosferatu", "2024", candidates));
    }

    [Fact]
    public void SelectConfident_NoCandidate_IsAmbiguous()
    {
        Assert.Null(LetterboxdTmdbMatcher.SelectConfident("Akira", "1988", []));
    }

    [Fact]
    public void SelectConfident_BlankLetterboxdTitle_IsAmbiguous()
    {
        Assert.Null(LetterboxdTmdbMatcher.SelectConfident("   ", "1988", [Item(1, "Akira", "Akira")]));
    }
}
