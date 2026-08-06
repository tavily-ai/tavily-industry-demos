import unittest

from backend.modules.investment_research.schemas import EconomicDataResearch, EvidencePoint
from backend.modules.merchant_risk.schemas import CategoryFitResearch, MerchantEvidence, MerchantIdentity
from backend.modules.merchant_risk.workflow import _normalize_category_fit, _normalize_confidence


class ResearchOutputValidationTests(unittest.TestCase):
    def test_investment_evidence_accepts_numeric_year_and_preserves_extras(self):
        point = EvidencePoint.model_validate({
            "claim": 2024,
            "detail": "Reported value",
            "source_urls": "https://example.com/report",
            "as_of": 2024,
            "provider_note": "preliminary",
        })
        self.assertEqual(point.claim, "2024")
        self.assertEqual(point.source_urls, ["https://example.com/report"])
        self.assertEqual(point.as_of, 2024)
        self.assertEqual(point.provider_note, "preliminary")

    def test_investment_lane_accepts_partial_output(self):
        result = EconomicDataResearch.model_validate({"indicators": None})
        self.assertEqual(result.indicators, [])
        self.assertEqual(result.trend_summary, "")

    def test_merchant_evidence_accepts_numeric_date_and_scalar_sources(self):
        finding = MerchantEvidence.model_validate({
            "finding": "Action",
            "significance": 5,
            "source_urls": "https://example.com/action",
            "observed_date": 2025,
        })
        self.assertEqual(finding.significance, "5")
        self.assertEqual(finding.source_urls, ["https://example.com/action"])
        self.assertEqual(finding.observed_date, 2025)

    def test_merchant_lanes_accept_partial_and_non_enum_values(self):
        identity = MerchantIdentity.model_validate({"confidence": "high confidence"})
        category = CategoryFitResearch.model_validate({"category_fit": "does not match"})
        self.assertEqual(identity.confidence, "high confidence")
        self.assertEqual(category.category_fit, "does not match")
        self.assertEqual(_normalize_confidence(identity.confidence), "high")
        self.assertEqual(_normalize_category_fit(category.category_fit), "inconsistent")


if __name__ == "__main__":
    unittest.main()
