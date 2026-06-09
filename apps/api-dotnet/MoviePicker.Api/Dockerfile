# Build depuis le monorepo :
#   docker build -t movie-picker-api-dotnet -f apps/api-dotnet/MoviePicker.Api/Dockerfile apps/api-dotnet/MoviePicker.Api
#
# Variables d'environnement (Cloud Run / run local) :
#   MONGODB_URI  (requis) — en prod GCP : Secret Manager → référence Cloud Run
#   TMDB_API_KEY (optionnel) — en prod GCP : Secret Manager
#   ALLOWED_ORIGINS (requis hors Development) : origines CORS du front, virgules (ex. https://xxx.cloudfront.net)
#   ASPNETCORE_ENVIRONMENT (optionnel, défaut Production)
#   PORT (Cloud Run injecte 8080 ; Kestrel écoute 8080 via ASPNETCORE_URLS)

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY *.csproj ./
RUN dotnet restore

COPY . .
RUN dotnet publish -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app

COPY --from=build /app/publish .

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

USER $APP_UID

ENTRYPOINT ["dotnet", "MoviePicker.Api.dll"]
