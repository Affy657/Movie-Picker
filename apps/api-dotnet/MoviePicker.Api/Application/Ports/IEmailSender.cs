using System.Text;
using MoviePicker.Api.Application.UseCases.Auth;

namespace MoviePicker.Api.Application.Ports;

/// <summary>Émetteur d'emails transactionnels (impl : Resend en prod, log en dev). Cf. Infrastructure/Email.</summary>
public interface IEmailSender
{
    Task SendAsync(EmailMessage message, CancellationToken ct = default);
}

/// <summary>
/// Message email transactionnel — corps HTML et texte fournis ensemble pour la délivrabilité.
/// <see cref="ToString"/> n'inclut volontairement pas HtmlBody/TextBody ni PII (<see cref="ToName"/>), uniquement destinataire masqué, sujet et tag.
/// </summary>
/// <param name="ToEmail">Adresse destinataire.</param>
/// <param name="ToName">Nom destinataire (utilisé dans la salutation).</param>
/// <param name="Subject">Sujet, déjà localisé.</param>
/// <param name="HtmlBody">Corps HTML inline-styles.</param>
/// <param name="TextBody">Corps texte (fallback clients qui le préfèrent).</param>
/// <param name="Tag">Tag de catégorisation côté provider (ex. "password-reset"). Optionnel.</param>
public sealed record EmailMessage(
    string ToEmail,
    string ToName,
    string Subject,
    string HtmlBody,
    string TextBody,
    string? Tag = null)
{
    /// <summary>Override pour ne PAS leak HtmlBody/TextBody (lien de reset) ni ToName (PII) dans les logs.</summary>
    private bool PrintMembers(StringBuilder builder)
    {
        builder.Append("To = ").Append(EmailMasking.Mask(ToEmail));
        builder.Append(", Subject = \"").Append(Subject).Append('"');
        builder.Append(", Tag = ").Append(Tag ?? "n/a");
        return true;
    }
}
