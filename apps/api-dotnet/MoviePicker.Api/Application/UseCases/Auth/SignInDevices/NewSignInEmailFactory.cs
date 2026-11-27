using System.Globalization;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain;

namespace MoviePicker.Api.Application.UseCases.Auth.SignInDevices;

public sealed record NewSignIn(UserAgentDevice Device, string? Method, DateTimeOffset At);

public static class NewSignInEmailFactory
{
    public const string Tag = "new-sign-in";

    private sealed record Language(CultureInfo Culture, string DayFormat, string TimeFormat, ServerCopy.SignInAlertEmail Copy);

    private static readonly Language French = new(new CultureInfo("fr-FR"), "dddd d MMMM yyyy", "HH' h 'mm", ServerCopy.NewSignInEmail.Copy);

    private static readonly Language English = new(new CultureInfo("en-US"), "dddd, MMMM d, yyyy", "h:mm tt", ServerCopy.English.NewSignInAlert.Copy);

    public static EmailMessage Build(string toEmail, NewSignIn signIn, CatalogLanguage language, Uri site)
    {
        var (culture, dayFormat, timeFormat, copy) = language == CatalogLanguage.English ? English : French;
        var siteUrl = site.GetLeftPart(UriPartial.Authority);
        var parisTime = TimeZoneInfo.ConvertTime(signIn.At, EventSchedule.ParisTimeZone);
        var method = signIn.Method switch
        {
            SignInMethods.Password => copy.Labels.Email,
            SignInMethods.Google => copy.Labels.Google,
            SignInMethods.GitHub => copy.Labels.GitHub,
            _ => null
        };
        var facts = new ServerCopy.SignInAlertFacts(
            signIn.Device.Browser,
            signIn.Device.OperatingSystem,
            parisTime.ToString(dayFormat, culture),
            parisTime.ToString(timeFormat, culture),
            method);
        return new EmailMessage(toEmail, copy.Subject, copy.HtmlBody(facts, siteUrl), copy.TextBody(facts, siteUrl), Tag);
    }
}
