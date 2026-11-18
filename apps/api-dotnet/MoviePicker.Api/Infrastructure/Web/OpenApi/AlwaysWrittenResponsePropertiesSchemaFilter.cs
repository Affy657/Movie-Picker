using System.Text.Json;
using System.Text.Json.Serialization.Metadata;
using Microsoft.AspNetCore.Mvc.ApiExplorer;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.Extensions.Options;
using Microsoft.OpenApi;
using MoviePicker.Api.Application.DTOs;
using Swashbuckle.AspNetCore.SwaggerGen;
using MvcJsonOptions = Microsoft.AspNetCore.Mvc.JsonOptions;

namespace MoviePicker.Api.Infrastructure.Web.OpenApi;

public sealed class AlwaysWrittenResponsePropertiesSchemaFilter : ISchemaFilter
{
    private static readonly Type[] SerializedWithoutNulls = [typeof(UserDataExportResponse)];

    private readonly JsonSerializerOptions _json;
    private readonly Lazy<HashSet<Type>> _requestTypes;
    private readonly Lazy<HashSet<Type>> _typesWithoutNulls;

    public AlwaysWrittenResponsePropertiesSchemaFilter(
        IOptions<MvcJsonOptions> jsonOptions,
        IApiDescriptionGroupCollectionProvider apiDescriptions)
    {
        _json = new JsonSerializerOptions(jsonOptions.Value.JsonSerializerOptions);
        _requestTypes = new Lazy<HashSet<Type>>(() => Reachable(RequestBodyTypes(apiDescriptions)));
        _typesWithoutNulls = new Lazy<HashSet<Type>>(() => Reachable(SerializedWithoutNulls));
    }

    public void Apply(IOpenApiSchema schema, SchemaFilterContext context)
    {
        if (schema is not OpenApiSchema { Properties.Count: > 0 } target || _requestTypes.Value.Contains(context.Type))
            return;

        var typeInfo = _json.GetTypeInfo(context.Type);
        if (typeInfo.Kind != JsonTypeInfoKind.Object)
            return;

        var nullsOmitted = _typesWithoutNulls.Value.Contains(context.Type);
        foreach (var property in typeInfo.Properties.Where(p => IsAlwaysWritten(p) && (!nullsOmitted || !p.IsGetNullable)))
        {
            if (!target.Properties.ContainsKey(property.Name))
                continue;
            target.Required ??= new HashSet<string>(StringComparer.Ordinal);
            target.Required.Add(property.Name);
        }
    }

    private static bool IsAlwaysWritten(JsonPropertyInfo property) =>
        property.Get is not null
        && property.ShouldSerialize is null
        && !property.IsExtensionData;

    private static IEnumerable<Type> RequestBodyTypes(IApiDescriptionGroupCollectionProvider apiDescriptions) =>
        apiDescriptions.ApiDescriptionGroups.Items
            .SelectMany(group => group.Items)
            .SelectMany(description => description.ParameterDescriptions)
            .Where(parameter => parameter.Source == BindingSource.Body || parameter.Source == BindingSource.Form)
            .Select(parameter => parameter.Type);

    private HashSet<Type> Reachable(IEnumerable<Type> roots)
    {
        var reached = new HashSet<Type>();
        var pending = new Stack<Type>(roots);

        while (pending.TryPop(out var type))
        {
            if (!reached.Add(type))
                continue;
            foreach (var nested in NestedTypes(_json.GetTypeInfo(type)))
                pending.Push(nested);
        }

        return reached;
    }

    private static IEnumerable<Type> NestedTypes(JsonTypeInfo typeInfo) => typeInfo.Kind switch
    {
        JsonTypeInfoKind.Object => typeInfo.Properties.Select(property => Unwrapped(property.PropertyType)),
        JsonTypeInfoKind.Enumerable => [Unwrapped(typeInfo.ElementType!)],
        JsonTypeInfoKind.Dictionary => [Unwrapped(typeInfo.KeyType!), Unwrapped(typeInfo.ElementType!)],
        _ => []
    };

    private static Type Unwrapped(Type type) => Nullable.GetUnderlyingType(type) ?? type;
}
