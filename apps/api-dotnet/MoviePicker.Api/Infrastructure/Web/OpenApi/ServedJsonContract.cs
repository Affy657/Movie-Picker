using Swashbuckle.AspNetCore.SwaggerGen;

namespace MoviePicker.Api.Infrastructure.Web.OpenApi;

public static class ServedJsonContract
{
    public static void DescribeServedJson(this SwaggerGenOptions options)
    {
        options.SupportNonNullableReferenceTypes();
        options.UseAllOfToExtendReferenceSchemas();
        options.SchemaFilter<AlwaysWrittenResponsePropertiesSchemaFilter>();
        options.SchemaFilter<ServedStringValuesSchemaFilter>();
        options.OperationFilter<ApiErrorResponseOperationFilter>();
    }
}
