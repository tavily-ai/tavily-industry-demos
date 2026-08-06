import unittest
from fastapi.testclient import TestClient
from backend.app import app


class RequestValidationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_investment_topic_required_and_nonblank_length(self):
        self.assertEqual(
            self.client.post("/api/investment-research/stream", json={}).status_code,
            422,
        )
        self.assertEqual(
            self.client.post(
                "/api/investment-research/stream", json={"topic": "x"}
            ).status_code,
            422,
        )

    def test_merchant_name_and_category_required(self):
        self.assertEqual(
            self.client.post(
                "/api/merchant-risk/stream", json={"merchant_name": "Acme"}
            ).status_code,
            422,
        )
        response = self.client.post(
            "/api/merchant-risk/stream", json={"category_code": "5999"}
        )
        self.assertEqual(response.status_code, 422)

    def test_compliance_routes_have_namespaced_and_legacy_aliases(self):
        paths = {route.path for route in app.routes}
        self.assertIn("/api/compliance/watchlist/stream", paths)
        self.assertIn("/api/watchlist/stream", paths)
        self.assertIn("/api/compliance/investigate/stream", paths)
        self.assertIn("/api/investigate/stream", paths)


if __name__ == "__main__":
    unittest.main()
