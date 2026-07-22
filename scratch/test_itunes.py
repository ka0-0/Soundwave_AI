import urllib.request
import json

url = "https://itunes.apple.com/search?term=daylight&limit=5&media=music&entity=song"
try:
    response = urllib.request.urlopen(url)
    data = json.loads(response.read().decode('utf-8'))
    for item in data.get('results', []):
        print(f"Title: {item.get('trackName')} | Artist: {item.get('artistName')}")
        print(f"Preview URL: {item.get('previewUrl')}")
        # Test preview URL connection
        try:
            p_res = urllib.request.urlopen(item.get('previewUrl'))
            print(f"Status: {p_res.status} | Content-Type: {p_res.headers.get('Content-Type')}\n")
        except Exception as ex:
            print(f"Failed to fetch preview URL: {ex}\n")
except Exception as e:
    print(f"Search failed: {e}")
