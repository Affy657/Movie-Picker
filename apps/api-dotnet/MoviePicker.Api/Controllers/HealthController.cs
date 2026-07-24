using Microsoft.AspNetCore.Mvc;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Contracts;

namespace MoviePicker.Api.Controllers;

[ApiController]
[Route("health")]
[ProducesResponseType(StatusCodes.Status500InternalServerError)]
public sealed class HealthController : ControllerBase
{
    private const string ServiceName = "movie-picker-api";

    private readonly IDatabaseHealthProbe _databaseHealthProbe;
    private readonly string _release;

    public HealthController(IDatabaseHealthProbe databaseHealthProbe, IConfiguration configuration)
    {
        _databaseHealthProbe = databaseHealthProbe;
        _release = configuration["SENTRY_RELEASE"] is { Length: > 0 } release ? release : "unknown";
    }

    [HttpGet]
    [ProducesResponseType(typeof(HealthOkResponse), StatusCodes.Status200OK)]
    public IActionResult Get() => Ok(new HealthOkResponse("ok", ServiceName));

    [HttpGet("ready")]
    [ProducesResponseType(typeof(HealthReadyResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(HealthReadyResponse), StatusCodes.Status503ServiceUnavailable)]
    public async Task<IActionResult> GetReady(CancellationToken ct)
    {
        var probe = await _databaseHealthProbe.CheckAsync(ct);
        var isReady = probe.Status != DatabaseProbeStatus.Unavailable;

        var payload = new HealthReadyResponse(
            isReady ? "ready" : "unavailable",
            ServiceName,
            _release,
            [new HealthDependencyStatus("mongodb", DescribeProbe(probe.Status), probe.DurationMs)]);

        return StatusCode(
            isReady ? StatusCodes.Status200OK : StatusCodes.Status503ServiceUnavailable,
            payload);
    }

    private static string DescribeProbe(DatabaseProbeStatus status) => status switch
    {
        DatabaseProbeStatus.Healthy => "ok",
        DatabaseProbeStatus.NotApplicable => "not-configured",
        _ => "unavailable"
    };
}
