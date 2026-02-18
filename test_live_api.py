
import requests
import os
import sys

def test_live_api():
    url = "http://localhost:8000/analyze"
    # Create black image
    from PIL import Image
    import io
    
    img = Image.new('RGB', (500, 300), color=(0, 0, 0))
    buffer = io.BytesIO()
    img.save(buffer, format="JPEG")
    buffer.seek(0)
    
    files = {'file': ('black_test.jpg', buffer, 'image/jpeg')}
    
    print(f"Testing Live API: {url}")
    try:
        response = requests.post(url, files=files)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 422:
             print("✅ PASS: Server rejected black image directly.")
        elif response.status_code == 200:
             data = response.json()
             risk = data.get("analysis", {}).get("risk", {})
             auth_score = risk.get("authenticity_score")
             risk_level = risk.get("risk_level")
             
             print(f"Risk Level: {risk_level}, Authenticity: {auth_score}")
             
             if risk_level == "critical" and auth_score == 0.0:
                  print("✅ PASS: Server marked image as CRITICAL risk (0.0 authenticity).")
             else:
                  print(f"❌ FAIL: Server accepted image with risk {risk_level}/{auth_score}. Code changes NOT applied.")
        else:
             print(f"❌ FAIL: Unexpected status code {response.status_code}")

    except Exception as e:
        print(f"Error connecting to server: {e}")

if __name__ == "__main__":
    test_live_api()
