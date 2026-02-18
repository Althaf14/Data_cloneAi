"""
Document Type Validator
Checks whether an uploaded file is a valid identity document or certificate
before running the full forensic pipeline.
"""
import os
import re
import io
import hashlib
from PIL import Image
import numpy as np

# ── Keywords that strongly suggest an ID / certificate ──────────────────────
ID_KEYWORDS = {
    # Passports
    "passport", "republic", "nationality", "bearer", "mrz",
    # National IDs
    "national identity", "national id", "identity card", "id card",
    "citizen", "citizenship", "resident", "emirates id", "aadhaar",
    "aadhar", "pan card", "driving licence", "driver license", "driver's license",
    # Certificates
    "certificate", "certify", "hereby certify", "awarded", "completion",
    "achievement", "diploma", "degree", "transcript", "accredited",
    "issued by", "authority", "government", "ministry",
    # Common ID fields
    "date of birth", "d.o.b", "dob", "expiry", "expiration", "valid until",
    "place of birth", "sex", "gender", "signature", "holder",
    "document no", "document number", "serial no",
}

# ── Keywords that strongly suggest NOT an ID ─────────────────────────────────
NON_ID_KEYWORDS = {
    "invoice", "receipt", "bill", "purchase order", "quotation",
    "menu", "price list", "catalogue", "catalog",
    "resume", "curriculum vitae", "cv", "cover letter",
    "article", "blog", "news", "press release",
    "contract", "agreement", "terms and conditions",
    "screenshot", "meme", "photo", "selfie",
    "advertisement", "ad ", "promo", "discount",
    "bank statement", "statement of account",
}

# ── Aspect ratios typical for ID documents ───────────────────────────────────
# ISO/IEC 7810 ID-1 (credit card): 85.6 × 54.0 mm → ratio ≈ 1.585
# Passport booklet page: 125 × 88 mm → ratio ≈ 1.42
# A4 certificate: 297 × 210 mm → ratio ≈ 1.41
VALID_ASPECT_RATIOS = [
    (1.35, 1.70, "ID card / passport page"),
    (1.30, 1.50, "Certificate / A4 document"),
    (0.60, 0.80, "Portrait-oriented ID"),
]


class DocumentValidator:
    def __init__(self):
        self._ocr_reader = None

    def _get_ocr(self):
        if self._ocr_reader is not None:
            return self._ocr_reader
        try:
            import pytesseract
            pytesseract.get_tesseract_version()
            self._ocr_reader = "pytesseract"
        except Exception:
            self._ocr_reader = "none"
        return self._ocr_reader

    def _extract_text_quick(self, file_path: str) -> str:
        """Fast text extraction for validation purposes only."""
        ext = os.path.splitext(file_path)[1].lower()

        # PDF: extract text layer
        if ext == ".pdf":
            try:
                import pdfplumber
                with pdfplumber.open(file_path) as pdf:
                    text = " ".join(
                        page.extract_text() or "" for page in pdf.pages[:3]
                    )
                return text.lower()
            except Exception:
                pass
            return ""

        # Image: try pytesseract
        ocr = self._get_ocr()
        if ocr == "pytesseract":
            try:
                import pytesseract
                img = Image.open(file_path)
                text = pytesseract.image_to_string(img, config="--oem 3 --psm 6")
                return text.lower()
            except Exception:
                pass
        return ""

    def _check_aspect_ratio(self, file_path: str):
        """Returns (is_valid_ratio, ratio, description)."""
        ext = os.path.splitext(file_path)[1].lower()
        if ext == ".pdf":
            return True, None, "PDF document"
        try:
            img = Image.open(file_path)
            w, h = img.size
            ratio = max(w, h) / min(w, h)
            for lo, hi, desc in VALID_ASPECT_RATIOS:
                if lo <= ratio <= hi:
                    return True, round(ratio, 2), desc
            return False, round(ratio, 2), "Unusual aspect ratio"
        except Exception:
            return True, None, "Unknown"

    def _check_image_quality(self, file_path: str):
        """Returns (is_acceptable, reason)."""
        ext = os.path.splitext(file_path)[1].lower()
        if ext == ".pdf":
            return True, "PDF"
        try:
            img = Image.open(file_path)
            w, h = img.size
            # Too small — probably a thumbnail or icon
            if w < 100 or h < 100:
                return False, f"Image too small ({w}×{h}px) — minimum 100×100px required"
            # Too large to be a scanned ID (>20MP is suspicious)
            if w * h > 20_000_000:
                return False, f"Image resolution too high ({w}×{h}px) — may not be a document scan"
            return True, f"{w}×{h}px"
        except Exception as e:
            return False, f"Cannot open image: {e}"

    def _score_text(self, text: str):
        """Returns (id_score, non_id_score, matched_id_keywords, matched_non_id)."""
        id_hits = [kw for kw in ID_KEYWORDS if kw in text]
        non_id_hits = [kw for kw in NON_ID_KEYWORDS if kw in text]
        return len(id_hits), len(non_id_hits), id_hits, non_id_hits

    def _check_content_integrity(self, file_path: str):
        """
        Heuristic-based content analysis using CV to reject non-document garbage.
        Returns (is_acceptable, reason, details)
        """
        ext = os.path.splitext(file_path)[1].lower()
        if ext == ".pdf":
            return True, "PDF", {}

        # ─── Robust Content Check (Pillow) ────────────────────────────────
        # Calculate entropy and variance on the PIL image to catch blank/solid images
        # independent of OpenCV presence.
        try:
            pil_img = Image.open(file_path).convert('L') # Convert to grayscale
            # 1. Entropy Check
            # Shannon entropy: 0.0 for solid color, high for detailed images.
            # Text documents usually have entropy > 3.5
            histogram = pil_img.histogram()
            entropy = 0.0
            total_pixels = pil_img.size[0] * pil_img.size[1]
            for count in histogram:
                if count > 0:
                    p = count / total_pixels
                    entropy -= p * np.log2(p)
            
            # 2. Variance/Std Dev Check (Pillow native approximation or numpy)
            # We already have numpy imported
            img_array = np.array(pil_img)
            std_dev = np.std(img_array)
            mean_val = np.mean(img_array)
            
            print(f"[DEBUG] Validation: file={os.path.basename(file_path)} mean={mean_val:.2f} std={std_dev:.2f} entropy={entropy:.2f}")

            # REJECT: Solid or near-solid images
            if std_dev < 5.0:
                    print(f"[DEBUG] REJECTING: Low std_dev ({std_dev})")
                    return False, "Image is solid color or blank (no content detected)", {"std_dev": round(std_dev, 2), "entropy": round(entropy, 2)}
            
            # REJECT: Extremely low entropy (simple gradients, very little detail)
            if entropy < 3.0:
                    print(f"[DEBUG] REJECTING: Low entropy ({entropy})")
                    return False, "Image lacks sufficient detail to be a document", {"entropy": round(entropy, 2)}

            # REJECT: Extreme Darkness or Brightness with low variance
            if (mean_val < 5 or mean_val > 250) and std_dev < 10:
                    return False, "Image is too dark or too bright to be processed", {"mean": round(mean_val, 2), "std_dev": round(std_dev, 2)}

        except Exception as e:
            print(f"[DocumentValidator] content integrity check via PIL failed: {e}")
            # Fallthrough to OpenCV if PIL fails for some reason (unlikely for images)

        try:
            import cv2
            img = cv2.imread(file_path)
            if img is None:
                # If PIL opened it but CV2 can't, it might be a format issue, but we rely on PIL check above mostly.
                    pass 
            else:
                gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
                h, w = gray.shape
                
                # 2. Edge Density (Detect structure)
                edges = cv2.Canny(gray, 100, 200)
                edge_pixels = np.count_nonzero(edges)
                edge_density = (edge_pixels / (h * w)) * 100
                
                # Typical documents have 0.5% to 5% edge density
                if edge_density < 0.2: # Lowered slightly to be safe, but 0.2% is still very low
                    return False, "Image lacks structural detail (not a document)", {"edge_density": f"{round(edge_density, 3)}%"}

                # 3. Keypoint Analysis (Detail verification)
                orb = cv2.ORB_create(nfeatures=500)
                kp = orb.detect(gray, None)
                
                if len(kp) < 20: 
                    return False, "Insufficient visual features detected (too blurry or plain)", {"keypoints": len(kp)}
        except Exception as e:
             print(f"[DocumentValidator] CV check failed: {e}")

        return True, "Valid content structure", {
            "entropy": round(entropy, 2) if 'entropy' in locals() else "N/A",
            "variance": round(std_dev, 2) if 'std_dev' in locals() else "N/A"
        }

    def validate(self, file_path: str) -> dict:
        """
        Main validation entry point.
        """
        details = []
        rejection_reasons = []

        # ── 1. File existence & extension ────────────────────────────────────
        if not os.path.exists(file_path):
            return self._reject("File not found.", [], confidence=1.0)

        ext = os.path.splitext(file_path)[1].lower()
        allowed_exts = {".jpg", ".jpeg", ".png", ".bmp", ".tiff", ".tif", ".pdf", ".webp"}
        if ext not in allowed_exts:
            return self._reject(
                f"Unsupported file type '{ext}'. Only images (JPG, PNG, BMP, TIFF) and PDFs are accepted.",
                [f"File extension: {ext}"],
                confidence=1.0,
            )
        details.append(f"File type: {ext.upper().lstrip('.')}")

        # ── 2. Image quality check ───────────────────────────────────────────
        quality_ok, quality_msg = self._check_image_quality(file_path)
        details.append(f"Image quality: {quality_msg}")
        if not quality_ok:
            rejection_reasons.append(quality_msg)

        # ── 3. Content Integrity (CV Heavy) ──────────────────────────────────
        content_ok, content_msg, content_meta = self._check_content_integrity(file_path)
        if not content_ok:
            rejection_reasons.append(content_msg)
            if content_meta:
                details.append(f"CV Metrics: {content_meta}")
        else:
            if content_meta:
                details.append(f"Content structure: {content_msg} ({content_meta.get('edge_density', '')} density)")

        # ── 4. Aspect ratio check ────────────────────────────────────────────
        ratio_ok, ratio_val, ratio_desc = self._check_aspect_ratio(file_path)
        if ratio_val:
            details.append(f"Aspect ratio: {ratio_val} ({ratio_desc})")
        
        # We only reject on ratio if content integrity also felt "light"
        if not ratio_ok and not content_ok:
             rejection_reasons.append(f"Unusual aspect ratio ({ratio_val})")

        # ── 5. Text content analysis (if OCR available) ──────────────────────
        text = self._extract_text_quick(file_path)
        id_score, non_id_score, id_hits, non_id_hits = self._score_text(text)

        if text:
            details.append(f"ID keywords found: {id_score}")
            if non_id_hits:
                details.append(f"Non-ID keywords: {non_id_score}")

            if non_id_score >= 2 and id_score == 0:
                rejection_reasons.append(f"Content identifies as {non_id_hits[0]}")
        
        # ── 6. Final decision ─────────────────────────────────────────────────
        if rejection_reasons:
            return self._reject(
                rejection_reasons[0],
                details,
                confidence=0.9
            )

        # Category determination
        category = "unknown"
        text_lower = text.lower()
        if any(k in text_lower for k in ["passport", "mrz"]): category = "passport"
        elif any(k in text_lower for k in ["certificate", "diploma"]): category = "certificate"
        elif any(k in text_lower for k in ["id card", "national id", "driving"]): category = "id_card"

        return {
            "is_valid": True,
            "document_category": category,
            "confidence": 0.85 if id_score > 0 else 0.6,
            "reason": f"Document validated as {category.replace('_', ' ')}.",
            "details": details,
            "warning": False,
        }

    @staticmethod
    def _reject(reason: str, details: list, confidence: float = 0.8) -> dict:
        return {
            "is_valid": False,
            "document_category": "rejected",
            "confidence": round(confidence, 2),
            "reason": reason,
            "details": details,
            "warning": False,
        }
