namespace MoviePicker.Api.Domain.Exceptions;

public sealed class NotFoundException : MoviePickerException
{
    public NotFoundException(string message = "Ressource introuvable") : base(message, 404) { }
}
