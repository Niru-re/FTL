"""
X-Ray Inference Service for Pneumonia Screening.
Loads the trained EfficientNet-B0 PyTorch model once on application startup
and provides device-agnostic, thread-safe inference on uploaded chest radiographs.
"""

import os
import io
import json
import logging
from pathlib import Path
from typing import Dict, Any, Optional, Union
from PIL import Image

import torch
import torch.nn as nn
from torchvision import models, transforms

logger = logging.getLogger("healthnet.xray_service")

class XRayPredictor:
    """
    Singleton AI predictor for Chest X-Ray Pneumonia screening.
    """
    _instance: Optional["XRayPredictor"] = None

    def __init__(self):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model: Optional[nn.Module] = None
        self.config: Dict[str, Any] = {}
        self.transform: Optional[transforms.Compose] = None
        self.is_loaded = False
        
        # Resolve default paths relative to root or environment
        self._init_paths()

    @classmethod
    def get_instance(cls) -> "XRayPredictor":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def _init_paths(self):
        # Allow environment overrides or relative search
        env_model_path = os.getenv("XRAY_MODEL_PATH")
        env_config_path = os.getenv("XRAY_CONFIG_PATH")

        possible_model_paths = [
            Path(env_model_path) if env_model_path else None,
            Path("models/pneumonia_model.pth"),
            Path("../models/pneumonia_model.pth"),
            Path("../../models/pneumonia_model.pth"),
            Path(__file__).resolve().parents[3] / "models" / "pneumonia_model.pth"
        ]

        possible_config_paths = [
            Path(env_config_path) if env_config_path else None,
            Path("models/xray_model_config.json"),
            Path("../models/xray_model_config.json"),
            Path("../../models/xray_model_config.json"),
            Path(__file__).resolve().parents[3] / "models" / "xray_model_config.json"
        ]

        self.model_path = next((p for p in possible_model_paths if p and p.exists()), None)
        self.config_path = next((p for p in possible_config_paths if p and p.exists()), None)

    def load_model(self) -> bool:
        """
        Loads model architecture and weights into memory once.
        """
        self._init_paths()
        if not self.model_path or not self.model_path.exists():
            logger.warning(f"X-Ray model weights not found. Searched paths. Service starting in offline mode.")
            return False

        try:
            logger.info(f"Loading X-Ray model from {self.model_path} onto {self.device}...")
            
            # Load config metadata if available
            if self.config_path and self.config_path.exists():
                with open(self.config_path, "r", encoding="utf-8") as f:
                    self.config = json.load(f)
            else:
                self.config = {
                    "model_architecture": "efficientnet_b0",
                    "num_classes": 2,
                    "image_size": [224, 224],
                    "idx_to_class": {"0": "NORMAL", "1": "PNEUMONIA"}
                }

            # Build EfficientNet-B0 architecture
            model = models.efficientnet_b0(weights=None)
            in_features = model.classifier[1].in_features
            model.classifier = nn.Sequential(
                nn.Dropout(p=0.3, inplace=True),
                nn.Linear(in_features, self.config.get("num_classes", 2))
            )

            # Load weights
            state_dict = torch.load(str(self.model_path), map_location=self.device)
            model.load_state_dict(state_dict)
            model.to(self.device)
            model.eval()
            self.model = model

            # Build inference transform
            img_size = self.config.get("image_size", [224, 224])[0]
            mean = self.config.get("normalization", {}).get("mean", [0.485, 0.456, 0.406])
            std = self.config.get("normalization", {}).get("std", [0.229, 0.224, 0.225])

            self.transform = transforms.Compose([
                transforms.Resize((img_size, img_size)),
                transforms.ToTensor(),
                transforms.Normalize(mean=mean, std=std)
            ])

            self.is_loaded = True
            logger.info("X-Ray Pneumonia classification model loaded successfully into memory.")
            return True

        except Exception as e:
            logger.error(f"Failed to load X-Ray model: {e}", exc_info=True)
            self.is_loaded = False
            return False

    def predict(self, image_input: Union[bytes, Image.Image]) -> Dict[str, Any]:
        """
        Runs model inference on an image input (bytes or PIL Image).
        """
        if not self.is_loaded or self.model is None or self.transform is None:
            # Try lazy load
            if not self.load_model():
                raise RuntimeError("X-Ray AI model is not loaded. Ensure models/pneumonia_model.pth is available.")

        # Decode image
        try:
            if isinstance(image_input, bytes):
                pil_image = Image.open(io.BytesIO(image_input))
            else:
                pil_image = image_input

            # Ensure RGB format
            if pil_image.mode != "RGB":
                pil_image = pil_image.convert("RGB")
        except Exception as e:
            raise ValueError(f"Invalid or corrupted image format: {e}")

        # Preprocess
        try:
            tensor = self.transform(pil_image).unsqueeze(0).to(self.device)
        except Exception as e:
            raise RuntimeError(f"Image preprocessing failed: {e}")

        # Inference
        with torch.no_grad():
            outputs = self.model(tensor)
            probabilities = torch.softmax(outputs, dim=1)[0]
            
            prob_normal = float(probabilities[0].item())
            prob_pneumonia = float(probabilities[1].item())

        prediction = "PNEUMONIA" if prob_pneumonia >= prob_normal else "NORMAL"
        confidence = prob_pneumonia if prediction == "PNEUMONIA" else prob_normal

        return {
            "prediction": prediction,
            "confidence": round(confidence, 4),
            "normal_probability": round(prob_normal, 4),
            "pneumonia_probability": round(prob_pneumonia, 4),
            "model_version": self.config.get("model_version", "1.0.0"),
            "architecture": self.config.get("model_architecture", "efficientnet_b0"),
            "disclaimer": "AI-assisted screening result only. This result is not a medical diagnosis and should be reviewed by a qualified healthcare professional."
        }

# Global singleton instance
xray_service = XRayPredictor.get_instance()
