using MoviePicker.Api.Application.UseCases.Auth.PasswordReset;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.Auth.PasswordReset;

public class PasswordResetEmailFactoryTests
{
    private static readonly Uri ResetUrl = new("https://www.movie-picker.fr/reset?token=abc");

    [Fact]
    public void Build_French_HasFrenchSubjectAndContainsResetUrl()
    {
        var msg = PasswordResetEmailFactory.Build("u@x.fr", ResetUrl, "fr");
        Assert.Contains("Réinitialise", msg.Subject);
        Assert.Contains(ResetUrl.AbsoluteUri, msg.HtmlBody);
        Assert.Contains(ResetUrl.AbsoluteUri, msg.TextBody);
        Assert.Contains("30", msg.HtmlBody);
        Assert.Equal("password-reset", msg.Tag);
        Assert.Equal("u@x.fr", msg.ToEmail);
    }

    [Fact]
    public void Build_English_HasEnglishSubject()
    {
        var msg = PasswordResetEmailFactory.Build("u@x.com", ResetUrl, "en");
        Assert.Contains("Reset", msg.Subject);
        Assert.Contains(ResetUrl.AbsoluteUri, msg.HtmlBody);
        Assert.Contains(ResetUrl.AbsoluteUri, msg.TextBody);
        Assert.Contains("30", msg.HtmlBody);
        Assert.Equal("password-reset", msg.Tag);
    }

    [Fact]
    public void Build_UnknownLocale_FallsBackToFrench()
    {
        var msg = PasswordResetEmailFactory.Build("u@x.fr", ResetUrl, "es");
        Assert.Contains("Réinitialise", msg.Subject);
    }

    [Fact]
    public void Build_NullOrEmptyLocale_FallsBackToFrench()
    {
        var msg1 = PasswordResetEmailFactory.Build("u@x.fr", ResetUrl, locale: "");
        var msg2 = PasswordResetEmailFactory.Build("u@x.fr", ResetUrl, locale: null!);
        Assert.Contains("Réinitialise", msg1.Subject);
        Assert.Contains("Réinitialise", msg2.Subject);
    }

    [Theory]
    [InlineData("fr", "Bonjour,")]
    [InlineData("en", "Hi,")]
    public void Build_GreetsWithoutAnyName(string locale, string greeting)
    {
        var msg = PasswordResetEmailFactory.Build("u@x.fr", ResetUrl, locale);

        Assert.Contains($">{greeting}</p>", msg.HtmlBody);
        Assert.StartsWith(greeting, msg.TextBody);
    }

    [Theory]
    [InlineData("fr")]
    [InlineData("en")]
    public void Build_HtmlCarriesTheSiteIdentity(string locale)
    {
        var html = PasswordResetEmailFactory.Build("u@x.fr", ResetUrl, locale).HtmlBody;

        Assert.Contains("<img src=\"https://www.movie-picker.fr/icons/clap-192x192.png\"", html);
        Assert.Contains("Movie<span style=\"color:#2563eb;\">Picker</span>", html);
        Assert.Contains("background-color:#2563eb", html);
        Assert.Contains("href=\"https://www.movie-picker.fr\"", html);
        Assert.Contains($"<html lang=\"{locale}\">", html);
    }

    [Theory]
    [InlineData("fr")]
    [InlineData("en")]
    public void Build_HtmlOnlyUsesInlineStylesAndLayoutTables(string locale)
    {
        var html = PasswordResetEmailFactory.Build("u@x.fr", ResetUrl, locale).HtmlBody;

        Assert.DoesNotContain("<style", html, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("class=", html, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("<svg", html, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("<div style=\"display:flex", html, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("role=\"presentation\"", html);
    }

    [Theory]
    [InlineData("fr")]
    [InlineData("en")]
    public void Build_TextBodyStaysPlainText(string locale)
    {
        var text = PasswordResetEmailFactory.Build("u@x.fr", ResetUrl, locale).TextBody;

        Assert.DoesNotContain("<", text);
        Assert.Contains(ResetUrl.AbsoluteUri, text);
    }

    [Fact]
    public void Build_UrlWithAnAmpersand_IsEncodedInTheHtmlAttribute()
    {
        var html = PasswordResetEmailFactory.Build("u@x.fr", new Uri("https://www.movie-picker.fr/reset?token=abc&lang=fr"), "fr").HtmlBody;

        Assert.Contains("href=\"https://www.movie-picker.fr/reset?token=abc&amp;lang=fr\"", html);
    }

    [Fact]
    public void Build_HtmlAndTextBodyEscapeUrl_NoBrokenLink()
    {
        var msg = PasswordResetEmailFactory.Build("u@x.fr", ResetUrl, "fr");
        Assert.Contains("https://www.movie-picker.fr/reset?token=abc", msg.HtmlBody);
        Assert.Contains("https://www.movie-picker.fr/reset?token=abc", msg.TextBody);
    }
}
