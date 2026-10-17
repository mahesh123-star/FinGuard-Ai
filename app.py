"""
FinGuard AI - Flask Backend
Integrated with new CBAM & DnCNN Denoising CNN Models:
  - Currency: finguard_currency_cbam_denoise.keras
  - Document: finguard_document_denoising_cbam_cnn.keras
  - QR:       finguard_qr_denoising_cbam_cnn.keras
"""

import os
import io
import time
import numpy as np
from PIL import Image
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import tensorflow as tf
from tensorflow.keras import layers
from tensorflow.keras.models import load_model

app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app)

app.config['MAX_CONTENT_LENGTH'] = 10 * 1024 * 1024
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp', 'bmp'}

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PARENT_DIR = os.path.dirname(BASE_DIR)

# ─── Custom Layer Definitions for Denoising & CBAM ──────────────────────────

@tf.keras.utils.register_keras_serializable()
class DnCNNDenoiser(layers.Layer):
    def __init__(self, features=32, depth=3, **kwargs):
        super().__init__(**kwargs)
        self.features = features
        self.depth = depth
        self.conv_in = layers.Conv2D(features, 3, padding='same', name='conv_in')
        self.relu_in = layers.ReLU(name='relu_in')
        self.hidden_layers = []
        for _ in range(depth - 2):
            self.hidden_layers.append(layers.Conv2D(features, 3, padding='same'))
            self.hidden_layers.append(layers.BatchNormalization())
            self.hidden_layers.append(layers.ReLU())
        self.conv_out = layers.Conv2D(3, 3, padding='same', name='conv_out')

    def call(self, inputs):
        x = self.conv_in(inputs)
        x = self.relu_in(x)
        for layer in self.hidden_layers:
            x = layer(x)
        residual = self.conv_out(x)
        denoised = inputs - residual
        return tf.clip_by_value(denoised, 0.0, 1.0)

    def get_config(self):
        config = super().get_config()
        config.update({'features': self.features, 'depth': self.depth})
        return config


def get_qr_custom_objects():
    @tf.keras.utils.register_keras_serializable()
    class ChannelAttention(layers.Layer):
        def __init__(self, ratio=8, **kwargs):
            super().__init__(**kwargs)
            self.ratio = ratio

        def build(self, input_shape):
            channels = input_shape[-1]
            hidden = max(channels // self.ratio, 1)
            self.shared_dense1 = layers.Dense(hidden, activation='relu', name='shared_dense1')
            self.shared_dense2 = layers.Dense(channels, name='shared_dense2')
            super().build(input_shape)

        def call(self, inputs):
            avg_pool = tf.reduce_mean(inputs, axis=[1, 2], keepdims=False)
            max_pool = tf.reduce_max(inputs, axis=[1, 2], keepdims=False)
            avg_out = self.shared_dense2(self.shared_dense1(avg_pool))
            max_out = self.shared_dense2(self.shared_dense1(max_pool))
            attention = tf.nn.sigmoid(avg_out + max_out)
            attention = tf.reshape(attention, [-1, 1, 1, tf.shape(attention)[-1]])
            return inputs * attention

        def get_config(self):
            config = super().get_config()
            config.update({'ratio': self.ratio})
            return config

    @tf.keras.utils.register_keras_serializable()
    class SpatialAttention(layers.Layer):
        def __init__(self, kernel_size=7, **kwargs):
            super().__init__(**kwargs)
            self.kernel_size = kernel_size
            self.conv = layers.Conv2D(1, kernel_size, padding='same', activation='sigmoid', use_bias=True, name='conv')

        def call(self, inputs):
            avg_pool = tf.reduce_mean(inputs, axis=-1, keepdims=True)
            max_pool = tf.reduce_max(inputs, axis=-1, keepdims=True)
            combined = tf.concat([avg_pool, max_pool], axis=-1)
            attention = self.conv(combined)
            return inputs * attention

        def get_config(self):
            config = super().get_config()
            config.update({'kernel_size': self.kernel_size})
            return config

    @tf.keras.utils.register_keras_serializable()
    class CBAM(layers.Layer):
        def __init__(self, ratio=8, kernel_size=7, **kwargs):
            super().__init__(**kwargs)
            self.ratio = ratio
            self.kernel_size = kernel_size
            self.channel_attention = ChannelAttention(ratio=ratio, name='channel_attention')
            self.spatial_attention = SpatialAttention(kernel_size=kernel_size, name='spatial_attention')

        def call(self, inputs):
            x = self.channel_attention(inputs)
            return self.spatial_attention(x)

        def get_config(self):
            config = super().get_config()
            config.update({'ratio': self.ratio, 'kernel_size': self.kernel_size})
            return config

    return {
        'DnCNNDenoiser': DnCNNDenoiser,
        'ChannelAttention': ChannelAttention,
        'SpatialAttention': SpatialAttention,
        'CBAM': CBAM
    }


def get_doc_currency_custom_objects():
    @tf.keras.utils.register_keras_serializable()
    class ChannelAttention(layers.Layer):
        def __init__(self, reduction_ratio=8, **kwargs):
            super().__init__(**kwargs)
            self.reduction_ratio = reduction_ratio

        def build(self, input_shape):
            channels = int(input_shape[-1])
            hidden_units = max(channels // self.reduction_ratio, 1)
            self.fc1 = layers.Dense(hidden_units, activation='relu', use_bias=True, name='fc1')
            self.fc2 = layers.Dense(channels, activation=None, use_bias=True, name='fc2')
            super().build(input_shape)

        def call(self, inputs):
            avg_pool = tf.reduce_mean(inputs, axis=[1, 2], keepdims=True)
            max_pool = tf.reduce_max(inputs, axis=[1, 2], keepdims=True)
            avg_attention = self.fc2(self.fc1(avg_pool))
            max_attention = self.fc2(self.fc1(max_pool))
            attention = tf.nn.sigmoid(avg_attention + max_attention)
            return inputs * attention

        def get_config(self):
            config = super().get_config()
            config.update({'reduction_ratio': self.reduction_ratio})
            return config

    @tf.keras.utils.register_keras_serializable()
    class SpatialAttention(layers.Layer):
        def __init__(self, kernel_size=7, **kwargs):
            super().__init__(**kwargs)
            self.kernel_size = kernel_size
            self.conv = layers.Conv2D(1, kernel_size, padding='same', activation='sigmoid', use_bias=True, name='conv')

        def call(self, inputs):
            avg_pool = tf.reduce_mean(inputs, axis=-1, keepdims=True)
            max_pool = tf.reduce_max(inputs, axis=-1, keepdims=True)
            combined = tf.concat([avg_pool, max_pool], axis=-1)
            attention = self.conv(combined)
            return inputs * attention

        def get_config(self):
            config = super().get_config()
            config.update({'kernel_size': self.kernel_size})
            return config

    @tf.keras.utils.register_keras_serializable()
    class CBAM(layers.Layer):
        def __init__(self, reduction_ratio=8, spatial_kernel_size=7, **kwargs):
            super().__init__(**kwargs)
            self.reduction_ratio = reduction_ratio
            self.spatial_kernel_size = spatial_kernel_size
            self.channel_attention = ChannelAttention(reduction_ratio=reduction_ratio, name='channel_attention')
            self.spatial_attention = SpatialAttention(kernel_size=spatial_kernel_size, name='spatial_attention')

        def call(self, inputs):
            x = self.channel_attention(inputs)
            return self.spatial_attention(x)

        def get_config(self):
            config = super().get_config()
            config.update({'reduction_ratio': self.reduction_ratio, 'spatial_kernel_size': self.spatial_kernel_size})
            return config

    return {
        'DnCNNDenoiser': DnCNNDenoiser,
        'ChannelAttention': ChannelAttention,
        'SpatialAttention': SpatialAttention,
        'CBAM': CBAM
    }


# ─── Dual Model Registries ──────────────────────────────────────────────────
# 1. Custom CNN / CBAM Models (Existing / Default)
models_cnn = {}
# 2. EfficientNet-B0 Models (Teammate's Transfer Learning Models)
models_eff = {}

# Backward-compatible alias for existing code
models = models_cnn

MODEL_PATHS_CNN = {
    "currency": [
        os.path.join(PARENT_DIR, "finguard_currency_cbam_denoise.keras"),
        os.path.join(BASE_DIR, "finguard_currency_cbam_denoise.keras"),
        os.path.join(BASE_DIR, "finguard_currency_custom_cnn.keras")
    ],
    "document": [
        os.path.join(PARENT_DIR, "finguard_document_denoising_cbam_cnn.keras"),
        os.path.join(BASE_DIR, "finguard_document_denoising_cbam_cnn.keras"),
        os.path.join(BASE_DIR, "finguard_document_custom_cnn.keras")
    ],
    "qr": [
        os.path.join(PARENT_DIR, "finguard_qr_denoising_cbam_cnn.keras"),
        os.path.join(BASE_DIR, "finguard_qr_denoising_cbam_cnn.keras"),
        os.path.join(BASE_DIR, "finguard_qr_custom_cnn.keras")
    ]
}

MODEL_PATHS_EFF = {
    "currency": [
        os.path.join(PARENT_DIR, "efficientnet_b0_currency_best.keras"),
        os.path.join(BASE_DIR, "efficientnet_b0_currency_best.keras"),
        os.path.join(PARENT_DIR, "finguard_currency_efficientnetb0.keras"),
        os.path.join(BASE_DIR, "finguard_currency_efficientnetb0.keras")
    ],
    "document": [
        os.path.join(PARENT_DIR, "efficientnet_b0_document_best.keras"),
        os.path.join(BASE_DIR, "efficientnet_b0_document_best.keras"),
        os.path.join(PARENT_DIR, "finguard_document_efficientnetb0.keras"),
        os.path.join(BASE_DIR, "finguard_document_efficientnetb0.keras")
    ],
    "qr": [
        os.path.join(PARENT_DIR, "efficientnet_b0_qr_best.keras"),
        os.path.join(BASE_DIR, "efficientnet_b0_qr_best.keras"),
        os.path.join(PARENT_DIR, "finguard_qr_efficientnetb0.keras"),
        os.path.join(BASE_DIR, "finguard_qr_efficientnetb0.keras")
    ]
}

def resolve_model_path(candidates):
    for candidate in candidates:
        if os.path.exists(candidate):
            return candidate
    return None

def init_models():
    # 1. Load Custom CNN / CBAM Models
    for key in ["qr", "document", "currency"]:
        path = resolve_model_path(MODEL_PATHS_CNN[key])
        if not path:
            print(f"[CNN MODEL MISSING] Could not find CNN model file for {key}")
            continue

        try:
            if key == "qr":
                custom_objs = get_qr_custom_objects()
            else:
                custom_objs = get_doc_currency_custom_objects()

            models_cnn[key] = load_model(path, compile=False, custom_objects=custom_objs)
            print(f"[CNN MODEL LOADED] {key.upper()} (CBAM+Denoising) -> {path}")
        except Exception as e:
            print(f"[CNN MODEL ERROR] Failed loading {key} from {path}: {e}")

    # 2. Load EfficientNet-B0 Models
    for key in ["qr", "document", "currency"]:
        path = resolve_model_path(MODEL_PATHS_EFF[key])
        if not path:
            print(f"[EFF MODEL MISSING] Could not find EfficientNet-B0 model file for {key}")
            continue

        try:
            models_eff[key] = load_model(path, compile=False)
            print(f"[EFF MODEL LOADED] {key.upper()} (EfficientNet-B0) -> {path}")
        except Exception as e:
            print(f"[EFF MODEL ERROR] Failed loading EfficientNet-B0 {key} from {path}: {e}")

init_models()

# ─── Verified Class Mappings ────────────────────────────────────────────────
# Class 0 = Genuine (Real / Authentic)
# Class 1 = Fraudulent (Fake / Tampered_Forged / Fraudulent)
CLASS_LABELS = {
    "currency": {0: "Real",            1: "Fake"},
    "document": {0: "Authentic",       1: "Tampered_Forged"},
    "qr":       {0: "Authentic",       1: "Fraudulent"}
}

# ─── Image Quality Validation ───────────────────────────────────────────────
def validate_image_quality(file_bytes):
    try:
        img = Image.open(io.BytesIO(file_bytes))
        width, height = img.size

        if width < 50 or height < 50:
            return False, "Resolution too low for reliable analysis."

        img_rgb = img.convert("RGB")
        arr = np.array(img_rgb, dtype=np.float32)

        mean_brightness = float(np.mean(arr))
        if mean_brightness < 10.0:
            return False, "Image too dark for reliable analysis."
        if mean_brightness > 245.0:
            return False, "Image overexposed/too bright for reliable analysis."

        return True, None
    except Exception as e:
        return False, f"Corrupted or invalid image file: {e}"

# ─── Image Preprocessing Pipelines ──────────────────────────────────────────
def preprocess_image_cnn(file_bytes):
    """Preprocessing for Custom CNN/CBAM models: RGB, 224x224, normalized to [0, 1]."""
    img = Image.open(io.BytesIO(file_bytes)).convert("RGB")
    img = img.resize((224, 224))
    arr = np.array(img, dtype=np.float32) / 255.0
    return np.expand_dims(arr, axis=0)

def preprocess_image_eff(file_bytes):
    """Preprocessing for EfficientNet-B0: RGB, 224x224, float32 [0, 255] (built-in rescaling)."""
    img = Image.open(io.BytesIO(file_bytes)).convert("RGB")
    img = img.resize((224, 224))
    arr = np.array(img, dtype=np.float32)
    return np.expand_dims(arr, axis=0)

# Backward-compatible default
preprocess_image = preprocess_image_cnn

def evaluate_prediction(module_key, p):
    """Evaluates probability into label, status code, and confidence."""
    if p >= 0.60:
        pred_label = CLASS_LABELS[module_key][1]
        status_code = "fraud"
        confidence = float(p * 100.0)
    elif p <= 0.40:
        pred_label = CLASS_LABELS[module_key][0]
        status_code = "genuine"
        confidence = float((1.0 - p) * 100.0)
    else:
        pred_label = "Uncertain"
        status_code = "fraud"
        confidence = float(max(p, 1.0 - p) * 100.0)
    return pred_label, status_code, round(confidence, 2)

# ─── Standard Single-Model Inference Route (Default: Custom CNN) ─────────────
@app.route('/predict/<module_key>', methods=['POST'])
def predict(module_key):
    if module_key not in CLASS_LABELS:
        return jsonify({"success": False, "error": f"Invalid module: {module_key}"}), 400

    if 'file' not in request.files:
        return jsonify({"success": False, "error": "No file uploaded"}), 400

    file = request.files['file']
    if not file or file.filename == '':
        return jsonify({"success": False, "error": "Empty file selection"}), 400

    ext = file.filename.rsplit('.', 1)[-1].lower() if '.' in file.filename else ''
    if ext and ext not in ALLOWED_EXTENSIONS:
        return jsonify({"success": False, "error": f"Unsupported format '.{ext}'"}), 400

    model_choice = request.form.get('model', '').lower().strip() or request.args.get('model', 'cnn').lower().strip()
    is_efficientnet = model_choice in ['efficientnet', 'eff', 'efficientnet-b0', 'efficientnet_b0']

    target_registry = models_eff if is_efficientnet else models_cnn
    model_label = "EfficientNet-B0" if is_efficientnet else "Custom CNN + CBAM"

    if module_key not in target_registry or target_registry[module_key] is None:
        return jsonify({"success": False, "error": f"{model_label} model for '{module_key}' is not loaded."}), 500

    try:
        file_bytes = file.read()
        if len(file_bytes) == 0:
            return jsonify({"success": False, "error": "Uploaded file is 0 bytes"}), 400

        is_valid, quality_error = validate_image_quality(file_bytes)
        if not is_valid:
            return jsonify({"success": False, "error": f"Image quality insufficient: {quality_error}"}), 400

        img_tensor = preprocess_image_eff(file_bytes) if is_efficientnet else preprocess_image_cnn(file_bytes)

        raw_output = target_registry[module_key].predict(img_tensor, verbose=0)
        p = float(raw_output.ravel()[0])

        pred_label, status_code, confidence = evaluate_prediction(module_key, p)

        print(f"\n[{module_key.upper()} INFERENCE ({model_label})]")
        print(f"  Filename        : {file.filename}")
        print(f"  Raw Probability : {p:.6f}")
        print(f"  Prediction      : {pred_label}")
        print(f"  Confidence      : {confidence:.2f}%")

        return jsonify({
            "success": True,
            "module": module_key,
            "model_used": model_label,
            "prediction": pred_label,
            "confidence": confidence,
            "status": status_code,
            "raw_probability": round(p, 6)
        }), 200

    except Exception as e:
        print(f"[INFERENCE EXCEPTION] {e}")
        return jsonify({"success": False, "error": "Unable to process image"}), 500

# ─── Dual-Model Comparison Route (CNN vs EfficientNet-B0) ───────────────────
@app.route('/api/compare-models', methods=['POST'])
def compare_models():
    category = request.form.get('category', '').lower().strip()
    if not category:
        category = request.args.get('category', 'currency').lower().strip()

    if category not in CLASS_LABELS:
        return jsonify({"success": False, "error": f"Invalid category: '{category}'"}), 400

    if 'file' not in request.files:
        return jsonify({"success": False, "error": "No file uploaded"}), 400

    file = request.files['file']
    if not file or file.filename == '':
        return jsonify({"success": False, "error": "Empty file selection"}), 400

    ext = file.filename.rsplit('.', 1)[-1].lower() if '.' in file.filename else ''
    if ext and ext not in ALLOWED_EXTENSIONS:
        return jsonify({"success": False, "error": f"Unsupported format '.{ext}'"}), 400

    try:
        file_bytes = file.read()
        if len(file_bytes) == 0:
            return jsonify({"success": False, "error": "Uploaded file is 0 bytes"}), 400

        is_valid, quality_error = validate_image_quality(file_bytes)
        if not is_valid:
            return jsonify({"success": False, "error": f"Image quality insufficient: {quality_error}"}), 400

        # 1. Custom CNN + CBAM Inference
        cnn_result = {
            "name": "Custom CNN + CBAM",
            "architecture": "Custom CNN with CBAM & DnCNN Denoising",
            "available": False
        }
        if category in models_cnn and models_cnn[category] is not None:
            tensor_cnn = preprocess_image_cnn(file_bytes)
            t0 = time.perf_counter()
            raw_out_cnn = models_cnn[category].predict(tensor_cnn, verbose=0)
            t1 = time.perf_counter()
            p_cnn = float(raw_out_cnn.ravel()[0])
            pred_cnn, status_cnn, conf_cnn = evaluate_prediction(category, p_cnn)
            cnn_result.update({
                "available": True,
                "prediction": pred_cnn,
                "confidence": conf_cnn,
                "raw_probability": round(p_cnn, 6),
                "status": status_cnn,
                "inference_time_ms": round((t1 - t0) * 1000.0, 2),
                "input_shape": [1, 224, 224, 3],
                "normalization": "Scale to [0, 1] (/255.0)"
            })
        else:
            cnn_result["error"] = "Custom CNN model not loaded"

        # 2. EfficientNet-B0 Inference
        eff_result = {
            "name": "EfficientNet-B0",
            "architecture": "Pre-trained EfficientNet-B0 (Transfer Learning)",
            "available": False
        }
        if category in models_eff and models_eff[category] is not None:
            tensor_eff = preprocess_image_eff(file_bytes)
            t0 = time.perf_counter()
            raw_out_eff = models_eff[category].predict(tensor_eff, verbose=0)
            t1 = time.perf_counter()
            p_eff = float(raw_out_eff.ravel()[0])
            pred_eff, status_eff, conf_eff = evaluate_prediction(category, p_eff)
            eff_result.update({
                "available": True,
                "prediction": pred_eff,
                "confidence": conf_eff,
                "raw_probability": round(p_eff, 6),
                "status": status_eff,
                "inference_time_ms": round((t1 - t0) * 1000.0, 2),
                "input_shape": [1, 224, 224, 3],
                "normalization": "Internal Rescaling (Raw [0, 255])"
            })
        else:
            eff_result["error"] = "EfficientNet-B0 model not loaded"

        # 3. Consensus & Agreement Analysis
        both_available = cnn_result["available"] and eff_result["available"]
        agreement = False
        agreement_text = ""
        faster_model = ""
        speed_summary = ""

        if both_available:
            agreement = (cnn_result["prediction"] == eff_result["prediction"])
            if agreement:
                agreement_text = f"Consensus: Both architectures agree on '{cnn_result['prediction']}'."
            else:
                agreement_text = f"Architectural Divergence: Custom CNN predicted '{cnn_result['prediction']}', whereas EfficientNet-B0 predicted '{eff_result['prediction']}'."

            t_cnn = cnn_result["inference_time_ms"]
            t_eff = eff_result["inference_time_ms"]
            diff = abs(t_eff - t_cnn)
            if t_cnn < t_eff:
                faster_model = "Custom CNN + CBAM"
                speed_summary = f"Custom CNN was {diff:.1f}ms faster than EfficientNet-B0"
            else:
                faster_model = "EfficientNet-B0"
                speed_summary = f"EfficientNet-B0 was {diff:.1f}ms faster than Custom CNN"
        elif cnn_result["available"]:
            agreement_text = "Only Custom CNN model was available for evaluation"
        elif eff_result["available"]:
            agreement_text = "Only EfficientNet-B0 model was available for evaluation"
        else:
            agreement_text = "Neither architecture model was available for evaluation"

        category_titles = {
            "currency": "Counterfeit Currency Detection",
            "document": "Financial Document Authentication",
            "qr": "QR Transaction Authenticity"
        }

        print(f"\n[MODEL COMPARISON BENCHMARK - {category.upper()}]")
        print(f"  File: {file.filename}")
        if cnn_result["available"]:
            print(f"  CNN Output   : {cnn_result['prediction']} ({cnn_result['confidence']}%, p={cnn_result['raw_probability']}, {cnn_result['inference_time_ms']}ms)")
        if eff_result["available"]:
            print(f"  EffNet Output: {eff_result['prediction']} ({eff_result['confidence']}%, p={eff_result['raw_probability']}, {eff_result['inference_time_ms']}ms)")
        print(f"  Agreement    : {agreement_text}")

        return jsonify({
            "success": True,
            "category": category,
            "category_title": category_titles.get(category, category.title()),
            "filename": file.filename,
            "both_available": both_available,
            "agreement": agreement,
            "agreement_text": agreement_text,
            "faster_model": faster_model,
            "speed_summary": speed_summary,
            "cnn": cnn_result,
            "efficientnet": eff_result
        }), 200

    except Exception as e:
        print(f"[COMPARE EXCEPTION] {e}")
        return jsonify({"success": False, "error": f"Comparison failed: {str(e)}"}), 500

@app.route('/')
def serve_ui():
    return send_from_directory('.', 'index.html')

@app.errorhandler(413)
def file_too_large(e):
    return jsonify({"success": False, "error": "File size exceeds 10MB limit"}), 413

if __name__ == '__main__':
    print("[SERVER] Starting FinGuard AI Flask Backend with Dual Models (CNN + EfficientNet-B0) on http://localhost:5000")
    app.run(host='0.0.0.0', port=5000, debug=False)

