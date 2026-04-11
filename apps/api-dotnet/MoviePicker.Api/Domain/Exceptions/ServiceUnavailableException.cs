namespace MoviePicker.Api.Domain.Exceptions;

public sealed class ServiceUnavailableException : MoviePickerException
{
    public ServiceUnavailableException(string message) : base(message, ErrorKind.ServiceUnavailable) { }
}
