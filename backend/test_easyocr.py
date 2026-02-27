import sys
print("starting import")
import easyocr
import time

print("Imported easyocr")
print("Initializing easyocr reader (this will download models if needed)...")
start = time.time()
reader = easyocr.Reader(['en'], gpu=False, verbose=False)
end = time.time()
print(f"Reader initialized in {end - start:.2f} seconds.")

from PIL import Image, ImageDraw, ImageFont
img = Image.new('RGB', (200, 100), color = (255, 255, 255))
d = ImageDraw.Draw(img)
d.text((10,10), "Hello World", fill=(0,0,0))
img.save('dummy_test.jpg')

print("Testing text extraction...")
results = reader.readtext('dummy_test.jpg')
print("Extracted:")
for res in results:
    print(res[1])
print("Done.")
