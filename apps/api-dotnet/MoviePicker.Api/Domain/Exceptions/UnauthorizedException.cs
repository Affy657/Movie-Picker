namespace MoviePicker.Api.Domain.Exceptions;

public sealed class UnauthorizedException : MoviePickerException
{
    public UnauthorizedException(string message, string? reason = null)
        : base(message, ErrorKind.Unauthorized, reason) { }
}
