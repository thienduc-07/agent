import urllib.request
import re

url = "https://sketchfab.com/3d-models/nami-onepiece-b9b097654aa046e9a228e93db787cbf1"
req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"})
try:
    with urllib.request.urlopen(req) as resp:
        html = resp.read().decode("utf-8", errors="ignore")
        print("Page length:", len(html))
        urls = set(re.findall(r"https://[^\s\"'\\]+", html))
        media_urls = [u for u in urls if any(k in u for k in ["media.sketchfab", "bin", "gltf", "glb", "archive", "download", "osg"])]
        for u in media_urls[:15]:
            print(u)
except Exception as e:
    print("Error:", e)
