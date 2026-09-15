using MoviePicker.Api.Domain.Exceptions;
namespace MoviePicker.Api.Application.Ports;

public static class ConcurrencyConflict
{
    public const string Reason = ErrorCodes.ConcurrentUpdate;
}
