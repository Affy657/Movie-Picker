namespace MoviePicker.Api.Infrastructure.Email;

/// <summary>Échec d'envoi d'un email transactionnel via le provider externe (Resend).</summary>
public sealed class EmailDeliveryException : Exception
{
    public int? StatusCode { get; }

    public EmailDeliveryException(string message, int? statusCode = null, Exception? inner = null)
        : base(message, inner)
    {
        StatusCode = statusCode;
    }
}
