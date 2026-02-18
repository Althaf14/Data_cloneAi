
import os
import cv2
import numpy as np
from document_validator import DocumentValidator

def test_validation():
    validator = DocumentValidator()
    
    # Create a solid black image
    black_img = np.zeros((720, 1280, 3), dtype=np.uint8)
    cv2.imwrite("test_black.jpg", black_img)
    
    # Create a noisy "text-less" image (garbage)
    garbage_img = np.random.randint(0, 255, (720, 1280, 3), dtype=np.uint8)
    cv2.imwrite("test_garbage.jpg", garbage_img)
    
    print("--- Testing Black Image ---")
    res_black = validator.validate("test_black.jpg")
    print(f"Valid: {res_black['is_valid']}")
    print(f"Reason: {res_black['reason']}")
    print(f"Details: {res_black['details']}")
    
    print("\n--- Testing Garbage Image ---")
    res_garbage = validator.validate("test_garbage.jpg")
    print(f"Valid: {res_garbage['is_valid']}")
    print(f"Reason: {res_garbage['reason']}")
    print(f"Details: {res_garbage['details']}")
    
    # Cleanup
    os.remove("test_black.jpg")
    os.remove("test_garbage.jpg")

if __name__ == "__main__":
    test_validation()
