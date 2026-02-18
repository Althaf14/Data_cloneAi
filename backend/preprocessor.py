import cv2
import numpy as np

class DocumentPreprocessor:
    def __init__(self):
        pass

    def enhance_image(self, image_path):
        """
        Standardizes inputs, performs enhancement, glare removal, and skew correction.
        """
        # Load image
        img = cv2.imread(image_path)
        if img is None:
            raise ValueError("Could not read image")

        # 1. Image Enhancement (Contrast/Brightness)
        enhanced = self._apply_clahe(img)

        # 2. Skew Correction
        corrected = self._correct_skew(enhanced)

        # 3. Glare Removal (Simplified using inpainting on bright spots)
        no_glare = self._remove_glare(corrected)

        return no_glare

    def _apply_clahe(self, img):
        """Apply Contrast Limited Adaptive Histogram Equalization."""
        lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(lab)
        clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8,8))
        cl = clahe.apply(l)
        limg = cv2.merge((cl, a, b))
        return cv2.cvtColor(limg, cv2.COLOR_LAB2BGR)

    def _correct_skew(self, img):
        """Detect and correct document skew."""
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        gray = cv2.bitwise_not(gray)
        thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY | cv2.THRESH_OTSU)[1]
        
        coords = np.column_stack(np.where(thresh > 0))
        angle = cv2.minAreaRect(coords)[-1]
        
        if angle < -45:
            angle = -(90 + angle)
        else:
            angle = -angle
            
        (h, w) = img.shape[:2]
        center = (w // 2, h // 2)
        M = cv2.getRotationMatrix2D(center, angle, 1.0)
        rotated = cv2.warpAffine(img, M, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
        
        return rotated

    def _remove_glare(self, img):
        """Simple glare removal using thresholding and inpainting."""
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        mask = cv2.threshold(gray, 220, 255, cv2.THRESH_BINARY)[1]
        result = cv2.inpaint(img, mask, 5, cv2.INPAINT_TELEA)
        return result

    def extract_metadata(self, image_path):
        """
        Placeholder for metadata extraction (EXIF, device info).
        In a real app, use PIL or exiftool.
        """
        return {
            "resolution": "1920x1080",
            "format": "JPEG",
            "capture_device": "Unknown/Mobile",
            "timestamp": "N/A"
        }
