
import fitz  
import os
import json
from PIL import Image
import io

PDF_PATH = r"d:\VSL\vsl.pdf"
OUTPUT_BASE = r"d:\VSL\pdf_extracted"
PAGES_DIR = os.path.join(OUTPUT_BASE, "pages_hires")
SIGNS_DIR = os.path.join(OUTPUT_BASE, "signs_v2")
MANIFEST_FILE = os.path.join(OUTPUT_BASE, "extraction_manifest.json")

os.makedirs(PAGES_DIR, exist_ok=True)
os.makedirs(SIGNS_DIR, exist_ok=True)

PAGE_MAP = {
    (1, 2):   ("cover", None, "Bìa"),
    (3, 4):   ("toc", None, "Mục lục"),
    (5, 6):   ("preface", None, "Lời nói đầu"),
    (7, 14):  ("theory", "1.1", "Sơ lược lịch sử phát triển của NNKH"),
    (15, 15): ("review", "1.1", "Câu hỏi ôn tập & Bài tập thực hành"),
    (16, 41): ("theory", "1.2", "Ngôn ngữ Kí hiệu"),
    (42, 42): ("review", "1.2", "Bài tập thực hành"),
    (43, 50): ("theory", "1.3", "Một số phương thức giao tiếp có sử dụng kí hiệu"),
    (51, 51): ("review", "1.3", "Câu hỏi ôn tập & Bài tập thực hành"),
    (52, 73): ("theory", "1.4", "Dạy và học Ngôn ngữ Kí hiệu"),
    (74, 74): ("review", "1.4", "Câu hỏi ôn tập & Bài tập thực hành"),
    (75, 76): ("alphabet_table", "2.1", "Chữ cái ngón tay"),
    (77, 79): ("number_table", "2.1", "Số tự nhiên"),
    (80, 102): ("sign_grid", "2.2", "Bản thân"),
    (103, 119): ("sign_grid", "2.3", "Gia đình"),
    (120, 129): ("sign_grid", "2.4", "Nghề nghiệp"),
    (130, 142): ("sign_grid", "2.5", "Hiện tượng tự nhiên"),
    (143, 160): ("sign_grid", "2.6", "Thực vật"),
    (161, 174): ("sign_grid", "2.7", "Động vật"),
    (175, 195): ("sign_grid", "2.8", "Trường học"),
    (196, 208): ("sign_grid", "2.9", "Giao thông"),
    (209, 218): ("sign_grid", "2.10", "Quê hương - Đất nước"),
    (219, 225): ("index", None, "Danh mục các kí hiệu"),
    (226, 226): ("index", None, "Danh mục các bài hát kí hiệu"),
    (227, 228): ("bibliography", None, "Tài liệu tham khảo"),
    (229, 236): ("appendix", None, "Phụ lục"),
}

def get_page_info(page_num):
    """Get classification for a page number."""
    for (start, end), (ptype, chapter, title) in PAGE_MAP.items():
        if start <= page_num <= end:
            return ptype, chapter, title
    return "unknown", None, None

def render_page(doc, page_idx, dpi=200):
    """Render a PDF page to a PIL Image at given DPI."""
    page = doc[page_idx]
    zoom = dpi / 72  # 72 is default DPI
    mat = fitz.Matrix(zoom, zoom)
    pix = page.get_pixmap(matrix=mat)
    img_data = pix.tobytes("png")
    return Image.open(io.BytesIO(img_data))

def crop_sign_grid_2x2(img, page_num, has_header=True):
   
    w, h = img.size
    
    if has_header:
        grid_top = int(h * 0.08)     # Below chapter header
    else:
        grid_top = int(h * 0.02)     # Minimal top margin
    
    grid_bottom = int(h * 0.95)      # Above page number
    grid_left = int(w * 0.05)        # Left margin
    grid_right = int(w * 0.95)       # Right margin
    
    mid_x = w // 2
    mid_y = (grid_top + grid_bottom) // 2
    
    pad = 3
    
    cells = [
        (1, (grid_left, grid_top, mid_x - pad, mid_y - pad)),        # top-left
        (2, (mid_x + pad, grid_top, grid_right, mid_y - pad)),       # top-right
        (3, (grid_left, mid_y + pad, mid_x - pad, grid_bottom)),     # bottom-left
        (4, (mid_x + pad, mid_y + pad, grid_right, grid_bottom)),    # bottom-right
    ]
    
    results = []
    for pos, box in cells:
        cropped = img.crop(box)
        fname = f"sign_p{page_num:04d}_{pos}.png"
        fpath = os.path.join(SIGNS_DIR, fname)
        cropped.save(fpath, "PNG", optimize=True)
        results.append({
            "position": pos,
            "filename": fname,
            "crop_box": list(box),
        })
    
    return results

def crop_sign_grid_3x2(img, page_num):
    w, h = img.size
    
    grid_top = int(h * 0.02)
    grid_bottom = int(h * 0.95)
    grid_left = int(w * 0.05)
    grid_right = int(w * 0.95)
    
    mid_x = w // 2
    row_height = (grid_bottom - grid_top) // 3
    
    pad = 3
    cells = []
    for row in range(3):
        for col in range(2):
            pos = row * 2 + col + 1
            y1 = grid_top + row * row_height + pad
            y2 = grid_top + (row + 1) * row_height - pad
            x1 = grid_left + col * (mid_x - grid_left) + (pad if col == 1 else 0)
            x2 = (mid_x - pad) if col == 0 else grid_right
            
            cropped = img.crop((x1, y1, x2, y2))
            fname = f"sign_p{page_num:04d}_{pos}.png"
            fpath = os.path.join(SIGNS_DIR, fname)
            cropped.save(fpath, "PNG", optimize=True)
            cells.append({
                "position": pos,
                "filename": fname,
                "crop_box": [x1, y1, x2, y2],
            })
    
    return cells


def extract_all(dpi=200):
    doc = fitz.open(PDF_PATH)
    total_pages = len(doc)
    manifest = {
        "pdf_file": PDF_PATH,
        "total_pages": total_pages,
        "dpi": dpi,
        "pages": []
    }
    
    print(f"Processing {total_pages} pages at {dpi} DPI...")
    
    for page_idx in range(total_pages):
        page_num = page_idx + 1
        ptype, chapter, title = get_page_info(page_num)
        
        img = render_page(doc, page_idx, dpi=dpi)
        
        page_fname = f"page_{page_num:04d}.png"
        page_fpath = os.path.join(PAGES_DIR, page_fname)
        img.save(page_fpath, "PNG", optimize=True)
        
        page_entry = {
            "page_num": page_num,
            "type": ptype,
            "chapter": chapter,
            "chapter_title": title,
            "full_page_image": page_fname,
            "size": {"width": img.width, "height": img.height},
            "signs": []
        }
        
        if ptype == "sign_grid":
            chapter_start_pages = [80, 103, 120, 130, 143, 161, 175, 196, 209]
            has_header = page_num in chapter_start_pages
            
            signs = crop_sign_grid_2x2(img, page_num, has_header=has_header)
            page_entry["signs"] = signs
            page_entry["grid_layout"] = "2x2"
        
        manifest["pages"].append(page_entry)
        
        if page_num % 20 == 0 or page_num == total_pages:
            print(f"  Processed {page_num}/{total_pages} pages...")
    
    with open(MANIFEST_FILE, 'w', encoding='utf-8') as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
    
    doc.close()
    
    sign_count = sum(len(p["signs"]) for p in manifest["pages"])
    sign_pages = sum(1 for p in manifest["pages"] if p["signs"])
    print(f"\n=== EXTRACTION COMPLETE ===")
    print(f"Total pages: {total_pages}")
    print(f"Pages with signs: {sign_pages}")
    print(f"Individual sign images: {sign_count}")
    print(f"High-res pages saved to: {PAGES_DIR}")
    print(f"Individual signs saved to: {SIGNS_DIR}")
    print(f"Manifest saved to: {MANIFEST_FILE}")

if __name__ == "__main__":
    extract_all(dpi=200)
