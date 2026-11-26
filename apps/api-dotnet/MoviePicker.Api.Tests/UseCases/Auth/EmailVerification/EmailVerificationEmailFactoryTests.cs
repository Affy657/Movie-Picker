using MoviePicker.Api.Application.UseCases.Auth.EmailVerification;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.Auth.EmailVerification;

public sealed class EmailVerificationEmailFactoryTests
{
    private static readonly Uri ConfirmationUrl = new("https://www.movie-picker.fr/verify-email?token=abc");

    [Theory]
    [InlineData("fr", "Confirmez")]
    [InlineData("en", "Confirm")]
    [InlineData("es", "Confirmez")]
    [InlineData(null, "Confirmez")]
    public void Build_SpeaksTheAskedLanguageWithFrenchAsDefault(string? locale, string subjectStart)
    {
        var message = EmailVerificationEmailFactory.Build("neo@example.com", ConfirmationUrl, locale);

        Assert.StartsWith(subjectStart, message.Subject);
        Assert.Equal("neo@example.com", message.ToEmail);
        Assert.Equal(EmailVerificationEmailFactory.Tag, message.Tag);
    }

    [Theory]
    [InlineData("fr")]
    [InlineData("en")]
    public void Build_CarriesTheConfirmationLinkInBothBodies(string locale)
    {
        var message = EmailVerificationEmailFactory.Build("neo@example.com", ConfirmationUrl, locale);

        Assert.Contains(ConfirmationUrl.AbsoluteUri, message.HtmlBody);
        Assert.Contains(ConfirmationUrl.AbsoluteUri, message.TextBody);
        Assert.Contains("https://www.movie-picker.fr", message.HtmlBody);
    }
}
