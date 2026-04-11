namespace MoviePicker.Api.Domain.Exceptions;

public sealed class ForbiddenException : MoviePickerException
{
    public ForbiddenException(string message = "Accès refusé") : base(message, ErrorKind.Forbidden) { }
}
