import aiohttp

# Search songs on Deezer API
async def search_songs(query: str):
    url = f"https://api.deezer.com/search?q={query}"

    async with aiohttp.ClientSession() as session:
        async with session.get(url) as response:
            return await response.json()