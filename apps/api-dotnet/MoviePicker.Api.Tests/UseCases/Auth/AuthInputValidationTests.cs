using MoviePicker.Api.Application.UseCases.Auth;
using MoviePicker.Api.Domain.Exceptions;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.Auth;

public sealed class AuthInputValidationTests
{
    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("short")]
    [InlineData("12345678")]
    [InlineData("abcdefgh")]
    public void ValidatePassword_Invalid_ReturnsMessage(string? password)
    {
        var msg = AuthInputValidation.ValidatePassword(password);
        Assert.NotNull(msg);
    }

    [Fact]
    public void ValidatePassword_Valid_ReturnsNull()
    {
        Assert.Null(AuthInputValidation.ValidatePassword("abcd1234"));
        Assert.Null(AuthInputValidation.ValidatePassword("Passw0rd"));
        Assert.Null(AuthInputValidation.ValidatePassword("a1" + new string('x', AuthInputValidation.PasswordMaxLength - 2)));
    }

    [Fact]
    public void ValidatePassword_LongerThanMaxLength_ReturnsMessage()
    {
        var tooLong = "a1" + new string('x', AuthInputValidation.PasswordMaxLength - 1);

        var msg = AuthInputValidation.ValidatePassword(tooLong);

        Assert.NotNull(msg);
        Assert.Equal(ErrorCodes.PasswordTooLong, msg!.Reason);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void ValidateDisplayName_Invalid_ReturnsMessage(string? name)
    {
        Assert.NotNull(AuthInputValidation.ValidateDisplayName(name));
    }

    [Fact]
    public void ValidateDisplayName_TooLong_ReturnsMessage()
    {
        var msg = AuthInputValidation.ValidateDisplayName(new string('x', AuthInputValidation.DisplayNameMaxLength + 1));
        Assert.NotNull(msg);
    }

    [Fact]
    public void ValidateDisplayName_Valid_ReturnsNull()
    {
        Assert.Null(AuthInputValidation.ValidateDisplayName("  OK  "));
    }

    [Theory]
    [InlineData("\u200B\u200B\u200B")]
    [InlineData("\u3164")]
    [InlineData("\u202E\u202E")]
    public void ValidateDisplayName_InvisibleCharactersOnly_IsRequired(string name)
    {
        var error = AuthInputValidation.ValidateDisplayName(name);

        Assert.Equal(ErrorCodes.DisplayNameRequired, error?.Reason);
    }

    [Fact]
    public void CleanDisplayName_DropsTheRightToLeftOverride()
    {
        Assert.Null(AuthInputValidation.ValidateDisplayName("\u202Eecila"));
        Assert.Equal("ecila", AuthInputValidation.CleanDisplayName("  \u202Eecila "));
    }

    [Theory]
    [InlineData("alice@exemple.fr")]
    [InlineData("a.b+c@sub.domaine.co")]
    [InlineData("bob@xn--e1afmkfd.xn--p1ai")]
    [InlineData("  carl@exemple.com  ")]
    public void ValidateEmail_AddressWithATopLevelDomain_ReturnsNull(string email)
    {
        Assert.Null(AuthInputValidation.ValidateEmail(email));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("alice@exemple")]
    [InlineData("alice@localhost")]
    [InlineData("alice@exemple.f")]
    [InlineData("alice@exemple..fr")]
    [InlineData("alice@exemple.123")]
    [InlineData("alice@.fr")]
    [InlineData("@exemple.fr")]
    [InlineData("alice@exemple.fr-")]
    public void ValidateEmail_AddressWithoutATopLevelDomain_IsInvalid(string? email)
    {
        Assert.Equal(ErrorCodes.EmailInvalid, AuthInputValidation.ValidateEmail(email)?.Reason);
    }
}
