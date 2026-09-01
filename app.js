// FinGuard AI: Application Controller
// Orchestrates navigation, interactive stats, file handling, and scanning simulations

// --- Initial History Database State ---
let verificationHistory = [
  {
    timestamp: "2026-07-23 09:05:12",
    module: "Currency Notes",
    moduleKey: "currency",
    fileName: "usd_100_front.jpg",
    prediction: "Genuine USD ($100)",
    confidence: 99.2,
    status: "genuine"
  },
  {
    timestamp: "2026-07-23 08:58:45",
    module: "Signature Matching",
    moduleKey: "signature",
    fileName: "sig_query_check.png",
    prediction: "Forged / High Discrepancy",
    confidence: 42.1,
    status: "fraud"
  },
  {
    timestamp: "2026-07-23 08:15:30",
    module: "Bank Cheques",
    moduleKey: "cheque",
    fileName: "cheque_chq8293.png",
    prediction: "Tampered Legal Amount",
    confidence: 61.5,
    status: "fraud"
  },
  {
    timestamp: "2026-07-23 07:44:22",
    module: "Doc Authentication",
    moduleKey: "document",
    fileName: "invoice_28491.pdf",
    prediction: "Original Document",
    confidence: 98.4,
    status: "genuine"
  },
  {
    timestamp: "2026-07-23 06:12:05",
    module: "QR Transactions",
    moduleKey: "qr",
    fileName: "qr_receipt_scan.png",
    prediction: "Safe Transaction URL",
    confidence: 99.8,
    status: "genuine"
  }
];

// Global Dashboard Preferences
let activeModel = "efficientnet"; // Default active model
let confidenceThreshold = 80;
let trendChart = null;
let breakdownChart = null;

// Track Dual Signature States
let signatureUploads = {
  ref: null,
  query: null
};

// Document Loaded Hook
document.addEventListener("DOMContentLoaded", () => {
  // Initialize Stats in UI
  updateStatsCounters();
  
  // Render History Tables
  renderHistoryTables();
  
  // Initialize Chart.js Elements
  initCharts();
  
  // Configure Drag and Drop Event Listeners
  setupDragAndDrop();
});

// ==================== VIEW ROUTER & NAVIGATION ====================

function showLandingView() {
  document.getElementById("dashboard-view").style.display = "none";
  document.getElementById("landing-page-view").style.display = "block";
  // Reset scroll position
  window.scrollTo({ top: 0, behavior: 'instant' });
}

function showDashboardView(initialPanel = "overview") {
  document.getElementById("landing-page-view").style.display = "none";
  document.getElementById("dashboard-view").style.display = "block";
  
  // Clean all active sidebar links and panels
  const links = document.querySelectorAll(".sidebar-link");
  links.forEach(l => l.classList.remove("active"));
  
  // Find link target
  const targetLink = Array.from(links).find(l => l.getAttribute("onclick").includes(initialPanel));
  if (targetLink) targetLink.classList.add("active");
  
  switchDashboardPanel(initialPanel);
}

function switchDashboardPanel(panelId, sidebarElement = null) {
  // Hide all panels
  const panels = document.querySelectorAll(".dashboard-workspace-panel");
  panels.forEach(p => p.classList.remove("active-panel"));
  
  // Activate selected panel
  const activePanel = document.getElementById(`panel-${panelId}`);
  if (activePanel) {
    activePanel.classList.add("active-panel");
  }
  
  // Update header text title
  const panelTitles = {
    overview: "Dashboard Overview & Operations",
    currency: "Counterfeit Currency Detection",
    cheque: "Bank Cheque Integrity Verification",
    signature: "Signature Specimen Matching",
    document: "Financial Document Authentication",
    qr: "QR Code Transaction Security",
    history: "Verification Audit History Logs",
    settings: "Model Configurations & Parameters"
  };
  document.getElementById("panel-title-label").innerText = panelTitles[panelId] || "FinGuard AI Console";
  
  // Handle sidebar active class swapping
  if (sidebarElement) {
    const links = document.querySelectorAll(".sidebar-link");
    links.forEach(l => l.classList.remove("active"));
    sidebarElement.classList.add("active");
  }
  
  // Close mobile sidebar if open
  document.getElementById("sidebar").classList.remove("mobile-open");
  
  // Auto update charts if returning to overview
  if (panelId === 'overview') {
    setTimeout(() => {
      if (trendChart && breakdownChart) {
        trendChart.resize();
        breakdownChart.resize();
      }
    }, 100);
  }
}

function toggleMobileSidebar() {
  document.getElementById("sidebar").classList.toggle("mobile-open");
}

function handleMockLogin(event) {
  event.preventDefault();
  
  // Hide Modal
  const modalEl = document.getElementById("loginModal");
  const modalInstance = bootstrap.Modal.getInstance(modalEl);
  if (modalInstance) modalInstance.hide();
  
  // Move to Dashboard Console
  showDashboardView("overview");
}

// ==================== DRAG & DROP FILE HANDLING ====================

function triggerFileInput(inputId) {
  document.getElementById(inputId).click();
}

function setupDragAndDrop() {
  const dropzones = ["currency", "cheque", "document", "qr"];
  
  dropzones.forEach(zone => {
    const el = document.getElementById(`dropzone-${zone}`);
    const input = document.getElementById(`input-${zone}`);
    
    if (!el) return;
    
    // Drag events
    el.addEventListener("dragover", (e) => {
      e.preventDefault();
      el.classList.add("dragover");
    });
    
    el.addEventListener("dragleave", () => {
      el.classList.remove("dragover");
    });
    
    el.addEventListener("drop", (e) => {
      e.preventDefault();
      el.classList.remove("dragover");
      
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        input.files = e.dataTransfer.files;
        handleFileSelection(input, zone);
      }
    });
  });
}

function handleFileSelection(input, moduleKey) {
  const file = input.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = function(e) {
    const previewContainer = document.getElementById(`preview-container-${moduleKey}`);
    const previewImg = document.getElementById(`preview-img-${moduleKey}`);
    const verifyBtn = document.getElementById(`btn-verify-${moduleKey}`);
    
    if (previewImg && previewContainer) {
      previewImg.src = e.target.result;
      previewContainer.style.display = "block";
    }
    
    if (verifyBtn) {
      verifyBtn.removeAttribute("disabled");
    }
  };
  reader.readAsDataURL(file);
}

// Handles side-by-side uploads in Signature Module
function handleDualFileSelection(input, type) {
  const file = input.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = function(e) {
    const previewContainer = document.getElementById(`preview-container-${type}`);
    const previewImg = document.getElementById(`preview-img-${type}`);
    
    if (previewImg && previewContainer) {
      previewImg.src = e.target.result;
      previewContainer.style.display = "block";
      
      // Save content reference
      if (type === 'sig-ref') {
        signatureUploads.ref = file;
      } else if (type === 'sig-query') {
        signatureUploads.query = file;
      }
      
      // If both are uploaded, enable the verify button
      const verifyBtn = document.getElementById("btn-verify-signature");
      if (signatureUploads.ref && signatureUploads.query && verifyBtn) {
        verifyBtn.removeAttribute("disabled");
      }
    }
  };
  reader.readAsDataURL(file);
}

function resetVerification(moduleKey) {
  // Clear inputs
  const input = document.getElementById(`input-${moduleKey}`);
  if (input) input.value = "";
  
  // Hide preview
  const previewContainer = document.getElementById(`preview-container-${moduleKey}`);
  if (previewContainer) previewContainer.style.display = "none";
  
  // Disable verify button
  const verifyBtn = document.getElementById(`btn-verify-${moduleKey}`);
  if (verifyBtn) verifyBtn.setAttribute("disabled", "true");
  
  // Hide results
  const resultCard = document.getElementById(`result-${moduleKey}`);
  if (resultCard) resultCard.style.display = "none";
}

function resetSignatureVerification() {
  signatureUploads.ref = null;
  signatureUploads.query = null;
  
  document.getElementById("input-sig-ref").value = "";
  document.getElementById("input-sig-query").value = "";
  
  document.getElementById("preview-container-sig-ref").style.display = "none";
  document.getElementById("preview-container-sig-query").style.display = "none";
  
  document.getElementById("btn-verify-signature").setAttribute("disabled", "true");
  document.getElementById("result-signature").style.display = "none";
}

// ==================== VERIFICATION & PREDICTION ENGINES ====================

function runVerification(moduleKey) {
  const container = document.getElementById(`preview-container-${moduleKey}`);
  const verifyBtn = document.getElementById(`btn-verify-${moduleKey}`);
  
  if (!container || !verifyBtn) return;
  
  // Add class for scanline animation
  container.classList.add("scanning");
  verifyBtn.setAttribute("disabled", "true");
  
  // Determine processing time based on selected Model
  const processTime = activeModel === "cnn" ? 1400 : 2200;
  
  setTimeout(() => {
    container.classList.remove("scanning");
    
    // Perform Dynamic Prediction Outputs
    generatePredictionResult(moduleKey);
    
    // Enable verify btn again
    verifyBtn.removeAttribute("disabled");
  }, processTime);
}

function runSignatureVerification() {
  const scanPanel = document.getElementById("scanning-sig-panel");
  const verifyBtn = document.getElementById("btn-verify-signature");
  
  if (!scanPanel || !verifyBtn) return;
  
  scanPanel.classList.remove("d-none");
  verifyBtn.setAttribute("disabled", "true");
  
  const processTime = activeModel === "cnn" ? 1600 : 2500;
  
  setTimeout(() => {
    scanPanel.classList.add("d-none");
    
    // Dynamic Signature output
    generateSignaturePrediction();
    
    verifyBtn.removeAttribute("disabled");
  }, processTime);
}

// Generates simulated prediction scores
function generatePredictionResult(moduleKey) {
  // Grab filename from input
  const inputEl = document.getElementById(`input-${moduleKey}`);
  const fileName = inputEl.files[0] ? inputEl.files[0].name : "unknown_specimen.png";
  
  // Model specific parameters (EfficientNet has slightly higher confidence averages)
  const isEff = activeModel === "efficientnet";
  const randomVal = Math.random();
  
  // Determine status (85% genuine, 15% fraud/tampered for demonstration)
  const isGenuine = randomVal > 0.15;
  let status = isGenuine ? "genuine" : "fraud";
  
  let predictionLabel = "";
  let confidence = 0;
  
  if (moduleKey === "currency") {
    predictionLabel = isGenuine ? "Genuine USD ($100)" : "Counterfeit USD Note";
    confidence = isGenuine 
      ? (isEff ? (98.0 + Math.random() * 1.9) : (94.5 + Math.random() * 3.0))
      : (isEff ? (89.5 + Math.random() * 8.5) : (82.1 + Math.random() * 12.0));
  } else if (moduleKey === "cheque") {
    predictionLabel = isGenuine ? "Genuine Instrument" : "Tampered Courtesy Amount";
    confidence = isGenuine 
      ? (isEff ? (97.0 + Math.random() * 2.8) : (92.1 + Math.random() * 4.5))
      : (isEff ? (91.2 + Math.random() * 6.0) : (84.5 + Math.random() * 9.5));
  } else if (moduleKey === "document") {
    predictionLabel = isGenuine ? "Original Invoice" : "Tampered Layout Checksum";
    confidence = isGenuine 
      ? (isEff ? (96.5 + Math.random() * 3.2) : (91.0 + Math.random() * 5.0))
      : (isEff ? (88.4 + Math.random() * 9.0) : (80.2 + Math.random() * 14.5));
  } else if (moduleKey === "qr") {
    predictionLabel = isGenuine ? "Safe Transaction Target" : "Suspicious Redirect URL";
    confidence = isGenuine 
      ? (isEff ? (99.5 + Math.random() * 0.4) : (98.0 + Math.random() * 1.5))
      : (isEff ? (95.0 + Math.random() * 4.5) : (91.2 + Math.random() * 7.0));
  }
  
  confidence = parseFloat(confidence.toFixed(1));
  
  // Display Results in UI
  displayResultsCard(moduleKey, predictionLabel, confidence, status);
  
  // Write to Log History
  logVerification(moduleKey, fileName, predictionLabel, confidence, status);
}

function generateSignaturePrediction() {
  const isEff = activeModel === "efficientnet";
  const randomVal = Math.random();
  const isGenuine = randomVal > 0.15;
  const status = isGenuine ? "genuine" : "fraud";
  
  const fileName = signatureUploads.query ? signatureUploads.query.name : "sig_specimen.png";
  
  const predictionLabel = isGenuine ? "Signature Match Verified" : "Forged / High Stroke Anomaly";
  let confidence = isGenuine 
    ? (isEff ? (94.0 + Math.random() * 5.5) : (88.0 + Math.random() * 8.0))
    : (isEff ? (35.0 + Math.random() * 15.0) : (30.0 + Math.random() * 20.0));
  
  confidence = parseFloat(confidence.toFixed(1));
  
  // Dynamic Distance metrics
  const distance = isGenuine 
    ? (0.05 + Math.random() * 0.1).toFixed(2) 
    : (0.35 + Math.random() * 0.4).toFixed(2);
  
  // Display Results Card
  displayResultsCard("signature", predictionLabel, confidence, status);
  
  // Set dual details in UI
  document.getElementById("sig-metric-distance").innerText = `${distance} (${isGenuine ? 'Low' : 'Critical'})`;
  
  // Log to history
  logVerification("signature", fileName, predictionLabel, confidence, status);
}

function displayResultsCard(moduleKey, prediction, confidence, status) {
  const resultCard = document.getElementById(`result-${moduleKey}`);
  const statusBadge = document.getElementById(`result-status-badge-${moduleKey}`);
  const predictionText = document.getElementById(`result-prediction-${moduleKey}`);
  const confidenceText = document.getElementById(`result-confidence-${moduleKey}`);
  const progressBar = document.getElementById(`result-progress-${moduleKey}`);
  
  if (!resultCard || !statusBadge || !predictionText || !confidenceText || !progressBar) return;
  
  // Configure Badge
  if (status === "genuine") {
    statusBadge.innerHTML = `<span class="badge-status badge-genuine"><i class="fa-solid fa-circle-check"></i> Genuine Asset</span>`;
  } else {
    statusBadge.innerHTML = `<span class="badge-status badge-fraud"><i class="fa-solid fa-triangle-exclamation"></i> Fraud Flagged</span>`;
  }
  
  // Configure values
  predictionText.innerText = prediction;
  confidenceText.innerText = `${confidence}%`;
  progressBar.style.width = `${confidence}%`;
  
  // Reveal card
  resultCard.style.display = "block";
  resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function logVerification(moduleKey, fileName, prediction, confidence, status) {
  const moduleNames = {
    currency: "Currency Notes",
    cheque: "Bank Cheques",
    signature: "Signature Matching",
    document: "Doc Authentication",
    qr: "QR Transactions"
  };
  
  const now = new Date();
  const formatTime = now.getFullYear() + '-' + 
                     String(now.getMonth() + 1).padStart(2, '0') + '-' + 
                     String(now.getDate()).padStart(2, '0') + ' ' + 
                     String(now.getHours()).padStart(2, '0') + ':' + 
                     String(now.getMinutes()).padStart(2, '0') + ':' + 
                     String(now.getSeconds()).padStart(2, '0');
  
  const newRecord = {
    timestamp: formatTime,
    module: moduleNames[moduleKey],
    moduleKey: moduleKey,
    fileName: fileName,
    prediction: prediction,
    confidence: confidence,
    status: status
  };
  
  // Add to top of history
  verificationHistory.unshift(newRecord);
  
  // Re-sync UI state
  updateStatsCounters();
  renderHistoryTables();
  updateCharts();
}

// ==================== DASHBOARD STATS & AUDITS ====================

function updateStatsCounters() {
  const total = verificationHistory.length;
  const genuine = verificationHistory.filter(h => h.status === "genuine").length;
  const fraud = verificationHistory.filter(h => h.status === "fraud").length;
  
  // Calculate dynamic average accuracy based on history
  let accuracy = 98.71;
  if (activeModel === "cnn") {
    accuracy = 96.42;
  }
  
  document.getElementById("stat-total-scans").innerText = total;
  document.getElementById("stat-genuine-assets").innerText = genuine;
  document.getElementById("stat-fraud-detected").innerText = fraud;
  document.getElementById("stat-system-accuracy").innerText = `${accuracy}%`;
}

function renderHistoryTables() {
  const recentTable = document.getElementById("overview-recent-table-body");
  const fullTable = document.getElementById("history-panel-table-body");
  
  if (!recentTable || !fullTable) return;
  
  // Generate HTML Rows
  const getRowHtml = (h) => {
    const statusClass = h.status === 'genuine' ? 'bg-success-subtle text-success border-success-subtle' : 'bg-danger-subtle text-danger border-danger-subtle';
    const statusText = h.status === 'genuine' ? 'Genuine' : 'Fraud';
    const statusIcon = h.status === 'genuine' ? 'fa-circle-check' : 'fa-triangle-exclamation';
    
    // Set placeholder thumbnail based on type
    const icons = {
      currency: "fa-money-bill-1 text-primary",
      cheque: "fa-money-check text-info",
      signature: "fa-signature text-secondary",
      document: "fa-file-invoice text-warning",
      qr: "fa-qrcode text-dark"
    };
    const iconClass = icons[h.moduleKey] || "fa-file-shield text-muted";
    
    return `
      <tr>
        <td class="text-muted small">${h.timestamp}</td>
        <td><strong>${h.module}</strong></td>
        <td>
          <div class="d-flex align-items-center justify-content-center border rounded bg-light" style="width: 44px; height: 32px;">
            <i class="fa-solid ${iconClass}" style="font-size: 1.1rem;"></i>
          </div>
        </td>
        <td><span class="small">${h.prediction}</span></td>
        <td><strong class="text-secondary">${h.confidence}%</strong></td>
        <td>
          <span class="badge ${statusClass} border px-2.5 py-1.5 rounded-pill small">
            <i class="fa-solid ${statusIcon} me-1"></i> ${statusText}
          </span>
        </td>
      </tr>
    `;
  };
  
  // Render Recent Table (Limit to 4 records)
  recentTable.innerHTML = verificationHistory.slice(0, 4).map(getRowHtml).join("");
  
  // Render Full History panel table
  applyHistoryFilters();
}

function applyHistoryFilters() {
  const fullTable = document.getElementById("history-panel-table-body");
  const moduleFilter = document.getElementById("filter-history-module").value;
  const statusFilter = document.getElementById("filter-history-status").value;
  
  if (!fullTable) return;
  
  let filtered = [...verificationHistory];
  
  if (moduleFilter !== 'all') {
    filtered = filtered.filter(h => h.moduleKey === moduleFilter);
  }
  
  if (statusFilter !== 'all') {
    filtered = filtered.filter(h => h.status === statusFilter);
  }
  
  const getRowHtml = (h) => {
    const statusClass = h.status === 'genuine' ? 'bg-success-subtle text-success border-success-subtle' : 'bg-danger-subtle text-danger border-danger-subtle';
    const statusText = h.status === 'genuine' ? 'Genuine' : 'Fraud';
    const statusIcon = h.status === 'genuine' ? 'fa-circle-check' : 'fa-triangle-exclamation';
    
    const icons = {
      currency: "fa-money-bill-1 text-primary",
      cheque: "fa-money-check text-info",
      signature: "fa-signature text-secondary",
      document: "fa-file-invoice text-warning",
      qr: "fa-qrcode text-dark"
    };
    const iconClass = icons[h.moduleKey] || "fa-file-shield text-muted";
    
    return `
      <tr>
        <td class="text-muted small">${h.timestamp}</td>
        <td><strong>${h.module}</strong></td>
        <td>
          <div class="d-flex align-items-center justify-content-center border rounded bg-light" style="width: 44px; height: 32px;">
            <i class="fa-solid ${iconClass}" style="font-size: 1.1rem;"></i>
          </div>
        </td>
        <td><span class="small">${h.prediction}</span></td>
        <td><strong class="text-secondary">${h.confidence}%</strong></td>
        <td>
          <span class="badge ${statusClass} border px-2.5 py-1.5 rounded-pill small">
            <i class="fa-solid ${statusIcon} me-1"></i> ${statusText}
          </span>
        </td>
      </tr>
    `;
  };
  
  if (filtered.length === 0) {
    fullTable.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">No records found matching filters.</td></tr>`;
  } else {
    fullTable.innerHTML = filtered.map(getRowHtml).join("");
  }
}

// ==================== SETTINGS MANIPULATIONS ====================

function selectSettingsModel(modelType) {
  activeModel = modelType;
  
  const cnnCard = document.getElementById("settings-model-card-cnn");
  const effCard = document.getElementById("settings-model-card-eff");
  const accuracyLabel = document.getElementById("stat-system-accuracy");
  const modelTextLabel = document.getElementById("stat-selected-model");
  
  if (modelType === "cnn") {
    cnnCard.className = "card p-3 border-2 border-primary bg-primary-subtle text-primary";
    cnnCard.querySelector("i").className = "fa-solid fa-circle-check fs-5";
    
    effCard.className = "card p-3 border-1 border-slate";
    effCard.querySelector("i").className = "fa-regular fa-circle fs-5 text-muted";
    
    if (accuracyLabel) accuracyLabel.innerText = "96.42%";
    if (modelTextLabel) modelTextLabel.innerText = "Custom CNN Loaded";
  } else {
    effCard.className = "card p-3 border-2 border-success bg-success-subtle text-success";
    effCard.querySelector("i").className = "fa-solid fa-circle-check fs-5";
    
    cnnCard.className = "card p-3 border-1 border-slate";
    cnnCard.querySelector("i").className = "fa-regular fa-circle fs-5 text-muted";
    
    if (accuracyLabel) accuracyLabel.innerText = "98.71%";
    if (modelTextLabel) modelTextLabel.innerText = "EfficientNet-B0 Loaded";
  }
  
  // Show quick toast/alert simulation
  const toastText = modelType === "cnn" ? "Switched to Custom CNN Model" : "Switched to Transfer Learned EfficientNet Model";
  console.log(toastText);
}

function updateConfidenceThresholdLabel(val) {
  confidenceThreshold = parseInt(val);
  document.getElementById("confidence-threshold-val").innerText = `${val}%`;
}

// ==================== CHART INTERACTION CODES ====================

function initCharts() {
  const trendCtx = document.getElementById('trendChart');
  const breakdownCtx = document.getElementById('breakdownChart');
  
  if (!trendCtx || !breakdownCtx) return;
  
  // Trend chart (Line Chart for scan volume)
  trendChart = new Chart(trendCtx.getContext('2d'), {
    type: 'line',
    data: {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      datasets: [
        {
          label: 'Total Scans',
          data: [150, 185, 160, 210, 240, 110, 193],
          borderColor: '#3B82F6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.4,
          fill: true,
          borderWidth: 3,
          pointBackgroundColor: '#0B0F19',
          pointBorderColor: '#3B82F6',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6
        },
        {
          label: 'Fraud Flagged',
          data: [5, 8, 4, 12, 18, 3, 9],
          borderColor: '#EF4444',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          tension: 0.4,
          fill: true,
          borderWidth: 3,
          pointBackgroundColor: '#0B0F19',
          pointBorderColor: '#EF4444',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: {
            color: '#94A3B8',
            font: { family: 'Inter', size: 12 }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { color: '#94A3B8', font: { family: 'Inter' } }
        },
        x: {
          grid: { display: false },
          ticks: { color: '#94A3B8', font: { family: 'Inter' } }
        }
      }
    }
  });
  
  // Breakdown chart (Doughnut)
  breakdownChart = new Chart(breakdownCtx.getContext('2d'), {
    type: 'doughnut',
    data: getBreakdownChartData(),
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: {
            color: '#94A3B8',
            font: { family: 'Inter', size: 11 },
            boxWidth: 12
          }
        }
      },
      cutout: '70%',
      elements: {
        arc: {
          borderWidth: 0
        }
      }
    }
  });
}

function getBreakdownChartData() {
  const counts = {
    currency: 0,
    cheque: 0,
    signature: 0,
    document: 0,
    qr: 0
  };
  
  verificationHistory.forEach(h => {
    if (counts.hasOwnProperty(h.moduleKey)) {
      counts[h.moduleKey]++;
    }
  });
  
  return {
    labels: ['Currency', 'Cheques', 'Signatures', 'Documents', 'QR Code'],
    datasets: [{
      data: [
        counts.currency || 1,
        counts.cheque || 1,
        counts.signature || 1,
        counts.document || 1,
        counts.qr || 1
      ],
      backgroundColor: ['#3B82F6', '#0EA5E9', '#8B5CF6', '#F59E0B', '#10B981'],
      borderWidth: 2,
      borderColor: '#0B0F19'
    }]
  };
}

function updateCharts() {
  if (!trendChart || !breakdownChart) return;
  
  // Add today's scan to trend (simulation)
  const currentTrendData = trendChart.data.datasets[0].data;
  currentTrendData[currentTrendData.length - 1] = currentTrendData[currentTrendData.length - 1] + 1;
  
  // Update breakdown
  breakdownChart.data = getBreakdownChartData();
  
  // Render
  trendChart.update();
  breakdownChart.update();
}
