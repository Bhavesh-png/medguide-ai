import os
from pydantic_settings import BaseSettings
from pydantic import Field

class Settings(BaseSettings):
    mongodb_uri: str = Field("mongodb://localhost:27017/medguide", validation_alias="MONGODB_URI")
    gemini_api_key: str = Field("", validation_alias="GEMINI_API_KEY")
    encryption_key: str = Field("", validation_alias="ENCRYPTION_KEY")
    jwt_secret: str = Field("default_jwt_secret_token_change_in_production", validation_alias="JWT_SECRET")
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"

settings = Settings()
