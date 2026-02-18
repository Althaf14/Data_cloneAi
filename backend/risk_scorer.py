import numpy as np

class RiskScorer:
    def __init__(self):
        pass

    def calculate_risk(self, module_results):
        """
        Aggregates results from all modules into a unified probability score.
        """
        weights = {
            "forgery": 0.35,
            "biometrics": 0.20,
            "ocr": 0.25,
            "linkage": 0.2
        }

        scores = []
        explanations = []

        # 1. Forgery Analysis
        f_res = module_results.get("forgery", {})
        f_score = 1.0 if f_res.get("is_tampered") else 0.0
        scores.append(f_score * weights["forgery"])
        if f_score > 0.5:
            explanations.append("High probability of digital manipulation detected in image texture.")

        # 2. OCR Analysis (Text Quality)
        o_res = module_results.get("ocr", {})     # Consistency check results
        o_data = module_results.get("ocr_data", {}) # Raw text data
        
        ocr_risk = 0.0
        # Check consistency
        if not o_res.get("is_consistent", True):
             ocr_risk += 0.5
             explanations.extend(o_res.get("findings", []))
        
        # Check raw text content
        char_count = o_data.get("char_count", 0)
        fields = o_data.get("fields", {})
        
        if char_count < 15:
            # CRITICAL FAILURE: Document has almost no text content.
            # This overrides other scores because a document without text cannot be valid.
            return {
                "authenticity_score": 0.0,
                "risk_level": "critical",
                "explanations": ["CRITICAL: Document contains no readable text or is illegible."],
                "duplicate_count": 0,
            }
        elif char_count < 50:
            ocr_risk += 1.0 # High penalty
            explanations.append("Low text content detected - validation reliability is low.")
            
        # Check for essential fields
        missing_critical = []
        if not fields.get("id_number"): missing_critical.append("ID Number")
        if not fields.get("detected_names"): missing_critical.append("Name")
        
        if missing_critical and char_count >= 20:
             ocr_risk += 0.5
             explanations.append(f"Critical fields not detected: {', '.join(missing_critical)}")

        scores.append(min(1.0, ocr_risk) * weights["ocr"])

        # 3. Biometrics
        b_res = module_results.get("biometrics", {})
        b_score = 1.0 if not b_res.get("is_match", True) else 0.0
        scores.append(b_score * weights["biometrics"])
        if b_score > 0.5:
            explanations.append("Face in document does not match live capture/reference.")

        # 4. Linkage / Duplicates
        l_res = module_results.get("linkage", {})
        duplicates = l_res.get("duplicates", [])
        dup_count = len(duplicates)
        
        if dup_count > 0:
            l_score = min(1.0, dup_count * 0.4)
            scores.append(l_score * weights["linkage"])
            if dup_count == 1:
                explanations.append("This document was previously submitted — 1 duplicate record found in the system.")
            else:
                explanations.append(f"Document submitted {dup_count} times — high likelihood of identity cloning or re-submission fraud.")
            for dup in duplicates[:3]:
                reason = dup.get("reason", "")
                if reason:
                    explanations.append(f"↳ {reason}")
        else:
            scores.append(0.0)

        total_risk = sum(scores)

        risk_level = "low"
        if total_risk > 0.7:   risk_level = "critical"
        elif total_risk > 0.4: risk_level = "high"
        elif total_risk > 0.2: risk_level = "medium"

        return {
            "authenticity_score": round(max(0.0, 1.0 - total_risk), 4),
            "risk_level": risk_level,
            "explanations": explanations if explanations else ["Document appears standard and consistent. No anomalies detected."],
            "duplicate_count": dup_count,
        }
