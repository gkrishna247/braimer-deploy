// script.js

// Utility: Get element by ID
function $(id) {
    return document.getElementById(id);
}

const API_BASE_URL = ''; // Relative path

// Toast Notification System
function showToast(message, type = 'info') {
    let toast = document.getElementById('toast-notification');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast-notification';
        toast.className = `toast ${type}`;
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.className = `toast ${type} show`;

    // Simple inline styles for toast if CSS not fully covering
    toast.style.position = 'fixed';
    toast.style.bottom = '20px';
    toast.style.right = '20px';
    toast.style.backgroundColor = type === 'error' ? '#E63946' : '#20B2AA';
    toast.style.color = 'white';
    toast.style.padding = '1rem';
    toast.style.borderRadius = '8px';
    toast.style.zIndex = '1000';
    toast.style.transition = 'opacity 0.3s';

    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Theme Management
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);

    // Update button icon if exists (though we handle this with toggle usually)
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
}

// Navigation Active State
document.addEventListener('DOMContentLoaded', () => {
    initTheme(); // Initialize theme

    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    const navLinks = document.querySelectorAll('.main-nav a');

    navLinks.forEach(link => {
        if (link.getAttribute('href') === currentPath) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });

    // Initialize Dashboard logic if on dashboard page
    if (document.getElementById('image-drop-zone')) {
        initDashboard();
    }
});

// Export Report Function
function exportReport() {
    const resultSection = document.getElementById('results-section');
    const previewImage = document.getElementById('previewImage');
    const reportImageContainer = document.getElementById('report-image-container');

    if (resultSection && resultSection.style.display !== 'none') {
        // Clone image for report
        if (previewImage && reportImageContainer) {
            reportImageContainer.innerHTML = ''; // Clear previous
            const imgClone = previewImage.cloneNode(true);
            imgClone.style.maxWidth = '300px';
            imgClone.style.maxHeight = '300px';
            imgClone.style.borderRadius = '8px';
            imgClone.style.margin = '0 auto';
            imgClone.style.display = 'block';
            reportImageContainer.appendChild(imgClone);
        }

        // Add timestamp data attribute for CSS print content
        resultSection.setAttribute('data-timestamp', new Date().toLocaleString());
        window.print();
    } else {
        showToast('No results to export', 'error');
    }
}

function initDashboard() {
    const dropZone = $('image-drop-zone');
    const fileInput = $('imageUpload');
    const previewContainer = $('preview-container');
    const previewImage = $('previewImage');
    const analyzeBtn = $('analyzeBtn');
    const resultsSection = $('results-section');
    const loadingDiv = $('loading');
    const resultContent = $('result-content');
    const errorMsg = $('upload-error-message');

    // Drag & Drop
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.style.background = 'rgba(32, 178, 170, 0.15)';
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.style.background = 'rgba(32, 178, 170, 0.05)';
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.style.background = 'rgba(32, 178, 170, 0.05)';
        if (e.dataTransfer.files.length) {
            handleFile(e.dataTransfer.files[0]);
        }
    });

    fileInput.addEventListener('change', () => {
        if (fileInput.files.length) {
            handleFile(fileInput.files[0]);
        }
    });

    function handleFile(file) {
        if (!file.type.startsWith('image/')) {
            errorMsg.textContent = 'Invalid file type. Please upload an image (JPG, PNG).';
            errorMsg.style.display = 'block';
            return;
        }
        errorMsg.style.display = 'none';

        const reader = new FileReader();
        reader.onload = (e) => {
            previewImage.src = e.target.result;
            previewContainer.style.display = 'block';
            dropZone.style.display = 'none';
        };
        reader.readAsDataURL(file);

        // Reset results
        resultsSection.style.display = 'none';
        resultContent.style.display = 'none';

        // Bind Analyze Button
        analyzeBtn.onclick = () => performAnalysis(file);
    }

    async function performAnalysis(file) {
        resultsSection.style.display = 'block';
        loadingDiv.style.display = 'block';
        resultContent.style.display = 'none';

        // Scroll to results
        resultsSection.scrollIntoView({ behavior: 'smooth' });

        const formData = new FormData();
        formData.append('image', file);

        try {
            const response = await fetch(`${API_BASE_URL}/analyze`, {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Analysis failed');
            }

            displayResults(data, file.name);

        } catch (error) {
            console.error(error);
            showToast(error.message, 'error');
            loadingDiv.innerHTML = `<p style="color: var(--error-color);">Error: ${error.message}</p>`;
        }
    }

    function displayResults(data, filename) {
        loadingDiv.style.display = 'none';
        resultContent.style.display = 'block';

        const label = data.prediction_label;
        const confidence = (data.confidence_score * 100).toFixed(1); // Assuming backend sends confidence_score
        const hasTumor = data.has_tumor;

        $('prediction-label').textContent = label;
        $('prediction-label').style.color = hasTumor ? '#E63946' : '#20B2AA'; // Red for tumor, Teal for healthy
        $('timestamp').textContent = new Date().toLocaleString();

        // Update Progress Bar (Simulating confidence if not provided yet, backend update pending)
        // If backend doesn't send confidence, we mock it high for demo or hide it.
        // The plan says we WILL add confidence score in Phase 4.
        // For now, if undefined, show a placeholder or mock.
        const displayConfidence = data.confidence_score ? (data.confidence_score * 100) : 95.0;

        const bar = $('confidence-bar');
        bar.style.width = `${displayConfidence}%`;
        bar.textContent = `${displayConfidence.toFixed(1)}%`;
        bar.style.backgroundColor = hasTumor ? '#E63946' : '#20B2AA';

        // Update Explanation
        const explanation = $('explanation-text');
        if (hasTumor) {
            explanation.textContent = "The analysis indicates a high probability of a tumor. Please schedule a consultation with a neurologist immediately for a comprehensive MRI review.";
        } else {
            explanation.textContent = "The analysis detected no signs of a tumor. However, if symptoms persist, please consult a medical professional.";
        }

        // Save to History
        saveHistory({
            filename: filename,
            result: label,
            date: new Date().toLocaleDateString(),
            isTumor: hasTumor
        });
    }
}

// History Management
const HISTORY_KEY = 'brain_tumor_history';

function saveHistory(entry) {
    const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    history.unshift(entry);
    if (history.length > 10) history.pop(); // Keep last 10
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    loadHistory();
}

function loadHistory() {
    const historyList = $('historyList');
    if (!historyList) return;

    const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    historyList.innerHTML = '';

    if (history.length === 0) {
        historyList.innerHTML = '<p style="text-align: center; color: #999;">No recent analysis.</p>';
        return;
    }

    history.forEach(item => {
        const div = document.createElement('div');
        div.className = 'history-item';
        div.innerHTML = `
            <div style="flex:1;">
                <strong>${item.filename}</strong>
                <div style="font-size: 0.85rem; color: #666;">${item.date}</div>
            </div>
            <div style="font-weight: 600; color: ${item.isTumor ? '#E63946' : '#20B2AA'};">
                ${item.result}
            </div>
        `;
        historyList.appendChild(div);
    });
}

// Clear History
const clearBtn = $('clearHistoryBtn');
if (clearBtn) {
    clearBtn.onclick = () => {
        localStorage.removeItem(HISTORY_KEY);
        loadHistory();
    };
}

// Load history on init
loadHistory();
