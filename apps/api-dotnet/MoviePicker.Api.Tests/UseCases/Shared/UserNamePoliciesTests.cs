using MoviePicker.Api.Application.UseCases.FriendGroups;
using MoviePicker.Api.Application.UseCases.MovieLists;
using MoviePicker.Api.Domain.Exceptions;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.Shared;

public sealed class UserNamePoliciesTests
{
    public static TheoryData<string> InvisibleOnlyNames =>
    [
        "\u200B\u200B",
        "\u3164\u3164",
        "\u202E \u2066",
        "\uFEFF\u00AD",
    ];

    [Theory]
    [MemberData(nameof(InvisibleOnlyNames))]
    public void FriendGroupName_InvisibleCharactersOnly_IsRequired(string name)
    {
        var ex = Assert.Throws<BadRequestException>(() => FriendGroupPolicy.NormalizeName(name));

        Assert.Equal(ErrorCodes.ValidationFailed, ex.Reason);
    }

    [Fact]
    public void FriendGroupName_DropsDirectionalControls()
    {
        Assert.Equal("Les cinéphiles", FriendGroupPolicy.NormalizeName(" \u202ELes cinéphiles\u202C "));
    }

    [Theory]
    [MemberData(nameof(InvisibleOnlyNames))]
    public void MovieListName_InvisibleCharactersOnly_IsRequired(string name)
    {
        var ex = Assert.Throws<BadRequestException>(() => MovieListPolicy.NormalizeName(name));

        Assert.Equal(ErrorCodes.ValidationFailed, ex.Reason);
    }

    [Fact]
    public void MovieListName_DropsDirectionalControls()
    {
        Assert.Equal("Films d’hiver", MovieListPolicy.NormalizeName("\u2067Films d’hiver\u2069"));
    }
}
