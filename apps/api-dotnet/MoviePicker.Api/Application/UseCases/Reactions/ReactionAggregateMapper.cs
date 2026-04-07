using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;

namespace MoviePicker.Api.Application.UseCases.Reactions;

internal static class ReactionAggregateMapper
{
    internal const int MaxPseudosPerKind = 30;

    public static IReadOnlyList<MovieReactionAggregateResponse> ToMovieReactionResponses(
        IReadOnlyList<ReactionKindAggregate> aggregates,
        IReadOnlyDictionary<string, string> pseudosByParticipantId)
    {
        if (aggregates.Count == 0)
            return Array.Empty<MovieReactionAggregateResponse>();

        var ordered = aggregates.OrderBy(a => a.ReactionId, StringComparer.Ordinal).ToList();
        var list = new List<MovieReactionAggregateResponse>(ordered.Count);
        foreach (var a in ordered)
        {
            var pseudos = new List<string>();
            foreach (var pid in a.ParticipantIds.Distinct())
            {
                if (pseudos.Count >= MaxPseudosPerKind)
                    break;
                if (pseudosByParticipantId.TryGetValue(pid, out var p) && !string.IsNullOrWhiteSpace(p))
                    pseudos.Add(p);
            }

            list.Add(new MovieReactionAggregateResponse
            {
                ReactionId = a.ReactionId,
                Count = a.Count,
                Pseudos = pseudos
            });
        }

        return list;
    }
}
