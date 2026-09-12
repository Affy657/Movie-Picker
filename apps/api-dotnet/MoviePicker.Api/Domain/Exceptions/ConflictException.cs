namespace MoviePicker.Api.Domain.Exceptions;

public sealed class ConflictException : MoviePickerException
{
    public ConflictException(string message, string? reason = null) : base(message, ErrorKind.Conflict, reason) { }
}
