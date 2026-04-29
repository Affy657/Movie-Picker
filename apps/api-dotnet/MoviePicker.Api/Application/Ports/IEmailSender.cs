namespace MoviePicker.Api.Application.Ports;

/// <summary>Émetteur d'emails transactionnels (impl : Resend en prod, log en dev). Cf. Infrastructure/Email.</summary>
public interface IEmailSender
{
    Task SendAsync(EmailMessage message, CancellationToken ct = default);
}

/// <summary>Message email transactionnel — corps HTML et texte fournis ensemble pour la délivrabilité.</summary>
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
    string? Tag = null);
