namespace MoviePicker.Api.Application.Ports;

/// <summary>Échec d'envoi d'un email transactionnel via le port <see cref="IEmailSender"/> (impl externe : Resend, etc.).</summary>
/// <remarks>
/// Vit côté Application (avec le port) plutôt que côté Infrastructure : l'Application en dépend
/// (handlers qui catch l'erreur). Voir Clean Architecture : la couche Infrastructure peut référencer
/// l'Application, pas l'inverse.
/// </remarks>
public sealed class EmailDeliveryException : Exception
{
    public int? StatusCode { get; }

    public EmailDeliveryException(string message, int? statusCode = null, Exception? inner = null)
        : base(message, inner)
    {
        StatusCode = statusCode;
    }
}
