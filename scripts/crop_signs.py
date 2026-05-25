# -*- coding: utf-8 -*-
"""
Crop individual sign images from VSL PDF page images.
Each page has a 2x2 grid layout with 4 signs.
"""

import os
from PIL import Image

# Configuration
INPUT_DIR = r"d:\VSL\pdf_extracted\images"
OUTPUT_DIR = r"d:\VSL\pdf_extracted\signs"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Page ranges for practice section
START_PAGE = 75
END_PAGE = 218

def get_crop_boxes(img_width, img_height):
    """
    Calculate 4 crop regions for 2x2 grid.
    Layout: top-left(1), top-right(2), bottom-left(3), bottom-right(4)
    """
    mid_x = img_width // 2
    mid_y = img_height // 2
    
    # Add small padding to avoid cutting content
    pad = 5
    
    return {
        1: (0, 0, mid_x + pad, mid_y + pad),           # top-left
        2: (mid_x - pad, 0, img_width, mid_y + pad),    # top-right
        3: (0, mid_y - pad, mid_x + pad, img_height),   # bottom-left
        4: (mid_x - pad, mid_y - pad, img_width, img_height),  # bottom-right
    }

def crop_page(page_num):
    """Crop a single page into 4 sign images."""
    filename = f"page{page_num:04d}_img01.png"
    filepath = os.path.join(INPUT_DIR, filename)
    
    if not os.path.exists(filepath):
        print(f"  SKIP: {filename} not found")
        return 0
    
    img = Image.open(filepath)
    boxes = get_crop_boxes(img.width, img.height)
    
    count = 0
    for pos, box in boxes.items():
        cropped = img.crop(box)
        out_name = f"sign_p{page_num:04d}_{pos}.png"
        out_path = os.path.join(OUTPUT_DIR, out_name)
        cropped.save(out_path, "PNG")
        count += 1
    
    return count

def main():
    total = 0
    for page in range(START_PAGE, END_PAGE + 1):
        count = crop_page(page)
        if count > 0:
            total += count
            print(f"  Page {page}: {count} signs cropped")
    
    print(f"\n=== DONE: {total} sign images created in {OUTPUT_DIR} ===")

if __name__ == "__main__":
    main()
