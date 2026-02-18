import re
import datetime

class OCRVerifier:
    def __init__(self):
        self._reader = None

    def _get_reader(self):
        """Try easyocr first, then pytesseract, then None."""
        if self._reader is not None:
            return self._reader
        # Try easyocr
        try:
            import easyocr
            self._reader = easyocr.Reader(['en'], gpu=False, verbose=False)
            print("[OCRVerifier] Using easyocr")
            return self._reader
        except Exception as e:
            print(f"[OCRVerifier] easyocr unavailable: {e}")
        # Try pytesseract
        try:
            import pytesseract
            from PIL import Image
            pytesseract.get_tesseract_version()
            self._reader = "pytesseract"
            print("[OCRVerifier] Using pytesseract")
            return self._reader
        except Exception as e:
            print(f"[OCRVerifier] pytesseract unavailable: {e}")
        self._reader = "unavailable"
        return self._reader

    def _extract_with_pytesseract(self, image_path):
        import pytesseract
        from PIL import Image
        img = Image.open(image_path)
        # Try multiple PSM modes for best extraction
        configs = [
            '--oem 3 --psm 6',   # Assume uniform block of text
            '--oem 3 --psm 11',  # Sparse text
            '--oem 3 --psm 3',   # Fully automatic
        ]
        best_text = ""
        for cfg in configs:
            try:
                text = pytesseract.image_to_string(img, config=cfg)
                if len(text.strip()) > len(best_text.strip()):
                    best_text = text
            except Exception:
                pass
        return best_text.strip()

    def extract_text(self, image_path):
        """Extracts text fields from the document image."""
        reader = self._get_reader()

        raw_text = ""

        if reader == "unavailable":
            # Last resort: try reading filename for hints
            raw_text = ""
        elif reader == "pytesseract":
            try:
                raw_text = self._extract_with_pytesseract(image_path)
            except Exception as e:
                print(f"[OCRVerifier] pytesseract extraction failed: {e}")
                raw_text = ""
        else:
            # easyocr
            try:
                results = reader.readtext(image_path)
                raw_text = " ".join([res[1] for res in results])
            except Exception as e:
                print(f"[OCRVerifier] easyocr extraction failed: {e}")
                raw_text = ""

        fields = self._parse_fields(raw_text)

        return {
            "raw_text": raw_text,
            "fields": fields,
            "char_count": len(raw_text),
            "word_count": len(raw_text.split()) if raw_text else 0,
        }

    def _parse_fields(self, text):
        """Heuristic parsing of identity document fields."""
        if not text:
            return {
                "date_of_birth": None,
                "id_number": None,
                "detected_names": [],
                "expiry_date": None,
                "nationality": None,
                "mrz_line": None,
            }

        # Date of birth — multiple formats
        dob_match = re.search(
            r'(?:DOB|D\.O\.B|Date of Birth|Born)[:\s]*'
            r'(\d{1,2}[/\-\.]\d{1,2}[/\-\.]\d{2,4})',
            text, re.IGNORECASE
        ) or re.search(r'(\d{2}[/\-]\d{2}[/\-]\d{4})', text)

        # Expiry date
        exp_match = re.search(
            r'(?:Expiry|Expiration|Valid Until|EXP)[:\s]*'
            r'(\d{1,2}[/\-\.]\d{1,2}[/\-\.]\d{2,4})',
            text, re.IGNORECASE
        )

        # ID / Document number
        id_match = re.search(
            r'(?:No\.|Number|ID|Doc)[:\s#]*([A-Z0-9]{6,15})',
            text, re.IGNORECASE
        ) or re.search(r'\b([A-Z]{1,3}[0-9]{6,9})\b', text)

        # MRZ line (machine readable zone — two lines of 44 chars)
        mrz_match = re.search(r'([A-Z0-9<]{30,44})', text)

        # Nationality
        nat_match = re.search(
            r'(?:Nationality|Citizenship)[:\s]*([A-Z][a-z]+)',
            text, re.IGNORECASE
        )

        # Names — capitalized words 3+ chars, exclude common document keywords
        KEYWORDS = {'THE', 'AND', 'FOR', 'DATE', 'BIRTH', 'EXPIRY', 'VALID',
                    'NATIONAL', 'IDENTITY', 'PASSPORT', 'CARD', 'REPUBLIC',
                    'GOVERNMENT', 'ISSUED', 'AUTHORITY', 'SIGNATURE'}
        detected_names = [
            w for w in re.findall(r'\b([A-Z][A-Z]{2,})\b', text)
            if w not in KEYWORDS
        ][:4]

        return {
            "date_of_birth": dob_match.group(1) if dob_match else None,
            "expiry_date": exp_match.group(1) if exp_match else None,
            "id_number": id_match.group(1) if id_match else None,
            "detected_names": detected_names,
            "nationality": nat_match.group(1) if nat_match else None,
            "mrz_line": mrz_match.group(1) if mrz_match else None,
        }

    def verify_consistency(self, ocr_data, template_type="passport"):
        """Validates logical consistency based on document rules."""
        findings = []
        is_consistent = True
        fields = ocr_data.get("fields", {})

        # DOB check
        if fields.get("date_of_birth"):
            try:
                raw = fields["date_of_birth"].replace('-', '/').replace('.', '/')
                # Try multiple date formats
                for fmt in ('%d/%m/%Y', '%m/%d/%Y', '%d/%m/%y', '%Y/%m/%d'):
                    try:
                        dob = datetime.datetime.strptime(raw, fmt)
                        if dob > datetime.datetime.now():
                            findings.append("D.O.B is in the future — possible forgery indicator.")
                            is_consistent = False
                        age = (datetime.datetime.now() - dob).days / 365
                        if age > 120:
                            findings.append("D.O.B implies age over 120 years — suspicious.")
                            is_consistent = False
                        break
                    except ValueError:
                        continue
            except Exception:
                findings.append("Malformed date field detected.")

        # Expiry check
        if fields.get("expiry_date"):
            try:
                raw = fields["expiry_date"].replace('-', '/').replace('.', '/')
                for fmt in ('%d/%m/%Y', '%m/%d/%Y', '%d/%m/%y'):
                    try:
                        exp = datetime.datetime.strptime(raw, fmt)
                        if exp < datetime.datetime.now():
                            findings.append("Document has expired.")
                        break
                    except ValueError:
                        continue
            except Exception:
                pass

        # No text extracted at all
        if not ocr_data.get("raw_text", "").strip():
            findings.append("No text could be extracted from document — image quality may be too low.")

        return {
            "is_consistent": is_consistent,
            "findings": findings
        }
