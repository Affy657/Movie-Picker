namespace MoviePicker.Api.Domain.Exceptions;

public sealed class ConflictException : MoviePickerException
{
    public ConflictException(string message) : base(message, 409) { }
}
