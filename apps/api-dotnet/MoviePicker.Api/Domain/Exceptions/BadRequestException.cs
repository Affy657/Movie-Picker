namespace MoviePicker.Api.Domain.Exceptions;

public sealed class BadRequestException : MoviePickerException
{
    public BadRequestException(string message) : base(message, ErrorKind.InvalidInput) { }
}
