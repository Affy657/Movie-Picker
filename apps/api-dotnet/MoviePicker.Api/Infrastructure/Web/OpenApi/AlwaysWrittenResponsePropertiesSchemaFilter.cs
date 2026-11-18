using System.Text.Json;
using System.Text.Json.Serialization.Metadata;
using Microsoft.AspNetCore.Mvc.ApiExplorer;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.Extensions.Options;
using Microsoft.OpenApi;
using Swashbuckle.AspNetCore.SwaggerGen;
using MvcJsonOptions = Microsoft.AspNetCore.Mvc.JsonOptions;

namespace MoviePicker.Api.Infrastructure.Web.OpenApi;

public sealed class AlwaysWrittenResponsePropertiesSchemaFilter : ISchemaFilter
{
    private readonly JsonSerializerOptions _json;
    private readonly Lazy<HashSet<Type>> _requestTypes;

    public AlwaysWrittenResponsePropertiesSchemaFilter(
        IOptions<MvcJsonOptions> jsonOptions,
        IApiDescriptionGroupCollectionProvider apiDescriptions)
    {
        _json = new JsonSerializerOptions(jsonOptions.Value.JsonSerializerOptions);
        _requestTypes = new Lazy<HashSet<Type>>(() => RequestTypes(apiDescriptions));
    }

    public void Apply(IOpenApiSchema schema, SchemaFilterContext context)
    {
        if (schema is not OpenApiSchema { Properties.Count: > 0 } target || _requestTypes.Value.Contains(context.Type))
            return;

        var typeInfo = _json.GetTypeInfo(context.Type);
        if (typeInfo.Kind != JsonTypeInfoKind.Object)
            return;

        foreach (var property in typeInfo.Properties.Where(IsAlwaysWrittenWithAValue))
        {
            if (!target.Properties.ContainsKey(property.Name))
                continue;
            target.Required ??= new HashSet<string>(StringComparer.Ordinal);
            target.Required.Add(property.Name);
        }
    }

    private static bool IsAlwaysWrittenWithAValue(JsonPropertyInfo property) =>
        property.Get is not null
        && property.ShouldSerialize is null
        && !property.IsExtensionData
        && !property.IsGetNullable;

    private HashSet<Type> RequestTypes(IApiDescriptionGroupCollectionProvider apiDescriptions)
    {
        var reached = new HashSet<Type>();
        var pending = new Stack<Type>(
            apiDescriptions.ApiDescriptionGroups.Items
                .SelectMany(group => group.Items)
                .SelectMany(description => description.ParameterDescriptions)
                .Where(parameter => parameter.Source == BindingSource.Body || parameter.Source == BindingSource.Form)
                .Select(parameter => parameter.Type));

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
