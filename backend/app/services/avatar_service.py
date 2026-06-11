import logging
import asyncio
from typing import Optional, Dict, Any
from abc import ABC, abstractmethod

logger = logging.getLogger("soundwave.avatar_service")

class ImageProvider(ABC):
    @abstractmethod
    async def generate_avatar(self, mood: str, style: str, input_image: Optional[str] = None) -> str:
        pass

class MockImageProvider(ImageProvider):
    async def generate_avatar(self, mood: str, style: str, input_image: Optional[str] = None) -> str:
        # Simulate API delay
        await asyncio.sleep(2)
        # Return a deterministic mock image based on style
        seed = f"{mood}-{style}".replace(" ", "-").lower()
        return f"https://picsum.photos/seed/{seed}/800/800.webp"

class OpenAIImageProvider(ImageProvider):
    async def generate_avatar(self, mood: str, style: str, input_image: Optional[str] = None) -> str:
        # Placeholder for DALL-E 3 integration
        logger.info("OpenAI Provider: Generating %s %s avatar", mood, style)
        return "https://picsum.photos/seed/openai-mock/800/800.webp"

class AvatarStudioService:
    def __init__(self, provider: ImageProvider):
        self.provider = provider

    async def create_avatar(self, mood: str, style: str, input_image: Optional[str] = None) -> Dict[str, Any]:
        image_url = await self.provider.generate_avatar(mood, style, input_image)
        return {
            "image_url": image_url,
            "metadata": {
                "mood": mood,
                "style": style,
                "provider": self.provider.__class__.__name__
            }
        }

# Default to Mock for now, can be swapped via config
avatar_service = AvatarStudioService(MockImageProvider())
