using MoviePicker.Api.Application.Ports;

namespace MoviePicker.Api.Infrastructure.Security;

public sealed class SchedulerCallerAuthenticator(
    IGoogleOidcSchedulerTokenValidator oidcTokenValidator) : ISchedulerCallerAuthenticator
{
    public async Task<SchedulerCallerVerdict> AuthenticateAsync(SchedulerCallerCredentials credentials, CancellationToken ct)
    {
        if (!oidcTokenValidator.IsConfigured)
            return SchedulerCallerVerdict.NotConfigured;

        return await oidcTokenValidator.IsValidAsync(credentials.BearerToken, ct)
            ? SchedulerCallerVerdict.Accepted
            : SchedulerCallerVerdict.Refused;
    }
}
