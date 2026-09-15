namespace MoviePicker.Api.Domain.Exceptions;

public sealed class BadRequestException : MoviePickerException
{
    public BadRequestException(
        string message,
        string? reason = null,
        IReadOnlyDictionary<string, object?>? parameters = null)
        : base(message, ErrorKind.InvalidInput, reason, parameters) { }
}
