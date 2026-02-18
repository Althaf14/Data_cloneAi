
import os
import numpy as np
from PIL import Image
import sys

# Ensure backend modules can be imported
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from document_validator import DocumentValidator
from risk_scorer import RiskScorer

def test_black_image_rejection():
    print("Testing Black Image Rejection...")
    # Create black image
    img = Image.new('RGB', (500, 300), color=(0, 0, 0))
    path = "black_test.jpg"
    img.save(path)

    validator = DocumentValidator()
    result = validator.validate(path)
    
    if result['is_valid'] is False:
        print(f"[PASS] Black image rejected. Reason: {result.get('reason')}")
    else:
        print(f"[FAIL] Black image accepted. Check document_validator.py logic.")

    # Cleanup
    if os.path.exists(path):
        os.remove(path)

def test_risk_scoring_empty_ocr():
    print("\nTesting Risk Scoring for Empty OCR...")
    scorer = RiskScorer()
    
    # Simulate valid forgery/biometrics/linkage but EMPTY OCR
    module_results = {
        "forgery": {"is_tampered": False},
        "biometrics": {"is_match": True},
        "linkage": {"duplicates": []},
        "ocr": {"is_consistent": True, "findings": []},
        "ocr_data": {
            "char_count": 0,
            "fields": {}
        }
    }
    
    risk_out = scorer.calculate_risk(module_results)
    print(f"Risk Output: {risk_out}")
    
    
    if risk_out['risk_level'] == 'critical' and risk_out['authenticity_score'] == 0.0:
         print(f"[PASS] Risk is CRITICAL and Authenticity is 0.0 for empty text.")
    else:
         print(f"[FAIL] Expected CRITICAL/0.0, got {risk_out['risk_level']}/{risk_out['authenticity_score']}")

if __name__ == "__main__":
    test_black_image_rejection()
    test_risk_scoring_empty_ocr()
