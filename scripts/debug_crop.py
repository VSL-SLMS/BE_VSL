"""
VSL PDF Extractor v4 - Debug specific pages to tune parameters.
"""
import cv2
import numpy as np
import fitz

INPUT_PDF = r'd:\VSL\vsl.pdf'

def get_page_img(doc, idx):
    page = doc[idx]
    imgs = page.get_images(full=True)
    if not imgs:
        return None
    xref = imgs[0][0]
    base = doc.extract_image(xref)
    nparr = np.frombuffer(base["image"], np.uint8)
    return cv2.imdecode(nparr, cv2.IMREAD_COLOR)

doc = fitz.open(INPUT_PDF)

# Debug pages that were missed: 103, 104, 108, 110, 112
for p in [103, 104, 108, 110, 112, 131, 133, 134]:
    img = get_page_img(doc, p - 1)
    if img is None:
        print(f"Page {p}: no image")
        continue

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    h, w = gray.shape
    _, binary = cv2.threshold(gray, 180, 255, cv2.THRESH_BINARY_INV)

    hk = cv2.getStructuringElement(cv2.MORPH_RECT, (w // 3, 1))
    horiz = cv2.morphologyEx(binary, cv2.MORPH_OPEN, hk)
    h_count = np.sum(horiz > 0)

    vk = cv2.getStructuringElement(cv2.MORPH_RECT, (1, h // 5))
    vert = cv2.morphologyEx(binary, cv2.MORPH_OPEN, vk)
    v_count = np.sum(vert > 0)

    # Try shorter vertical kernel
    vk2 = cv2.getStructuringElement(cv2.MORPH_RECT, (1, h // 8))
    vert2 = cv2.morphologyEx(binary, cv2.MORPH_OPEN, vk2)
    v_count2 = np.sum(vert2 > 0)

    print(f"Page {p}: h_count={h_count}, v_count={v_count}, v_count2(shorter)={v_count2}")
    print(f"  -> Current filter: h>1000 and v>500 => {'PASS' if h_count > 1000 and v_count > 500 else 'FAIL'}")
    print(f"  -> With v2: h>1000 and v2>300 => {'PASS' if h_count > 1000 and v_count2 > 300 else 'FAIL'}")

doc.close()
