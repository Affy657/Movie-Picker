using MoviePicker.Api.Domain;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.Auth;

public static class AuthInputValidation
{
    public const int PasswordMinLength = 8;
    public const int PasswordMaxLength = 128;
    public const int DisplayNameMaxLength = 80;

    private const int MinTopLevelDomainLength = 2;

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

    public static string CleanDisplayName(string? displayName) => UserText.Clean(displayName);

    public static BadRequestException? ValidateDisplayName(string? displayName)
    {
        var cleaned = CleanDisplayName(displayName);
        if (!UserText.HasVisibleCharacter(cleaned))
            return Errors.DisplayNameRequired();
        if (cleaned.Length > DisplayNameMaxLength)
            return Errors.DisplayNameTooLong(DisplayNameMaxLength);
        return null;
    }

    public static BadRequestException? ValidateEmail(string? email)
    {
        var trimmed = (email ?? string.Empty).Trim();
        var at = trimmed.LastIndexOf('@');
        if (at <= 0)
            return Errors.EmailInvalid();

        var labels = trimmed[(at + 1)..].Split('.');
        if (labels.Length < 2 || labels.Any(label => label.Length == 0))
            return Errors.EmailInvalid();

        return IsTopLevelDomain(labels[^1]) ? null : Errors.EmailInvalid();
    }

    private static bool IsTopLevelDomain(string label) =>
        label.Length >= MinTopLevelDomainLength
        && label.Any(char.IsLetter)
        && label.All(character => char.IsLetterOrDigit(character) || character == '-')
        && label[0] != '-'
        && label[^1] != '-';
}
