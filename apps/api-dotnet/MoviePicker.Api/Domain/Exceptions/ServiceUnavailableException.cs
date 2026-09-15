namespace MoviePicker.Api.Domain.Exceptions;

public sealed class ServiceUnavailableException : MoviePickerException
{
    public ServiceUnavailableException(string message, string? reason = null)
        : base(message, ErrorKind.ServiceUnavailable, reason) { }
}
