using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.LetterboxdImport;
using MoviePicker.Api.Domain.Entities;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.LetterboxdImport;

public sealed class LetterboxdTmdbMatcherTests
{
    private static TmdbSearchItem Item(int id, string title, string? originalTitle = null) =>
        new(id, MovieMediaType.Movie, title, "2004", null, 7.0, originalTitle);

    [Fact]
    public void SelectConfident_SingleCandidateMatchingOriginalTitle_IsConfident()
    {
        var candidates = new[] { Item(5255, "Le Pôle express", "The Polar Express") };

        var chosen = LetterboxdTmdbMatcher.SelectConfident("The Polar Express", candidates);

        Assert.NotNull(chosen);
        Assert.Equal(5255, chosen.Id);
    }

    [Fact]
    public void SelectConfident_MatchesLocalizedTitleToo()
    {
        var candidates = new[] { Item(1, "Le Pôle express", "Something Else") };

        var chosen = LetterboxdTmdbMatcher.SelectConfident("le pole express", candidates);

        Assert.NotNull(chosen);
        Assert.Equal(1, chosen.Id);
    }

    [Fact]
    public void SelectConfident_IgnoresCaseAccentsAndPunctuation()
    {
        var candidates = new[] { Item(1, "Titre FR", "Spider-Man: No Way Home") };

        var chosen = LetterboxdTmdbMatcher.SelectConfident("spider man no way home", candidates);

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

        Assert.Null(LetterboxdTmdbMatcher.SelectConfident("Midnight Mass", candidates));
    }

    [Fact]
    public void SelectConfident_SeveralCandidatesShareTheTitle_IsAmbiguous()
    {
        var candidates = new[] { Item(1, "Akira", "Akira"), Item(2, "Akira", "Akira") };

        Assert.Null(LetterboxdTmdbMatcher.SelectConfident("Akira", candidates));
    }

    [Fact]
    public void SelectConfident_NoCandidate_IsAmbiguous()
    {
        Assert.Null(LetterboxdTmdbMatcher.SelectConfident("Akira", []));
    }

    [Fact]
    public void SelectConfident_BlankLetterboxdTitle_IsAmbiguous()
    {
        Assert.Null(LetterboxdTmdbMatcher.SelectConfident("   ", [Item(1, "Akira", "Akira")]));
    }
}
