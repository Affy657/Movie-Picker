using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.UseCases.SavedLists;

public static class ListSourceNames
{
    public const string TmdbCollection = "tmdbCollection";
    public const string ExplorerTheme = "explorerTheme";
    public const string MemberList = "memberList";
    public const string MemberWatched = "memberWatched";
    public const string MemberProposals = "memberProposals";
    public const string MemberWinningProposals = "memberWinningProposals";

    public static string Of(ListSourceType type) => type switch
    {
        ListSourceType.TmdbCollection => TmdbCollection,
        ListSourceType.ExplorerTheme => ExplorerTheme,
        ListSourceType.MemberList => MemberList,
        ListSourceType.MemberWatched => MemberWatched,
        ListSourceType.MemberProposals => MemberProposals,
        ListSourceType.MemberWinningProposals => MemberWinningProposals,
        _ => throw new ArgumentOutOfRangeException(nameof(type), type, "Unknown list source type")
    };

    public static Dictionary<string, ListSourceType> TypesByName(StringComparer comparer) =>
        Enum.GetValues<ListSourceType>().ToDictionary(Of, comparer);
}
