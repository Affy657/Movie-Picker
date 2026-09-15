using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.Auth;

public static class AuthInputValidation
{
    public const int PasswordMinLength = 8;
    public const int PasswordMaxLength = 128;
    public const int DisplayNameMaxLength = 80;

    public static BadRequestException? ValidatePassword(string? password)
    {
        if (string.IsNullOrEmpty(password) || password.Length < PasswordMinLength)
            return Errors.PasswordTooShort(PasswordMinLength);
        if (password.Length > PasswordMaxLength)
            return Errors.PasswordTooLong(PasswordMaxLength);
        if (!password.Any(char.IsLetter))
            return Errors.PasswordNeedsLetter();
        if (!password.Any(char.IsDigit))
            return Errors.PasswordNeedsDigit();
        return null;
    }

    public static BadRequestException? ValidateDisplayName(string? displayName)
    {
        if (string.IsNullOrWhiteSpace(displayName))
            return Errors.DisplayNameRequired();
        var t = displayName.Trim();
        if (t.Length > DisplayNameMaxLength)
            return Errors.DisplayNameTooLong(DisplayNameMaxLength);
        return null;
    }
}
