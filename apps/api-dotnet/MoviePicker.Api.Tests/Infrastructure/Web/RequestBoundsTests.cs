using System.Net;
using System.Reflection;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.Timeouts;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using MoviePicker.Api.Controllers;
using MoviePicker.Api.Infrastructure.Web;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Web;

public sealed class RequestBoundsTests
{
    private sealed class SilentUpstream : HttpMessageHandler
    {
        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            await Task.Delay(Timeout.Infinite, cancellationToken);
            return new HttpResponseMessage(HttpStatusCode.OK);
        }
    }

    private static HttpClient ClientWithBudget(TimeSpan budget) =>
        new(new RequestTimeoutHandler(budget) { InnerHandler = new SilentUpstream() }) { Timeout = Timeout.InfiniteTimeSpan };

    [Fact]
    public async Task OutgoingCall_UpstreamSilentPastItsBudget_FailsAsAGatewayTimeout()
    {
        using var client = ClientWithBudget(TimeSpan.FromMilliseconds(50));

        var ex = await Assert.ThrowsAsync<HttpRequestException>(() => client.GetAsync("https://api.themoviedb.org/3/movie/550"));

        Assert.Equal(HttpStatusCode.GatewayTimeout, ex.StatusCode);
    }

    [Fact]
    public async Task OutgoingCall_CallerGivesUp_PropagatesTheCancellation()
    {
        using var client = ClientWithBudget(TimeSpan.FromSeconds(30));
        using var caller = new CancellationTokenSource(TimeSpan.FromMilliseconds(50));

        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => client.GetAsync("https://api.themoviedb.org/3/movie/550", caller.Token));
    }

    [Fact]
    public void RequestTimeouts_BoundEveryRequestAndGiveLongActionsTheirOwnBudget()
    {
        var services = new ServiceCollection();
        services.AddMoviePickerRequestTimeouts();
        using var provider = services.BuildServiceProvider();

        var options = provider.GetRequiredService<IOptions<RequestTimeoutOptions>>().Value;

        Assert.Equal(RequestTimeoutPolicies.Default, options.DefaultPolicy!.Timeout);
        Assert.Equal(StatusCodes.Status503ServiceUnavailable, options.DefaultPolicy.TimeoutStatusCode);
        Assert.Equal(RequestTimeoutPolicies.LongRunningBudget, options.Policies[RequestTimeoutPolicies.LongRunning].Timeout);
        Assert.True(RequestTimeoutPolicies.LongRunningBudget < TimeSpan.FromSeconds(300));
    }

    [Theory]
    [InlineData(typeof(SchedulerController), null)]
    [InlineData(typeof(LetterboxdController), null)]
    [InlineData(typeof(AuthController), nameof(AuthController.ExportMyData))]
    [InlineData(typeof(IdeaSuggestionsController), nameof(IdeaSuggestionsController.Create))]
    public void SlowActions_RunUnderTheLongRunningBudget(Type controller, string? action)
    {
        MemberInfo member = action is null ? controller : controller.GetMethod(action)!;

        Assert.Equal(RequestTimeoutPolicies.LongRunning, member.GetCustomAttribute<RequestTimeoutAttribute>()?.PolicyName);
    }

    [Fact]
    public void IdeaWithAttachments_IsTheOnlyActionAllowedPastTheDefaultBodyLimit()
    {
        var widened = typeof(Program).Assembly.GetTypes()
            .Where(t => typeof(ControllerBase).IsAssignableFrom(t))
            .SelectMany(t => t.GetMethods(BindingFlags.Public | BindingFlags.Instance | BindingFlags.DeclaredOnly))
            .Where(m => m.GetCustomAttribute<RequestSizeLimitAttribute>() is not null || m.GetCustomAttribute<DisableRequestSizeLimitAttribute>() is not null)
            .Select(m => $"{m.DeclaringType!.Name}.{m.Name}")
            .ToList();

        Assert.Equal([$"{nameof(IdeaSuggestionsController)}.{nameof(IdeaSuggestionsController.Create)}"], widened);
        Assert.True(RequestBodyLimits.AttachmentsBytes > RequestBodyLimits.DefaultBytes);
    }
}
