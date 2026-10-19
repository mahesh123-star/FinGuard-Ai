# FinGuard AI - Project Links & Submission Details

### Project Links:

- **a. URL of online server where application is hosted:**  
  [https://fin-guard-hvwy6k9x0-mahesh123-stars-projects.vercel.app/](https://fin-guard-hvwy6k9x0-mahesh123-stars-projects.vercel.app/)

- **b. GitHub URL:**  
  [https://github.com/mahesh123-star/FinGuard-Ai](https://github.com/mahesh123-star/FinGuard-Ai)

- **c. IEEE DataPort URL where the dataset is published:**  
  [https://ieee-dataport.org/documents/financial](https://ieee-dataport.org/documents/financial)

---

### Project Overview:
**FinGuard AI** is an intelligent, multi-domain financial security and document authentication platform engineered for real-time deployment at point-of-sale (POS) terminals and automated banking endpoints. The system unifies deep learning innovations—combining an input **Residual Denoising CNN (DnCNN)** frontend to filter scanner grain and print dither, **Convolutional Block Attention Modules (CBAM)** for localized tamper and watermark feature extraction, and a **Three-State Hysteresis Decision Guard** to virtually eliminate False Acceptance Rates (FAR down to 2.90%). Covering three vital attack vectors—Counterfeit Currency, Tampered Financial Invoices/Checks, and Fraudulent QR Payment Hijacks—FinGuard AI achieves **96.84% accuracy** with an ultra-light **4.8 MB** footprint and **18.4 ms** edge CPU inference latency.

---

# FinGuard AI: Intelligent Financial Security & Document Authentication Platform

[![Python](https://img.shields.io/badge/Python-3.10%2B-blue.svg?logo=python&logoColor=white)](https://www.python.org/)
[![TensorFlow](https://img.shields.io/badge/TensorFlow-2.15%2B-FF6F00.svg?logo=tensorflow&logoColor=white)](https://tensorflow.org/)
[![Flask](https://img.shields.io/badge/Flask-3.0%2B-000000.svg?logo=flask&logoColor=white)](https://flask.palletsprojects.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Status: Production-Ready](https://img.shields.io/badge/Deployment-Edge%20POS%20Ready-brightgreen.svg)](#)
[![Academic Course](https://img.shields.io/badge/NNDL-23CSE473-orange.svg)](#)

> **An end-to-end, multi-domain deep learning authentication system designed to detect counterfeit currency, spliced financial documents, and fraudulent QR payments in real time at point-of-sale (POS) and automated banking endpoints.**

---

## 📌 Table of Contents
- [Executive Overview](#-executive-overview)
- [System Architecture & DL Innovations](#-system-architecture--dl-innovations)
  - [1. Residual Denoising Frontend (DnCNN)](#1-residual-denoising-frontend-dncnndenoiser)
  - [2. Dual-Domain Attention (CBAM)](#2-dual-domain-attention-cbam)
  - [3. Three-State Decision Guard](#3-three-state-hysteresis-decision-guard)
  - [4. Dual Model Registry & Comparison](#4-dual-model-registry--model-comparison)
- [Supported Detection Modules](#-supported-detection-modules)
- [Empirical Benchmarks & Comparative Evaluation](#-empirical-benchmarks--comparative-evaluation)
- [Project Directory Structure](#-project-directory-structure)
- [Quickstart: How to Run the Project](#-quickstart-how-to-run-the-project)
  - [Prerequisites](#prerequisites)
  - [1. Clone Repository](#1-clone-repository)
  - [2. Create & Activate Environment](#2-create--activate-virtual-environment)
  - [3. Install Dependencies](#3-install-dependencies)
  - [4. Launch Backend Application](#4-launch-backend-application)
  - [5. Access Web Dashboard](#5-access-web-dashboard)
- [REST API Reference](#-rest-api-reference)
- [Academic Deliverables & Documentation](#-academic-deliverables--documentation)
- [Research Team & Authorship](#-research-team--authorship)
- [License](#-license)

---

## 📖 Executive Overview

Financial institutions, commercial retail points, and digital payment gateways face escalating threats from sophisticated document tampering, high-resolution banknote counterfeiting, and QR routing hijack attacks. Traditional computer vision and unconstrained deep neural networks often suffer from:
1. **Scanner Dither Vulnerability:** Confusing stochastic sensor noise or print dither with authentic microprinting.
2. **Sparse Tampering Blindness:** Missing localized 2% typography splices (e.g., altered invoice totals or check routing numbers) because global feature extractors are dominated by pristine background text.
3. **High Latency & Edge Footprint:** Heavy transfer-learning architectures (e.g., EfficientNet, ResNet) or adversarial GAN discriminators require heavy compute and introduce intolerable latency on edge microprocessors.

**FinGuard AI** solves these challenges by combining a custom 4-stage convolutional backbone with an input **Residual Denoising CNN (DnCNN)** and multi-stage **Convolutional Block Attention Modules (CBAM)**. The resulting edge-optimized model delivers **96.84% accuracy**, an ultra-low **2.90% False Acceptance Rate (FAR)**, and runs in **18.4 ms on CPU** (54.3 FPS) with only a **4.8 MB** footprint.

---

## 🧠 System Architecture & DL Innovations

```
[ Input Specimen: 224x224x3 RGB ]
                │
                ▼
┌───────────────────────────────────────────┐
│     1. Residual Denoising Stream (DnCNN)   │  --> Subtracts scanner dither & halftone noise:
│   x_clean = clip(x - R(x), 0.0, 1.0)      │      R(x) = x - x_clean
└───────────────────────────────────────────┘
                │
                ▼
┌───────────────────────────────────────────┐
│  2. Channel Attention Module (CAM)        │  --> Recalibrates multi-spectral feature channels:
│   Mc(F) = σ(W1(ReLU(W0(F_avg))) + ...)    │      Highlights watermarks & security threads
└───────────────────────────────────────────┘
                │
                ▼
┌───────────────────────────────────────────┐
│  3. Spatial Attention Module (SAM)        │  --> 7x7 conv across inter-channel pooling:
│   Ms(F') = σ(f^7x7([F'_avg; F'_max]))     │      Pinpoints localized 2% spliced characters
└───────────────────────────────────────────┘
                │
                ▼
┌───────────────────────────────────────────┐
│  4. Three-State Decision Guard            │  --> Enforces security hysteresis:
│   p ≤ 0.40 -> Authentic                   │      Eliminates marginal false acceptances
│   p ≥ 0.60 -> Forged / Tampered           │
│   0.40 < p < 0.60 -> Uncertain (Audit)    │
└───────────────────────────────────────────┘
```

### 1. Residual Denoising Frontend (`DnCNNDenoiser`)
Operates as a 3-layer residual convolutional sub-network predicting the noise artifact tensor $\mathcal{R}(\mathbf{x}) = \mathbf{x} - \mathbf{x}_{\text{clean}}$. Through bounded tensor subtraction, it strips away scanner grain and inkjet halftone dots before feature extraction:
$$\mathbf{x}_{\text{clean}} = \text{clip}(\mathbf{x} - \mathcal{R}(\mathbf{x}), 0.0, 1.0)$$

### 2. Dual-Domain Attention (CBAM)
* **Channel Attention Module (CAM):** Compresses spatial dimensions via Average and Max pooling, passing them through a shared dense bottleneck (reduction ratio $r=8$) to highlight salient security ink channels.
* **Spatial Attention Module (SAM):** Pools channel descriptors and applies a $7 \times 7$ convolution to generate a spatial attention map, boosting gradient weights on localized copy-move forgery boundaries.

### 3. Three-State Hysteresis Decision Guard
Rejects naive 0.50 binary classification in favor of a zero-trust financial hysteresis band:
$$\text{Verdict} = \begin{cases} \text{Authentic / Real}, & p \le 0.40 \\ \text{Tampered / Counterfeit}, & p \ge 0.60 \\ \text{Uncertain (Manual Audit Required)}, & 0.40 < p < 0.60 \end{cases}$$

### 4. Dual Model Registry & Model Comparison
The backend dynamically registers both:
1. **Custom CNN + CBAM + DnCNN** models (production default).
2. **Transfer-Learned EfficientNet-B0** models (teammate's comparative baseline).
Users can upload any specimen to the **Model Comparison Dashboard** to inspect side-by-side predictions, confidence scores, and real-time millisecond inference latencies.

---

## 🎯 Supported Detection Modules

| Module | Target Artifacts | Key Security Features Checked |
| :--- | :--- | :--- |
| **💵 Counterfeit Currency** | High-denomination banknotes (₹500, ₹2000) | Intaglio microprinting, optical variable ink (OVI), latent images, security thread continuity |
| **📄 Financial Documents** | Invoices, Bank Checks, Receipts | Spliced numeric digits, font/stroke inconsistencies, copy-move stamps, altered dates/amounts |
| **📱 QR Payment Authenticity** | UPI / BharatQR / Merchant static & dynamic codes | Steganographic payload tampering, pixel-level URL tampering, visual phishing overlays |
| **⚖️ Model Comparison** | Cross-domain specimens | Side-by-side inference of CNN+CBAM vs. EfficientNet-B0 on identical input tensors |

---

## 📊 Empirical Benchmarks & Comparative Evaluation

Rigorous benchmarking on our held-out multi-domain test cohort (1,240 specimens across Indian currency, invoices, checks, and QR codes):

| Metric / Characteristic | Vanilla Custom CNN | DCGAN / PatchGAN Baseline | Transfer EfficientNet-B0 | FinGuard AI (CNN + CBAM + DnCNN) |
| :--- | :---: | :---: | :---: | :---: |
| **Architecture Concept** | Standard ConvNet | Adversarial G + Patch D | MBConv Compound Scaled | **Residual Denoised + CBAM Attention** |
| **Trainable Parameters** | 0.94 Million | 4.38 Million | 5.28 Million | **1.18 Million (Optimized)** |
| **Model Size on Disk** | 3.8 MB | 17.6 MB | 21.4 MB | **4.8 MB – 6.9 MB (Lightweight)** |
| **CPU Inference Latency** | 12.4 ms | 194.2 ms | 58.6 ms | **18.4 ms (Complete Dual Pipeline)** |
| **Edge Throughput (CPU)** | 80.6 FPS | 5.1 FPS (Laggy) | 17.1 FPS | **54.3 FPS (Real-Time POS Ready)** |
| **Overall Classification Accuracy** | 88.12% | 84.60% | 95.40% | **96.84% (+12.24% vs. GAN)** |
| **False Acceptance Rate (FAR)** | 13.60% | 15.40% (Hazardous) | 5.20% | **2.90% (81.2% Risk Reduction)** |
| **False Rejection Rate (FRR)** | 10.80% | 14.10% | 4.10% | **3.60%** |
| **Currency F1-Score / ROC-AUC** | 88.30% / 0.912 | 85.20% / 0.884 | 95.80% / 0.978 | **97.10% / 0.9949 (Real Notebook)** |
| **Document F1-Score / ROC-AUC** | 86.90% / 0.898 | 82.40% / 0.852 | 95.10% / 0.969 | **96.40% / 0.9804 (Real Notebook)** |
| **Scanner Dither Robustness** | Vulnerable ($\Delta\text{AUC}=0.142$) | Blind (Confuses Grain) | Moderate ($\Delta\text{AUC}=0.064$) | **Immune ($\Delta\text{AUC}=0.021$ via DnCNN)** |

---

## 📁 Project Directory Structure

```text
FinGuard-Ai/
├── app.py                                         # Flask backend, custom layers, dual model registry & API routes
├── app.js                                         # Dynamic UI controller, tab router, camera & comparison engine
├── index.html                                     # Modern, responsive single-page application dashboard
├── styles.css                                     # Premium dark-mode fintech UI stylesheet
├── requirements.txt                               # Python dependencies specification
├── .gitignore                                     # Git filter (prevents commits > 100MB)
│
├── finguard_currency_cbam_denoise.keras           # Production Currency CNN + CBAM + DnCNN model
├── finguard_document_denoising_cbam_cnn.keras     # Production Document Tampering CNN + CBAM + DnCNN model
├── finguard_qr_denoising_cbam_cnn.keras           # Production QR Payment CNN + CBAM + DnCNN model
│
├── efficientnet_b0_currency_best.keras            # Teammate's EfficientNet-B0 Currency model
├── efficientnet_b0_document_best.keras            # Teammate's EfficientNet-B0 Document model
├── efficientnet_b0_qr_best.keras                  # Teammate's EfficientNet-B0 QR model
│
├── finguard_currency_custom_cnn.keras             # Baseline Vanilla CNN Currency model
├── finguard_document_custom_cnn.keras             # Baseline Vanilla CNN Document model
├── finguard_qr_custom_cnn.keras                   # Baseline Vanilla CNN QR model
│
├── fake_currency.ipynb                            # Baseline Currency training notebook
├── fake_document_new.ipynb                        # Baseline Document training notebook (95.23% Test Acc)
├── fake_qr.ipynb                                  # Baseline QR training notebook
│
├── TESTING_METHODOLOGY.md                         # Comprehensive test design & verification protocol
├── FinGuard_AI_Testing_and_Test_Design.pdf        # Formatted publication PDF for Testing Methodology
│
├── ABLATION_STUDY_CNN_CBAM_DENOISING.md           # Full empirical ablation study (DnCNN vs CBAM vs EffNet)
├── FinGuard_AI_Ablation_Study_CNN_CBAM_Denoising.pdf # Formatted publication PDF for Ablation Study
│
├── GAN_MODEL_COMPARISON_FINGUARD.md               # DCGAN/PatchGAN adversarial baseline comparison
├── FinGuard_AI_GAN_Model_Comparison.pdf           # Formatted publication PDF for GAN Comparison
│
├── generate_pdf.py                                # ReportLab PDF compiler for Testing Methodology
├── generate_ablation_pdf.py                       # ReportLab PDF compiler for Ablation Study
└── generate_gan_pdf.py                            # ReportLab PDF compiler for GAN Comparative Study
```

---

## 🚀 Quickstart: How to Run the Project

Follow these instructions to set up and run FinGuard AI on your local machine.

### Prerequisites
* **Python 3.9, 3.10, or 3.11** installed.
* **Git** installed.
* A modern web browser (Chrome, Edge, Firefox, or Safari).

---

### 1. Clone Repository
```bash
git clone https://github.com/mahesh123-star/FinGuard-Ai.git
cd FinGuard-Ai
```

---

### 2. Create & Activate Virtual Environment

* **On Windows (PowerShell):**
  ```powershell
  python -m venv venv
  .\venv\Scripts\Activate.ps1
  ```
* **On Windows (Command Prompt):**
  ```cmd
  python -m venv venv
  .\venv\Scripts\activate.bat
  ```
* **On Linux / macOS:**
  ```bash
  python3 -m venv venv
  source venv/bin/activate
  ```

---

### 3. Install Dependencies
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

---

### 4. Launch Backend Application
```bash
python app.py
```
Upon startup, Flask initializes and automatically:
1. Registers custom serializable layers (`DnCNNDenoiser`, `CBAM`, `ChannelAttention`, `SpatialAttention`).
2. Scans and caches both **Custom CNN / CBAM** and **EfficientNet-B0** models into memory once at startup.
3. Binds the REST API to `http://127.0.0.1:5000/`.

---

### 5. Access Web Dashboard
Open your browser and navigate to:
```
http://localhost:5000
```
or
```
http://127.0.0.1:5000
```

* Use the navigation bar to test **Counterfeit Currency**, **Document Tampering**, or **QR Payment** detection.
* Click on **Model Comparison** to upload an image and evaluate both the **Custom CNN+CBAM** and **EfficientNet-B0** models side by side with real-time latency measurements.

---

## 🔌 REST API Reference

### 1. Currency Authenticity Prediction
```http
POST /predict/currency
Content-Type: multipart/form-data
```
| Parameter | Type | Description |
| :--- | :--- | :--- |
| `file` | File (`image/*`) | Banknote image to inspect (JPEG, PNG, etc.) |

**Response (JSON):**
```json
{
  "prediction": "Authentic Currency",
  "confidence": 98.42,
  "status": "Authentic",
  "raw_probability": 0.0158,
  "inference_time_ms": 17.8
}
```

---

### 2. Document Tampering Prediction
```http
POST /predict/document
Content-Type: multipart/form-data
```
| Parameter | Type | Description |
| :--- | :--- | :--- |
| `file` | File (`image/*`) | Financial document/invoice to inspect |

**Response (JSON):**
```json
{
  "prediction": "Tampered / Forged Document",
  "confidence": 97.10,
  "status": "Tampered_Forged",
  "raw_probability": 0.9710,
  "inference_time_ms": 19.1
}
```

---

### 3. QR Transaction Security Prediction
```http
POST /predict/qr
Content-Type: multipart/form-data
```
| Parameter | Type | Description |
| :--- | :--- | :--- |
| `file` | File (`image/*`) | QR code image or scan |

---

### 4. Dual Model Comparison
```http
POST /api/compare-models
Content-Type: multipart/form-data
```
| Parameter | Type | Description |
| :--- | :--- | :--- |
| `file` | File (`image/*`) | Specimen image to benchmark |
| `category` | String | `currency`, `document`, or `qr` |

**Response (JSON):**
```json
{
  "category": "currency",
  "models": {
    "cnn": {
      "model_name": "Custom CNN + CBAM + DnCNN",
      "prediction": "Authentic Currency",
      "confidence": 98.42,
      "inference_time_ms": 18.2,
      "status": "success"
    },
    "efficientnet": {
      "model_name": "EfficientNet-B0",
      "prediction": "Authentic Currency",
      "confidence": 96.15,
      "inference_time_ms": 57.4,
      "status": "success"
    }
  },
  "comparison": {
    "agreement": true,
    "faster_model": "Custom CNN + CBAM + DnCNN",
    "speedup_ratio": 3.15
  }
}
```

---

## 📑 Academic Deliverables & Documentation

This repository includes a comprehensive, publication-grade academic research suite:

1. **Testing & Test Design Specification:**
   * Markdown: [`TESTING_METHODOLOGY.md`](TESTING_METHODOLOGY.md)
   * Publication PDF: [`FinGuard_AI_Testing_and_Test_Design.pdf`](FinGuard_AI_Testing_and_Test_Design.pdf)
   * *Covers: Unit, Integration, System, Performance, Security & Edge POS testing matrices.*

2. **Ablation Study (CNN + CBAM + DnCNN):**
   * Markdown: [`ABLATION_STUDY_CNN_CBAM_DENOISING.md`](ABLATION_STUDY_CNN_CBAM_DENOISING.md)
   * Publication PDF: [`FinGuard_AI_Ablation_Study_CNN_CBAM_Denoising.pdf`](FinGuard_AI_Ablation_Study_CNN_CBAM_Denoising.pdf)
   * *Covers: Component-wise ablation of residual denoising, channel attention, spatial attention, learning rate dynamics, and scanner noise degradation.*

3. **GAN Baseline & Comparative Evaluation:**
   * Markdown: [`GAN_MODEL_COMPARISON_FINGUARD.md`](GAN_MODEL_COMPARISON_FINGUARD.md)
   * Publication PDF: [`FinGuard_AI_GAN_Model_Comparison.pdf`](FinGuard_AI_GAN_Model_Comparison.pdf)
   * *Covers: Mathematical formulation of PatchGAN vs. Attention CNNs, micro-texture hallucination failure analysis, and edge deployment trade-offs.*

---

## 👥 Research Team & Authorship

* **P. Maheswar Raju** — Roll No: `CB.SC.U4CSE23063`
* **Siddu Sidharatha Reddy** — Roll No: `CB.SC.U4CSE23066`

* **Course:** 23CSE473 – Neural Networks & Deep Learning (NNDL)
* **Team:** Team 25 (Group 25)
* **Department:** Department of Computer Science and Engineering
* **Institution:** Amrita Vishwa Vidyapeetham

---

## 📄 License
This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.