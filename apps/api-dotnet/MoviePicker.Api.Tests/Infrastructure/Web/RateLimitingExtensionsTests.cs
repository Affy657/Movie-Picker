using System.Net;
using System.Reflection;
using System.Security.Claims;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using MoviePicker.Api.Controllers;
using MoviePicker.Api.Infrastructure.Web;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Web;

public sealed class RateLimitingExtensionsTests
{
    private const string HostingAddress = "66.249.93.69";
    private const string OtherHostingAddress = "142.250.32.37";
    private const string DirectAddress = "203.0.113.9";
    private const string RelayedClientAddress = "203.0.113.7";
    private const string OtherRelayedClientAddress = "198.51.100.2";
    private const string CloudRunPeerAddress = "169.254.1.1";
    private const string RelayedSlug = "7fKq2p";

    [Fact]
    public void AddMoviePickerRateLimiter_Development_RegistersService()
    {
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddMoviePickerRateLimiter(new StubHostEnvironment("Development"));

        using var provider = services.BuildServiceProvider();
        Assert.NotNull(provider.GetRequiredService<IOptions<RateLimiterOptions>>());
    }

    [Fact]
    public void AddMoviePickerRateLimiter_Production_RegistersService()
    {
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddMoviePickerRateLimiter(new StubHostEnvironment("Production"));

        using var provider = services.BuildServiceProvider();
        Assert.NotNull(provider.GetService<IOptions<RateLimiterOptions>>());
        var options = provider.GetRequiredService<IOptions<RateLimiterOptions>>().Value;
        Assert.Equal(StatusCodes.Status429TooManyRequests, options.RejectionStatusCode);
    }

    [Fact]
    public void ClientIpPartitionKey_UsesRemoteIp()
    {
        var http = new DefaultHttpContext();
        http.Connection.RemoteIpAddress = IPAddress.Parse("203.0.113.10");

        Assert.Equal("203.0.113.10", ClientIpPartitionKey.Get(http));
    }

    [Fact]
    public void ClientIpPartitionKey_Unknown_WhenNoIp()
    {
        Assert.Equal("unknown", ClientIpPartitionKey.Get(new DefaultHttpContext()));
    }

    [Theory]
    [InlineData("2001:db8:1:2::1", "2001:db8:1:2:ffff:ffff:ffff:ffff")]
    [InlineData("2001:db8:1:2::1", "2001:db8:1:2:8a2e:370:7334:1")]
    public void ClientIpPartitionKey_AddressesOfOneIpv6Network_ShareOneKey(string first, string second)
    {
        Assert.Equal(ClientIpPartitionKey.Get(From(first)), ClientIpPartitionKey.Get(From(second)));
    }

    [Fact]
    public void ClientIpPartitionKey_TwoIpv6Networks_KeepTheirOwnKeys()
    {
        Assert.NotEqual(
            ClientIpPartitionKey.Get(From("2001:db8:1:2::1")),
            ClientIpPartitionKey.Get(From("2001:db8:1:3::1")));
    }

    [Fact]
    public void ClientIpPartitionKey_Ipv4MappedAddress_IsKeyedLikeItsIpv4Address()
    {
        Assert.Equal("203.0.113.10", ClientIpPartitionKey.Get(From("::ffff:203.0.113.10")));
        Assert.NotEqual(
            ClientIpPartitionKey.Get(From("::ffff:203.0.113.10")),
            ClientIpPartitionKey.Get(From("::ffff:198.51.100.2")));
    }

    [Theory]
    [InlineData(RateLimitingExtensions.AuthLoginPolicy)]
    [InlineData(RateLimitingExtensions.AuthRegisterPolicy)]
    [InlineData(RateLimitingExtensions.AuthPasswordResetRequestPolicy)]
    public void CreatePartition_AddressScopedPolicy_RotatingInsideAnIpv6Network_KeepsThePartition(string policy)
    {
        var spec = RateLimitingExtensions.FindPolicy(policy)!.Value;

        var first = RateLimitingExtensions.CreatePartition(From("2001:db8:1:2::1"), spec);
        var rotated = RateLimitingExtensions.CreatePartition(From("2001:db8:1:2:dead:beef:0:1"), spec);

        Assert.Equal(first.PartitionKey, rotated.PartitionKey);
    }

    [Fact]
    public void ClientAddressAccessor_RotatingInsideAnIpv6Network_ReportsOneSource()
    {
        static string SourceOf(string address) =>
            new ClientAddressAccessor(new HttpContextAccessor { HttpContext = From(address) }).GetClientAddress();

        Assert.Equal(SourceOf("2001:db8:1:2::1"), SourceOf("2001:db8:1:2:dead:beef:0:1"));
    }

    [Fact]
    public void NightRecapRoute_HasItsOwnPolicy_CountedPerReader()
    {
        var attribute = typeof(RecapsController).GetMethod(nameof(RecapsController.Get))!
            .GetCustomAttribute<EnableRateLimitingAttribute>();

        Assert.Equal(RateLimitingExtensions.NightRecapPolicy, attribute?.PolicyName);
        var spec = RateLimitingExtensions.FindPolicy(RateLimitingExtensions.NightRecapPolicy)!.Value;
        Assert.Equal(60, spec.PermitLimit);
        Assert.Equal(1, spec.WindowMinutes);
        Assert.Equal("ip:192.0.2.8", RateLimitingExtensions.CreatePartition(From("192.0.2.8"), spec).PartitionKey);
    }

    [Fact]
    public void CreatePartition_IdeaSuggestion_CountsPerAccountWhateverTheAddress()
    {
        var spec = RateLimitingExtensions.FindPolicy(RateLimitingExtensions.IdeaSuggestionPolicy)!.Value;

        var fromHome = RateLimitingExtensions.CreatePartition(SignedIn("alice", "192.0.2.8"), spec);
        var fromWork = RateLimitingExtensions.CreatePartition(SignedIn("alice", "198.51.100.2"), spec);
        var neighbour = RateLimitingExtensions.CreatePartition(SignedIn("bob", "192.0.2.8"), spec);

        Assert.Equal("user:alice", fromHome.PartitionKey);
        Assert.Equal(fromHome.PartitionKey, fromWork.PartitionKey);
        Assert.NotEqual(fromHome.PartitionKey, neighbour.PartitionKey);
    }

    [Fact]
    public void CreatePartition_IdeaSuggestionAddress_CountsEveryAccountBehindOneAddress()
    {
        var spec = RateLimitingExtensions.FindPolicy(RateLimitingExtensions.IdeaSuggestionAddressPolicy)!.Value;

        var alice = RateLimitingExtensions.CreatePartition(SignedIn("alice", "192.0.2.8"), spec);
        var bob = RateLimitingExtensions.CreatePartition(SignedIn("bob", "192.0.2.8"), spec);
        var elsewhere = RateLimitingExtensions.CreatePartition(SignedIn("alice", "198.51.100.2"), spec);

        Assert.Equal(alice.PartitionKey, bob.PartitionKey);
        Assert.NotEqual(alice.PartitionKey, elsewhere.PartitionKey);
        Assert.True(spec.PermitLimit > RateLimitingExtensions.FindPolicy(RateLimitingExtensions.IdeaSuggestionPolicy)!.Value.PermitLimit);
        Assert.Equal(60, spec.WindowMinutes);
    }

    private static RateLimitPartition<string> ShowcasePartition(string query)
    {
        var http = From("192.0.2.8");
        http.Request.QueryString = new QueryString(query);
        return RateLimitingExtensions.CreatePartition(
            http,
            RateLimitingExtensions.FindPolicy(RateLimitingExtensions.MovieShowcasePolicy)!.Value);
    }

    private static int PermitsOf(RateLimitPartition<string> partition)
    {
        using var limiter = partition.Factory(partition.PartitionKey);
        var permits = 0;
        while (permits < 1_000)
        {
            using var lease = limiter.AttemptAcquire();
            if (!lease.IsAcquired)
                break;
            permits++;
        }
        return permits;
    }

    [Theory]
    [InlineData("?section=recommendations&seedTmdbId=27205")]
    [InlineData("?section=RECOMMENDATIONS&seedTmdbId=27205")]
    [InlineData("?section=recommendations&section=trending&seedTmdbId=27205")]
    [InlineData("?section=trending&genreIds=28,35")]
    [InlineData("?genreIds=28,35")]
    [InlineData("?section=director&personId=525")]
    [InlineData("?section=Director&personId=525")]
    [InlineData("?section=collection&collectionId=31")]
    [InlineData("?section=collection&collectionId=%2B31")]
    [InlineData("?section=collection&collectionId=%2031")]
    [InlineData("?section=collection&collectionId=0x1F")]
    [InlineData("?section=collection&collectionId=%231F")]
    public void CreatePartition_ShowcaseOnAFreeKey_GetsItsOwnLowerQuota(string query)
    {
        var partition = ShowcasePartition(query);

        Assert.Equal(RateLimitingExtensions.MovieShowcaseFreeKeyPermitLimit, PermitsOf(partition));
        Assert.NotEqual(ShowcasePartition("?section=trending").PartitionKey, partition.PartitionKey);
    }

    [Theory]
    [InlineData("")]
    [InlineData("?section=trending")]
    [InlineData("?section=trending&genreIds=28")]
    [InlineData("?section=trending&section=recommendations&seedTmdbId=27205")]
    [InlineData("?section=now-playing")]
    [InlineData("?section=most-proposed")]
    [InlineData("?section=theme&theme=frissons")]
    [InlineData("?section=provider&provider=netflix")]
    [InlineData("?section=collection&collectionId=1241")]
    public void CreatePartition_ShowcaseOnAClosedList_KeepsTheRegularQuota(string query)
    {
        var spec = RateLimitingExtensions.FindPolicy(RateLimitingExtensions.MovieShowcasePolicy)!.Value;

        var partition = ShowcasePartition(query);

        Assert.Equal(spec.PermitLimit, PermitsOf(partition));
        Assert.Equal("ip:192.0.2.8", partition.PartitionKey);
    }

    [Fact]
    public void CreatePartition_FreeKeyQuota_DoesNotApplyToAnotherPolicy()
    {
        var http = From("192.0.2.8");
        http.Request.QueryString = new QueryString("?section=recommendations");
        var spec = RateLimitingExtensions.FindPolicy(RateLimitingExtensions.MovieDetailsPolicy)!.Value;

        Assert.Equal("ip:192.0.2.8", RateLimitingExtensions.CreatePartition(http, spec).PartitionKey);
    }

    private static DefaultHttpContext From(string address)
    {
        var http = new DefaultHttpContext();
        http.Connection.RemoteIpAddress = IPAddress.Parse(address);
        return http;
    }

    [Fact]
    public void UserOrIpPartitionKey_PrefersAuthenticatedUser()
    {
        var http = new DefaultHttpContext
        {
            User = new ClaimsPrincipal(
                new ClaimsIdentity(
                    [new Claim(ClaimTypes.NameIdentifier, "u-42")],
                    "test"))
        };
        http.Connection.RemoteIpAddress = IPAddress.Loopback;

        Assert.Equal("user:u-42", UserOrIpPartitionKey.Get(http));
    }

    [Fact]
    public void UserOrIpPartitionKey_FallsBackToIp()
    {
        var http = new DefaultHttpContext();
        http.Connection.RemoteIpAddress = IPAddress.Parse("198.51.100.2");

        Assert.Equal("ip:198.51.100.2", UserOrIpPartitionKey.Get(http));
    }

    [Fact]
    public void CreatePartition_Anonymous_UsesClientAddress()
    {
        var http = new DefaultHttpContext();
        http.Connection.RemoteIpAddress = IPAddress.Parse("192.0.2.8");
        var spec = new RateLimitingExtensions.PolicySpec("search-movies", 40, 1);

        var partition = RateLimitingExtensions.CreatePartition(http, spec);

        Assert.Equal("ip:192.0.2.8", partition.PartitionKey);
        Assert.NotNull(partition.Factory(partition.PartitionKey));
    }

    [Fact]
    public void CreatePartition_SignedIn_UsesTheAccountWhateverTheAddress()
    {
        var http = new DefaultHttpContext
        {
            User = new ClaimsPrincipal(
                new ClaimsIdentity(
                    [new Claim(ClaimTypes.NameIdentifier, "alice")],
                    "test"))
        };
        http.Connection.RemoteIpAddress = IPAddress.Parse("192.0.2.8");
        var spec = new RateLimitingExtensions.PolicySpec(RateLimitingExtensions.VoteMutationPolicy, 120, 1);

        var partition = RateLimitingExtensions.CreatePartition(http, spec);

        Assert.Equal("user:alice", partition.PartitionKey);
    }

    [Theory]
    [InlineData(RateLimitingExtensions.AuthLoginPolicy)]
    [InlineData(RateLimitingExtensions.AuthRegisterPolicy)]
    [InlineData(RateLimitingExtensions.AuthPasswordResetRequestPolicy)]
    [InlineData(RateLimitingExtensions.AuthPasswordResetConfirmPolicy)]
    public void CreatePartition_AnonymousFacingPolicy_KeysByAddressEvenWithASession(string policy)
    {
        var http = SignedIn("alice", "192.0.2.8");

        var partition = RateLimitingExtensions.CreatePartition(http, RateLimitingExtensions.FindPolicy(policy)!.Value);

        Assert.Equal("ip:192.0.2.8", partition.PartitionKey);
    }

    [Fact]
    public void GlobalLimiter_ManyAccountsFromOneAddress_ShareTheAddressCeiling()
    {
        using var limiter = RateLimitingExtensions.CreateGlobalLimiter();
        var accepted = Enumerable.Range(0, RateLimitingExtensions.AddressCeilingPerMinute + 1)
            .Count(i =>
            {
                using var lease = limiter.AttemptAcquire(SignedIn($"account-{i}", "203.0.113.9"));
                return lease.IsAcquired;
            });

        Assert.Equal(RateLimitingExtensions.AddressCeilingPerMinute, accepted);
    }

    private static DefaultHttpContext SignedIn(string userId, string address)
    {
        var http = new DefaultHttpContext
        {
            User = new ClaimsPrincipal(new ClaimsIdentity([new Claim(ClaimTypes.NameIdentifier, userId)], "test"))
        };
        http.Connection.RemoteIpAddress = IPAddress.Parse(address);
        return http;
    }

    [Fact]
    public void CreateGlobalPartition_SignedInGuestsOnOneNetwork_GetOnePartitionEach()
    {
        static DefaultHttpContext Guest(string userId)
        {
            var http = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(new ClaimsIdentity([new Claim(ClaimTypes.NameIdentifier, userId)], "test"))
            };
            http.Connection.RemoteIpAddress = IPAddress.Parse("203.0.113.7");
            return http;
        }

        var first = RateLimitingExtensions.CreateGlobalPartition(Guest("u1"));
        var second = RateLimitingExtensions.CreateGlobalPartition(Guest("u2"));

        Assert.NotEqual(first.PartitionKey, second.PartitionKey);
    }

    [Fact]
    public void CreateGlobalPartition_PolledEventView_IsLeftToItsOwnPolicy()
    {
        var polled = WithEndpoint(new EnableRateLimitingAttribute(RateLimitingExtensions.EventViewPollPolicy));
        var action = WithEndpoint(new EnableRateLimitingAttribute(RateLimitingExtensions.VoteMutationPolicy));

        using var pollLimiter = Limiter(RateLimitingExtensions.CreateGlobalPartition(polled));
        using var actionLimiter = Limiter(RateLimitingExtensions.CreateGlobalPartition(action));

        Assert.All(
            Enumerable.Range(0, RateLimitingExtensions.GlobalPermitLimitPerMinute + 1),
            _ => Assert.True(pollLimiter.AttemptAcquire().IsAcquired));
        Assert.Equal(
            RateLimitingExtensions.GlobalPermitLimitPerMinute,
            Enumerable.Range(0, RateLimitingExtensions.GlobalPermitLimitPerMinute + 1).Count(_ => actionLimiter.AttemptAcquire().IsAcquired));
        Assert.NotNull(RateLimitingExtensions.FindPolicy(RateLimitingExtensions.EventViewPollPolicy));
    }

    [Fact]
    public void PostersPolicy_CountsEveryAccountBehindOneAddress_OutsideTheSharedCeilings()
    {
        var spec = RateLimitingExtensions.FindPolicy(RateLimitingExtensions.PostersPolicy)!.Value;
        var alice = SignedIn("alice", "203.0.113.7");
        alice.SetEndpoint(new Endpoint(
            _ => Task.CompletedTask,
            new EndpointMetadataCollection(new EnableRateLimitingAttribute(RateLimitingExtensions.PostersPolicy)),
            "poster"));

        Assert.Equal(
            RateLimitingExtensions.CreatePartition(alice, spec).PartitionKey,
            RateLimitingExtensions.CreatePartition(SignedIn("bob", "203.0.113.7"), spec).PartitionKey);
        Assert.NotEqual(
            RateLimitingExtensions.CreatePartition(alice, spec).PartitionKey,
            RateLimitingExtensions.CreatePartition(SignedIn("alice", "198.51.100.2"), spec).PartitionKey);
        using var ceiling = Limiter(RateLimitingExtensions.CreateAddressCeilingPartition(alice));
        using var global = Limiter(RateLimitingExtensions.CreateGlobalPartition(alice));
        Assert.All(
            Enumerable.Range(0, RateLimitingExtensions.AddressCeilingPerMinute + 1),
            _ => Assert.True(ceiling.AttemptAcquire().IsAcquired && global.AttemptAcquire().IsAcquired));
    }

    [Theory]
    [InlineData(typeof(EventsController), nameof(EventsController.GetBySlug))]
    [InlineData(typeof(EventMoviesController), nameof(EventMoviesController.List))]
    public void PolledEventViewRoutes_CountAgainstThePollPolicy(Type controller, string action)
    {
        var attribute = controller.GetMethod(action)!.GetCustomAttribute<EnableRateLimitingAttribute>();

        Assert.Equal(RateLimitingExtensions.EventViewPollPolicy, attribute?.PolicyName);
    }

    private static DefaultHttpContext WithEndpoint(params object[] metadata)
    {
        var http = new DefaultHttpContext();
        http.SetEndpoint(new Endpoint(_ => Task.CompletedTask, new EndpointMetadataCollection(metadata), "test"));
        http.Connection.RemoteIpAddress = IPAddress.Parse("203.0.113.7");
        return http;
    }

    private static RateLimiter Limiter(RateLimitPartition<string> partition) => partition.Factory(partition.PartitionKey);

    [Fact]
    public void CreatePartition_BySlug_RelayedWithoutAClientHop_UsesTheRouteSlugAndNotTheAddress()
    {
        var http = From(HostingAddress);
        http.Request.RouteValues["slug"] = "7fKq2p";
        var spec = RateLimitingExtensions.FindPolicy(RateLimitingExtensions.RecapDocumentPolicy)!.Value;

        var partition = RateLimitingExtensions.CreatePartition(http, spec);

        Assert.Equal("slug:7fKq2p", partition.PartitionKey);
        Assert.Equal("slug:7fKq2p", RateLimitingExtensions.PartitionKeyFor(http, spec));
    }

    private static DefaultHttpContext MovieDocumentRequest(string slug, string address = HostingAddress)
    {
        var http = From(address);
        http.Request.RouteValues["slug"] = slug;
        return http;
    }

    [Theory]
    [InlineData("27205-inception", "27205-x")]
    [InlineData("27205", "27205-un-tout-autre-titre")]
    public void CreatePartition_MovieDocument_TwoSuffixesOfOneId_ShareOneBucket(string first, string second)
    {
        var spec = RateLimitingExtensions.FindPolicy(RateLimitingExtensions.MovieDocumentPolicy)!.Value;

        var firstPartition = RateLimitingExtensions.CreatePartition(MovieDocumentRequest(first), spec);
        var secondPartition = RateLimitingExtensions.CreatePartition(MovieDocumentRequest(second, OtherHostingAddress), spec);

        Assert.Equal("movie:27205", firstPartition.PartitionKey);
        Assert.Equal(firstPartition.PartitionKey, secondPartition.PartitionKey);
        Assert.Equal("movie:27205", RateLimitingExtensions.PartitionKeyFor(MovieDocumentRequest(second), spec));
    }

    [Theory]
    [InlineData("inception")]
    [InlineData("-27205")]
    [InlineData("0-x")]
    [InlineData("1234567890-x")]
    [InlineData("+27205-x")]
    public void CreatePartition_MovieDocument_UnreadableId_SharesOneBucket(string slug)
    {
        var spec = RateLimitingExtensions.FindPolicy(RateLimitingExtensions.MovieDocumentPolicy)!.Value;

        Assert.Equal("movie:invalid", RateLimitingExtensions.CreatePartition(MovieDocumentRequest(slug), spec).PartitionKey);
    }

    [Fact]
    public void MovieDocumentCeiling_CountsEveryMovieFromEveryAddressInOneBucket()
    {
        var spec = RateLimitingExtensions.FindPolicy(RateLimitingExtensions.MovieDocumentCeilingPolicy)!.Value;

        var inception = RateLimitingExtensions.PartitionKeyFor(MovieDocumentRequest("27205-inception"), spec);
        var other = RateLimitingExtensions.PartitionKeyFor(MovieDocumentRequest("603-matrix", "198.51.100.2"), spec);

        Assert.Equal(inception, other);
        Assert.Equal(RateLimitingExtensions.QuotaScope.Endpoint, spec.Scope);
        Assert.True(spec.PermitLimit > RateLimitingExtensions.FindPolicy(RateLimitingExtensions.MovieDocumentPolicy)!.Value.PermitLimit);
    }

    [Fact]
    public void CreatePartition_BySlug_RelayedWithoutSlug_FallsBackToTheAddress()
    {
        var spec = RateLimitingExtensions.FindPolicy(RateLimitingExtensions.RecapDocumentPolicy)!.Value;

        Assert.Equal($"ip:{HostingAddress}", RateLimitingExtensions.CreatePartition(From(HostingAddress), spec).PartitionKey);
    }

    [Fact]
    public void AvatarPhotoUpload_AllowsTenPhotosPerHourAndPerUser()
    {
        var spec = RateLimitingExtensions.FindPolicy(RateLimitingExtensions.AvatarPhotoUploadPolicy)!.Value;

        Assert.Equal(10, spec.PermitLimit);
        Assert.Equal(60, spec.WindowMinutes);
        Assert.Equal(RateLimitingExtensions.QuotaScope.Account, spec.Scope);
    }

    [Fact]
    public void CreateGlobalPartition_LeavesTheDocumentsRelayedWithoutAClientHopToTheirOwnPolicy()
    {
        var http = DocumentRequest(RateLimitingExtensions.RecapDocumentPolicy, HostingAddress);

        var partition = RateLimitingExtensions.CreateGlobalPartition(http);

        Assert.Equal("proxied", partition.PartitionKey);
        using var lease = partition.Factory(partition.PartitionKey).AttemptAcquire();
        Assert.True(lease.IsAcquired);
    }

    [Fact]
    public void CreateGlobalPartition_KeepsTheAddressForEveryOtherEndpoint()
    {
        var http = new DefaultHttpContext();
        http.Connection.RemoteIpAddress = IPAddress.Parse("192.0.2.8");
        http.SetEndpoint(new Endpoint(
            null,
            new EndpointMetadataCollection(new EnableRateLimitingAttribute(RateLimitingExtensions.PublicProfilePolicy)),
            "profile"));

        Assert.Equal("ip:192.0.2.8", RateLimitingExtensions.CreateGlobalPartition(http).PartitionKey);
    }

    [Fact]
    public void CreateAddressCeilingPartition_LeavesTheDocumentsRelayedWithoutAClientHopToTheirOwnPolicy()
    {
        var http = DocumentRequest(RateLimitingExtensions.RecapDocumentPolicy, HostingAddress);

        Assert.Equal("proxied", RateLimitingExtensions.CreateAddressCeilingPartition(http).PartitionKey);
    }

    public static TheoryData<string> DocumentPolicies =>
    [
        RateLimitingExtensions.RecapDocumentPolicy,
        RateLimitingExtensions.InvitationDocumentPolicy,
        RateLimitingExtensions.MovieDocumentPolicy,
        RateLimitingExtensions.ProfileDocumentPolicy
    ];

    [Theory]
    [MemberData(nameof(DocumentPolicies))]
    public void CreatePartition_DocumentCalledDirectly_CountsPerAddressWhateverTheSlug(string policy)
    {
        var spec = RateLimitingExtensions.FindPolicy(policy)!.Value;
        var first = DocumentRequest(policy, DirectAddress);
        first.Request.RouteValues["slug"] = "27205-inception";
        var second = DocumentRequest(policy, DirectAddress);
        second.Request.RouteValues["slug"] = "603-matrix";

        Assert.Equal($"ip:{DirectAddress}", RateLimitingExtensions.CreatePartition(first, spec).PartitionKey);
        Assert.Equal($"ip:{DirectAddress}", RateLimitingExtensions.PartitionKeyFor(second, spec));
    }

    [Theory]
    [MemberData(nameof(DocumentPolicies))]
    public void SharedCeilings_DocumentCalledDirectly_KeepTheAddressCeilings(string policy)
    {
        var http = DocumentRequest(policy, DirectAddress);
        var ceiling = RateLimitingExtensions.CreateAddressCeilingPartition(http);
        var global = RateLimitingExtensions.CreateGlobalPartition(http);
        using var globalLimiter = Limiter(global);

        Assert.Equal($"ip:{DirectAddress}", ceiling.PartitionKey);
        Assert.Equal($"ip:{DirectAddress}", global.PartitionKey);
        Assert.Equal(
            RateLimitingExtensions.GlobalPermitLimitPerMinute,
            Enumerable.Range(0, RateLimitingExtensions.GlobalPermitLimitPerMinute + 1).Count(_ => globalLimiter.AttemptAcquire().IsAcquired));
    }

    [Theory]
    [InlineData("66.249.93.69")]
    [InlineData("66.102.8.194")]
    [InlineData("74.125.210.10")]
    [InlineData("142.250.32.37")]
    [InlineData("192.178.15.7")]
    [InlineData("::ffff:66.249.93.69")]
    public void FirebaseHostingRelay_AnAddressHostingCallsCloudRunFrom_IsRelayed(string address)
    {
        Assert.True(FirebaseHostingRelay.Carries(From(address)));
    }

    [Theory]
    [InlineData("203.0.113.9")]
    [InlineData("2a02:8434:b6b4:a101::1")]
    [InlineData("35.198.224.104")]
    [InlineData("34.159.197.47")]
    [InlineData("107.178.196.5")]
    [InlineData("66.249.96.1")]
    [InlineData("142.252.0.1")]
    public void FirebaseHostingRelay_AnyOtherAddress_IsADirectCall(string address)
    {
        Assert.False(FirebaseHostingRelay.Carries(From(address)));
    }

    [Fact]
    public void FirebaseHostingRelay_UnknownAddress_IsADirectCall()
    {
        Assert.False(FirebaseHostingRelay.Carries(new DefaultHttpContext()));
    }

    [Theory]
    [InlineData("203.0.113.7, 142.250.32.37", "203.0.113.7")]
    [InlineData("203.0.113.7, 66.249.93.69", "203.0.113.7")]
    [InlineData("2001:db8:1:2::1, 142.250.32.37", "2001:db8:1:2::/64")]
    [InlineData("198.51.100.4, 203.0.113.9", "203.0.113.9")]
    [InlineData("142.250.32.37, 203.0.113.9", "203.0.113.9")]
    [InlineData("203.0.113.9", "203.0.113.9")]
    [InlineData("142.250.32.37", "142.250.32.37")]
    public async Task ClientIpPartitionKey_AfterTheForwardedHeadersMiddleware_KeysTheClientCloudRunOrHostingSaw(
        string forwardedFor,
        string expectedKey)
    {
        var http = From(CloudRunPeerAddress);
        http.Request.Headers[ForwardedHeadersDefaults.XForwardedForHeaderName] = forwardedFor;
        using var services = new ServiceCollection().AddMoviePickerForwardedHeaders().BuildServiceProvider();
        var middleware = new ForwardedHeadersMiddleware(
            _ => Task.CompletedTask,
            NullLoggerFactory.Instance,
            services.GetRequiredService<IOptions<ForwardedHeadersOptions>>());

        await middleware.Invoke(http);

        Assert.Equal(expectedKey, ClientIpPartitionKey.Get(http));
    }

    private static DefaultHttpContext RelayedDocumentRequest(string policy, string? forwardedHopsLeft, string slug = RelayedSlug)
    {
        var http = DocumentRequest(policy, HostingAddress);
        http.Request.RouteValues["slug"] = slug;
        if (forwardedHopsLeft is not null)
            http.Request.Headers[ForwardedHeadersDefaults.XForwardedForHeaderName] = forwardedHopsLeft;
        return http;
    }

    [Theory]
    [MemberData(nameof(DocumentPolicies))]
    public void CreatePartition_DocumentRelayedByHosting_CountsPerTheClientHopLeft(string policy)
    {
        var spec = RateLimitingExtensions.FindPolicy(policy)!.Value;
        var http = RelayedDocumentRequest(policy, RelayedClientAddress);

        Assert.Equal($"ip:{RelayedClientAddress}", RateLimitingExtensions.CreatePartition(http, spec).PartitionKey);
        Assert.Equal($"ip:{RelayedClientAddress}", RateLimitingExtensions.PartitionKeyFor(http, spec));
    }

    [Theory]
    [MemberData(nameof(DocumentPolicies))]
    public void CreatePartition_TwoClientsRelayedOnOneSlug_GetOnePartitionEach(string policy)
    {
        var spec = RateLimitingExtensions.FindPolicy(policy)!.Value;

        var first = RateLimitingExtensions.CreatePartition(RelayedDocumentRequest(policy, RelayedClientAddress, "27205-inception"), spec);
        var second = RateLimitingExtensions.CreatePartition(RelayedDocumentRequest(policy, OtherRelayedClientAddress, "27205-inception"), spec);

        Assert.NotEqual(first.PartitionKey, second.PartitionKey);
    }

    [Theory]
    [MemberData(nameof(DocumentPolicies))]
    public void SharedCeilings_DocumentRelayedByHosting_CapTheClientHopLeft(string policy)
    {
        var http = RelayedDocumentRequest(policy, RelayedClientAddress);

        Assert.Equal($"ip:{RelayedClientAddress}", RateLimitingExtensions.CreateAddressCeilingPartition(http).PartitionKey);
        Assert.Equal($"ip:{RelayedClientAddress}", RateLimitingExtensions.CreateGlobalPartition(http).PartitionKey);
    }

    [Fact]
    public void GlobalLimiter_ManyAccountsRelayedFromOneClient_ShareTheAddressCeiling()
    {
        using var limiter = RateLimitingExtensions.CreateGlobalLimiter();
        var accepted = Enumerable.Range(0, RateLimitingExtensions.AddressCeilingPerMinute + 1)
            .Count(i =>
            {
                var http = RelayedDocumentRequest(RateLimitingExtensions.RecapDocumentPolicy, RelayedClientAddress);
                http.User = SignedIn($"account-{i}", HostingAddress).User;
                using var lease = limiter.AttemptAcquire(http);
                return lease.IsAcquired;
            });

        Assert.Equal(RateLimitingExtensions.AddressCeilingPerMinute, accepted);
    }

    [Theory]
    [MemberData(nameof(DocumentPolicies))]
    public void CreatePartition_DocumentCalledDirectly_IgnoresTheForwardedHopsLeft(string policy)
    {
        var spec = RateLimitingExtensions.FindPolicy(policy)!.Value;
        var http = DocumentRequest(policy, DirectAddress);
        http.Request.RouteValues["slug"] = RelayedSlug;
        http.Request.Headers[ForwardedHeadersDefaults.XForwardedForHeaderName] = RelayedClientAddress;

        Assert.Equal($"ip:{DirectAddress}", RateLimitingExtensions.CreatePartition(http, spec).PartitionKey);
        Assert.Equal($"ip:{DirectAddress}", RateLimitingExtensions.CreateAddressCeilingPartition(http).PartitionKey);
        Assert.Equal(DirectAddress, ClientIpPartitionKey.Get(http));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("unknown")]
    [InlineData("_hidden")]
    [InlineData("203.0.113.7, unknown")]
    public void SharedCeilings_DocumentRelayedWithoutAReadableClientHop_LeaveItToTheSlugQuota(string? forwardedHopsLeft)
    {
        var spec = RateLimitingExtensions.FindPolicy(RateLimitingExtensions.RecapDocumentPolicy)!.Value;
        var http = RelayedDocumentRequest(RateLimitingExtensions.RecapDocumentPolicy, forwardedHopsLeft);

        Assert.Equal($"slug:{RelayedSlug}", RateLimitingExtensions.CreatePartition(http, spec).PartitionKey);
        Assert.Equal("proxied", RateLimitingExtensions.CreateAddressCeilingPartition(http).PartitionKey);
        Assert.Equal("proxied", RateLimitingExtensions.CreateGlobalPartition(http).PartitionKey);
    }

    [Fact]
    public void ClientAddressAccessor_RequestRelayedByHosting_ReportsTheClientHopLeft()
    {
        var http = RelayedDocumentRequest(RateLimitingExtensions.RecapDocumentPolicy, RelayedClientAddress);

        Assert.Equal(RelayedClientAddress, new ClientAddressAccessor(new HttpContextAccessor { HttpContext = http }).GetClientAddress());
        Assert.Equal($"ip:{RelayedClientAddress}", UserOrIpPartitionKey.Get(http));
    }

    private static DefaultHttpContext DocumentRequest(string policy, string address)
    {
        var http = From(address);
        http.SetEndpoint(new Endpoint(
            null,
            new EndpointMetadataCollection(new EnableRateLimitingAttribute(policy)),
            policy));
        return http;
    }

    [Fact]
    public async Task WriteRejectedAsync_SetsStatusAndRetryAfter()
    {
        var http = new DefaultHttpContext();
        http.Response.Body = new MemoryStream();
        var context = new OnRejectedContext
        {
            HttpContext = http,
            Lease = new RetryAfterLease(TimeSpan.FromSeconds(2.4))
        };

        await RateLimitingExtensions.WriteRejectedAsync(context, CancellationToken.None);

        Assert.Equal(StatusCodes.Status429TooManyRequests, http.Response.StatusCode);
        Assert.Equal("3", http.Response.Headers.RetryAfter.ToString());
        Assert.Equal("application/json", http.Response.ContentType);
        http.Response.Body.Position = 0;
        using var reader = new StreamReader(http.Response.Body);
        var body = await reader.ReadToEndAsync();
        Assert.Contains("\"code\":429", body, StringComparison.Ordinal);
    }

    [Fact]
    public async Task WriteRejectedAsync_OmitsRetryAfter_WhenMetadataMissing()
    {
        var http = new DefaultHttpContext();
        http.Response.Body = new MemoryStream();
        var context = new OnRejectedContext
        {
            HttpContext = http,
            Lease = new RetryAfterLease(null)
        };

        await RateLimitingExtensions.WriteRejectedAsync(context, CancellationToken.None);

        Assert.False(http.Response.Headers.ContainsKey("Retry-After"));
    }

    private sealed class RetryAfterLease : RateLimitLease
    {
        private readonly TimeSpan? _retryAfter;

        public RetryAfterLease(TimeSpan? retryAfter) => _retryAfter = retryAfter;

        public override bool IsAcquired => false;

        public override IEnumerable<string> MetadataNames =>
            _retryAfter is null ? [] : [MetadataName.RetryAfter.Name];

        public override bool TryGetMetadata(string key, out object? metadata)
        {
            if (_retryAfter is not null && key == MetadataName.RetryAfter.Name)
            {
                metadata = _retryAfter.Value;
                return true;
            }

            metadata = null;
            return false;
        }
    }

    private sealed class StubHostEnvironment : IHostEnvironment
    {
        public StubHostEnvironment(string environmentName) => EnvironmentName = environmentName;

        public string EnvironmentName { get; set; }
        public string ApplicationName { get; set; } = "MoviePicker.Api.Tests";
        public string ContentRootPath { get; set; } = ".";
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }
}
