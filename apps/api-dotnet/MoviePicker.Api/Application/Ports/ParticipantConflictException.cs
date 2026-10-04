using MoviePicker.Api.Domain;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.Ports;

public enum ParticipantCollision
{
    SameAccount,
    SamePseudo
}

public sealed class ParticipantConflictException(ParticipantCollision collision)
    : MoviePickerException(
        collision == ParticipantCollision.SameAccount
            ? "This account already takes part in the movie night"
            : "This pseudo is already taken in the movie night",
        ErrorKind.Conflict,
        ConcurrencyConflict.Reason)
{
    public ParticipantCollision Collision { get; } = collision;
}
