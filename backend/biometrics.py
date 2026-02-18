import numpy as np
from PIL import Image

class BiometricIntegrity:
    def __init__(self):
        # In a real app, use InsightFace or DeepFace
        pass

    def match_faces(self, doc_photo, live_capture):
        """
        Compares face in document with a live selfie/capture.
        Returns similarity score using pixel-level comparison as a baseline.
        """
        try:
            img1 = np.array(Image.open(doc_photo).convert('L').resize((64, 64)), dtype=np.float32)
            img2 = np.array(Image.open(live_capture).convert('L').resize((64, 64)), dtype=np.float32)
            # Normalized cross-correlation as a simple similarity metric
            norm1 = (img1 - img1.mean()) / (img1.std() + 1e-8)
            norm2 = (img2 - img2.mean()) / (img2.std() + 1e-8)
            similarity = float(np.clip((norm1 * norm2).mean() + 0.5, 0.0, 1.0))
        except Exception:
            similarity = 0.5  # Unknown

        is_match = similarity > 0.65

        return {
            "is_match": is_match,
            "similarity_score": similarity,
            "findings": ["Facial features aligned" if is_match else "Significant biometric distance detected"]
        }

    def detect_deepfake(self, image_path):
        """
        Deepfake detector using frequency domain analysis.
        GAN-generated images often lack natural high-frequency noise.
        """
        try:
            img = np.array(Image.open(image_path).convert('L').resize((128, 128)), dtype=np.float32)
            # FFT-based high-frequency energy ratio
            fft = np.fft.fft2(img)
            fft_shift = np.fft.fftshift(fft)
            magnitude = np.abs(fft_shift)

            h, w = magnitude.shape
            cy, cx = h // 2, w // 2
            radius = min(h, w) // 4

            y, x = np.ogrid[:h, :w]
            mask_low = (x - cx)**2 + (y - cy)**2 <= radius**2
            mask_high = ~mask_low

            low_energy = magnitude[mask_low].sum()
            high_energy = magnitude[mask_high].sum()
            total = low_energy + high_energy + 1e-8

            # Real photos have more high-frequency content than GAN images
            hf_ratio = high_energy / total
            # GAN images tend to have hf_ratio < 0.85
            score = float(np.clip(1.0 - hf_ratio, 0.0, 1.0))
            is_synthetic = score > 0.5
        except Exception:
            score = 0.2
            is_synthetic = False

        return {
            "is_synthetic": is_synthetic,
            "confidence": 1.0 - score,
            "risk": "Low" if not is_synthetic else "High"
        }
