namespace MoviePicker.Api.Domain.Exceptions;

public sealed class ForbiddenException : MoviePickerException
{
    public ForbiddenException(string message, string? reason = ErrorCodes.Forbidden)
        : base(message, ErrorKind.Forbidden, reason) { }
}
