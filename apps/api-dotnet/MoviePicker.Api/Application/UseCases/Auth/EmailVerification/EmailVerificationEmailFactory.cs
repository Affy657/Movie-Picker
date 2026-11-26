using MoviePicker.Api.Application.Ports;

namespace MoviePicker.Api.Application.UseCases.Auth.EmailVerification;

public static class EmailVerificationEmailFactory
{
    public const string Tag = "email-verification";

    public static EmailMessage Build(string toEmail, Uri confirmationUrl, string? locale)
    {
        var url = confirmationUrl.AbsoluteUri;
        var siteUrl = confirmationUrl.GetLeftPart(UriPartial.Authority);
        var inEnglish = string.Equals((locale ?? "").Trim(), "en", StringComparison.OrdinalIgnoreCase);
        return inEnglish
            ? new EmailMessage(
                toEmail,
                ServerCopy.English.VerificationEmail.Subject,
                ServerCopy.English.VerificationEmail.HtmlBody(url, siteUrl),
                ServerCopy.English.VerificationEmail.TextBody(url),
                Tag)
            : new EmailMessage(
                toEmail,
                ServerCopy.EmailVerificationEmail.Subject,
                ServerCopy.EmailVerificationEmail.HtmlBody(url, siteUrl),
                ServerCopy.EmailVerificationEmail.TextBody(url),
                Tag);
    }
}
