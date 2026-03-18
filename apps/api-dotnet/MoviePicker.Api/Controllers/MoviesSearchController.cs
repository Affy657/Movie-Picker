using Microsoft.AspNetCore.Mvc;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.SearchMovies;

namespace MoviePicker.Api.Controllers;

[ApiController]
[Route("movies")]
public sealed class MoviesSearchController : ControllerBase
{
    [HttpGet("search")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status503ServiceUnavailable)]
    public async Task<IActionResult> Search(
        [FromQuery] string? q,
        [FromServices] ISearchMoviesHandler handler,
        CancellationToken ct)
    {
        var results = await handler.HandleAsync(q ?? string.Empty, ct);
        return Ok(results);
    }
}
