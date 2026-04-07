using MoviePicker.Api.Application.UseCases.Auth;
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
