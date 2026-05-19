namespace MoviePicker.Api.Application.Ports;

public sealed class EmailDeliveryException : Exception
{
    public int? StatusCode { get; }

    public EmailDeliveryException(string message, int? statusCode = null, Exception? inner = null)
        : base(message, inner)
    {
        StatusCode = statusCode;
    }
}
