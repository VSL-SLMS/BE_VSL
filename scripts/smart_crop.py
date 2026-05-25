"""
VSL PDF Extractor v5 - Reliable extraction using known page structure.

The VSL PDF has consistent layouts:
- Vocabulary pages: 2x2 grid with borders (4 signs per page)
- Some pages have 3x2 grid (6 signs - like days of week)
- Some pages have chapter headers taking top space
- Exercise/practice pages: text tables (no grid)

Strategy: Process ALL pages. For each page:
1. Save full page as reference image
2. Try contour detection with relaxed thresholds
3. If that fails, use fixed 2x2 split of the main content area
4. Manual page list for special layouts
"""
import cv2
import numpy as np
import os
import fitz
import json

INPUT_PDF = r'd:\VSL\vsl.pdf'
CELLS_DIR = r'd:\VSL\pdf_extracted\cells'
PAGES_DIR = r'd:\VSL\pdf_extracted\pages'

for d in [CELLS_DIR, PAGES_DIR]:
    if os.path.exists(d):
        for f in os.listdir(d):
            os.remove(os.path.join(d, f))
    os.makedirs(d, exist_ok=True)

# Pages that contain vocabulary grids (manually verified from reading)
# Format: page_num -> number of expected cells (4=2x2, 6=3x2)
VOCAB_PAGES = {}
# Part 1: Alphabet & Numbers (pages ~75-101)
for p in range(75, 102):
    VOCAB_PAGES[p] = 4

# Part 2: Ban than (pages 89-101) - already included above

# Chapter: Gia dinh (103-117)
for p in [103,104,105,106,107,108,109,110,111,112,113,114,115,116,117]:
    VOCAB_PAGES[p] = 4

# Chapter: Nghe nghiep (120-128)
for p in [120,121,122,123,124,125,126,127,128]:
    VOCAB_PAGES[p] = 4

# Chapter: Hien tuong tu nhien (130-137)
for p in [130,131,132,133,134,135,136,137]:
    VOCAB_PAGES[p] = 4
# Page 132 has 6 cells (3x2: thu 4,5,6,7, chu nhat, hom qua)
VOCAB_PAGES[132] = 6

# Chapter: Thuc vat (139-148)
for p in range(139, 149):
    VOCAB_PAGES[p] = 4

# Chapter: Dong vat (149-165)
for p in range(149, 166):
    VOCAB_PAGES[p] = 4

# Chapter: Truong hoc (168-186)
for p in range(168, 187):
    VOCAB_PAGES[p] = 4

# Chapter: Giao thong (187-206)
for p in range(187, 207):
    VOCAB_PAGES[p] = 4

# Chapter: Que huong (207-218)
for p in range(207, 219):
    VOCAB_PAGES[p] = 4

def get_page_img(doc, idx):
    page = doc[idx]
    imgs = page.get_images(full=True)
    if not imgs:
        return None
    xref = imgs[0][0]
    base = doc.extract_image(xref)
    nparr = np.frombuffer(base["image"], np.uint8)
    return cv2.imdecode(nparr, cv2.IMREAD_COLOR)

def detect_cells_relaxed(img):
    """Try to detect cells with very relaxed thresholds."""
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    h, w = gray.shape

    # Try multiple thresholds
    for thresh_val in [150, 170, 190]:
        _, binary = cv2.threshold(gray, thresh_val, 255, cv2.THRESH_BINARY_INV)

        # Shorter kernels for thin lines
        hk = cv2.getStructuringElement(cv2.MORPH_RECT, (w // 5, 1))
        horiz = cv2.morphologyEx(binary, cv2.MORPH_OPEN, hk)
        horiz = cv2.dilate(horiz, cv2.getStructuringElement(cv2.MORPH_RECT, (w // 3, 3)))

        vk = cv2.getStructuringElement(cv2.MORPH_RECT, (1, h // 8))
        vert = cv2.morphologyEx(binary, cv2.MORPH_OPEN, vk)
        vert = cv2.dilate(vert, cv2.getStructuringElement(cv2.MORPH_RECT, (3, h // 5)))

        grid = cv2.add(horiz, vert)
        grid = cv2.dilate(grid, np.ones((5, 5), np.uint8))

        contours, _ = cv2.findContours(grid, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)

        min_w, max_w = w * 0.2, w * 0.58
        min_h, max_h = h * 0.06, h * 0.52

        cells = []
        for cnt in contours:
            x, y, cw, ch = cv2.boundingRect(cnt)
            if min_w < cw < max_w and min_h < ch < max_h:
                cells.append((x, y, cw, ch))

        cells = remove_overlap(cells)
        if len(cells) >= 2:
            cells.sort(key=lambda c: (c[1], c[0]))
            return cells

    return []

def fixed_split(img, num_cells=4):
    """Fixed grid split based on known page structure."""
    h, w = img.shape[:2]

    # Standard vocabulary page layout (904x1277):
    # - Top margin: ~12% (header/chapter title area)
    # - Bottom margin: ~5% (page number)
    # - Left/Right margins: ~3%
    # - Grid occupies the middle ~80% vertically, ~94% horizontally

    # Find the actual content area by looking for dark pixels
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # Content boundaries (approximate for 904x1277 resolution)
    left = int(w * 0.03)
    right = int(w * 0.97)
    mid_x = w // 2

    # For pages with chapter headers, content starts lower
    # Scan for first significant content row
    row_darkness = []
    for y in range(h):
        row = gray[y, left:right]
        dark_pixels = np.sum(row < 150)
        row_darkness.append(dark_pixels)

    # Find first row with significant content (> 5% of row width is dark)
    threshold = (right - left) * 0.05
    content_start = int(h * 0.08)
    for y in range(int(h * 0.05), int(h * 0.3)):
        if row_darkness[y] > threshold:
            content_start = max(y - 5, 0)
            break

    # Find last row with content
    content_end = int(h * 0.95)
    for y in range(int(h * 0.95), int(h * 0.7), -1):
        if row_darkness[y] > threshold:
            content_end = min(y + 5, h)
            break

    if num_cells == 4:
        mid_y = (content_start + content_end) // 2
        cells = [
            (left, content_start, mid_x - left, mid_y - content_start),       # top-left
            (mid_x, content_start, right - mid_x, mid_y - content_start),     # top-right
            (left, mid_y, mid_x - left, content_end - mid_y),                 # bottom-left
            (mid_x, mid_y, right - mid_x, content_end - mid_y),              # bottom-right
        ]
    elif num_cells == 6:
        third = (content_end - content_start) // 3
        y1, y2, y3 = content_start, content_start + third, content_start + 2 * third
        cells = [
            (left, y1, mid_x - left, third),
            (mid_x, y1, right - mid_x, third),
            (left, y2, mid_x - left, third),
            (mid_x, y2, right - mid_x, third),
            (left, y3, mid_x - left, content_end - y3),
            (mid_x, y3, right - mid_x, content_end - y3),
        ]
    else:
        cells = [(left, content_start, right - left, content_end - content_start)]

    return cells

def remove_overlap(cells, thresh=0.4):
    if not cells:
        return []
    cells = sorted(cells, key=lambda c: c[2]*c[3], reverse=True)
    keep = []
    for cell in cells:
        x1, y1, w1, h1 = cell
        overlap = False
        for kc in keep:
            x2, y2, w2, h2 = kc
            ix = max(0, min(x1+w1, x2+w2) - max(x1, x2))
            iy = max(0, min(y1+h1, y2+h2) - max(y1, y2))
            inter = ix * iy
            smaller = min(w1*h1, w2*h2)
            if smaller > 0 and inter / smaller > thresh:
                overlap = True
                break
        if not overlap:
            keep.append(cell)
    return keep

def main():
    doc = fitz.open(INPUT_PDF)
    total = len(doc)
    print(f"PDF: {total} pages")
    print(f"Known vocabulary pages: {len(VOCAB_PAGES)}")

    manifest = {}
    total_cells = 0
    methods = {"smart": 0, "fixed": 0}

    # Save ALL pages as reference images
    for i in range(total):
        img = get_page_img(doc, i)
        if img is None:
            continue
        page_num = i + 1
        cv2.imwrite(os.path.join(PAGES_DIR, f"page_{page_num:04d}.png"), img)

    # Process vocabulary pages
    for page_num, expected_cells in sorted(VOCAB_PAGES.items()):
        img = get_page_img(doc, page_num - 1)
        if img is None:
            print(f"  p{page_num:3d}: NO IMAGE")
            continue

        # Try smart detection first
        cells = detect_cells_relaxed(img)

        if len(cells) >= 2:
            method = "smart"
        else:
            # Use fixed split
            cells = fixed_split(img, expected_cells)
            method = "fixed"

        methods[method] += 1
        page_files = []

        for idx, (x, y, w, h) in enumerate(cells):
            pad = 3
            x1, y1 = max(0, x + pad), max(0, y + pad)
            x2 = min(img.shape[1], x + w - pad)
            y2 = min(img.shape[0], y + h - pad)
            cell_img = img[y1:y2, x1:x2]
            if cell_img.size == 0:
                continue

            fname = f"cell_p{page_num:04d}_{idx+1}.png"
            cv2.imwrite(os.path.join(CELLS_DIR, fname), cell_img)
            page_files.append(fname)

        manifest[str(page_num)] = {
            "method": method,
            "expected": expected_cells,
            "actual": len(page_files),
            "cells": page_files
        }
        total_cells += len(page_files)
        status = "OK" if len(page_files) == expected_cells else f"MISMATCH({len(page_files)}/{expected_cells})"
        print(f"  p{page_num:3d}: {len(page_files)} cells [{method}] {status}")

    # Save manifest
    with open(os.path.join(CELLS_DIR, "manifest.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)

    doc.close()

    print(f"\n{'='*50}")
    print(f"Total vocabulary cells: {total_cells}")
    print(f"Smart: {methods['smart']}, Fixed: {methods['fixed']}")
    print(f"All 236 pages saved to: {PAGES_DIR}")
    print(f"Vocab cells saved to: {CELLS_DIR}")

if __name__ == "__main__":
    main()
