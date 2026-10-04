using MoviePicker.Api.Domain;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.Ports;

public sealed class EventCreationReplayedException()
    : MoviePickerException(
        "This movie night was already created by the same request",
        ErrorKind.Conflict,
        ConcurrencyConflict.Reason);
