namespace MoviePicker.Api.Domain.Exceptions;

public abstract class MoviePickerException : Exception
{
    public int StatusCode { get; }

    protected MoviePickerException(string message, int statusCode) : base(message)
    {
        StatusCode = statusCode;
    }
}
