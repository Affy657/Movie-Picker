using System.Globalization;
using Microsoft.OpenApi;
using Swashbuckle.AspNetCore.SwaggerGen;

namespace MoviePicker.Api.Infrastructure.Web.OpenApi;

public sealed class ApiErrorResponseOperationFilter : IOperationFilter
{
    private const string JsonMediaType = "application/json";

    public void Apply(OpenApiOperation operation, OperationFilterContext context)
    {
        if (operation.Responses is null)
            return;

        foreach (var (status, response) in operation.Responses)
        {
            if (!IsError(status) || response is not OpenApiResponse error)
                continue;
            error.Content = new Dictionary<string, IOpenApiMediaType>(StringComparer.Ordinal)
            {
                [JsonMediaType] = new OpenApiMediaType
                {
                    Schema = context.SchemaGenerator.GenerateSchema(typeof(ApiErrorResponse), context.SchemaRepository)
                }
            };
        }
    }

    private static bool IsError(string status) =>
        int.TryParse(status, NumberStyles.None, CultureInfo.InvariantCulture, out var code)
        && code >= StatusCodes.Status400BadRequest;
}
