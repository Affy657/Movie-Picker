using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.Watched;

public static class WatchedRating
{
    public static int? Require(int? rating) =>
        rating is { } value && !MovieRating.IsValidValue(value) ? throw Errors.RatingOutOfRange() : rating;
}
