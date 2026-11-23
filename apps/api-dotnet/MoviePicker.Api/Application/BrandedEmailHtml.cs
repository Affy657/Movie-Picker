using System.Net;
using System.Text;

namespace MoviePicker.Api.Application;

public sealed record BrandedEmail(
    string Lang,
    string Title,
    string Heading,
    IReadOnlyList<string> Intro,
    string ButtonLabel,
    string ButtonUrl,
    string FallbackIntro,
    IReadOnlyList<string> Outro,
    string Signature,
    string SiteUrl);

public static class BrandedEmailHtml
{
    public const string LogoPath = "/icons/clap-192x192.png";

    private const string FontStack = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
    private const string Page = "#f4f6fa";
    private const string Ink = "#0f172a";
    private const string Muted = "#475569";
    private const string Subtle = "#5d6b80";
    private const string Brand = "#2563eb";
    private const string LinkText = "#1d4ed8";

    public static string Render(BrandedEmail email)
    {
        var siteUrl = email.SiteUrl.TrimEnd('/');
        var html = new StringBuilder();
        html.Append($"""
            <!DOCTYPE html>
            <html lang="{Encode(email.Lang)}">
            <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <meta name="color-scheme" content="light">
            <meta name="supported-color-schemes" content="light">
            <title>{Encode(email.Title)}</title>
            </head>
            <body style="margin:0;padding:0;background-color:{Page};">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:{Page};">
            <tr><td align="center" style="padding:32px 16px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
            <tr><td style="padding:0 4px 20px 4px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
            <td style="padding-right:10px;vertical-align:middle;"><img src="{Encode(siteUrl + LogoPath)}" width="40" height="40" alt="" style="display:block;border:0;outline:none;"></td>
            <td style="vertical-align:middle;font-family:{FontStack};font-size:22px;line-height:28px;font-weight:700;color:{Ink};">Movie<span style="color:{Brand};">Picker</span></td>
            </tr></table>
            </td></tr>
            <tr><td style="background-color:#ffffff;border-top:4px solid {Brand};border-radius:12px;padding:32px 28px;font-family:{FontStack};font-size:16px;line-height:24px;color:{Ink};">
            <h1 style="margin:0 0 16px 0;font-family:{FontStack};font-size:22px;line-height:28px;font-weight:700;color:{Ink};">{Encode(email.Heading)}</h1>

            """);
        foreach (var paragraph in email.Intro)
            html.Append($"""<p style="margin:0 0 16px 0;">{Encode(paragraph)}</p>""").Append('\n');
        html.Append($"""
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0;"><tr>
            <td style="border-radius:8px;background-color:{Brand};"><a href="{Encode(email.ButtonUrl)}" style="display:inline-block;padding:14px 24px;font-family:{FontStack};font-size:16px;line-height:20px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:8px;">{Encode(email.ButtonLabel)}</a></td>
            </tr></table>
            <p style="margin:0 0 16px 0;font-size:14px;line-height:20px;color:{Muted};">{Encode(email.FallbackIntro)}<br><a href="{Encode(email.ButtonUrl)}" style="color:{LinkText};word-break:break-all;">{Encode(email.ButtonUrl)}</a></p>

            """);
        foreach (var paragraph in email.Outro)
            html.Append($"""<p style="margin:0 0 16px 0;font-size:14px;line-height:20px;color:{Muted};">{Encode(paragraph)}</p>""").Append('\n');
        html.Append($"""
            </td></tr>
            <tr><td align="center" style="padding:20px 8px 0 8px;font-family:{FontStack};font-size:12px;line-height:18px;color:{Subtle};">{Encode(email.Signature)}<br><a href="{Encode(siteUrl)}" style="color:{Subtle};">{Encode(WithoutScheme(siteUrl))}</a></td></tr>
            </table>
            </td></tr>
            </table>
            </body>
            </html>
            """);
        return html.ToString();
    }

    private static string Encode(string value) => WebUtility.HtmlEncode(value);

    private static string WithoutScheme(string url)
    {
        var marker = url.IndexOf("://", StringComparison.Ordinal);
        return marker < 0 ? url : url[(marker + 3)..];
    }
}
