using System.ComponentModel.DataAnnotations;
using System.Net;
using System.Net.Http.Json;
using System.Reflection;
using System.Runtime.CompilerServices;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;
using MoviePicker.Api.Application.DTOs;
using Xunit;

namespace MoviePicker.Api.IntegrationTests;

public sealed partial class OpenApiContractTests : IClassFixture<MoviePickerApplicationFactory>
{
    private const string SchemaRefPrefix = "#/components/schemas/";

    private static readonly string[] NotificationTypes =
    [
        "newfollower", "movieadded", "moviepicked", "participantjoined", "eventdeleted", "eventreminder1h",
        "eventreminder24h", "eventinvitation", "eventpending", "moviepickedmanually",
        "letterboxdreconciliationpending", "eventdatechanged", "ratingreminder", "listinvitation", "groupinvitation", "groupnight", "removedfromevent", "hostrolereceived"
    ];

    private static readonly string[] Lifecycles = ["upcoming", "live", "pending", "finished"];

    private static readonly string[] ShowcaseSections =
        ["trending", "now-playing", "most-proposed", "theme", "collection", "provider", "recommendations", "director"];

    private static readonly string[] ListSourceTypes =
        ["tmdbCollection", "explorerTheme", "memberList", "memberWatched", "memberProposals", "memberWinningProposals"];

    private static readonly string[] OAuthProviders = ["google", "github"];

    private readonly MoviePickerApplicationFactory _factory;
    private readonly HttpClient _client;

    public OpenApiContractTests(MoviePickerApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    private async Task<JsonDocument> ContractAsync()
    {
        var res = await _client.GetAsync("/swagger/v1/swagger.json");
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        return JsonDocument.Parse(await res.Content.ReadAsStringAsync());
    }

    private static JsonElement Schemas(JsonDocument contract) =>
        contract.RootElement.GetProperty("components").GetProperty("schemas");

    private static IEnumerable<(string Status, JsonElement Response)> Responses(JsonDocument contract) =>
        from path in contract.RootElement.GetProperty("paths").EnumerateObject()
        from operation in path.Value.EnumerateObject()
        from response in operation.Value.GetProperty("responses").EnumerateObject()
        select (response.Name, response.Value);

    private static HashSet<string> SchemaRefs(JsonElement node)
    {
        var refs = new HashSet<string>(StringComparer.Ordinal);
        CollectSchemaRefs(node, refs);
        return refs;
    }

    private static void CollectSchemaRefs(JsonElement node, HashSet<string> refs)
    {
        if (node.ValueKind == JsonValueKind.Array)
        {
            foreach (var item in node.EnumerateArray())
                CollectSchemaRefs(item, refs);
            return;
        }

        if (node.ValueKind != JsonValueKind.Object)
            return;

        foreach (var property in node.EnumerateObject())
        {
            if (property.Name == "$ref" && property.Value.GetString() is { } reference && reference.StartsWith(SchemaRefPrefix, StringComparison.Ordinal))
                refs.Add(reference[SchemaRefPrefix.Length..]);
            else
                CollectSchemaRefs(property.Value, refs);
        }
    }

    private static HashSet<string> ReachableSchemas(JsonElement schemas, IEnumerable<string> roots)
    {
        var reached = new HashSet<string>(StringComparer.Ordinal);
        var pending = new Stack<string>(roots);
        while (pending.TryPop(out var name))
        {
            if (!reached.Add(name))
                continue;
            foreach (var reference in SchemaRefs(schemas.GetProperty(name)))
                pending.Push(reference);
        }

        return reached;
    }

    private static HashSet<string> RequestSchemas(JsonDocument contract)
    {
        var roots = new HashSet<string>(StringComparer.Ordinal);
        foreach (var path in contract.RootElement.GetProperty("paths").EnumerateObject())
            foreach (var operation in path.Value.EnumerateObject())
            {
                if (operation.Value.TryGetProperty("requestBody", out var body))
                    roots.UnionWith(SchemaRefs(body));
                if (operation.Value.TryGetProperty("parameters", out var parameters))
                    roots.UnionWith(SchemaRefs(parameters));
            }

        return ReachableSchemas(Schemas(contract), roots);
    }

    private static bool IsNullable(JsonElement schema) =>
        schema.TryGetProperty("nullable", out var nullable) && nullable.GetBoolean();

    private static HashSet<string> RequiredOf(JsonElement schema) =>
        schema.TryGetProperty("required", out var required)
            ? required.EnumerateArray().Select(name => name.GetString()!).ToHashSet(StringComparer.Ordinal)
            : [];

    private static string[] EnumOf(JsonElement schemas, string schema, string property) =>
        EnumValues(schemas.GetProperty(schema).GetProperty("properties").GetProperty(property));

    private static string[] ItemsEnumOf(JsonElement schemas, string schema, string property) =>
        EnumValues(schemas.GetProperty(schema).GetProperty("properties").GetProperty(property).GetProperty("items"));

    private static string[] ParameterEnumOf(JsonDocument contract, string path, string method, string parameter) =>
        EnumValues(contract.RootElement.GetProperty("paths").GetProperty(path).GetProperty(method).GetProperty("parameters")
            .EnumerateArray()
            .Single(p => p.GetProperty("name").GetString() == parameter)
            .GetProperty("schema"));

    private static string[] EnumValues(JsonElement schema) =>
        schema.TryGetProperty("enum", out var values)
            ? values.EnumerateArray().Select(value => value.GetString()!).ToArray()
            : [];

    private static string PropertySchemaRef(JsonElement schemas, string schema, string property) =>
        Assert.Single(SchemaRefs(schemas.GetProperty(schema).GetProperty("properties").GetProperty(property)));

    [GeneratedRegex(@"^\^(?<prefix>[A-Za-z0-9/_-]*)\((?<values>[A-Za-z0-9_-]+(?:\|[A-Za-z0-9_-]+)*)\)(?<suffix>[A-Za-z0-9/_-]*)\$$")]
    private static partial Regex ClosedListPattern();

    private static bool IsValidatedAsRequired(PropertyInfo property) =>
        property.GetCustomAttribute<RequiredAttribute>() is not null
        || property.GetCustomAttribute<JsonRequiredAttribute>() is not null
        || property.GetCustomAttribute<RequiredMemberAttribute>() is not null;

    [Fact]
    public async Task ResponseSchemas_RequireEveryPropertyTheServerAlwaysWrites()
    {
        using var contract = await ContractAsync();
        var schemas = Schemas(contract);
        var requestSchemas = RequestSchemas(contract);
        var exportSchemas = ReachableSchemas(schemas, ["UserDataExportResponse"]);

        var optionalThoughAlwaysWritten = (
            from schema in schemas.EnumerateObject()
            where !requestSchemas.Contains(schema.Name)
                  && !exportSchemas.Contains(schema.Name)
                  && schema.Name != "ApiErrorResponse"
                  && schema.Value.TryGetProperty("properties", out _)
            let required = RequiredOf(schema.Value)
            from property in schema.Value.GetProperty("properties").EnumerateObject()
            where !required.Contains(property.Name)
            select $"{schema.Name}.{property.Name}").ToList();

        Assert.Empty(optionalThoughAlwaysWritten);
        var myParticipant = schemas.GetProperty("EventDetailResponse").GetProperty("properties").GetProperty("myParticipant");
        Assert.True(IsNullable(myParticipant));
        Assert.Equal("ParticipantResponse", Assert.Single(SchemaRefs(myParticipant)));
        Assert.Contains("myParticipant", RequiredOf(schemas.GetProperty("EventDetailResponse")));
        Assert.Contains("actorHandle", RequiredOf(schemas.GetProperty("UserNotificationItem")));
        Assert.Contains("myVote", RequiredOf(schemas.GetProperty("MovieWithScoreResponse")));
        Assert.Contains("eventsCreated", RequiredOf(schemas.GetProperty("UserStatsResponse")));
    }

    [Fact]
    public async Task ExportSchema_LeavesOptionalTheNullsTheExportOmits()
    {
        using var contract = await ContractAsync();
        var export = Schemas(contract).GetProperty("UserDataExportResponse");

        Assert.Contains("exportedAt", RequiredOf(export));
        Assert.DoesNotContain("avatarPhoto", RequiredOf(export));
        Assert.True(IsNullable(export.GetProperty("properties").GetProperty("avatarPhoto")));
    }

    [Fact]
    public async Task RequestSchemas_RequireOnlyTheFieldsTheServerValidatesAsRequired()
    {
        using var contract = await ContractAsync();
        var schemas = Schemas(contract);
        var dtoTypes = typeof(AddMovieRequest).Assembly.GetTypes()
            .GroupBy(type => type.Name, StringComparer.Ordinal)
            .ToDictionary(group => group.Key, group => group.First(), StringComparer.Ordinal);

        var requiredWithoutValidation = (
            from name in RequestSchemas(contract)
            let type = dtoTypes.GetValueOrDefault(name)
            where type is not null && !type.IsEnum
            from requiredName in RequiredOf(schemas.GetProperty(name))
            let property = type.GetProperties().Single(p => JsonNamingPolicy.CamelCase.ConvertName(p.Name) == requiredName)
            where !IsValidatedAsRequired(property)
            select $"{name}.{requiredName}").ToList();

        Assert.Empty(requiredWithoutValidation);
        Assert.Equal(["participantId", "title", "tmdbId"], RequiredOf(schemas.GetProperty("AddMovieRequest")).Order());
        Assert.Empty(RequiredOf(schemas.GetProperty("PasswordResetRequest")));
    }

    [Fact]
    public async Task ErrorResponses_DescribeTheApiErrorEnvelopeTheServerWrites()
    {
        using var contract = await ContractAsync();
        var schemas = Schemas(contract);

        var errorResponses = Responses(contract).Where(r => int.Parse(r.Status) >= 400).ToList();

        Assert.NotEmpty(errorResponses);
        Assert.All(errorResponses, error =>
        {
            var content = error.Response.GetProperty("content").EnumerateObject().ToList();
            var media = Assert.Single(content);
            Assert.Equal("application/json", media.Name);
            Assert.Equal(SchemaRefPrefix + "ApiErrorResponse", media.Value.GetProperty("schema").GetProperty("$ref").GetString());
        });
        Assert.False(schemas.TryGetProperty("ProblemDetails", out _));
        var envelope = schemas.GetProperty("ApiErrorResponse");
        Assert.Equal(["code", "error"], RequiredOf(envelope).Order());
        Assert.Equal(
            ["code", "error", "params", "reason", "requestId"],
            envelope.GetProperty("properties").EnumerateObject().Select(p => p.Name).Order());
    }

    [Fact]
    public async Task FreeStringValues_AreEnumsOfTheValuesTheServerWrites()
    {
        using var contract = await ContractAsync();
        var schemas = Schemas(contract);

        Assert.Equal(NotificationTypes, EnumOf(schemas, "UserNotificationItem", "type"));
        Assert.Equal(NotificationTypes, EnumOf(schemas, "NotificationTypePreference", "type"));
        Assert.Equal(Lifecycles, EnumOf(schemas, "EventDetailResponse", "lifecycle"));
        Assert.Equal(Lifecycles, EnumOf(schemas, "MyEventSummaryDto", "lifecycle"));
        Assert.Equal(Lifecycles, EnumOf(schemas, "NightRecapResponse", "lifecycle"));
        Assert.Equal(["wheel", "manual"], EnumOf(schemas, "EventWinnerResponse", "pickMethod"));
        Assert.Equal(
            ["creator", "director", "writer", "composer", "photography"],
            EnumOf(schemas, "MovieCrewMemberResponse", "job"));
        Assert.Equal(ShowcaseSections, EnumOf(schemas, "MovieShowcaseListResponse", "section"));
        Assert.Equal(["film", "photo"], EnumOf(schemas, "ProfileBannerResponse", "source"));
        Assert.Equal(OAuthProviders, ItemsEnumOf(schemas, "OAuthProvidersResponse", "providers"));
        Assert.Equal(OAuthProviders, ItemsEnumOf(schemas, "UserProfileResponse", "linkedProviders"));
    }

    [Fact]
    public async Task ClosedRequestValues_AreEnumsOfTheValuesTheServerAccepts()
    {
        using var contract = await ContractAsync();
        var schemas = Schemas(contract);

        Assert.Equal(NotificationTypes, EnumOf(schemas, "NotificationTypePreferencePatch", "type"));
        Assert.Equal(ListSourceTypes, EnumOf(schemas, "SaveListRequest", "sourceType"));
        Assert.Equal(["system", "light", "dark"], EnumOf(schemas, "PatchUserProfileRequest", "uiTheme"));
        Assert.Equal(["five", "ten"], EnumOf(schemas, "PatchUserProfileRequest", "ratingScale"));
        Assert.Contains("purple", EnumOf(schemas, "PatchUserProfileRequest", "accentColor"));
        Assert.Equal(["film", "photo"], EnumOf(schemas, "SetProfileBannerRequest", "source"));
        Assert.Equal(ShowcaseSections, ParameterEnumOf(contract, "/api/v1/movies/showcase", "get", "section"));
        Assert.Equal(ListSourceTypes, ParameterEnumOf(contract, "/api/v1/saved-lists", "get", "sourceType"));
        Assert.Equal(OAuthProviders, ParameterEnumOf(contract, "/api/v1/auth/oauth/{provider}/start", "get", "provider"));
        Assert.Equal(OAuthProviders, ParameterEnumOf(contract, "/api/v1/auth/oauth/{provider}/callback", "get", "provider"));
        Assert.Equal(OAuthProviders, ParameterEnumOf(contract, "/api/v1/auth/me/identities/{provider}", "delete", "provider"));
    }

    [Fact]
    public async Task RequestPropertiesValidatedAgainstAClosedList_AreEnumsOfThatList()
    {
        using var contract = await ContractAsync();
        var schemas = Schemas(contract);
        var dtoTypes = typeof(AddMovieRequest).Assembly.GetTypes()
            .GroupBy(type => type.Name, StringComparer.Ordinal)
            .ToDictionary(group => group.Key, group => group.First(), StringComparer.Ordinal);

        var describedAsFree = (
            from name in RequestSchemas(contract)
            let type = dtoTypes.GetValueOrDefault(name)
            where type is not null && !type.IsEnum
            from property in type.GetProperties()
            let pattern = property.GetCustomAttribute<RegularExpressionAttribute>()?.Pattern
            where pattern is not null && ClosedListPattern().IsMatch(pattern)
            let jsonName = JsonNamingPolicy.CamelCase.ConvertName(property.Name)
            let match = ClosedListPattern().Match(pattern)
            let expected = match.Groups["values"].Value.Split('|').Select(value => match.Groups["prefix"].Value + value + match.Groups["suffix"].Value)
            where !EnumOf(schemas, name, jsonName).SequenceEqual(expected)
            select $"{name}.{jsonName}").ToList();

        Assert.Empty(describedAsFree);
        Assert.Equal(["image/jpeg", "image/png", "image/webp"], EnumOf(schemas, "UploadBannerPhotoRequest", "contentType"));
    }

    [Fact]
    public async Task ExportSchema_DescribesItsClosedValuesAsTheEnumsTheApiServes()
    {
        using var contract = await ContractAsync();
        var schemas = Schemas(contract);

        Assert.Equal("UiThemePreference", PropertySchemaRef(schemas, "ExportedProfile", "uiTheme"));
        Assert.Equal("AccentColor", PropertySchemaRef(schemas, "ExportedProfile", "accentColor"));
        Assert.Equal("RatingScale", PropertySchemaRef(schemas, "ExportedProfile", "ratingScale"));
        Assert.Equal(OAuthProviders, ItemsEnumOf(schemas, "ExportedProfile", "linkedProviders"));
        Assert.Equal(NotificationTypes, EnumOf(schemas, "ExportedNotification", "type"));
        Assert.Equal("ListSourceType", PropertySchemaRef(schemas, "ExportedSavedList", "sourceType"));
        Assert.Equal("ProfileBannerSource", PropertySchemaRef(schemas, "ExportedProfileBanner", "source"));
        Assert.Equal("WatchedOrigin", PropertySchemaRef(schemas, "ExportedWatchedTitle", "origin"));
        Assert.Equal("WatchedOrigin", PropertySchemaRef(schemas, "ExportedWatchedTitle", "ratingOrigin"));
        foreach (var exported in new[] { "ExportedWatchlistItem", "ExportedMovieListItem", "ExportedWatchedTitle", "ExportedFavorite", "ExportedProposedMovie" })
            Assert.Equal("MovieMediaType", PropertySchemaRef(schemas, exported, "mediaType"));
    }

    [Fact]
    public async Task NotificationTypeEnum_MatchesTheTypesTheServerServes()
    {
        using var contract = await ContractAsync();
        var client = await IntegrationTestAuth.NewRegisteredClientAsync(_factory, "ContractPrefs");

        var served = await client.GetFromJsonAsync<JsonElement>("/api/v1/notifications/preferences");

        Assert.Equal(
            EnumOf(Schemas(contract), "NotificationTypePreference", "type"),
            served.GetProperty("preferences").EnumerateArray().Select(p => p.GetProperty("type").GetString()!));
    }

    [Fact]
    public async Task SwaggerJson_ExposesCriticalPaths()
    {
        var res = await _client.GetAsync("/swagger/v1/swagger.json");
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        var json = await res.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var paths = doc.RootElement.GetProperty("paths");
        Assert.True(paths.TryGetProperty("/health", out _));
        Assert.True(paths.TryGetProperty("/health/ready", out var ready) && ready.TryGetProperty("get", out _));
        Assert.True(paths.TryGetProperty("/api/v1/events", out var events) && events.TryGetProperty("post", out _));
        Assert.True(paths.TryGetProperty("/api/v1/events/mine", out var mine) && mine.TryGetProperty("get", out _));
        Assert.True(paths.TryGetProperty("/api/v1/events/slug/{slug}", out _));
        Assert.False(paths.TryGetProperty("/api/v1/events/slug/{slug}/share-preview", out _));
        Assert.False(paths.TryGetProperty("/e/{slug}", out _));
        Assert.True(paths.TryGetProperty("/api/v1/auth/register", out var reg) && reg.TryGetProperty("post", out _));
        Assert.True(paths.TryGetProperty("/api/v1/auth/login", out var login) && login.TryGetProperty("post", out _));
        Assert.True(paths.TryGetProperty("/api/v1/auth/logout", out var logout) && logout.TryGetProperty("post", out _));
        Assert.True(paths.TryGetProperty("/api/v1/auth/me", out var me) && me.TryGetProperty("get", out _) && me.TryGetProperty("patch", out _));
        Assert.True(paths.TryGetProperty("/api/v1/auth/password-reset/request", out var pwdReq)
                    && pwdReq.TryGetProperty("post", out _));
        Assert.True(paths.TryGetProperty("/api/v1/auth/password-reset/confirm", out var pwdConfirm)
                    && pwdConfirm.TryGetProperty("post", out _));
        Assert.True(paths.TryGetProperty("/api/v1/events/{slug}/config", out var evCfg)
                    && evCfg.TryGetProperty("get", out _)
                    && evCfg.TryGetProperty("patch", out _));
        Assert.True(paths.TryGetProperty("/api/v1/events/{slug}", out var evRoot)
                    && evRoot.TryGetProperty("delete", out _));
        Assert.True(paths.TryGetProperty("/api/v1/events/{slug}/movies/{movieId}/seen", out var seen)
                    && seen.TryGetProperty("post", out _)
                    && seen.TryGetProperty("delete", out _));
        Assert.True(paths.TryGetProperty("/api/v1/events/{slug}/movies/{movieId}/vote", out var voteOps)
                    && voteOps.TryGetProperty("post", out _)
                    && voteOps.TryGetProperty("delete", out _));
        Assert.True(paths.TryGetProperty("/api/v1/movies/search", out var mSearch) && mSearch.TryGetProperty("get", out _));
        Assert.True(paths.TryGetProperty("/api/v1/movies/tmdb/{tmdbId}/details", out var mDetails) && mDetails.TryGetProperty("get", out _));
        Assert.True(paths.TryGetProperty("/api/v1/posters/{posterKey}", out var posters) && posters.TryGetProperty("get", out _));
        Assert.True(paths.TryGetProperty("/api/v1/posters/tmdb/{size}/{file}", out var tmdbPosters) && tmdbPosters.TryGetProperty("get", out _));
        Assert.True(paths.TryGetProperty("/api/v1/users/{handle}/stats", out var userStats) && userStats.TryGetProperty("get", out _));
        var schemas = doc.RootElement.GetProperty("components").GetProperty("schemas");
        Assert.True(schemas.TryGetProperty("MovieSearchListResponse", out _));
        Assert.True(schemas.TryGetProperty("MovieSearchItemResponse", out var searchItem));
        var searchItemProps = searchItem.GetProperty("properties");
        Assert.True(searchItemProps.TryGetProperty("runtimeMinutes", out var searchRuntimeProp));
        Assert.Equal("integer", searchRuntimeProp.GetProperty("type").GetString());
        Assert.True(schemas.TryGetProperty("WatchProviderOfferResponse", out _));
        Assert.True(schemas.TryGetProperty("MovieDetailsResponse", out var movieDetails));
        var movieDetailsProps = movieDetails.GetProperty("properties");
        Assert.True(movieDetailsProps.TryGetProperty("trailerUrl", out _));
        Assert.True(schemas.TryGetProperty("EventConfigResponse", out var evConfig));
        Assert.True(evConfig.GetProperty("properties").TryGetProperty("allowSeries", out _));
        Assert.True(schemas.TryGetProperty("MovieMediaType", out _));

        Assert.True(schemas.TryGetProperty("UserStatsResponse", out var userStatsSchema));
        var statsProps = userStatsSchema.GetProperty("properties");
        Assert.True(statsProps.TryGetProperty("eventsCreated", out var eventsCreatedProp));
        Assert.Equal("integer", eventsCreatedProp.GetProperty("type").GetString());
        Assert.True(statsProps.TryGetProperty("favoriteGenres", out var favGenresProp));
        Assert.Equal("array", favGenresProp.GetProperty("type").GetString());
        Assert.True(statsProps.TryGetProperty("dailyActivity", out var dailyProp));
        Assert.Equal("array", dailyProp.GetProperty("type").GetString());
        Assert.True(schemas.TryGetProperty("GenreCount", out _));
        Assert.True(schemas.TryGetProperty("DailyActivityPoint", out _));

        Assert.True(schemas.TryGetProperty("MovieWithScoreResponse", out var movieWithScore));
        var movieProps = movieWithScore.GetProperty("properties");
        Assert.True(movieProps.TryGetProperty("runtimeMinutes", out var runtimeProp));
        Assert.Equal("integer", runtimeProp.GetProperty("type").GetString());

        Assert.True(movieProps.TryGetProperty("seenCount", out var seenCountProp));
        Assert.Equal("integer", seenCountProp.GetProperty("type").GetString());
        Assert.True(movieProps.TryGetProperty("seenByPseudos", out var seenByPseudosProp));
        Assert.Equal("array", seenByPseudosProp.GetProperty("type").GetString());

        Assert.True(movieProps.TryGetProperty("myVote", out var myVoteProp));
        Assert.Equal("integer", myVoteProp.GetProperty("type").GetString());

        Assert.True(schemas.TryGetProperty("MarkAsSeenRequest", out _));
        Assert.True(schemas.TryGetProperty("UnmarkAsSeenRequest", out _));
        Assert.True(schemas.TryGetProperty("SeenMarkResponse", out _));

        Assert.True(schemas.TryGetProperty("DeleteEventResponse", out _));

        Assert.False(schemas.TryGetProperty("ReactionRequest", out _));
        Assert.False(schemas.TryGetProperty("MovieReactionAggregateResponse", out _));
    }
}
