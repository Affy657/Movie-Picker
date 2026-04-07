namespace MoviePicker.Api.Domain.Exceptions;

public sealed class UnauthorizedException : MoviePickerException
{
    public UnauthorizedException(string message) : base(message, 401) { }
}
