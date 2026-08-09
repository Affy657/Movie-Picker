using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;

namespace MoviePicker.Api.Infrastructure.Web;

public sealed class MoviePickerCookieAuthenticationConfigurer : IConfigureNamedOptions<CookieAuthenticationOptions>
{
    private readonly ITicketStore _ticketStore;
    private readonly IHostEnvironment _environment;

    public MoviePickerCookieAuthenticationConfigurer(
        ITicketStore ticketStore,
        IHostEnvironment environment)
    {
        _ticketStore = ticketStore;
        _environment = environment;
    }

    public void Configure(string? name, CookieAuthenticationOptions options)
    {
        if (name != CookieAuthenticationDefaults.AuthenticationScheme)
            return;

        options.Cookie.Name = AuthConstants.CookieName;
        options.SessionStore = _ticketStore;
        options.Cookie.HttpOnly = true;
        options.Cookie.Path = "/";
        options.ExpireTimeSpan = AuthConstants.SessionLifetime;
        options.SlidingExpiration = true;

        if (_environment.IsDevelopment())
        {
            options.Cookie.SecurePolicy = CookieSecurePolicy.SameAsRequest;
            options.Cookie.SameSite = SameSiteMode.Lax;
        }
        else
        {
            options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
            // Front (web.movie-picker.fr) et API (api.movie-picker.fr) partagent le même
            // eTLD+1 : la requête est same-site, Lax suffit et évite le traitement
            // "cookie tiers" (ITP Safari, protections cross-site Chrome/Firefox) que
            // SameSite=None subissait, qui purgeait la session prématurément.
            options.Cookie.SameSite = SameSiteMode.Lax;
        }

        options.Events.OnRedirectToLogin = async ctx =>
        {
            ctx.Response.StatusCode = StatusCodes.Status401Unauthorized;
            ctx.Response.ContentType = "application/json";
            await ctx.Response.WriteAsync(
                ApiErrorJson.Serialize(
                    ctx.HttpContext,
                    StatusCodes.Status401Unauthorized,
                    "Authentification requise."));
        };
        options.Events.OnRedirectToAccessDenied = async ctx =>
        {
            ctx.Response.StatusCode = StatusCodes.Status403Forbidden;
            ctx.Response.ContentType = "application/json";
            await ctx.Response.WriteAsync(
                ApiErrorJson.Serialize(
                    ctx.HttpContext,
                    StatusCodes.Status403Forbidden,
                    "Accès refusé."));
        };
    }

    public void Configure(CookieAuthenticationOptions options) =>
        Configure(CookieAuthenticationDefaults.AuthenticationScheme, options);
}
