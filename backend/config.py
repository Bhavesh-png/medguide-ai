import os
from pydantic_settings import BaseSettings
from pydantic import Field
from typing import List

class Settings(BaseSettings):
    mongodb_uri: str = Field("mongodb://localhost:27017/medguide", validation_alias="MONGODB_URI")
    gemini_api_key: str = Field("", validation_alias="GEMINI_API_KEY")
    encryption_key: str = Field("", validation_alias="ENCRYPTION_KEY")
    jwt_secret: str = Field("default_jwt_secret_token_change_in_production", validation_alias="JWT_SECRET")
    # Comma-separated list of allowed frontend origins, e.g. https://medguide.up.railway.app
    allowed_origins: str = Field("*", validation_alias="ALLOWED_ORIGINS")
    
    def get_allowed_origins(self) -> List[str]:
        if self.allowed_origins == "*":
            return ["*"]
        return [o.strip() for o in self.allowed_origins.split(",")]
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"

settings = Settings()
