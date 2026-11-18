using System.Reflection;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.Extensions.Options;
using Microsoft.OpenApi;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.GetMovieShowcase;
using MoviePicker.Api.Application.UseCases.ListMyEvents;
using MoviePicker.Api.Domain.Entities;
using Swashbuckle.AspNetCore.SwaggerGen;
using MvcJsonOptions = Microsoft.AspNetCore.Mvc.JsonOptions;

namespace MoviePicker.Api.Infrastructure.Web.OpenApi;

public sealed class ServedStringValuesSchemaFilter : ISchemaFilter
{
    private static readonly string[] NotificationTypes = LowerCaseNames<UserNotificationType>();

    private static readonly string[] Lifecycles =
        Enum.GetValues<EventLifecycle>().Select(MyEventListLifecycle.FromLifecycle).Distinct().ToArray();

    private static readonly Dictionary<Type, Dictionary<string, string[]>> ValuesByMember = new()
    {
        [typeof(UserNotificationItem)] = new() { [nameof(UserNotificationItem.Type)] = NotificationTypes },
        [typeof(NotificationTypePreference)] = new() { [nameof(NotificationTypePreference.Type)] = NotificationTypes },
        [typeof(EventDetailResponse)] = new() { [nameof(EventDetailResponse.Lifecycle)] = Lifecycles },
        [typeof(MyEventSummaryDto)] = new() { [nameof(MyEventSummaryDto.Lifecycle)] = Lifecycles },
        [typeof(NightRecapResponse)] = new() { [nameof(NightRecapResponse.Lifecycle)] = Lifecycles },
        [typeof(EventWinnerResponse)] = new()
        {
            [nameof(EventWinnerResponse.PickMethod)] = LowerCaseNames<WinnerPickMethod>()
        },
        [typeof(MovieCrewMemberResponse)] = new()
        {
            [nameof(MovieCrewMemberResponse.Job)] = StringConstantsOf(typeof(TmdbCrewJobs))
        },
        [typeof(MovieShowcaseListResponse)] = new()
        {
            [nameof(MovieShowcaseListResponse.Section)] = StringConstantsOf(typeof(MovieShowcaseSections))
        }
    };

    private readonly JsonSerializerOptions _json;

    public ServedStringValuesSchemaFilter(IOptions<MvcJsonOptions> jsonOptions)
    {
        _json = new JsonSerializerOptions(jsonOptions.Value.JsonSerializerOptions);
    }

    public void Apply(IOpenApiSchema schema, SchemaFilterContext context)
    {
        if (schema is not OpenApiSchema { Properties: { } properties } || !ValuesByMember.TryGetValue(context.Type, out var valuesByMember))
            return;

        foreach (var property in _json.GetTypeInfo(context.Type).Properties)
        {
            if (property.AttributeProvider is MemberInfo member
                && valuesByMember.TryGetValue(member.Name, out var values)
                && properties.TryGetValue(property.Name, out var served)
                && served is OpenApiSchema servedSchema)
            {
                servedSchema.Enum = values.Select(value => (JsonNode)JsonValue.Create(value)).ToList();
            }
        }
    }

    private static string[] LowerCaseNames<TEnum>() where TEnum : struct, Enum =>
        Enum.GetValues<TEnum>().Select(value => value.ToString().ToLowerInvariant()).ToArray();

    private static string[] StringConstantsOf(Type holder) =>
        holder.GetFields(BindingFlags.Public | BindingFlags.Static)
            .Where(field => field.IsLiteral && field.FieldType == typeof(string))
            .Select(field => (string)field.GetRawConstantValue()!)
            .ToArray();
}
