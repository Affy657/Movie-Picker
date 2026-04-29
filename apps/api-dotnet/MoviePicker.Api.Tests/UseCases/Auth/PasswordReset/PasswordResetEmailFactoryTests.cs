using MoviePicker.Api.Application.UseCases.Auth.PasswordReset;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.Auth.PasswordReset;

public class PasswordResetEmailFactoryTests
{
    private static readonly Uri ResetUrl = new("https://web.movie-picker.fr/reset?token=abc");

    [Fact]
    public void Build_French_HasFrenchSubjectAndContainsResetUrl()
    {
        var msg = PasswordResetEmailFactory.Build("u@x.fr", "Alice", ResetUrl, "fr");
        Assert.Contains("Réinitialise", msg.Subject);
        Assert.Contains(ResetUrl.AbsoluteUri, msg.HtmlBody);
        Assert.Contains(ResetUrl.AbsoluteUri, msg.TextBody);
        Assert.Contains("30", msg.HtmlBody);
        Assert.Equal("password-reset", msg.Tag);
        Assert.Equal("u@x.fr", msg.ToEmail);
        Assert.Equal("Alice", msg.ToName);
    }

    [Fact]
    public void Build_English_HasEnglishSubject()
    {
        var msg = PasswordResetEmailFactory.Build("u@x.com", "Bob", ResetUrl, "en");
        Assert.Contains("Reset", msg.Subject);
        Assert.Contains(ResetUrl.AbsoluteUri, msg.HtmlBody);
        Assert.Contains(ResetUrl.AbsoluteUri, msg.TextBody);
        Assert.Contains("30", msg.HtmlBody);
        Assert.Equal("password-reset", msg.Tag);
    }

    [Fact]
    public void Build_UnknownLocale_FallsBackToFrench()
    {
        var msg = PasswordResetEmailFactory.Build("u@x.fr", "x", ResetUrl, "es");
        Assert.Contains("Réinitialise", msg.Subject);
    }

    [Fact]
    public void Build_NullOrEmptyLocale_FallsBackToFrench()
    {
        var msg1 = PasswordResetEmailFactory.Build("u@x.fr", "x", ResetUrl, locale: "");
        var msg2 = PasswordResetEmailFactory.Build("u@x.fr", "x", ResetUrl, locale: null!);
        Assert.Contains("Réinitialise", msg1.Subject);
        Assert.Contains("Réinitialise", msg2.Subject);
    }

    [Fact]
    public void Build_HtmlAndTextBodyEscapeUrl_NoBrokenLink()
    {
        var msg = PasswordResetEmailFactory.Build("u@x.fr", "x", ResetUrl, "fr");
        Assert.Contains("https://web.movie-picker.fr/reset?token=abc", msg.HtmlBody);
        Assert.Contains("https://web.movie-picker.fr/reset?token=abc", msg.TextBody);
    }
}
