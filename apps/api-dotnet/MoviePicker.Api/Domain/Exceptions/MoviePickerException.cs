namespace MoviePicker.Api.Domain.Exceptions;

public abstract class MoviePickerException : Exception
{
    public ErrorKind Kind { get; }

    public string? Reason { get; }

    public IReadOnlyDictionary<string, object?>? Parameters { get; }

    protected MoviePickerException(
        string message,
        ErrorKind kind,
        string? reason = null,
        IReadOnlyDictionary<string, object?>? parameters = null) : base(message)
    {
        Kind = kind;
        Reason = reason;
        Parameters = parameters;
    }
}
