namespace MoviePicker.Api.Domain.Exceptions;

public abstract class MoviePickerException : Exception
{
    public ErrorKind Kind { get; }

    protected MoviePickerException(string message, ErrorKind kind) : base(message)
    {
        Kind = kind;
    }
}
