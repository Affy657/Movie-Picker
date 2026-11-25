using System.Reflection;
using System.Text.Json;
using System.Text.Json.Serialization.Metadata;
using Microsoft.Extensions.Options;
using Microsoft.OpenApi;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.GetMovieShowcase;
using MoviePicker.Api.Application.UseCases.ListMyEvents;
using MoviePicker.Api.Application.UseCases.SavedLists;
using MoviePicker.Api.Domain.Entities;
using Swashbuckle.AspNetCore.SwaggerGen;
using MvcJsonOptions = Microsoft.AspNetCore.Mvc.JsonOptions;

namespace MoviePicker.Api.Infrastructure.Web.OpenApi;

public sealed class ServedStringValuesSchemaFilter : ISchemaFilter
{
    private static readonly string[] NotificationTypes = ServedValues.LowerCaseNames<UserNotificationType>();

    private static readonly string[] Lifecycles =
        Enum.GetValues<EventLifecycle>().Select(MyEventListLifecycle.FromLifecycle).Distinct().ToArray();

    private static readonly string[] Providers = ServedValues.StringConstantsOf(typeof(OAuthProviders));

    private static readonly Dictionary<Type, Dictionary<string, string[]>> ValuesByMember = new()
    {
        [typeof(UserNotificationItem)] = new() { [nameof(UserNotificationItem.Type)] = NotificationTypes },
        [typeof(NotificationTypePreference)] = new() { [nameof(NotificationTypePreference.Type)] = NotificationTypes },
        [typeof(NotificationTypePreferencePatch)] = new() { [nameof(NotificationTypePreferencePatch.Type)] = NotificationTypes },
        [typeof(ExportedNotification)] = new() { [nameof(ExportedNotification.Type)] = NotificationTypes },
        [typeof(EventDetailResponse)] = new() { [nameof(EventDetailResponse.Lifecycle)] = Lifecycles },
        [typeof(MyEventSummaryDto)] = new() { [nameof(MyEventSummaryDto.Lifecycle)] = Lifecycles },
        [typeof(NightRecapResponse)] = new() { [nameof(NightRecapResponse.Lifecycle)] = Lifecycles },
        [typeof(EventWinnerResponse)] = new()
        {
            [nameof(EventWinnerResponse.PickMethod)] = ServedValues.LowerCaseNames<WinnerPickMethod>()
        },
        [typeof(MovieCrewMemberResponse)] = new()
        {
            [nameof(MovieCrewMemberResponse.Job)] = ServedValues.StringConstantsOf(typeof(TmdbCrewJobs))
        },
        [typeof(MovieShowcaseListResponse)] = new()
        {
            [nameof(MovieShowcaseListResponse.Section)] = ServedValues.StringConstantsOf(typeof(MovieShowcaseSections))
        },
        [typeof(SaveListRequest)] = new()
        {
            [nameof(SaveListRequest.SourceType)] = ServedValues.StringConstantsOf(typeof(ListSourceNames))
        },
        [typeof(ProfileBannerResponse)] = new()
        {
            [nameof(ProfileBannerResponse.Source)] = [ProfileBannerResponse.FilmSource, ProfileBannerResponse.PhotoSource]
        },
        [typeof(OAuthProvidersResponse)] = new() { [nameof(OAuthProvidersResponse.Providers)] = Providers },
        [typeof(UserProfileResponse)] = new() { [nameof(UserProfileResponse.LinkedProviders)] = Providers },
        [typeof(ExportedProfile)] = new() { [nameof(ExportedProfile.LinkedProviders)] = Providers }
    };

    private readonly JsonSerializerOptions _json;

    public ServedStringValuesSchemaFilter(IOptions<MvcJsonOptions> jsonOptions)
    {
        _json = new JsonSerializerOptions(jsonOptions.Value.JsonSerializerOptions);
    }

    public void Apply(IOpenApiSchema schema, SchemaFilterContext context)
    {
        if (schema is not OpenApiSchema { Properties: { Count: > 0 } properties })
            return;

        var typeInfo = _json.GetTypeInfo(context.Type);
        if (typeInfo.Kind != JsonTypeInfoKind.Object)
            return;

        var declared = ValuesByMember.GetValueOrDefault(context.Type);
        foreach (var property in typeInfo.Properties)
        {
            if (property.AttributeProvider is MemberInfo member
                && ValuesOf(member, declared) is { } values
                && properties.TryGetValue(property.Name, out var served)
                && served is OpenApiSchema servedSchema)
            {
                var described = servedSchema.Items as OpenApiSchema ?? servedSchema;
                described.Enum = ServedValues.AsEnum(values);
            }
        }
    }

    private static string[]? ValuesOf(MemberInfo member, Dictionary<string, string[]>? declared) =>
        declared is not null && declared.TryGetValue(member.Name, out var values)
            ? values
            : ServedValues.ClosedListOf(member);
}
