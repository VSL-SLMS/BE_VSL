import fitz
import os

doc = fitz.open(r'd:\VSL\vsl.pdf')
print(f"Total pages: {len(doc)}")

sample_pages = [0, 79, 102, 103, 119, 129, 149, 169, 189, 209]
for p in sample_pages:
    if p >= len(doc):
        continue
    page = doc[p]
    imgs = page.get_images(full=True)
    text = page.get_text().strip()
    text_preview = text[:80].replace('\n', ' ') if text else "(no text)"
    print(f"\nPage {p+1}: {len(imgs)} images, text: {text_preview}")
    for i, img in enumerate(imgs):
        xref = img[0]
        base = doc.extract_image(xref)
        w, h, ext = base["width"], base["height"], base["ext"]
        print(f"  img{i}: {w}x{h} ({ext}), size={len(base['image'])} bytes")

doc.close()
