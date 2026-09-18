"""Exercise the production SPA mount in each self-contained Python demo."""

import importlib.util
import tempfile
import unittest
from pathlib import Path

from fastapi import FastAPI
from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parents[1]


class StaticUITest(unittest.TestCase):
    def test_spa_and_api_routing(self):
        for demo in ("company-research-agent", "market-researcher",
                     "travel-hospitality-intelligence-agent", "fsi-kit"):
            with self.subTest(demo=demo), tempfile.TemporaryDirectory() as directory:
                spec = importlib.util.spec_from_file_location("static_ui", ROOT / demo / "backend/static_ui.py")
                module = importlib.util.module_from_spec(spec)
                spec.loader.exec_module(module)
                dist = Path(directory)
                (dist / "index.html").write_text("<!doctype html><title>demo</title>")
                (dist / "assets").mkdir()
                (dist / "assets/app.js").write_text("console.log('demo')")
                app = FastAPI()

                @app.get("/health")
                def health():
                    return {"ok": True}

                module.mount_ui(app, dist)
                with TestClient(app) as client:
                    self.assertEqual(client.get("/health").json(), {"ok": True})
                    for route in ("/", "/compliance/watchlist", "/investment-research"):
                        response = client.get(route)
                        self.assertEqual(response.status_code, 200)
                        self.assertIn("text/html", response.headers["content-type"])
                        self.assertIn("<title>demo</title>", response.text)
                    self.assertEqual(client.get("/assets/app.js").text, "console.log('demo')")
                    for route in ("/api/missing", "/research/missing", "/generate-pdf/missing",
                                  "/assets/missing.js", "/assets/missing", "/missing.png"):
                        self.assertEqual(client.get(route).status_code, 404, route)
                    self.assertEqual(client.post("/unknown").status_code, 405)
                    self.assertEqual(client.head("/compliance/watchlist").status_code, 200)
                local_app = FastAPI()
                module.mount_ui(local_app, dist / "not-built")
                self.assertEqual(len(local_app.routes), 4)


if __name__ == "__main__":
    unittest.main()
