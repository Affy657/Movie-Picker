namespace MoviePicker.Api.Domain.Exceptions;

public sealed class ConflictException : MoviePickerException
{
    public ConflictException(
        string message,
        string? reason = null,
        IReadOnlyDictionary<string, object?>? parameters = null)
        : base(message, ErrorKind.Conflict, reason, parameters) { }
}
