from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_NAME: str = "WealthTracker"
    DEBUG: bool = False

    # Supabase
    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    SUPABASE_JWT_SECRET: str = ""

    # Database — use Supabase's PostgreSQL connection string
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@db.YOUR_PROJECT.supabase.co:5432/postgres"
    DATABASE_URL_SYNC: str = "postgresql://postgres:postgres@db.YOUR_PROJECT.supabase.co:5432/postgres"

    # Plaid
    PLAID_CLIENT_ID: str = ""
    PLAID_SECRET: str = ""
    PLAID_ENV: str = "sandbox"  # sandbox, development, production

    # CORS — Netlify production URL + local dev
    CORS_ORIGINS: list[str] = ["http://localhost:5173", "http://localhost:3000"]
    NETLIFY_URL: str = ""  # e.g., https://your-app.netlify.app

    model_config = {"env_file": ".env", "extra": "ignore"}

    @property
    def all_cors_origins(self) -> list[str]:
        origins = list(self.CORS_ORIGINS)
        if self.NETLIFY_URL:
            origins.append(self.NETLIFY_URL)
        return origins


settings = Settings()
