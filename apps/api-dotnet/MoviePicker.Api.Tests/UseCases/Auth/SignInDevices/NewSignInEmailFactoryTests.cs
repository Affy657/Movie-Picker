using System.Net;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Auth.SignInDevices;
using MoviePicker.Api.Domain;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.Auth.SignInDevices;

public sealed class NewSignInEmailFactoryTests
{
    private static readonly DateTimeOffset WinterSignIn = new(2026, 11, 27, 12, 40, 0, TimeSpan.Zero);
    private static readonly DateTimeOffset SummerSignIn = new(2026, 7, 14, 21, 5, 0, TimeSpan.Zero);
    private static readonly Uri Site = new("https://www.movie-picker.fr");
    private static readonly UserAgentDevice ChromeOnWindows = new("Chrome", "Windows", DeviceKind.Desktop);

    private static EmailMessage Build(
        UserAgentDevice? device = null,
        string? method = "email",
        DateTimeOffset? at = null,
        CatalogLanguage language = CatalogLanguage.French) =>
        NewSignInEmailFactory.Build(
            "lea@example.com",
            new NewSignIn(device ?? ChromeOnWindows, method, at ?? WinterSignIn),
            language,
            Site);

    [Fact]
    public void French_NamesTheDeviceTheParisTimeAndTheMethod()
    {
        var message = Build();

        Assert.Equal("lea@example.com", message.ToEmail);
        Assert.Equal("Nouvelle connexion à votre compte Movie Picker", message.Subject);
        Assert.Equal(NewSignInEmailFactory.Tag, message.Tag);
        foreach (var body in new[] { message.TextBody, WebUtility.HtmlDecode(message.HtmlBody) })
        {
            Assert.Contains("Chrome sur Windows", body);
            Assert.Contains("vendredi 27 novembre 2026 à 13 h 40 (heure de Paris)", body);
            Assert.Contains("avec votre mot de passe", body);
        }
    }

    [Fact]
    public void ParisTime_FollowsSummerTime()
    {
        Assert.Contains("mardi 14 juillet 2026 à 23 h 05 (heure de Paris)", Build(at: SummerSignIn).TextBody);
    }

    [Theory]
    [InlineData("google", "avec Google")]
    [InlineData("github", "avec GitHub")]
    public void French_NamesTheProvider(string method, string expected)
    {
        Assert.Contains(expected, Build(method: method).TextBody);
    }

    [Fact]
    public void UnknownMethod_LeavesTheMethodOut()
    {
        var body = Build(method: null).TextBody;

        Assert.DoesNotContain("Connexion :", body);
    }

    [Theory]
    [InlineData(null, "Windows", "Navigateur sur Windows")]
    [InlineData("Firefox", null, "Firefox")]
    [InlineData(null, null, "Appareil non reconnu")]
    public void French_DescribesAPartlyRecognisedDevice(string? browser, string? system, string expected)
    {
        Assert.Contains($"Appareil : {expected}", Build(device: new UserAgentDevice(browser, system, DeviceKind.Unknown)).TextBody);
    }

    [Fact]
    public void Both_LinkToThePasswordResetAndToTheSecuritySettings()
    {
        var message = Build();

        foreach (var body in new[] { message.TextBody, WebUtility.HtmlDecode(message.HtmlBody) })
        {
            Assert.Contains("https://www.movie-picker.fr/forgot-password", body);
            Assert.Contains("https://www.movie-picker.fr/settings/securite", body);
        }
    }

    [Fact]
    public void English_SpeaksEnglish()
    {
        var message = Build(device: new UserAgentDevice("Safari", "iOS", DeviceKind.Phone), method: "github", language: CatalogLanguage.English);

        Assert.Equal("New sign-in to your Movie Picker account", message.Subject);
        Assert.Contains("Safari on iOS", message.TextBody);
        Assert.Contains("Friday, November 27, 2026 at 1:40 PM (Paris time)", message.TextBody);
        Assert.Contains("with GitHub", message.TextBody);
        Assert.Contains("lang=\"en\"", message.HtmlBody);
    }

    [Fact]
    public void Html_EscapesTheDeviceLabel()
    {
        var message = Build(device: new UserAgentDevice("<b>", "Windows", DeviceKind.Desktop));

        Assert.DoesNotContain("<b> sur", message.HtmlBody);
        Assert.Contains("&lt;b&gt; sur Windows", message.HtmlBody);
    }
}
