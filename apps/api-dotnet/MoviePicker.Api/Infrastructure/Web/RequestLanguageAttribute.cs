using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.Net.Http.Headers;
using MoviePicker.Api.Application.Ports;

namespace MoviePicker.Api.Infrastructure.Web;

[AttributeUsage(AttributeTargets.Parameter)]
public sealed class RequestLanguageAttribute : Attribute, IBinderTypeProviderMetadata
{
    public BindingSource BindingSource => BindingSource.Special;

    public Type BinderType => typeof(RequestLanguageModelBinder);
}

public sealed class RequestLanguageModelBinder : IModelBinder
{
    public Task BindModelAsync(ModelBindingContext bindingContext)
    {
        var httpContext = bindingContext.HttpContext;
        httpContext.Response.Headers.Append(HeaderNames.Vary, HeaderNames.AcceptLanguage);
        bindingContext.Result = ModelBindingResult.Success(LanguageOf(httpContext.Request));
        return Task.CompletedTask;
    }

    private static CatalogLanguage LanguageOf(HttpRequest request)
    {
        if (!StringWithQualityHeaderValue.TryParseList(request.Headers.AcceptLanguage, out var preferences))
            return CatalogLanguage.French;

        return CatalogLanguages.FirstSupported(preferences
            .Where(preference => preference.Quality is null or > 0)
            .OrderByDescending(preference => preference.Quality ?? 1)
            .Select(preference => preference.Value.Value ?? string.Empty));
    }
}
