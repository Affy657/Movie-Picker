# Build depuis le monorepo :
#   docker build -t movie-picker-api-dotnet -f apps/api-dotnet/MoviePicker.Api/Dockerfile apps/api-dotnet/MoviePicker.Api
#
# Variables d'environnement (Cloud Run / run local) :
#   MONGODB_URI  (requis) — en prod GCP : Secret Manager → référence Cloud Run
#   TMDB_API_KEY (optionnel) — en prod GCP : Secret Manager
#   ALLOWED_ORIGINS (requis hors Development) : origines CORS du front, virgules (ex. https://xxx.cloudfront.net)
#   ASPNETCORE_ENVIRONMENT (optionnel, défaut Production)
#   PORT (Cloud Run injecte 8080 ; Kestrel écoute 8080 via ASPNETCORE_URLS)

FROM mcr.microsoft.com/dotnet/sdk:10.0@sha256:ea8bde36c11b6e7eec2656d0e59101d4462f6bd630730f2c8201ed0572b295d5 AS build
WORKDIR /src

COPY *.csproj ./
RUN dotnet restore

COPY . .
RUN dotnet publish -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0@sha256:7644f992230d35cf230017189d4038c0ae0f7388b13f4f7ae1900a155bafb597
WORKDIR /app

COPY --from=build /app/publish .

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

USER $APP_UID

ENTRYPOINT ["dotnet", "MoviePicker.Api.dll"]
