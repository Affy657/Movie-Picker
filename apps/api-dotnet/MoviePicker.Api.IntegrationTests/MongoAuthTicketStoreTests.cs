using System.Globalization;
using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.Extensions.DependencyInjection;
using MongoDB.Bson;
using MoviePicker.Api.Infrastructure.Persistence.Mongo;
using MoviePicker.Api.Infrastructure.Web;
using Xunit;

namespace MoviePicker.Api.IntegrationTests;

public sealed class MongoAuthTicketStoreTests : IClassFixture<MoviePickerApplicationFactory>
{
    private readonly MoviePickerApplicationFactory _factory;

    public MongoAuthTicketStoreTests(MoviePickerApplicationFactory factory)
    {
        _factory = factory;
        _ = _factory.CreateClient();
    }

    private MongoAuthTicketStore Store() =>
        new(_factory.Services.GetRequiredService<MongoCollectionFactory>());

    private static AuthenticationTicket Ticket(DateTimeOffset issued, DateTimeOffset expires) =>
        new(
            new ClaimsPrincipal(new ClaimsIdentity([new Claim(ClaimTypes.NameIdentifier, "user-1")], CookieAuthenticationDefaults.AuthenticationScheme)),
            new AuthenticationProperties { IsPersistent = true, IssuedUtc = issued, ExpiresUtc = expires },
            CookieAuthenticationDefaults.AuthenticationScheme);

    [MongoFact]
    public async Task RetrieveAfterARenewal_StartsTheSlidingWindowAtTheRenewal()
    {
        var store = Store();
        var now = DateTimeOffset.UtcNow;
        var key = await store.StoreAsync(Ticket(now, now + AuthConstants.SessionLifetime));
        var renewedAt = now.AddDays(16);

        await store.RenewAsync(key, Ticket(renewedAt, renewedAt + AuthConstants.SessionLifetime));
        var retrieved = await store.RetrieveAsync(key);

        Assert.NotNull(retrieved);
        var window = retrieved!.Properties.ExpiresUtc!.Value - retrieved.Properties.IssuedUtc!.Value;
        Assert.True(window <= AuthConstants.SessionLifetime + TimeSpan.FromSeconds(1), $"window {window}");
    }

    [MongoFact]
    public async Task RetrieveAnExpiredSession_ReturnsNothingAndForgetsIt()
    {
        var store = Store();
        var past = DateTimeOffset.UtcNow.AddDays(-40);
        var key = await store.StoreAsync(Ticket(past, past.AddDays(30)));

        Assert.Null(await store.RetrieveAsync(key));
        Assert.Null(await store.RetrieveAsync(key));
    }

    [MongoFact]
    public async Task StoredSession_KeepsTheSignInTimeThroughRetrievalAndRenewal()
    {
        using var scope = _factory.Services.CreateScope();
        var store = new MongoAuthTicketStore(scope.ServiceProvider.GetRequiredService<MongoCollectionFactory>());
        var signedInAt = DateTimeOffset.UtcNow;
        var principal = new ClaimsPrincipal(new ClaimsIdentity(
            [
                new Claim(ClaimTypes.NameIdentifier, ObjectId.GenerateNewId().ToString()),
                RecentAuthentication.ClaimFor(signedInAt)
            ],
            CookieAuthenticationDefaults.AuthenticationScheme));
        var ticket = new AuthenticationTicket(
            principal,
            new AuthenticationProperties { ExpiresUtc = signedInAt.AddHours(1) },
            CookieAuthenticationDefaults.AuthenticationScheme);
        var expected = signedInAt.ToUnixTimeSeconds().ToString(CultureInfo.InvariantCulture);

        var key = await store.StoreAsync(ticket);
        var retrieved = await store.RetrieveAsync(key);
        Assert.NotNull(retrieved);
        Assert.Equal(expected, retrieved.Principal.FindFirst(RecentAuthentication.AuthenticatedAtClaimType)?.Value);
        Assert.True(RecentAuthentication.IsRecent(retrieved.Principal, signedInAt));

        retrieved.Properties.ExpiresUtc = signedInAt.AddHours(2);
        await store.RenewAsync(key, retrieved);
        var renewed = await store.RetrieveAsync(key);
        Assert.NotNull(renewed);
        Assert.Equal(expected, renewed.Principal.FindFirst(RecentAuthentication.AuthenticatedAtClaimType)?.Value);

        await store.RemoveAsync(key);
    }

    private static AuthenticationTicket TicketOf(string userId)
    {
        var now = DateTimeOffset.UtcNow;
        return new AuthenticationTicket(
            new ClaimsPrincipal(new ClaimsIdentity([new Claim(ClaimTypes.NameIdentifier, userId)], CookieAuthenticationDefaults.AuthenticationScheme)),
            new AuthenticationProperties { IsPersistent = true, IssuedUtc = now, ExpiresUtc = now + AuthConstants.SessionLifetime },
            CookieAuthenticationDefaults.AuthenticationScheme);
    }

    [MongoFact]
    public async Task InvalidateOthersForUser_KeepsTheNamedSession_AndEveryOtherUsersSessions()
    {
        var store = Store();
        var user = ObjectId.GenerateNewId().ToString();
        var neighbour = ObjectId.GenerateNewId().ToString();
        var current = await store.StoreAsync(TicketOf(user));
        var elsewhere = await store.StoreAsync(TicketOf(user));
        var neighbours = await store.StoreAsync(TicketOf(neighbour));
        var invalidator = new MongoAuthSessionInvalidator(
            _factory.Services.GetRequiredService<MongoCollectionFactory>(),
            _factory.Services.GetRequiredService<AuthTicketCache>());

        var revoked = await invalidator.InvalidateOthersForUserAsync(user, current);

        Assert.Equal(1, revoked);
        Assert.NotNull(await store.RetrieveAsync(current));
        Assert.Null(await store.RetrieveAsync(elsewhere));
        Assert.NotNull(await store.RetrieveAsync(neighbours));
    }
}
