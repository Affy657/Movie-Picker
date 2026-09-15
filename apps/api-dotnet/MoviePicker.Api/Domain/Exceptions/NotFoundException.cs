namespace MoviePicker.Api.Domain.Exceptions;

public sealed class NotFoundException : MoviePickerException
{
    public NotFoundException(string message = "Resource not found", string? reason = ErrorCodes.NotFound)
        : base(message, ErrorKind.NotFound, reason) { }
}
