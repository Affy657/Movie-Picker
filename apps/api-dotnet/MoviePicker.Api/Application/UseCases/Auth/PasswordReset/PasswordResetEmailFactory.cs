using MoviePicker.Api.Application.Ports;

namespace MoviePicker.Api.Application.UseCases.Auth.PasswordReset;

public static class PasswordResetEmailFactory
{
    private const string Tag = "password-reset";

    public static EmailMessage Build(string toEmail, Uri resetUrl, string? locale)
    {
        var url = resetUrl.AbsoluteUri;
        var siteUrl = resetUrl.GetLeftPart(UriPartial.Authority);
        var lang = (locale ?? "").Trim().ToLowerInvariant();
        return lang switch
        {
            "en" => new EmailMessage(
                toEmail,
                ServerCopy.English.ResetEmail.Subject,
                ServerCopy.English.ResetEmail.HtmlBody(url, siteUrl),
                ServerCopy.English.ResetEmail.TextBody(url),
                Tag),
            _ => new EmailMessage(
                toEmail,
                ServerCopy.PasswordResetEmail.Subject,
                ServerCopy.PasswordResetEmail.HtmlBody(url, siteUrl),
                ServerCopy.PasswordResetEmail.TextBody(url),
                Tag),
        };
    }
}
