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
}
