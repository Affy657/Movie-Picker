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
        options.ExpireTimeSpan = TimeSpan.FromDays(14);
        options.SlidingExpiration = true;

        if (_environment.IsDevelopment())
        {
            options.Cookie.SecurePolicy = CookieSecurePolicy.SameAsRequest;
            options.Cookie.SameSite = SameSiteMode.Lax;
        }
        else
        {
            options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
            options.Cookie.SameSite = SameSiteMode.None;
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
