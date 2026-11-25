using System.Reflection;
using Microsoft.OpenApi;
using Swashbuckle.AspNetCore.SwaggerGen;

namespace MoviePicker.Api.Infrastructure.Web.OpenApi;

public sealed class ServedParameterValuesFilter : IParameterFilter
{
    public void Apply(IOpenApiParameter parameter, ParameterFilterContext context)
    {
        if (context.ParameterInfo?.GetCustomAttribute<ValuesOfAttribute>() is { } valuesOf
            && parameter is OpenApiParameter { Schema: OpenApiSchema schema })
        {
            schema.Enum = ServedValues.AsEnum(ServedValues.StringConstantsOf(valuesOf.Constants));
        }
    }
}
