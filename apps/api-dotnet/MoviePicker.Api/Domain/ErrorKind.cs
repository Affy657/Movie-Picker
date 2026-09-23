namespace MoviePicker.Api.Domain;

public enum ErrorKind
{
    InvalidInput,
    Unauthorized,
    Forbidden,
    NotFound,
    Conflict,
    TooManyRequests,
    ServiceUnavailable
}
