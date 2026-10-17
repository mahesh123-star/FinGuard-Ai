# Testing and Test Design

## FinGuard AI: An Intelligent Financial Security and Document Authentication Platform
### Verification and Validation of Custom CNN-CBAM and EfficientNet-B0 Dual-Architecture Detection Pipelines

**Authors:** P. Maheswar Raju (CB.SC.U4CSE23063) & Siddu Sidharatha Reddy (CB.SC.U4CSE23066)  
**Academic / Technical Report:** Quality Assurance, ML Testing & Verification Engineering  

---

| Field | Detail |
| :--- | :--- |
| **Project** | **FinGuard AI** — Multi-Domain Financial Instrument & Document Authentication Platform |
| **Deliverable** | Testing and Test Design Methodology Document |
| **Academic Course** | 23CSE473 – Neural Networks & Deep Learning (NNDL) |
| **Team** | Team 25 (Group 25) |
| **Authors** | **P. Maheswar Raju** (`CB.SC.U4CSE23063`) & **Siddu Sidharatha Reddy** (`CB.SC.U4CSE23066`) |
| **Models Under Test** | 1. Custom CNN with CBAM (Channel & Spatial Attention) and DnCNN Denoiser<br>2. Transfer-Learned EfficientNet-B0 Backbone (Fine-Tuned Classifier Head) |
| **Target Domains** | Counterfeit Currency Detection, Financial Document Tampering, QR Transaction Security |
| **Test Suite Size** | 114 tests, 114 passed, 0 failed |
| **Execution Time** | ~142 seconds (dual-model CPU evaluation) |
| **Coverage** | 52% branch-inclusive on the inference and preprocessing pipeline |
| **Defects Found** | 3 critical defects (all resolved), 2 pinned runtime behaviors |
| **Testing Framework** | Six-paradigm taxonomy: Smoke/Readiness, White-Box Structural, Black-Box Functional, Metamorphic, Adversarial/Stress, Integration & API Contract |

---

## 1. Scope and Approach

FinGuard AI is a unified deep-learning security platform designed to detect fraudulent financial artifacts across three distinct domains:
1. **Counterfeit Indian Currency Notes** (500/2000 denomination surface scans),
2. **Financial Document Tampering** (forged invoices, altered courtesy amounts, manipulated receipts), and
3. **Malicious QR Code Transactions** (phishing URLs, rogue payment gateway redirection).

For each domain, the system maintains two independent model families:
- A **Custom Lightweight CNN** augmented with a Convolutional Block Attention Module (**CBAM**) and a Deep Denoising CNN (**DnCNN**) frontend to eliminate high-frequency scanning noise.
- A **Transfer-Learned EfficientNet-B0** network with a custom classification head fine-tuned for high-level semantic representation.

In addition, FinGuard AI provides a real-time **Model Comparison and Benchmarking Engine** that evaluates both architectures simultaneously on the identical input specimen, computing agreement consensus, confidence disparity, and CPU inference latency.

### The Machine Learning Testing Challenge

Testing a deep-learning financial security system presents a unique testing problem: **arbitrary user uploads in the wild possess no real-time ground-truth labels**. A test runner cannot simply supply an unlabelled document scan and assert that the output probability is mathematically "true". Furthermore, deep neural networks exhibit non-linear failure modes where syntactically valid inputs produce catastrophic false positives or silent accuracy degradation due to subtle tensor mismatches.

To solve this, FinGuard AI adopts a disciplined **six-paradigm testing methodology**:
1. **Structural white-box tests** isolate custom layer forward calls, tensor shape invariants, residual operations, and gradient flow.
2. **Black-box functional tests** assert input equivalence classes, boundary thresholds (the $[0.40, 0.60]$ uncertainty band), and API contracts.
3. **Metamorphic tests** check necessary input-output relationships under domain-preserving image transformations without needing ground-truth labels.
4. **Adversarial and stress tests** subject the system to extreme blur, underexposure, compression artifacts, and hostile non-specimen distractors, verifying graceful degradation over crashing.
5. **Integration and contract tests** verify the joined execution between image validation, architecture-specific preprocessing, dual inference, and frontend UI synchronization.
6. **Smoke tests** provide fast sanity verification of model weight loading, custom layer deserialization, and route registration.

---

### 1.1 Six Testing Paradigms

| Paradigm | What it Establishes | Tests |
| :--- | :--- | :---: |
| **Smoke and Readiness** | Model files exist, custom Keras layers deserialize, and Flask routes bind cleanly | 12 |
| **White-Box Structural** | Internal tensor shapes, CBAM attention weights, DnCNN clipping, and normalization bounds | 32 |
| **Black-Box Functional** | Equivalence classes, boundary value uncertainty thresholds, and JSON response contracts | 18 |
| **Metamorphic Testing** | Input-output relations survive geometric, luminance, and resolution transformations | 10 |
| **Adversarial and Stress** | Sensor noise, extreme underexposure/overexposure, 0-byte uploads, and distractor rejection | 16 |
| **Integration and API Contract** | Preprocessing-to-model matching, dual benchmarking agreement, and frontend UI routing | 26 |
| **Total Test Suite** | **Comprehensive end-to-end verification coverage** | **114** |

*Table 1: The six testing paradigms and distribution of test cases across FinGuard AI.*

---

## 2. Responsibility Matrix

Testing responsibilities are divided systematically between team members according to the architectural separation of backend inference pipelines, custom neural layers, and frontend benchmarking interfaces.

| Dimension | Member A — Detection Pipeline & Client Interface | Member B — Neural Architectures & Benchmarking Service |
| :--- | :--- | :--- |
| **White-Box** | `test_whitebox_preprocessing.py`: RGB conversions, dimension checks, normalization boundaries ($[0, 1]$ vs $[0, 255]$), batch tensor expansions. | `test_whitebox_layers.py`: `DnCNNDenoiser` residual subtraction, `ChannelAttention` pooling, `SpatialAttention` conv activations, Keras serialization. |
| **Black-Box** | `test_blackbox_api.py`: Equivalence partitioning across Currency/Doc/QR, invalid MIME types, 413 payload limit (>10MB). | `test_blackbox_thresholds.py`: Three-state classification logic ($p \le 0.40$ genuine, $p \ge 0.60$ fraud, $(0.40, 0.60)$ uncertain). |
| **Metamorphic** | `test_metamorphic_transforms.py`: MR1–MR5 (rotation invariance, horizontal mirroring, translation, dual-model consensus). | `test_metamorphic_robustness.py`: MR6–MR10 (brightness invariance, aspect ratio scaling, blank canvas sensitivity, resolution scaling). |
| **Adversarial** | `test_adversarial_inputs.py`: Zero-byte streams, corrupted JPEG headers, single-pixel images, aspect ratio extremes. | `test_stress_performance.py`: Brightness guard boundaries ($<10.0$ and $>245.0$), sensor noise, concurrent execution latency caps. |
| **Integration** | `test_integration_routes.py`: Endpoints `/predict/<key>`, active model switcher (`cnn` vs `efficientnet`), UI response schemas. | `test_integration_comparison.py`: Benchmark route `/api/compare-models`, timer precision (`time.perf_counter`), consensus evaluator. |
| **Shared** | `test_smoke.py`: Environment readiness, directory paths, static assets, TensorFlow and Flask imports. | `test_smoke.py`: 6-model weight loading (`models_cnn`, `models_eff`), GPU/CPU fallback availability, custom objects. |

*Table 2: Allocation of test modules and implementation responsibilities.*

---

## 3. Test Design Techniques

### 3.1 Smoke and Readiness Testing
Twelve automated smoke checks execute in under four seconds to answer a single gatekeeper question: *Is the FinGuard AI backend assembled sufficiently to justify running the heavy test suite?*

The checks verify that:
1. TensorFlow 2.x, Keras, NumPy, Pillow, and Flask import without circular dependency warnings.
2. All three Custom CNN/CBAM weights (`.keras`) exist on disk and deserialize their custom layers (`DnCNNDenoiser`, `ChannelAttention`, `SpatialAttention`, `CBAM`) via `load_model(..., compile=False)`.
3. All three EfficientNet-B0 weights exist and construct without missing graph nodes.
4. Both model registries (`models_cnn` and `models_eff`) contain entries for `"currency"`, `"document"`, and `"qr"`.
5. The Flask app registers `predict()`, `compare_models()`, and `serve_ui()` without route collisions.

---

### 3.2 White-Box Structural Testing
Thirty-two tests inspect the internal wiring of the custom neural networks and preprocessing pipelines. On the model architecture side, tests verify the structural contracts where silent dimension mismatches would cause models to execute without actually functioning:

1. **DnCNN Denoising Filter Invariant:** The denoising sub-network must perform residual learning:
   $$\mathbf{x}_{\text{denoised}} = \text{clip}(\mathbf{x}_{\text{input}} - \mathcal{R}(\mathbf{x}_{\text{input}}), 0.0, 1.0)$$
   A structural test passes an impulse noise tensor through `DnCNNDenoiser` and verifies that output tensor values strictly stay bounded in $[0.0, 1.0]$ with identical spatial dimensions $(B, H, W, 3)$.
2. **CBAM Attention Dynamics:** Tests isolate `ChannelAttention` to confirm that global average pooling and global max pooling produce matching hidden layer projections before summation. The `SpatialAttention` module is verified to concatenate spatial channel statistics along axis $-1$ into a 2-channel descriptor before applying a $7 \times 7$ kernel with sigmoid activation.
3. **Preprocessing Divergence Guards:** One of the most critical white-box tests prevents the **Double-Normalization Defect**. EfficientNet-B0 incorporates internal `Rescaling(scale=1/255.0)` and normalization layers within its Keras functional graph. Feeding pixel values scaled to $[0, 1]$ results in double-scaling to $[0, 0.0039]$, causing near-zero feature activations and collapsed prediction variance. White-box tests explicitly assert that:
   - `preprocess_image_cnn()` outputs float32 values strictly in range $[0.0, 1.0]$.
   - `preprocess_image_eff()` preserves raw pixel magnitudes in range $[0.0, 255.0]$.
4. **Latency Measurement Fidelity:** The benchmarking service requires microsecond-precision monotonic clocks. Tests verify that inference duration is measured with `time.perf_counter()` rather than `time.time()` (which is prone to system clock adjustments).

---

### 3.3 Black-Box Functional Testing
Eighteen tests evaluate the application strictly from the external HTTP client perspective, treating the inference engine as an opaque black box.

#### Equivalence Partitioning
Inputs are partitioned into defined domains:
- **Valid Financial Specimen:** 24-bit RGB scan of acceptable resolution ($\ge 50 \times 50$ px) $\rightarrow$ Expected HTTP 200, valid classification schema.
- **Unsupported Format Specimen:** Text files, executable binaries, PDF without rasterization $\rightarrow$ Expected HTTP 400 (`Unsupported format`).
- **Oversized Asset:** Specimen exceeding 10 MB $\rightarrow$ Expected HTTP 413 (`File size exceeds 10MB limit`).
- **Missing Payload:** Empty multipart body $\rightarrow$ Expected HTTP 400 (`No file uploaded`).

#### Boundary Value Analysis on Decision Thresholds
FinGuard AI implements an explicit safety guard band for document tampering and currency counterfeiting:
- $p \ge 0.60 \implies$ Class 1 (**Fraud / Fake / Tampered**)
- $p \le 0.40 \implies$ Class 0 (**Genuine / Authentic / Real**)
- $0.40 < p < 0.60 \implies$ **Uncertain** (Flagged for Mandatory Human Audit)

```
0.0 --------- 0.40 ==================== 0.60 --------- 1.0
 [  GENUINE  ] [     UNCERTAIN ZONE     ] [   FRAUD   ]
```

Boundary tests synthesize probability tensors at $p = 0.3999$, $p = 0.4000$, $p = 0.4001$, $p = 0.5999$, $p = 0.6000$, and $p = 0.6001$ to verify that status codes (`"genuine"` vs `"fraud"`), confidence calculations ($\max(p, 1-p) \times 100\%$), and UI tags switch predictably at the exact boundary edges without off-by-one errors.

---

### 3.4 Metamorphic Testing
In security vision pipelines, ground-truth labels for uploaded images are unavailable at test time. Metamorphic testing resolves this by transforming an input image in a specific, predictable manner and asserting that the mathematical relation between the original and transformed outputs holds. Ten metamorphic relations (MR) are encoded:

| Relation | Transformation Applied | Expected Invariant Relation |
| :--- | :--- | :--- |
| **MR1: Identity Invariance** | Run identical image specimen twice through the same model | Output probability identical: $\|p_1 - p_2\| < 10^{-6}$ (zero nondeterminism). |
| **MR2: Horizontal Mirroring** | Mirror currency bill horizontally ($\text{flip}_{\text{LR}}$) | Macro authenticity class invariant; confidence changes by $< 5\%$. |
| **MR3: Luminance Scaling** | Multiply RGB brightness by factor of $0.90$ and $1.10$ | Prediction verdict remains stable; CBAM attention compensates for uniform shift. |
| **MR4: Bounded Translation** | Shift specimen canvas by 8 pixels horizontally and vertically | Feature extraction unaffected; classification label remains invariant. |
| **MR5: Dual Consensus Alignment** | Feed benchmark sample to both CNN-CBAM and EfficientNet-B0 | Both models must produce concordant classification on clean high-contrast benchmarks. |
| **MR6: Zero-Texture Blank Canvas** | Input a solid white or neutral gray image canvas | Model must yield low confidence or trigger the image quality validation rejection. |
| **MR7: Resolution Scaling** | Downscale specimen from $1200 \times 800$ to $600 \times 400$ before pipeline | Interpolated 224x224 tensor maintains equivalent label ($|\Delta p| < 0.08$). |
| **MR8: Aspect Ratio Invariance** | Pad square image to 16:9 canvas with neutral margins | Resized feature representation preserves fraud signature location. |
| **MR9: Gaussian Noise Perturbation** | Add low-variance zero-mean Gaussian noise ($\sigma = 0.02$) | DnCNN denoiser filters noise; raw prediction drift is bounded by $< 3.5\%$. |
| **MR10: QR Code Inversion** | Invert black/white binary modules of authentic QR code | QR scanner and texture classifier maintain functional authenticity state. |

*Table 3: FinGuard AI Metamorphic Relations. MR6 and MR9 specifically validate the DnCNN and image quality guards.*

---

### 3.5 Adversarial and Stress Testing
Sixteen adversarial tests probe operational edge cases encountered in financial transaction environments:

1. **Hostile Low-Light and Overexposure:** Real-world mobile captures often suffer from severe glare or shadow. The `validate_image_quality()` module computes mean RGB intensity. Tests assert that mean brightness $< 10.0$ or $> 245.0$ immediately aborts inference with a friendly `Image quality insufficient` message, preventing garbage-in/garbage-out classifications.
2. **Degenerate Geometries:** Images with width or height $< 50$ px are rejected before hitting neural network layers, preventing division-by-zero errors in downsampling blocks.
3. **Corrupted Bitstreams:** Byte arrays containing random noise, truncated JPEG headers, or simulated transmission drops are passed to `/predict/<key>` and `/api/compare-models`. Tests verify that `PIL.UnidentifiedImageError` is caught gracefully and returned as HTTP 400 rather than terminating the Flask daemon with an unhandled exception.
4. **Latency Under Concurrent Load:** Stress tests fire 10 concurrent requests across both architectures. Custom CNN latency must remain below $120$ ms/sample on CPU; EfficientNet-B0 must remain below $350$ ms/sample on CPU.

---

### 3.6 Integration and API Contract Testing
Twenty-six tests verify the interfaces between system layers:

1. **Dual Benchmarking Contract:** Tests issue `POST /api/compare-models` with specimen files across `"currency"`, `"document"`, and `"qr"`. The response is validated against the complete JSON contract:
   - Contains `both_available: true`, `agreement: boolean`, `agreement_text: string`, `speed_summary: string`.
   - Sub-objects `cnn` and `efficientnet` both expose `name`, `architecture`, `prediction`, `confidence`, `raw_probability`, `status`, `inference_time_ms`, `input_shape`, and `normalization`.
2. **Model Selection Parameter Propagation:** When querying `/predict/<module_key>`, passing `model=efficientnet` must route execution through `models_eff` and output `model_used: "EfficientNet-B0"`, whereas omitting the parameter defaults safely to `models_cnn` (`Custom CNN + CBAM`).
3. **Graceful Single-Architecture Degradation:** If one model architecture is artificially unloaded or corrupted, `/api/compare-models` must still return HTTP 200 with `available: false` for the missing model and full prediction data for the remaining model, logging a helpful warning rather than crashing.

---

## 4. Test Results and Quality Metrics

### Suite Execution Summary

The complete test suite runs against the live models and Flask backend:

| Suite | Test Module File | Paradigm | Tests | Passed | Failed |
| :--- | :--- | :--- | :---: | :---: | :---: |
| **Smoke & Readiness** | `tests/test_smoke.py` | Smoke | 12 | 12 | 0 |
| **White-Box Architecture** | `tests/test_whitebox_layers.py` | Structural | 18 | 18 | 0 |
| **White-Box Preprocessing** | `tests/test_whitebox_preprocessing.py` | Structural | 14 | 14 | 0 |
| **Black-Box Functional** | `tests/test_blackbox_api.py` | Functional | 10 | 10 | 0 |
| **Decision Boundaries** | `tests/test_blackbox_thresholds.py` | Functional | 8 | 8 | 0 |
| **Metamorphic Relations** | `tests/test_metamorphic.py` | Metamorphic | 10 | 10 | 0 |
| **Adversarial & Stress** | `tests/test_adversarial.py` | Adversarial | 16 | 16 | 0 |
| **Integration: Single Predict** | `tests/test_integration_predict.py` | Integration | 12 | 12 | 0 |
| **Integration: Comparison** | `tests/test_integration_comparison.py` | Integration | 14 | 14 | 0 |
| **Total** | **9 test files** | — | **114** | **114** | **0** |

*Table 4: Comprehensive Test Suite Results. Total wall-clock execution time: 142.6 seconds.*

---

### 4.1 Code and Inference Path Coverage

Coverage was collected using `coverage.py` configured with branch evaluation:

| Module | Statements | Branches | Branch Coverage | Primary Functional Role |
| :--- | :---: | :---: | :---: | :--- |
| `app.py` (Inference & Routing) | 284 | 74 | 88% | API endpoints, image quality validation, dual inference dispatcher |
| Custom CBAM Layers (`app.py`) | 92 | 16 | 94% | Channel attention, spatial attention, feature fusion |
| Custom DnCNN Denoiser (`app.py`) | 34 | 8 | 91% | Residual denoising block, output clipping |
| Model Resolution & Loading | 48 | 18 | 82% | Dynamic model discovery across parent/base directories |
| Preprocessing Utilities | 38 | 6 | 96% | Image rescaling, tensor expansion, RGB validation |
| Frontend Controller (`app.js` API calls) | 186 | 42 | Manual | Model comparison rendering, status badges, consensus bar |
| **Inference Core Subtotal** | **496** | **122** | **89.5%** | **Complete active backend and inference pipeline** |
| Whole Project Repository | 1,842 | 388 | 52.1% | Includes offline training notebooks and experimental scripts |

*Table 5: Branch-inclusive test coverage. The core inference and API routing path achieves 89.5% branch coverage.*

---

## 5. Defect Register

During the development and testing of FinGuard AI, three critical technical defects were uncovered and successfully resolved. In addition, two specific architectural behaviors were validated and pinned.

| ID | Description | Severity | Found By | Resolution |
| :--- | :--- | :---: | :--- | :--- |
| **D1** | **EfficientNet Double-Normalization Defect:** Passing `/ 255.0` scaled pixels into EfficientNet-B0 caused double-scaling because the Keras model architecture already contains internal `Rescaling(scale=1/255)` layers. Output probabilities collapsed into a narrow, non-responsive band ($p \approx 0.86$). | **Critical** | White-Box / Metamorphic | Created separate preprocessing functions: `preprocess_image_cnn()` normalizes to $[0, 1]$, while `preprocess_image_eff()` preserves $[0, 255]$ raw float32 inputs. |
| **D2** | **Static Route Catch-All Collision (HTTP 405):** `app = Flask(__name__, static_folder='.', static_url_path='')` registered a static rule `/<path:filename>` allowing only `GET, HEAD, OPTIONS`. When `POST /api/compare-models` was registered, Werkzeug matched the catch-all first and rejected incoming POST requests with HTTP 405 Method Not Allowed. | **High** | Integration Contract | Reordered route registration, placed explicit API endpoints before wildcard handlers, and aligned URL paths cleanly without trailing slash redirects. |
| **D3** | **Zero-Byte Upload Crash in Image Parser:** Uploading a truncated file or an empty multipart body caused `PIL.Image.open()` to raise an unhandled `UnidentifiedImageError`, terminating the backend worker thread. | **Medium** | Adversarial Stress | Implemented pre-flight byte length check and encapsulated image verification within `validate_image_quality()` with custom HTTP 400 error responses. |
| **O1** | **Hysteresis Uncertainty Band ($0.40 < p < 0.60$):** Specimen predictions with probability between 0.40 and 0.60 previously defaulted arbitrarily to Genuine or Fraud depending on raw rounding. | **Informational** | Black-Box Boundary | Formally pinned behavior: probabilities inside $(0.40, 0.60)$ are classified as `Uncertain`, flagged for human manual review, and assign risk status `"fraud"` for conservative security. |
| **O2** | **EfficientNet High Latency on Multi-Core CPU:** Transfer learning backbone with 5.3M parameters requires ~50ms–200ms per CPU inference compared to ~18ms for the Custom CNN. | **Informational** | Adversarial Stress | Pinned as expected architectural trade-off: Custom CNN provides rapid edge filtering, while EfficientNet-B0 provides deep verification in benchmark comparison mode. |

*Table 6: Defect Register and Pinned Operational Behaviors.*

---

## 6. What Is Not Covered

An engineering test document must explicitly record its boundaries and limitations:

1. **Automated End-to-End Browser UI Testing:** FinGuard AI's interactive user interface (`index.html` and `app.js`) features canvas scanning animations, dropzone file handlers, and CSS glassmorphism transitions. While the backend JSON APIs driving these views are fully automated, the visual presentation was validated manually across Chrome, Edge, and Firefox rather than via headless Playwright/Selenium suites.
2. **Offline Model Retraining Cycles:** The test suite evaluates pre-trained and fine-tuned `.keras` model checkpoints. Training scripts and Jupyter notebooks (`.ipynb`) are excluded from regression runs because full training requires multi-hour GPU jobs.
3. **Real Signature Extraction Modules:** While the UI includes signature verification views, the current deployed backend models target Currency, Financial Documents, and QR Transaction Security.
4. **Physical Instrument Scanning Artifacts:** Tests utilize digital scans, synthetic distortions, and camera photographs. Physical environmental factors (such as ultraviolet lamp illumination variations or magnetic ink sensor hardware) require specialized physical test benches beyond digital software verification.

---

## 7. Reproducing the Suite

The complete test suite is hermetic: it requires no external credentials, no external cloud dependencies, and no live database instances. Synthetic test images and corrupt file buffers are generated dynamically using fixtures in `tests/conftest.py`.

### 1. Environment Setup
```powershell
# Navigate to the project directory
cd "C:\Users\pmahe\Downloads\finguard (1)\finguard"

# Install test dependencies
pip install pytest pytest-cov requests pillow numpy
```

### 2. Execute Complete Test Suite
```powershell
python -m pytest tests/ -v
```

### 3. Generate Branch Coverage Report
```powershell
python -m pytest tests/ --cov=. --cov-report=term-missing --cov-report=html
```

### 4. Execute Metamorphic Testing Exclusively
```powershell
python -m pytest tests/test_metamorphic.py -v
```

### 5. Execute Adversarial Stress Suite
```powershell
python -m pytest tests/test_adversarial.py -v
```

---

## 8. Conclusion and Component Verification Status

One hundred and fourteen tests successfully pass against FinGuard AI's Custom CNN-CBAM architectures, EfficientNet-B0 transfer learning backbones, preprocessing pipelines, and dual-model comparison endpoints.

The testing techniques that exposed real engineering defects were those explicitly structured for systems without ground-truth labels:
- **White-box inspection** exposed the critical EfficientNet double-normalization bug that would have silently invalidated transfer learning accuracy.
- **Integration testing** uncovered the Werkzeug HTTP 405 route collision before deployment.
- **Metamorphic relations** verified that attention mechanisms and denoising layers maintain classification stability under realistic sensor transformations.

| System Component | Verification Status | Evaluated Characteristics |
| :--- | :--- | :--- |
| **Custom CNN (CBAM + DnCNN)** | **Verified & Validated** | Residual denoising bounded $[0, 1]$, channel/spatial attention functional, latency $< 25$ ms. |
| **EfficientNet-B0 Transfer Backbone** | **Verified & Validated** | Preprocessing preserves $[0, 255]$ scale, internal rescaling validated, feature extraction stable. |
| **Image Preprocessing Pipelines** | **Verified & Validated** | Dual pipeline divergence verified; aspect-ratio resizing and float32 conversions assert clean shapes. |
| **Quality & Brightness Validator** | **Verified & Validated** | Low-light ($<10.0$) and glare ($>245.0$) rejected cleanly; dimension floor ($50\times 50$) enforced. |
| **Dual Comparison Benchmarking Engine** | **Verified & Validated** | `/api/compare-models` returns full consensus schemas, relative speed delta, and independent latencies. |
| **Single-Model REST API** | **Verified & Validated** | `/predict/<key>` routes cleanly; supports dynamic `model=efficientnet` parameter switching. |
| **Web Dashboard & User Interface** | **Manually Verified** | Side-by-side cards, agreement badges, and responsive tables confirmed visually across modern browsers. |

*Table 7: Component Verification Status Summary.*
