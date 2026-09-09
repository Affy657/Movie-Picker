using MoviePicker.Api.Application.Ports;

namespace MoviePicker.Api.Application.UseCases.GetMovieShowcase;

public static class MovieShowcaseSections
{
    public const string Trending = "trending";
    public const string NowPlaying = "now-playing";
    public const string MostProposed = "most-proposed";
    public const string Theme = "theme";
    public const string Collection = "collection";
    public const string Provider = "provider";
    public const string Recommendations = "recommendations";

    public static readonly IReadOnlyList<string> All =
        [Trending, NowPlaying, MostProposed, Theme, Collection, Provider, Recommendations];

    public static bool IsKnown(string? section) =>
        section is not null && All.Contains(section.Trim().ToLowerInvariant());
}

public static class MovieShowcaseCatalog
{
    public const int PagesPerSection = 5;
    public const int MostProposedLimit = 100;
    public const int MostProposedMinEventCount = 2;
    public const int MostProposedMinDistinctMovies = 30;

    private const int A24CompanyId = 41_077;
    private const int FamilyGenreId = 10_751;
    private const int AcclaimedVoteCountMin = 3_000;

    private static readonly IReadOnlyDictionary<string, int> ProviderIds =
        new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase)
        {
            ["netflix"] = 8,
            ["prime-video"] = 119,
            ["disney-plus"] = 337,
            ["canal-plus"] = 381,
            ["apple-tv-plus"] = 350,
        };

    private static readonly IReadOnlyDictionary<string, TmdbDiscoveryCriteria> ThemeCriteria =
        new Dictionary<string, TmdbDiscoveryCriteria>(StringComparer.OrdinalIgnoreCase)
        {
            ["frissons"] = new(GenreIds: [27, 53], VoteMin: 6.0),
            ["comedies-francaises"] = new(GenreIds: [35], OriginalLanguage: "fr", VoteMin: 6.0),
            ["annees-80"] = new(YearFrom: 1980, YearTo: 1989, VoteMin: 7.0),
            ["braquages"] = new(GenreIds: [80], VoteMin: 6.5),
            ["pepites-a24"] = new(VoteMin: 6.0, CompanyIds: [A24CompanyId]),
            ["moins-de-90-min"] = new(RuntimeMax: 90, VoteMin: 6.5, VoteCountMin: 200),
            ["indetronables"] = new(
                VoteMin: 8.0,
                VoteCountMin: AcclaimedVoteCountMin,
                SortBy: "vote_average.desc"),
            ["annees-90"] = new(YearFrom: 1990, YearTo: 1999, VoteMin: 7.0, VoteCountMin: 500),
            ["annees-2000"] = new(YearFrom: 2000, YearTo: 2009, VoteMin: 7.0, VoteCountMin: 500),
            ["en-famille"] = new(GenreIds: [FamilyGenreId], VoteMin: 6.5, VoteCountMin: 300),
        };

    public static readonly IReadOnlyList<string> ThemeKeys = ThemeCriteria.Keys.ToList();

    public const int CollectionFetchParallelism = 12;

    public static readonly IReadOnlyList<int> CollectionIds =
    [
        1_241, 10, 86_311, 645, 9_485, 748,
        263, 295, 328, 119, 131_292, 131_635,
        131_296, 131_295, 531_241, 10_194, 87_359, 284_433,
        448_150, 528, 2_344, 404_609, 556, 87_096,
        33_514, 2_150, 121_938, 8_354, 84, 264,
        8_650, 656, 230, 8_945, 422_834, 8_091,
        31_562, 173_710, 86_066, 86_119, 1_570, 295_130,
        86_055, 435_259, 495_527, 399, 391_860, 558_216,
        77_816, 283_579, 313_086, 1_575, 87_118, 382_685,
        2_602, 17_255, 9_743, 9_888, 91_361, 94_032,
        304, 8_864, 115_575, 535_313, 120_794, 4_246,
        14_740, 135_483, 14_890, 85_943, 420, 5_039,
        2_326, 185_103, 2_806, 126_125, 1_733, 2_980,
        228_446, 523_855, 720_879, 9_735, 1_565, 8_580,
        86_027, 553_717, 735, 402_074, 2_366, 41_437,
        8_581, 544_669, 306_031, 90_863, 10_455, 2_794,
        9_518, 63_043, 153_010, 167_613, 14_563, 111_751,
        1_006, 70_068, 2_396, 8_537, 5_547, 1_709,
        211_721, 64_748, 489_724, 24_761, 579_870, 8_050,
        1_413_999, 10_517, 389_544, 52_835, 52_097, 103_001,
    ];

    public static TmdbDiscoveryCriteria? CriteriaForProvider(string? provider, string region)
    {
        if (string.IsNullOrWhiteSpace(provider) || !ProviderIds.TryGetValue(provider.Trim(), out var id))
            return null;

        var watchRegion = string.IsNullOrWhiteSpace(region) ? "FR" : region.Trim().ToUpperInvariant();
        return new TmdbDiscoveryCriteria(
            VoteCountMin: 100,
            WatchProviderIds: [id],
            WatchRegion: watchRegion);
    }

    public static TmdbDiscoveryCriteria? CriteriaForTheme(string? theme) =>
        !string.IsNullOrWhiteSpace(theme) && ThemeCriteria.TryGetValue(theme.Trim(), out var criteria)
            ? criteria
            : null;
}
