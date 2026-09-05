using MoviePicker.Api.Application.UseCases.Profile;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.Profile;

public sealed class HandlePolicyTests
{
    [Theory]
    [InlineData("alice")]
    [InlineData("bob_2")]
    [InlineData("a1b")]
    [InlineData("user_name_123")]
    public void Validate_AcceptsWellFormedHandles(string handle)
    {
        Assert.Null(HandlePolicy.Validate(handle));
    }

    [Theory]
    [InlineData("")]
    [InlineData("ab")]
    [InlineData("this_handle_is_way_too_long")]
    [InlineData("has-dash")]
    [InlineData("é_accent")]
    [InlineData("with space")]
    public void Validate_RejectsMalformedHandles(string handle)
    {
        Assert.NotNull(HandlePolicy.Validate(handle));
    }

    [Fact]
    public void Validate_NormalizesCaseBeforeChecking()
    {
        Assert.Null(HandlePolicy.Validate("Alice"));
    }

    [Theory]
    [InlineData("me")]
    [InlineData("admin")]
    [InlineData("settings")]
    [InlineData("api")]
    public void Validate_RejectsReservedWords(string handle)
    {
        Assert.NotNull(HandlePolicy.Validate(handle));
    }

    [Fact]
    public void Normalize_LowercasesAndTrims()
    {
        Assert.Equal("alice", HandlePolicy.Normalize("  ALICE  "));
    }

    [Theory]
    [InlineData("Jean Dupont", "jean_dupont")]
    [InlineData("Élodie", "elodie")]
    [InlineData("a", "a00")]
    [InlineData("", "member")]
    [InlineData("Marie-Hélène", "marie_helene")]
    public void SlugifyBase_ProducesValidSlug(string displayName, string expected)
    {
        var slug = HandlePolicy.SlugifyBase(displayName);
        Assert.Equal(expected, slug);
        Assert.Null(HandlePolicy.Validate(slug));
    }

    [Fact]
    public void ValidateBio_RejectsOver140Chars()
    {
        Assert.NotNull(HandlePolicy.ValidateBio(new string('x', 141)));
        Assert.Null(HandlePolicy.ValidateBio(new string('x', 140)));
        Assert.Null(HandlePolicy.ValidateBio(null));
    }
}
