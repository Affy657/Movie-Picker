using System.Net;

namespace MoviePicker.Api.Infrastructure.Web;

public sealed class RequestTimeoutHandler(TimeSpan timeout) : DelegatingHandler
{
    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        using var budget = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        budget.CancelAfter(timeout);
        try
        {
            var response = await base.SendAsync(request, budget.Token).ConfigureAwait(false);
            return await ReadWholeBodyAsync(response, budget.Token).ConfigureAwait(false);
        }
        catch (OperationCanceledException ex) when (!cancellationToken.IsCancellationRequested)
        {
            throw new HttpRequestException(
                $"Request to {request.RequestUri?.Host} timed out after {timeout.TotalSeconds} s",
                ex,
                HttpStatusCode.GatewayTimeout);
        }
    }

    private static async Task<HttpResponseMessage> ReadWholeBodyAsync(HttpResponseMessage response, CancellationToken budget)
    {
        try
        {
            await response.Content.LoadIntoBufferAsync(budget).ConfigureAwait(false);
            return response;
        }
        catch
        {
            response.Dispose();
            throw;
        }
    }
}
