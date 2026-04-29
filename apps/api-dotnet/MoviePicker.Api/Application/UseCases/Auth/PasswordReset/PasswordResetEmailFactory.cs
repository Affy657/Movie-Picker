using System.Net;
using MoviePicker.Api.Application.Ports;

namespace MoviePicker.Api.Application.UseCases.Auth.PasswordReset;

public static class PasswordResetEmailFactory
{
    private const string Tag = "password-reset";

    public static EmailMessage Build(string toEmail, string toName, Uri resetUrl, string? locale)
    {
        var lang = (locale ?? "").Trim().ToLowerInvariant();
        return lang switch
        {
            "en" => BuildEn(toEmail, toName, resetUrl),
            _ => BuildFr(toEmail, toName, resetUrl),
        };
    }

    private static EmailMessage BuildFr(string toEmail, string toName, Uri resetUrl)
    {
        var url = resetUrl.AbsoluteUri;
        var safeNameHtml = WebUtility.HtmlEncode(toName);
        const string subject = "Réinitialise ton mot de passe Movie Picker";
        var htmlBody = $"""
            <!DOCTYPE html>
            <html lang="fr">
            <body style="font-family: Arial, sans-serif; background:#f6f6f6; padding:24px;">
              <table width="100%" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:8px;padding:24px;">
                <tr><td>
                  <h1 style="font-size:20px;margin-top:0;">Réinitialise ton mot de passe</h1>
                  <p>Bonjour {safeNameHtml},</p>
                  <p>Tu as demandé à réinitialiser ton mot de passe Movie Picker. Clique sur le bouton ci-dessous (lien valide 30 minutes) :</p>
                  <p style="text-align:center;margin:32px 0;">
                    <a href="{url}" style="background:#2563eb;color:#ffffff;padding:12px 20px;text-decoration:none;border-radius:6px;display:inline-block;">Définir un nouveau mot de passe</a>
                  </p>
                  <p style="font-size:14px;color:#555;">Si le bouton ne fonctionne pas, copie cette URL dans ton navigateur :<br/><a href="{url}">{url}</a></p>
                  <p style="font-size:14px;color:#555;">Si tu n'es pas à l'origine de cette demande, ignore cet email — ton mot de passe restera inchangé.</p>
                  <p style="font-size:12px;color:#999;margin-top:32px;">— L'équipe Movie Picker</p>
                </td></tr>
              </table>
            </body>
            </html>
            """;
        var textBody = $"""
            Bonjour {toName},

            Tu as demandé à réinitialiser ton mot de passe Movie Picker.
            Clique sur le lien ci-dessous (valide 30 minutes) :

            {url}

            Si tu n'es pas à l'origine de cette demande, ignore cet email — ton mot de passe restera inchangé.

            — L'équipe Movie Picker
            """;
        return new EmailMessage(toEmail, toName, subject, htmlBody, textBody, Tag);
    }

    private static EmailMessage BuildEn(string toEmail, string toName, Uri resetUrl)
    {
        var url = resetUrl.AbsoluteUri;
        var safeNameHtml = WebUtility.HtmlEncode(toName);
        const string subject = "Reset your Movie Picker password";
        var htmlBody = $"""
            <!DOCTYPE html>
            <html lang="en">
            <body style="font-family: Arial, sans-serif; background:#f6f6f6; padding:24px;">
              <table width="100%" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:8px;padding:24px;">
                <tr><td>
                  <h1 style="font-size:20px;margin-top:0;">Reset your password</h1>
                  <p>Hi {safeNameHtml},</p>
                  <p>You asked to reset your Movie Picker password. Click the button below (link valid for 30 minutes):</p>
                  <p style="text-align:center;margin:32px 0;">
                    <a href="{url}" style="background:#2563eb;color:#ffffff;padding:12px 20px;text-decoration:none;border-radius:6px;display:inline-block;">Set a new password</a>
                  </p>
                  <p style="font-size:14px;color:#555;">If the button doesn't work, copy this URL into your browser:<br/><a href="{url}">{url}</a></p>
                  <p style="font-size:14px;color:#555;">If you didn't request this, ignore this email — your password will remain unchanged.</p>
                  <p style="font-size:12px;color:#999;margin-top:32px;">— The Movie Picker team</p>
                </td></tr>
              </table>
            </body>
            </html>
            """;
        var textBody = $"""
            Hi {toName},

            You asked to reset your Movie Picker password.
            Click the link below (valid for 30 minutes):

            {url}

            If you didn't request this, ignore this email — your password will remain unchanged.

            — The Movie Picker team
            """;
        return new EmailMessage(toEmail, toName, subject, htmlBody, textBody, Tag);
    }
}
