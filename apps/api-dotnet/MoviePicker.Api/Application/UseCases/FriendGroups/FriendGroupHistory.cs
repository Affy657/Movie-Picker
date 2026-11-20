using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.UseCases.FriendGroups;

public sealed class FriendGroupHistory
{
    public static readonly FriendGroupHistory Empty = new([], [], [], [], [], []);

    private readonly IReadOnlyList<Event> _nights;
    private readonly IReadOnlyList<Participant> _participants;
    private readonly IReadOnlyList<Movie> _movies;
    private readonly IReadOnlyList<Vote> _upVotes;
    private readonly ILookup<string, string> _seenByMovie;
    private readonly IReadOnlyList<MovieRating> _ratings;
    private readonly ILookup<string, MovieRating> _ratingsByMovie;
    private readonly HashSet<string> _winnerIds;

    public FriendGroupHistory(
        IReadOnlyList<Event> nights,
        IReadOnlyList<Participant> participants,
        IReadOnlyList<Movie> movies,
        IReadOnlyList<Vote> votes,
        IReadOnlyList<SeenMark> seenMarks,
        IReadOnlyList<MovieRating> ratings)
    {
        _nights = nights;
        _participants = participants;
        _movies = movies;
        _upVotes = votes.Where(vote => vote.Value > 0).ToList();
        _seenByMovie = seenMarks.ToLookup(mark => mark.MovieId, mark => mark.ParticipantId);
        _ratings = ratings;
        _ratingsByMovie = ratings.ToLookup(rating => rating.MovieId);
        _winnerIds = nights.SelectMany(night => night.GetWinnerMovieIds()).ToHashSet(StringComparer.Ordinal);
    }

    public FriendGroupMemberStatsResponse StatsOf(FriendGroupMember member)
    {
        var mine = _participants
            .Where(participant => participant.UserId == member.UserId)
            .Select(participant => participant.Id)
            .ToHashSet(StringComparer.Ordinal);
        var attended = _participants
            .Where(participant => mine.Contains(participant.Id))
            .Select(participant => participant.EventId)
            .ToHashSet(StringComparer.Ordinal);
        var proposals = _movies.Where(movie => mine.Contains(movie.ParticipantId)).ToList();
        var proposalIds = proposals.Select(movie => movie.Id).ToHashSet(StringComparer.Ordinal);
        var winning = proposals.Where(movie => _winnerIds.Contains(movie.Id)).ToList();
        var winningAverages = winning
            .Select(movie => _ratingsByMovie[movie.Id].ToList())
            .Where(ratings => ratings.Count > 0)
            .Select(ratings => ratings.Average(rating => rating.Value))
            .ToList();
        var castUp = _upVotes.Where(vote => mine.Contains(vote.ParticipantId)).ToList();
        var given = _ratings.Where(rating => mine.Contains(rating.ParticipantId)).ToList();

        return new FriendGroupMemberStatsResponse
        {
            UserId = member.UserId,
            ProposedCount = proposals.Count,
            WinningCount = winning.Count,
            RatedWinningCount = winningAverages.Count,
            ProposalsAverageRating = AverageOf(winningAverages),
            UpVotesReceived = _upVotes.Count(vote => proposalIds.Contains(vote.MovieId) && !mine.Contains(vote.ParticipantId)),
            UpVotesCast = castUp.Count,
            UpVotesOnWinner = castUp.Count(vote => _winnerIds.Contains(vote.MovieId)),
            FreshProposalCount = proposals.Count(movie => _seenByMovie[movie.Id].All(mine.Contains)),
            NightsAttended = attended.Count,
            NightsSinceJoined = attended.Count,
            NightsHosted = _nights.Count(night => night.CreatorUserId == member.UserId),
            RatingsGiven = given.Count,
            AverageRatingGiven = AverageOf(given.Select(rating => (double)rating.Value).ToList())
        };
    }

    private static double? AverageOf(List<double> values) =>
        values.Count == 0 ? null : Math.Round(values.Average(), 2);
}
