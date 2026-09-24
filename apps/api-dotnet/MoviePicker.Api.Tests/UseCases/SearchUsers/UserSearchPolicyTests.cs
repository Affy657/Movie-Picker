using System.Text.RegularExpressions;
using MoviePicker.Api.Application.UseCases.SearchUsers;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.SearchUsers;

public sealed class UserSearchPolicyTests
{
    [Theory]
    [InlineData("Léa Moreau", "lea")]
    [InlineData("Lea Moreau", "léa")]
    [InlineData("Léa Moreau", "MOREAU")]
    [InlineData("Sofia Benali", "ali")]
    [InlineData("Adrien Morand", "morand")]
    public void Contains_IgnoresCaseAndDiacritics(string value, string query)
    {
        Assert.True(UserSearchPolicy.Contains(value, query));
    }

    [Theory]
    [InlineData("Léa Moreau", "zephyrin")]
    [InlineData("Sofia Benali", "xyz")]
    public void Contains_UnrelatedQuery_ReturnsFalse(string value, string query)
    {
        Assert.False(UserSearchPolicy.Contains(value, query));
    }

    [Fact]
    public void Contains_NullValue_ReturnsFalse()
    {
        Assert.False(UserSearchPolicy.Contains(null, "lea"));
    }

    [Theory]
    [InlineData("Léa Moreau", "lea", true)]
    [InlineData("Léa Moreau", "moreau", false)]
    [InlineData("sofiamorgane", "sofia", true)]
    public void StartsWith_MatchesOnlyAtTheBeginning(string value, string query, bool expected)
    {
        Assert.Equal(expected, UserSearchPolicy.StartsWith(value, query));
    }

    [Fact]
    public void ToRegexPattern_MatchesAccentedVariants()
    {
        var pattern = new Regex(UserSearchPolicy.ToRegexPattern("lea"), RegexOptions.IgnoreCase);

        Assert.Matches(pattern, "Léa Moreau");
        Assert.Matches(pattern, "Lea Moreau");
        Assert.DoesNotMatch(pattern, "Julien Morin");
    }

    [Fact]
    public void ToRegexPattern_MatchesWhenQueryItselfIsAccented()
    {
        var pattern = new Regex(UserSearchPolicy.ToRegexPattern("léa"), RegexOptions.IgnoreCase);

        Assert.Matches(pattern, "Lea Moreau");
        Assert.Matches(pattern, "Léa Moreau");
    }

    [Theory]
    [InlineData(".*")]
    [InlineData("a+b")]
    [InlineData("(")]
    [InlineData("[a-z]")]
    public void ToRegexPattern_EscapesRegexMetacharacters(string query)
    {
        var pattern = UserSearchPolicy.ToRegexPattern(query);

        var compiled = new Regex(pattern, RegexOptions.IgnoreCase);
        Assert.DoesNotMatch(compiled, "Adrien Morand");
        Assert.Matches(compiled, $"prefix{query}suffix");
    }

    [Fact]
    public void Normalize_TrimsSurroundingWhitespace()
    {
        Assert.Equal("lea", UserSearchPolicy.Normalize("  lea  "));
        Assert.Equal(string.Empty, UserSearchPolicy.Normalize(null));
    }

    [Fact]
    public void Normalize_AVeryLongQuery_IsCutToTheMaximumLength()
    {
        var normalized = UserSearchPolicy.Normalize(new string('a', 5_000));

        Assert.Equal(new string('a', UserSearchPolicy.MaxQueryLength), normalized);
    }

    [Fact]
    public void ToRegexPattern_OfTheLongestAccentFoldedQuery_StaysFarBelowTheMongoPatternLimit()
    {
        var pattern = "^" + UserSearchPolicy.ToRegexPattern(UserSearchPolicy.Normalize(new string('a', 5_000)));

        Assert.True(pattern.Length < 4_096, $"pattern length {pattern.Length}");
    }

    [Fact]
    public void Normalize_NeverCutsASurrogatePairInHalf()
    {
        var query = new string('a', UserSearchPolicy.MaxQueryLength - 1) + "🎬" + "suite";

        var normalized = UserSearchPolicy.Normalize(query);

        Assert.False(char.IsHighSurrogate(normalized[^1]));
        Assert.Equal(new string('a', UserSearchPolicy.MaxQueryLength - 1), normalized);
        Assert.NotEmpty(UserSearchPolicy.ToRegexPattern(normalized));
    }

    [Fact]
    public void Normalize_IsStableOnItsOwnOutput()
    {
        var once = UserSearchPolicy.Normalize(new string('a', 70) + "   ");

        Assert.Equal(once, UserSearchPolicy.Normalize(once));
    }
}
