
import os
import sys
from PIL import Image
import numpy as np

# Path from metadata
USER_IMAGE_PATH = r"C:/Users/Siyad/.gemini/antigravity/brain/87608553-de70-4907-9e19-57fb049e94de/uploaded_media_1771429561888.png"

def analyze_user_image():
    if not os.path.exists(USER_IMAGE_PATH):
        print(f"File not found: {USER_IMAGE_PATH}")
        return

    print(f"Analyzing: {USER_IMAGE_PATH}")
    try:
        pil_img = Image.open(USER_IMAGE_PATH).convert('L')
        img_array = np.array(pil_img)
        
        std_dev = np.std(img_array)
        mean_val = np.mean(img_array)
        
        histogram = pil_img.histogram()
        entropy = 0.0
        total_pixels = pil_img.size[0] * pil_img.size[1]
        for count in histogram:
            if count > 0:
                p = count / total_pixels
                entropy -= p * np.log2(p)
                
        print(f"Metrics:")
        print(f"  Mean: {mean_val:.2f}")
        print(f"  Std Dev: {std_dev:.2f}")
        print(f"  Entropy: {entropy:.2f}")
        
        if std_dev < 5.0:
            print("  -> Would be REJECTED by std_dev check (< 5.0)")
        else:
            print("  -> Would PASS std_dev check (>= 5.0)")
            
        if entropy < 3.0:
             print("  -> Would be REJECTED by entropy check (< 3.0)")
        else:
             print("  -> Would PASS entropy check (>= 3.0)")

    except Exception as e:
        print(f"Error: {e}")

    # OCR Check
    print("\nRunning OCR Analysis...")
    from backend.ocr_verifier import OCRVerifier
    try:
        ocr = OCRVerifier()
        # Mock easyocr if needed or rely on what's available
        result = ocr.extract_text(USER_IMAGE_PATH)
        print(f"OCR Result:")
        print(f"  Raw Text: '{result['raw_text']}'")
        print(f"  Char Count: {result['char_count']}")
        
        if result['char_count'] < 15:
             print("  -> Would be CRITICAL RISK (< 15 chars)")
        else:
             print(f"  -> Would PASS critical risk check (>= 15 chars)")

    except Exception as e:
        print(f"OCR Analysis Failed: {e}")

if __name__ == "__main__":
    analyze_user_image()
