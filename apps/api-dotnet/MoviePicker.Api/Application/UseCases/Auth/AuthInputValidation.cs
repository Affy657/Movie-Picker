namespace MoviePicker.Api.Application.UseCases.Auth;

public static class AuthInputValidation
{
    public const int PasswordMinLength = 8;
    public const int DisplayNameMaxLength = 80;

    public static string? ValidatePassword(string? password)
    {
        if (string.IsNullOrEmpty(password) || password.Length < PasswordMinLength)
            return "Le mot de passe doit contenir au moins 8 caractères.";
        if (!password.Any(char.IsLetter))
            return "Le mot de passe doit contenir au moins une lettre.";
        if (!password.Any(char.IsDigit))
            return "Le mot de passe doit contenir au moins un chiffre.";
        return null;
    }

    public static string? ValidateDisplayName(string? displayName)
    {
        if (string.IsNullOrWhiteSpace(displayName))
            return "Le pseudo est requis.";
        var t = displayName.Trim();
        if (t.Length > DisplayNameMaxLength)
            return $"Le pseudo ne peut pas dépasser {DisplayNameMaxLength} caractères.";
        return null;
    }
}
