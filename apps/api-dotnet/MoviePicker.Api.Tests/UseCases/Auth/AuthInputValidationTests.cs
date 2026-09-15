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
}
