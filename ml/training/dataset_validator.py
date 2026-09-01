"""
Dataset Validation Module for Chest X-Ray (Pneumonia) Dataset.
Validates directory structure, image readability, corrupted images, dimensions, formats, and class balance.
"""

import os
import sys
from pathlib import Path
from typing import Dict, Any, List, Tuple
from PIL import Image
import numpy as np

def validate_dataset(data_dir: str = "data/chest_xray") -> Dict[str, Any]:
    """
    Validates the dataset structure and checks all images for corruption.
    """
    base_path = Path(data_dir)
    print(f"=== [DATASET VALIDATION] Checking dataset at: {base_path.resolve()} ===")
    
    if not base_path.exists():
        raise FileNotFoundError(f"Dataset path does not exist: {base_path}")
    
    splits = ["train", "val", "test"]
    classes = ["NORMAL", "PNEUMONIA"]
    
    report = {
        "dataset_path": str(base_path.resolve()),
        "splits": {},
        "total_images": 0,
        "corrupted_images": [],
        "formats": {},
        "dimension_stats": {
            "min_width": float("inf"),
            "max_width": 0,
            "min_height": float("inf"),
            "max_height": 0,
        },
        "class_counts": {"NORMAL": 0, "PNEUMONIA": 0},
        "is_valid": True
    }
    
    for split in splits:
        split_path = base_path / split
        if not split_path.exists():
            report["is_valid"] = False
            report["splits"][split] = {"error": f"Directory missing: {split_path}"}
            continue
            
        report["splits"][split] = {}
        for cls in classes:
            cls_path = split_path / cls
            if not cls_path.exists():
                report["is_valid"] = False
                report["splits"][split][cls] = {"error": f"Class folder missing: {cls_path}"}
                continue
                
            image_files = [f for f in cls_path.iterdir() if f.is_file() and not f.name.startswith(".")]
            valid_images = 0
            
            for img_file in image_files:
                try:
                    with Image.open(img_file) as img:
                        img.verify()  # Fast structural verification
                    
                    # Reopen to test decoding and check dimensions/mode
                    with Image.open(img_file) as img:
                        w, h = img.size
                        fmt = img.format or img_file.suffix.upper()
                        report["formats"][fmt] = report["formats"].get(fmt, 0) + 1
                        
                        report["dimension_stats"]["min_width"] = min(report["dimension_stats"]["min_width"], w)
                        report["dimension_stats"]["max_width"] = max(report["dimension_stats"]["max_width"], w)
                        report["dimension_stats"]["min_height"] = min(report["dimension_stats"]["min_height"], h)
                        report["dimension_stats"]["max_height"] = max(report["dimension_stats"]["max_height"], h)
                        
                        valid_images += 1
                        report["class_counts"][cls] += 1
                        report["total_images"] += 1
                        
                except Exception as e:
                    print(f"[CORRUPTION DETECTED] File {img_file}: {e}")
                    report["corrupted_images"].append({
                        "file": str(img_file),
                        "error": str(e)
                    })
                    
            report["splits"][split][cls] = {
                "total_files": len(image_files),
                "valid_images": valid_images,
                "corrupted": len(image_files) - valid_images
            }
            
    print("\n--- Summary of Dataset Statistics ---")
    print(f"Total Valid Images : {report['total_images']}")
    print(f"Total Corrupted    : {len(report['corrupted_images'])}")
    print(f"Image Formats      : {report['formats']}")
    print(f"Dimensions Range   : Width [{report['dimension_stats']['min_width']}, {report['dimension_stats']['max_width']}] x Height [{report['dimension_stats']['min_height']}, {report['dimension_stats']['max_height']}]")
    print("\n--- Breakdown by Split ---")
    for split in splits:
        if split in report["splits"] and "error" not in report["splits"][split]:
            normal_cnt = report["splits"][split]["NORMAL"]["valid_images"]
            pneu_cnt = report["splits"][split]["PNEUMONIA"]["valid_images"]
            tot = normal_cnt + pneu_cnt
            ratio = round(pneu_cnt / max(1, normal_cnt), 2)
            print(f"[{split.upper():5s}] NORMAL: {normal_cnt:4d} | PNEUMONIA: {pneu_cnt:4d} | Total: {tot:4d} | Imbalance (P/N): {ratio}x")
            
    if report["corrupted_images"]:
        report["is_valid"] = False
        print(f"\n[WARNING] Found {len(report['corrupted_images'])} corrupted images.")
    else:
        print("\n[SUCCESS] Dataset integrity verified: 0 corrupted images found.")
        
    return report

if __name__ == "__main__":
    dataset_dir = sys.argv[1] if len(sys.argv) > 1 else "data/chest_xray"
    res = validate_dataset(dataset_dir)
    if not res["is_valid"]:
        sys.exit(1)
    sys.exit(0)
