using System.Text.Json;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.AspNetCore.Authentication.OAuth;
using Microsoft.Extensions.Options;
using MongoDB.Driver;
using MoviePicker.Api.Infrastructure.Persistence.InMemory;
using MoviePicker.Api.Infrastructure.Persistence.Mongo;

namespace MoviePicker.Api.Infrastructure.Web;

public static class AuthenticationExtensions
{
    public static IServiceCollection AddMoviePickerAuthentication(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        services.AddSingleton<AuthTicketCache>();
        services.AddSingleton<ITicketStore>(sp =>
            sp.GetService<MongoCollectionFactory>() is { } collections
                ? new CachedAuthTicketStore(new MongoAuthTicketStore(collections), sp.GetRequiredService<AuthTicketCache>())
                : new MemoryAuthTicketStore());

        services.AddSingleton<IConfigureOptions<CookieAuthenticationOptions>, MoviePickerCookieAuthenticationConfigurer>();
        services.AddSingleton<OAuthProviderCatalog>();

        var authBuilder = services
            .AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
            .AddCookie(CookieAuthenticationDefaults.AuthenticationScheme)
            .AddCookie(AuthConstants.ExternalCookieScheme, options =>
            {
                options.Cookie.Name = AuthConstants.ExternalCookieName;
                options.Cookie.HttpOnly = true;
                options.Cookie.Path = "/";
                options.ExpireTimeSpan = AuthConstants.ExternalCookieLifetime;
                options.SlidingExpiration = false;
            });

        var googleClientId = OAuthProviderCatalog.ReadCredential(configuration, "OAUTH_GOOGLE_CLIENT_ID");
        var googleClientSecret = OAuthProviderCatalog.ReadCredential(configuration, "OAUTH_GOOGLE_CLIENT_SECRET");
        if (googleClientId is not null && googleClientSecret is not null)
        {
            authBuilder.AddGoogle(OAuthProviders.Google, options =>
            {
                options.SignInScheme = AuthConstants.ExternalCookieScheme;
                options.ClientId = googleClientId;
                options.ClientSecret = googleClientSecret;
                options.Scope.Add("email");
                options.Scope.Add("profile");
                options.ClaimActions.MapCustomJson(
                    "email_verified",
                    user => IsGoogleEmailVerified(user) ? "true" : "false");
            });
        }

        var githubClientId = OAuthProviderCatalog.ReadCredential(configuration, "OAUTH_GITHUB_CLIENT_ID");
        var githubClientSecret = OAuthProviderCatalog.ReadCredential(configuration, "OAUTH_GITHUB_CLIENT_SECRET");
        if (githubClientId is not null && githubClientSecret is not null)
        {
            authBuilder.AddOAuth(OAuthProviders.GitHub, options =>
            {
                options.SignInScheme = AuthConstants.ExternalCookieScheme;
                options.ClientId = githubClientId;
                options.ClientSecret = githubClientSecret;
                options.CallbackPath = "/signin-github";
                options.AuthorizationEndpoint = "https://github.com/login/oauth/authorize";
                options.TokenEndpoint = "https://github.com/login/oauth/access_token";
                options.UserInformationEndpoint = "https://api.github.com/user";
                options.Scope.Add("read:user");
                options.Scope.Add("user:email");
                options.ClaimActions.MapJsonKey(System.Security.Claims.ClaimTypes.NameIdentifier, "id");
                options.ClaimActions.MapJsonKey(System.Security.Claims.ClaimTypes.Name, "name");
                options.ClaimActions.MapJsonKey("urn:github:login", "login");
                options.Events = new OAuthEvents { OnCreatingTicket = GitHubOAuthEvents.OnCreatingTicketAsync };
            });
        }

        services.AddAuthorization();
        return services;
    }

    private static bool IsGoogleEmailVerified(JsonElement user) =>
        IsTrue(user, "verified_email") || IsTrue(user, "email_verified");

    private static bool IsTrue(JsonElement user, string property) =>
        user.TryGetProperty(property, out var value) && value.ValueKind == JsonValueKind.True;
}
