namespace MoviePicker.Api.Application.UseCases.Auth;

public static class EmailMasking
{
    public static string Mask(string email)
    {
        if (string.IsNullOrWhiteSpace(email))
            return "***";
        var at = email.IndexOf('@');
        if (at <= 0)
            return "***";
        var local = email[..at];
        var domain = email[at..].ReplaceLineEndings(string.Empty);
        if (local.Length <= 1)
            return "*" + domain;
        return local[0] + "***" + domain;
    }
}
