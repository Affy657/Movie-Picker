namespace MoviePicker.Api.Domain.Exceptions;

public sealed class TooManyRequestsException : MoviePickerException
{
    public TooManyRequestsException(string message, string? reason = null)
        : base(message, ErrorKind.TooManyRequests, reason) { }
}
