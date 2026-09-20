# Build from the monorepo root, with the solution folder as context: `Directory.Build.props`
# lives there and carries the analyser, code-style and NuGet audit settings the CI validates.
#   docker build -t movie-picker-api-dotnet -f apps/api-dotnet/MoviePicker.Api/Dockerfile apps/api-dotnet
# The tests and the key tool of the solution folder stay out of the context (see ../.dockerignore).
#
# Environment variables (Cloud Run / local run):
#   MONGODB_URI              (required), on GCP: Secret Manager secret referenced by Cloud Run
#   TMDB_READ_ACCESS_TOKEN   (optional, preferred: travels as a Bearer header), on GCP: Secret Manager
#   TMDB_API_KEY             (optional, legacy v3 key appended to the query string when no token is set)
#   ALLOWED_ORIGINS          (required outside Development): CORS origins of the front, comma-separated
#   ASPNETCORE_ENVIRONMENT   (optional, defaults to Production)
#   PORT                     (Cloud Run injects 8080; Kestrel listens on 8080 through ASPNETCORE_URLS)

FROM mcr.microsoft.com/dotnet/sdk:10.0@sha256:2fa828c68761b1b8c23d7662dc134421b9d3b59fe1425fdbc80804e390cdb24d AS build
WORKDIR /src

COPY Directory.Build.props ./
COPY MoviePicker.Api/*.csproj MoviePicker.Api/packages.lock.json MoviePicker.Api/
# --locked-mode: the graph and the hashes of packages.lock.json, or nothing (RestorePackagesWithLockFile
# in Directory.Build.props). A package republished upstream under the same version does not get in.
RUN dotnet restore MoviePicker.Api/MoviePicker.Api.csproj -r linux-x64 -p:PublishReadyToRun=true --locked-mode

COPY MoviePicker.Api/ MoviePicker.Api/
RUN dotnet publish MoviePicker.Api/MoviePicker.Api.csproj -c Release -r linux-x64 --self-contained false -p:PublishReadyToRun=true -o /app/publish --no-restore

# Chiseled runtime: no shell, no package manager, non-root by default. The `-extra` variant is
# required, it ships ICU and tzdata: EventSchedule resolves Europe/Paris and the API talks to TMDB
# in fr-FR. ProductionStartupValidation refuses to start when tzdata is missing.
FROM mcr.microsoft.com/dotnet/aspnet:10.0-noble-chiseled-extra@sha256:6385dc0eaef704fad88d3f65c334e791a371bbe448f52ca39d83d2df49251e28
WORKDIR /app

COPY --from=build /app/publish .

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

USER $APP_UID

ENTRYPOINT ["dotnet", "MoviePicker.Api.dll"]
