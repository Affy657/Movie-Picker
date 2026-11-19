namespace MoviePicker.Api.Domain.Entities;

public enum ListSourceType
{
    TmdbCollection,
    ExplorerTheme,
    MemberList,
    MemberWatched,
    MemberProposals,
    MemberWinningProposals
}

public enum ListSourceUnavailableReason
{
    Private,
    Deleted
}

public sealed record ListSource(ListSourceType Type, string Id);
