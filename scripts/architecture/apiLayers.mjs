const USING_PREFIX = String.raw`^\s*(?:global\s+)?using\s+(?:static\s+)?`;
const NAMESPACE = String.raw`(?:global::)?([A-Za-z_][\w.]*)`;
const USING_RE = new RegExp(String.raw`${USING_PREFIX}${NAMESPACE}\s*;`, 'gm');
const USING_ALIAS_RE = new RegExp(String.raw`${USING_PREFIX}[A-Za-z_]\w*\s*=\s*${NAMESPACE}`, 'gm');
const USING_LINE_RE = new RegExp(String.raw`${USING_PREFIX}.*$`, 'gm');
const CSHARP_STRING_RE = /"(?:[^"\\\n]|\\.)*"/g;
const QUALIFIED_NAME_RE = /(?<![\w.])(?:global::)?([A-Za-z_]\w*(?:\.[A-Za-z_]\w*)+)/g;

export const LAYER_RULES = [
  {
    layer: 'Domain',
    allow: [/^System(\.|$)/, /^MoviePicker\.Api\.Domain(\.|$)/],
    message: 'the domain must depend on System and itself only',
  },
  {
    layer: 'Application',
    forbid: [
      /^MongoDB(\.|$)/,
      /^Microsoft\.AspNetCore(\.|$)/,
      /^MoviePicker\.Api\.Infrastructure(\.|$)/,
      /^MoviePicker\.Api\.Controllers(\.|$)/,
    ],
    message:
      'the application layer must know neither the web framework, nor the database, nor the infrastructure',
  },
  {
    layer: 'Controllers',
    forbid: [/^MongoDB(\.|$)/, /^MoviePicker\.Api\.Infrastructure\.Persistence(\.|$)/],
    message: 'a controller goes through a use case, never through persistence',
  },
];

export const WEB_SDK_IMPLICIT_TYPES = {
  'Microsoft.AspNetCore.Builder': [
    'WebApplication',
    'WebApplicationBuilder',
    'IApplicationBuilder',
    'IEndpointConventionBuilder',
    'RouteHandlerBuilder',
  ],
  'Microsoft.AspNetCore.Hosting': ['IWebHostEnvironment', 'IWebHostBuilder'],
  'Microsoft.AspNetCore.Http': [
    'HttpContext',
    'HttpRequest',
    'HttpResponse',
    'IHttpContextAccessor',
    'HttpContextAccessor',
    'DefaultHttpContext',
    'IFormFile',
    'IFormFileCollection',
    'IFormCollection',
    'FormFile',
    'IHeaderDictionary',
    'HeaderDictionary',
    'IQueryCollection',
    'IRequestCookieCollection',
    'IResponseCookies',
    'CookieOptions',
    'SameSiteMode',
    'PathString',
    'QueryString',
    'HostString',
    'ISession',
    'WebSocketManager',
    'RequestDelegate',
    'IMiddleware',
    'IResult',
    'IStatusCodeHttpResult',
    'IValueHttpResult',
    'IEndpointFilter',
    'EndpointFilterInvocationContext',
    'IProblemDetailsService',
    'HttpValidationProblemDetails',
    'BadHttpRequestException',
    'Results',
    'TypedResults',
    'StatusCodes',
    'HttpMethods',
  ],
  'Microsoft.AspNetCore.Routing': [
    'IEndpointRouteBuilder',
    'RouteGroupBuilder',
    'LinkGenerator',
    'RouteValueDictionary',
    'RouteData',
  ],
  'Microsoft.Extensions.Configuration': [
    'IConfiguration',
    'IConfigurationSection',
    'IConfigurationRoot',
  ],
  'Microsoft.Extensions.DependencyInjection': [
    'IServiceCollection',
    'IServiceScopeFactory',
    'IServiceScope',
    'ServiceLifetime',
    'ActivatorUtilities',
  ],
  'Microsoft.Extensions.Hosting': [
    'IHostEnvironment',
    'IHostedService',
    'BackgroundService',
    'IHostApplicationLifetime',
    'IHostBuilder',
    'Environments',
  ],
  'Microsoft.Extensions.Logging': ['ILogger', 'ILoggerFactory', 'LogLevel', 'LoggerMessage'],
  Sentry: [
    'SentrySdk',
    'ISentryClient',
    'SentryId',
    'SentryLevel',
    'SentryEvent',
    'SentryOptions',
    'Breadcrumb',
    'BreadcrumbLevel',
    'ITransactionTracer',
  ],
};

const STATIC_CLASSES = new Set([
  'Results',
  'TypedResults',
  'StatusCodes',
  'HttpMethods',
  'Environments',
  'SentrySdk',
  'ActivatorUtilities',
]);

function usingsIn(text) {
  return [...text.matchAll(USING_RE), ...text.matchAll(USING_ALIAS_RE)].map((m) => m[1]);
}

function codeOf(text) {
  return text.replace(CSHARP_STRING_RE, '""').replace(USING_LINE_RE, '');
}

function qualifiedNamesIn(code) {
  return [...code.matchAll(QUALIFIED_NAME_RE)].map((m) => m[1]);
}

function layerBreaks(rule, ns) {
  return rule.allow ? !rule.allow.some((re) => re.test(ns)) : rule.forbid.some((re) => re.test(ns));
}

function implicitTypeUsage(name) {
  const tail = STATIC_CLASSES.has(name) ? String.raw`\s*\.` : String.raw`(?!\w)`;
  return new RegExp(String.raw`(?<![\w.])${name}${tail}`);
}

function implicitTypesIn(rule, code) {
  return Object.entries(WEB_SDK_IMPLICIT_TYPES)
    .filter(([ns]) => layerBreaks(rule, ns))
    .flatMap(([ns, names]) =>
      names.filter((name) => implicitTypeUsage(name).test(code)).map((name) => [ns, name])
    );
}

export function apiLayerViolations(layer, path, text) {
  const rule = LAYER_RULES.find((candidate) => candidate.layer === layer);
  const code = codeOf(text);
  const usings = usingsIn(text)
    .filter((ns) => layerBreaks(rule, ns))
    .map((ns) => `${path}: using ${ns}, ${rule.message}`);
  const implicit = implicitTypesIn(rule, code).map(
    ([ns, name]) =>
      `${path}: ${name} comes from ${ns} through the implicit usings of the Web SDK, ${rule.message}`
  );
  if (!rule.forbid) return [...usings, ...implicit];
  const qualified = qualifiedNamesIn(code)
    .filter((name) => layerBreaks(rule, name))
    .map((name) => `${path}: ${name}, ${rule.message}`);
  return [...usings, ...qualified, ...implicit];
}
