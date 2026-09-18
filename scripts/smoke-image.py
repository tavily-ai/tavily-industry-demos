"""Check UI, asset, and health routes on a running image without external API calls."""

import re
import sys
import time
from urllib.error import URLError
from urllib.request import urlopen

base, health = sys.argv[1:3]
for attempt in range(60):
    try:
        with urlopen(base + health, timeout=3) as response:
            assert response.status == 200
        break
    except (URLError, TimeoutError, ConnectionError):
        if attempt == 59:
            raise
        time.sleep(1)
with urlopen(base + "/", timeout=5) as response:
    assert "text/html" in response.headers["Content-Type"]
    html = response.read().decode()
    assert "<html" in html.lower()
asset = re.search(r'src="(/assets/[^\"]+\.js)"', html)
assert asset, "The built UI must include a JavaScript asset"
with urlopen(base + asset.group(1), timeout=5) as response:
    javascript = response.read().decode()
    assert response.status == 200
    assert "http://localhost:8000" not in javascript
    assert "http://localhost:8080" not in javascript
print("PASS UI, JavaScript asset, same-origin API configuration, and health endpoint")
