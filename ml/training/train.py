"""
Training Pipeline for Chest X-Ray Pneumonia Classification using Transfer Learning.
Trains an EfficientNet-B0 classifier, evaluates metrics on validation and test sets,
and saves the best model weights and configuration artifact to models/.
"""

import os
import sys
import time
import json
import argparse
from pathlib import Path
from typing import Dict, Any, Tuple

import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from torchvision import datasets, transforms, models
from PIL import Image

# Ensure reproducibility
torch.manual_seed(42)
if torch.cuda.is_available():
    torch.cuda.manual_seed_all(42)

def get_transforms(img_size: int = 224):
    """
    Returns image transformation pipelines for training, validation, and testing.
    Converts grayscale images to RGB to match pretrained ImageNet weights.
    """
    imagenet_mean = [0.485, 0.456, 0.406]
    imagenet_std = [0.229, 0.224, 0.225]
    
    train_transform = transforms.Compose([
        transforms.Lambda(lambda img: img.convert("RGB") if img.mode != "RGB" else img),
        transforms.Resize((img_size, img_size)),
        transforms.RandomHorizontalFlip(p=0.5),
        transforms.RandomRotation(degrees=10),
        transforms.ColorJitter(brightness=0.1, contrast=0.1),
        transforms.ToTensor(),
        transforms.Normalize(mean=imagenet_mean, std=imagenet_std)
    ])
    
    eval_transform = transforms.Compose([
        transforms.Lambda(lambda img: img.convert("RGB") if img.mode != "RGB" else img),
        transforms.Resize((img_size, img_size)),
        transforms.ToTensor(),
        transforms.Normalize(mean=imagenet_mean, std=imagenet_std)
    ])
    
    return train_transform, eval_transform

def build_model(num_classes: int = 2, pretrained: bool = True) -> nn.Module:
    """
    Builds an EfficientNet-B0 model with a custom classification head.
    """
    weights = models.EfficientNet_B0_Weights.DEFAULT if pretrained else None
    model = models.efficientnet_b0(weights=weights)
    
    # Replace classification head
    in_features = model.classifier[1].in_features
    model.classifier = nn.Sequential(
        nn.Dropout(p=0.3, inplace=True),
        nn.Linear(in_features, num_classes)
    )
    return model

def calculate_metrics(y_true, y_pred, num_classes=2):
    """
    Computes Accuracy, Precision, Recall, F1-Score, and Confusion Matrix.
    Class 0: NORMAL, Class 1: PNEUMONIA
    """
    y_true = np.array(y_true)
    y_pred = np.array(y_pred)
    
    total = len(y_true)
    accuracy = float((y_true == y_pred).sum() / max(1, total))
    
    # Confusion Matrix: [[TN, FP], [FN, TP]]
    tn = int(((y_true == 0) & (y_pred == 0)).sum())
    fp = int(((y_true == 0) & (y_pred == 1)).sum())
    fn = int(((y_true == 1) & (y_pred == 0)).sum())
    tp = int(((y_true == 1) & (y_pred == 1)).sum())
    
    # Precision, Recall, F1 for Pneumonia (class 1)
    precision_1 = float(tp / (tp + fp)) if (tp + fp) > 0 else 0.0
    recall_1 = float(tp / (tp + fn)) if (tp + fn) > 0 else 0.0
    f1_1 = float(2 * precision_1 * recall_1 / (precision_1 + recall_1)) if (precision_1 + recall_1) > 0 else 0.0
    
    # Precision, Recall, F1 for Normal (class 0)
    precision_0 = float(tn / (tn + fn)) if (tn + fn) > 0 else 0.0
    recall_0 = float(tn / (tn + fp)) if (tn + fp) > 0 else 0.0
    f1_0 = float(2 * precision_0 * recall_0 / (precision_0 + recall_0)) if (precision_0 + recall_0) > 0 else 0.0
    
    # Macro F1
    macro_f1 = float((f1_0 + f1_1) / 2.0)
    
    return {
        "accuracy": round(accuracy, 4),
        "precision_pneumonia": round(precision_1, 4),
        "recall_pneumonia": round(recall_1, 4),
        "f1_pneumonia": round(f1_1, 4),
        "precision_normal": round(precision_0, 4),
        "recall_normal": round(recall_0, 4),
        "f1_normal": round(f1_0, 4),
        "macro_f1": round(macro_f1, 4),
        "confusion_matrix": {
            "true_normal": tn,
            "false_positive": fp,
            "false_negative": fn,
            "true_positive": tp
        }
    }

import numpy as np

def evaluate(model: nn.Module, loader: DataLoader, criterion: nn.Module, device: torch.device):
    model.eval()
    total_loss = 0.0
    all_preds = []
    all_targets = []
    
    with torch.no_grad():
        for images, targets in loader:
            images, targets = images.to(device), targets.to(device)
            outputs = model(images)
            loss = criterion(outputs, targets)
            total_loss += loss.item() * images.size(0)
            
            preds = torch.argmax(outputs, dim=1)
            all_preds.extend(preds.cpu().numpy())
            all_targets.extend(targets.cpu().numpy())
            
    avg_loss = total_loss / max(1, len(loader.dataset))
    metrics = calculate_metrics(all_targets, all_preds)
    metrics["loss"] = round(avg_loss, 4)
    return metrics

def train(
    data_dir: str = "data/chest_xray",
    output_dir: str = "models",
    epochs: int = 5,
    batch_size: int = 32,
    lr: float = 5e-4,
    device_name: str = None
):
    start_time = time.time()
    data_path = Path(data_dir)
    out_path = Path(output_dir)
    out_path.mkdir(parents=True, exist_ok=True)
    
    # Select Device
    if device_name:
        device = torch.device(device_name)
    else:
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"=== [TRAINING] Device: {device} | Architecture: EfficientNet-B0 ===")
    
    train_dir = data_path / "train"
    val_dir = data_path / "val"
    test_dir = data_path / "test"
    
    train_tf, eval_tf = get_transforms(img_size=224)
    
    print(f"Loading datasets from {data_path.resolve()}...")
    train_dataset = datasets.ImageFolder(str(train_dir), transform=train_tf)
    val_dataset = datasets.ImageFolder(str(val_dir), transform=eval_tf)
    test_dataset = datasets.ImageFolder(str(test_dir), transform=eval_tf)
    
    class_names = train_dataset.classes  # ['NORMAL', 'PNEUMONIA']
    class_to_idx = train_dataset.class_to_idx  # {'NORMAL': 0, 'PNEUMONIA': 1}
    idx_to_class = {str(v): k for k, v in class_to_idx.items()}
    print(f"Class mapping: {class_to_idx}")
    
    # Class weights for handling imbalance in training set
    targets = [s[1] for s in train_dataset.samples]
    class_counts = [targets.count(i) for i in range(len(class_names))]
    total_samples = len(targets)
    # Inverse frequency weights
    weights = [total_samples / (len(class_names) * count) for count in class_counts]
    class_weights_tensor = torch.tensor(weights, dtype=torch.float).to(device)
    print(f"Class sample counts (train): {dict(zip(class_names, class_counts))}")
    print(f"Computed loss class weights: {weights}")
    
    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True, num_workers=0, pin_memory=False)
    val_loader = DataLoader(val_dataset, batch_size=batch_size, shuffle=False, num_workers=0)
    test_loader = DataLoader(test_dataset, batch_size=batch_size, shuffle=False, num_workers=0)
    
    # Build Model
    model = build_model(num_classes=len(class_names), pretrained=True).to(device)
    criterion = nn.CrossEntropyLoss(weight=class_weights_tensor)
    optimizer = torch.optim.AdamW(model.parameters(), lr=lr, weight_decay=1e-4)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs)
    
    best_val_f1 = 0.0
    best_weights_path = out_path / "pneumonia_model.pth"
    config_path = out_path / "xray_model_config.json"
    
    print("\nStarting model training...")
    for epoch in range(1, epochs + 1):
        epoch_start = time.time()
        model.train()
        running_loss = 0.0
        correct = 0
        total = 0
        
        for batch_idx, (images, labels) in enumerate(train_loader, 1):
            images, labels = images.to(device), labels.to(device)
            optimizer.zero_grad()
            outputs = model(images)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()
            
            running_loss += loss.item() * images.size(0)
            preds = torch.argmax(outputs, dim=1)
            correct += (preds == labels).sum().item()
            total += labels.size(0)
            
            if batch_idx % 40 == 0 or batch_idx == len(train_loader):
                print(f"  Epoch [{epoch}/{epochs}] Batch [{batch_idx}/{len(train_loader)}] Loss: {loss.item():.4f}")
                
        scheduler.step()
        train_loss = running_loss / total
        train_acc = correct / total
        
        val_metrics = evaluate(model, val_loader, criterion, device)
        epoch_duration = time.time() - epoch_start
        
        print(f"--> Epoch {epoch}/{epochs} ({epoch_duration:.1f}s) | Train Loss: {train_loss:.4f} Acc: {train_acc:.4f} | Val Loss: {val_metrics['loss']:.4f} Acc: {val_metrics['accuracy']:.4f} F1: {val_metrics['macro_f1']:.4f}")
        
        # Save best model checkpoint
        if val_metrics["macro_f1"] >= best_val_f1 or epoch == 1:
            best_val_f1 = val_metrics["macro_f1"]
            torch.save(model.state_dict(), str(best_weights_path))
            print(f"    [*] Saved best model checkpoint to {best_weights_path}")
            
    # Load best weights for final evaluation on test set
    print("\n--- Running Final Evaluation on Test Set ---")
    model.load_state_dict(torch.load(str(best_weights_path), map_location=device))
    test_metrics = evaluate(model, test_loader, criterion, device)
    
    print("\n" + "=" * 55)
    print("FINAL TEST SET PERFORMANCE METRICS")
    print("=" * 55)
    print(f"Test Accuracy        : {test_metrics['accuracy'] * 100:.2f}%")
    print(f"Pneumonia Precision  : {test_metrics['precision_pneumonia'] * 100:.2f}%")
    print(f"Pneumonia Recall     : {test_metrics['recall_pneumonia'] * 100:.2f}%")
    print(f"Pneumonia F1-Score   : {test_metrics['f1_pneumonia'] * 100:.2f}%")
    print(f"Normal Precision     : {test_metrics['precision_normal'] * 100:.2f}%")
    print(f"Normal Recall        : {test_metrics['recall_normal'] * 100:.2f}%")
    print(f"Normal F1-Score      : {test_metrics['f1_normal'] * 100:.2f}%")
    print(f"Macro F1-Score       : {test_metrics['macro_f1'] * 100:.2f}%")
    print(f"Confusion Matrix     : {test_metrics['confusion_matrix']}")
    print(f"Total Elapsed Time   : {time.time() - start_time:.1f}s")
    print("=" * 55)
    
    # Save Model Config / Metadata
    config_data = {
        "model_architecture": "efficientnet_b0",
        "num_classes": len(class_names),
        "class_to_idx": class_to_idx,
        "idx_to_class": idx_to_class,
        "image_size": [224, 224],
        "normalization": {
            "mean": [0.485, 0.456, 0.406],
            "std": [0.229, 0.224, 0.225]
        },
        "model_version": "1.0.0",
        "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "metrics": {
            "test_accuracy": test_metrics["accuracy"],
            "test_precision_pneumonia": test_metrics["precision_pneumonia"],
            "test_recall_pneumonia": test_metrics["recall_pneumonia"],
            "test_f1_pneumonia": test_metrics["f1_pneumonia"],
            "test_macro_f1": test_metrics["macro_f1"],
            "confusion_matrix": test_metrics["confusion_matrix"]
        }
    }
    
    with open(config_path, "w", encoding="utf-8") as f:
        json.dump(config_data, f, indent=4)
        
    print(f"[SUCCESS] Model saved: {best_weights_path}")
    print(f"[SUCCESS] Config saved: {config_path}")
    return config_data

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train Chest X-Ray Pneumonia Classifier")
    parser.add_argument("--data-dir", type=str, default="data/chest_xray", help="Dataset directory")
    parser.add_argument("--output-dir", type=str, default="models", help="Model weights and config output directory")
    parser.add_argument("--epochs", type=int, default=4, help="Number of training epochs")
    parser.add_argument("--batch-size", type=int, default=32, help="Batch size for training")
    parser.add_argument("--lr", type=float, default=5e-4, help="Learning rate")
    args = parser.parse_args()
    
    train(
        data_dir=args.data_dir,
        output_dir=args.output_dir,
        epochs=args.epochs,
        batch_size=args.batch_size,
        lr=args.lr
    )
