using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.UseCases.Shared;

public static class AttributedProposals
{
    public static List<Movie> Among(IEnumerable<Movie> proposals, IEnumerable<Event> nights)
    {
        var anonymousNightIds = nights
            .Where(night => night.HasAnonymousProposals)
            .Select(night => night.Id)
            .ToHashSet(StringComparer.Ordinal);
        return proposals.Where(movie => !anonymousNightIds.Contains(movie.EventId)).ToList();
    }
}
