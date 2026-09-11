namespace MoviePicker.Api.Domain.Exceptions;

public abstract class MoviePickerException : Exception
{
    public ErrorKind Kind { get; }

    public string? Reason { get; }

    protected MoviePickerException(string message, ErrorKind kind, string? reason = null) : base(message)
    {
        Kind = kind;
        Reason = reason;
    }
}
