
import cv2
import numpy as np
import os
import sys

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

try:
    from document_validator import DocumentValidator
except ImportError:
    # If run from root, backend.document_validator might be needed or just document_validator if in backend
    sys.path.append('backend')
    from document_validator import DocumentValidator

def create_black_image(filename):
    # Create a 1000x1000 black image
    img = np.zeros((1000, 1000, 3), dtype=np.uint8)
    cv2.imwrite(filename, img)
    return filename

def create_noise_image(filename):
    # Create a 1000x1000 noise image
    img = np.random.randint(0, 256, (1000, 1000, 3), dtype=np.uint8)
    cv2.imwrite(filename, img)
    return filename

def test_validation():
    validator = DocumentValidator()
    
    # Test 1: Black Image
    black_img = "test_black.jpg"
    create_black_image(black_img)
    print(f"Testing {black_img}...")
    result = validator.validate(black_img)
    print(f"Result for black image: {result['is_valid']}")
    print(f"Reason: {result.get('reason')}")
    print(f"Details: {result.get('details')}")
    
    # Test 2: Noise Image
    noise_img = "test_noise.jpg"
    create_noise_image(noise_img)
    print(f"\nTesting {noise_img}...")
    result = validator.validate(noise_img)
    print(f"Result for noise image: {result['is_valid']}")
    print(f"Reason: {result.get('reason')}")
    print(f"Details: {result.get('details')}")

    # Clean up
    if os.path.exists(black_img):
        os.remove(black_img)
    if os.path.exists(noise_img):
        os.remove(noise_img)

if __name__ == "__main__":
    test_validation()
