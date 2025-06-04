// script.js

// Utility: Get element by ID (shorter, safer)
function $(id) {
    return document.getElementById(id);
}

// Configuration
const API_BASE_URL = 'http://127.0.0.1:5000/'; // Use '' for relative paths (same origin), or e.g., 'https://your-api-domain.com'

// Toast Notification System
function showToast(message, type = 'info') {
    let toast = document.getElementById('toast-notification');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast-notification';
        toast.setAttribute('aria-live', 'polite');
        toast.setAttribute('role', 'status');
        toast.style.position = 'fixed';
        toast.style.bottom = '2rem';
        toast.style.right = '2rem';
        toast.style.zIndex = '9999';
        toast.style.minWidth = '220px';
        toast.style.padding = '1rem 1.5rem';
        toast.style.borderRadius = '8px';
        toast.style.boxShadow = '0 2px 12px rgba(0,0,0,0.15)';
        toast.style.fontWeight = 'bold';
        toast.style.fontSize = '1rem';
        toast.style.transition = 'opacity 0.3s';
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.style.background = type === 'error' ? '#ff6f61' : (type === 'success' ? '#4CAF50' : '#222e3c');
    toast.style.color = '#fff';
    toast.style.opacity = '1';
    setTimeout(() => {
        toast.style.opacity = '0';
    }, 3000);
}

// Login Function
function login() {
    const email = $('login-email')?.value.trim();
    const password = $('login-password')?.value;
    if (!email || !password) {
        showToast('Please enter both email and password.', 'error');
        return;
    }
    fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    })
    .then(response => {
        if (response.ok) {
            window.location.href = 'dashboard.html';
        } else {
            showToast('Invalid credentials', 'error');
        }
    })
    .catch(error => {
        console.error('Login Error:', error);
        showToast('An error occurred during login. Please try again later.', 'error');
    });
}

// Theme Toggle Function
function toggleTheme() {
    const root = document.documentElement;
    root.classList.toggle('light-theme');
    localStorage.setItem('theme', root.classList.contains('light-theme') ? 'light' : 'dark');
}

// Apply saved theme on load
(function() {
    const theme = localStorage.getItem('theme');
    if (theme === 'light') {
        document.documentElement.classList.add('light-theme');
    } else {
        // Ensure dark theme is applied if 'light-theme' class is not present
        // This handles the case where 'theme' might be 'dark' or null/undefined initially
        document.documentElement.classList.remove('light-theme');
    }
})();

// DOMContentLoaded event for all page-specific logic
document.addEventListener('DOMContentLoaded', function() {
    // Navigation Highlight (optimized)
    const navLinks = document.querySelectorAll('nav a');
    const currentPathname = window.location.pathname;

    // Clear active class from all links first
    navLinks.forEach(nav => nav.classList.remove('active'));

    // Set active class on the current link
    navLinks.forEach(link => {
        const linkHref = link.getAttribute('href');
        // Ensure linkHref is not null and handle relative paths correctly
        if (linkHref && (currentPathname.endsWith(linkHref) || (linkHref === './' && (currentPathname.endsWith('/index.html') || currentPathname.endsWith('/'))))) {
            link.classList.add('active');
        }
    });

    // Add click listener to update active class on navigation
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            navLinks.forEach(nav => nav.classList.remove('active'));
            link.classList.add('active');
            // Note: If the click navigates away, the DOMContentLoaded logic above will re-apply active on page load.
            // This click listener is mostly for SPA-like behavior or if navigation doesn't cause a full reload.
        });
    });

    // Smooth Scroll for Navigation Links (skip external links and ensure target exists)
    document.querySelectorAll('nav a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const targetId = this.getAttribute('href'); // e.g., "#section1"
            if (targetId && targetId.length > 1) { // Ensure it's not just "#"
                try {
                    const targetElement = document.querySelector(targetId);
                    if (targetElement) {
                        e.preventDefault();
                        targetElement.scrollIntoView({ behavior: 'smooth' });
                    } else {
                        console.warn(`Smooth scroll target '${targetId}' not found.`);
                    }
                } catch (error) {
                    console.error(`Invalid selector for smooth scroll: '${targetId}'`, error);
                }
            }
        });
    });

    // Animation on Scroll (IntersectionObserver)
    const features = document.querySelectorAll('.feature');
    if (features.length > 0) { // Only proceed if features exist
        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver(entries => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('animate');
                        observer.unobserve(entry.target); // Optional: stop observing once animated
                    }
                });
            }, { threshold: 0.5 });
            features.forEach(feature => observer.observe(feature));
        } else {
            // Fallback: add animate class immediately
            features.forEach(feature => feature.classList.add('animate'));
        }
    }

    // Generic Scroll-triggered Animation (IntersectionObserver for .scroll-animate)
    const scrollAnimatedElements = document.querySelectorAll('.scroll-animate');
    if (scrollAnimatedElements.length > 0) {
        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver(entries => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('is-visible'); // Triggers .section-fade-in-up
                        observer.unobserve(entry.target); // Stop observing once animated
                    }
                });
            }, { threshold: 0.1 }); // Trigger when 10% of the element is visible

            scrollAnimatedElements.forEach(element => observer.observe(element));
        } else {
            // Fallback for browsers that don't support IntersectionObserver
            scrollAnimatedElements.forEach(element => element.classList.add('is-visible'));
        }
    }

    // Dashboard page logic
    if (window.location.pathname.endsWith('dashboard.html')) {
        const imageUploadInput = $('imageUpload'); // Actual file input, visually hidden
        const imageDropZone = $('image-drop-zone');
        const previewImage = $('previewImage');
        const loadingMessage = $('loadingMessage');
        const detectionResult = $('detectionResult');
        const historyList = $('historyList'); // Existing element
        const uploadErrorMessage = $('upload-error-message');
        const clearHistoryBtn = $('clearHistoryBtn'); // New button

        // --- Analysis History Functions ---
        const MAX_HISTORY_ENTRIES = 20;
        const HISTORY_STORAGE_KEY = 'analysisHistory';

        function loadHistory() {
            if (!historyList) {
                console.warn('History list element not found.');
                return;
            }
            historyList.innerHTML = ''; // Clear existing items

            try {
                const history = JSON.parse(localStorage.getItem(HISTORY_STORAGE_KEY)) || [];
                if (history.length === 0) {
                    const li = document.createElement('li');
                    li.textContent = 'No analysis history yet.';
                    historyList.appendChild(li);
                    return;
                }

                history.forEach(entry => {
                    const li = document.createElement('li');
                    li.classList.add('history-item'); // For styling

                    const timestampSpan = document.createElement('span');
                    timestampSpan.classList.add('history-timestamp');
                    timestampSpan.textContent = entry.timestamp;

                    const nameSpan = document.createElement('span');
                    nameSpan.classList.add('history-name');
                    nameSpan.textContent = `Image: ${entry.imageName}`;

                    const resultSpan = document.createElement('span');
                    resultSpan.classList.add('history-result');
                    resultSpan.textContent = `Result: ${entry.resultLabel}`;

                    const previewImg = document.createElement('img');
                    previewImg.classList.add('history-preview');
                    previewImg.src = entry.previewSrc;
                    previewImg.alt = `Preview of ${entry.imageName}`;
                    previewImg.style.width = '50px'; // Keep small
                    previewImg.style.height = '50px';
                    previewImg.style.objectFit = 'cover';
                    previewImg.style.marginRight = '10px';


                    li.appendChild(previewImg);
                    li.appendChild(timestampSpan);
                    li.appendChild(nameSpan);
                    li.appendChild(resultSpan);
                    historyList.appendChild(li);
                });
            } catch (e) {
                console.error('Error loading or parsing history from localStorage:', e);
                showToast('Could not load analysis history.', 'error');
                const li = document.createElement('li');
                li.textContent = 'Error loading history.';
                historyList.appendChild(li);
            }
        }

        function saveHistoryEntry(entry) {
            if (!previewImage) { // Check if previewImage is available for src
                console.warn("Preview image element not found, cannot save previewSrc for history.");
                // return; // Optionally skip saving if preview is critical
            }
            try {
                let history = JSON.parse(localStorage.getItem(HISTORY_STORAGE_KEY)) || [];
                history.unshift(entry); // Add to the beginning
                if (history.length > MAX_HISTORY_ENTRIES) {
                    history = history.slice(0, MAX_HISTORY_ENTRIES); // Keep only the latest 20
                }
                localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
            } catch (e) {
                console.error('Error saving history to localStorage:', e);
                showToast('Could not save analysis to history.', 'error');
            }
        }

        if (clearHistoryBtn) {
            clearHistoryBtn.addEventListener('click', () => {
                try {
                    localStorage.removeItem(HISTORY_STORAGE_KEY);
                    loadHistory(); // Refresh the list (will show "No history")
                    showToast('Analysis history cleared.', 'success');
                } catch (e) {
                    console.error('Error clearing history from localStorage:', e);
                    showToast('Could not clear analysis history.', 'error');
                }
            });
        }
        // --- End Analysis History Functions ---


        function clearUploadState() {
            if (previewImage) {
                previewImage.style.display = 'none';
                previewImage.src = '#';
            }
            if (uploadErrorMessage) {
                uploadErrorMessage.textContent = '';
                uploadErrorMessage.style.display = 'none';
            }
            if (detectionResult) {
                detectionResult.style.display = 'none';
                detectionResult.textContent = '';
            }
            if (imageUploadInput) {
                imageUploadInput.value = ''; // Reset file input value
            }
        }

        function handleFile(file) {
            clearUploadState();

            if (!file) {
                // This case might occur if a user deselects a file from input, or drag action had no files.
                // console.log("No file provided or selection cancelled.");
                return;
            }

            // Validate file type
            if (!file.type.startsWith('image/')) {
                const errorMsg = 'Invalid file type. Please upload an image (e.g., JPG, PNG).';
                if (uploadErrorMessage) {
                    uploadErrorMessage.textContent = errorMsg;
                    uploadErrorMessage.style.display = 'block';
                } else {
                    showToast(errorMsg, 'error');
                }
                return;
            }

            if (previewImage) { // Ensure previewImage element exists
                const reader = new FileReader();
                reader.onload = function(e) {
                    previewImage.src = e.target.result;
                    previewImage.style.display = 'block';
                    if (detectionResult) detectionResult.style.display = 'none'; // Hide previous result

                    if (loadingMessage) {
                        loadingMessage.innerHTML = '<div class="loader"></div><p>Analyzing, please wait...</p>';
                        loadingMessage.style.display = 'block';
                    }
                    processImage(file); // Call existing analysis function
                };
                reader.onerror = function() {
                    // console.error("FileReader error."); // Keep for debugging if needed
                    const errorMsg = "Error reading file. Please try again.";
                    showToast(errorMsg, 'error'); // Use showToast for user feedback
                    if (uploadErrorMessage) { // Still update specific error UI if available
                        uploadErrorMessage.textContent = errorMsg;
                        uploadErrorMessage.style.display = 'block';
                    }
                    if (loadingMessage) loadingMessage.style.display = 'none';
                };
                reader.readAsDataURL(file);
            } else {
                // Fallback if previewImage is not available, directly process
                if (loadingMessage) {
                    loadingMessage.innerHTML = '<div class="loader"></div><p>Analyzing, please wait...</p>';
                    loadingMessage.style.display = 'block';
                }
                processImage(file);
            }
        }

        if (imageDropZone) {
            // Clicking the drop zone should trigger the hidden file input
            imageDropZone.addEventListener('click', (e) => {
                // Prevent triggering if the click is on the browse button itself or its children
                if (e.target.closest('.browse-button') || e.target.id === 'imageUpload') {
                    return;
                }
                imageUploadInput.click();
            });

            imageDropZone.addEventListener('dragenter', (e) => {
                e.preventDefault();
                imageDropZone.classList.add('drag-over');
            });

            imageDropZone.addEventListener('dragover', (e) => {
                e.preventDefault(); // Necessary for drop to work
                imageDropZone.classList.add('drag-over'); // Keep class while dragging over
            });

            imageDropZone.addEventListener('dragleave', (e) => {
                imageDropZone.classList.remove('drag-over');
            });

            imageDropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                imageDropZone.classList.remove('drag-over');
                const file = e.dataTransfer.files[0];
                if (file) {
                    handleFile(file);
                }
            });
        }

        if (imageUploadInput) {
            imageUploadInput.addEventListener('change', function(event) {
                const file = event.target.files[0];
                handleFile(file); // The handleFile function now includes validation and preview logic
            });
        }

        // Check if all essential dashboard elements exist for processImage
        if (loadingMessage && detectionResult) {
            // processImage function remains largely the same, but relies on handleFile for UI setup
            function processImage(file) {
                const formData = new FormData();
                formData.append('image', file);

                fetch(`${API_BASE_URL}/analyze`, { // Using relative path or configured base URL
                    method: 'POST',
                    body: formData
                    // No 'Content-Type' header for FormData, browser sets it with boundary
                })
                .then(response => {
                    if (!response.ok) {
                        // Try to parse error from backend if available
                        return response.json().then(errData => {
                            throw new Error(errData.error || `Network response was not ok: ${response.statusText}`);
                        }).catch(() => {
                            // If parsing error JSON fails, use the original status text
                            throw new Error(`Network response was not ok: ${response.statusText}`);
                        });
                    }
                    return response.json();
                })
                .then(data => {
                    if (loadingMessage) {
                        loadingMessage.style.display = 'none';
                        loadingMessage.innerHTML = ''; // Clear spinner and text
                    }
                    // Corrected: Use data.message (or data.prediction_label) from backend response
                    detectionResult.textContent = data.message || 'Analysis complete. No specific message.';
                    detectionResult.style.display = 'block';

                    // Add the toast notification here:
                    const toastMessage = data.message || data.prediction_label || 'Analysis complete!';
                    showToast(toastMessage, 'success'); // Display success toast

                    // Save to history
                    if (file && previewImage && (data.message || data.prediction_label)) {
                        const historyEntry = {
                            timestamp: new Date().toLocaleString(),
                            imageName: file.name,
                            previewSrc: previewImage.src, // Already a data URL from FileReader
                            resultLabel: data.prediction_label || data.message
                        };
                        saveHistoryEntry(historyEntry);
                        loadHistory(); // Refresh the displayed history list
                    } else {
                        // Fallback if some info is missing, or just call loadHistory to ensure UI consistency
                        loadHistory();
                    }
                })
                .catch(error => {
                    console.error('Analysis Error:', error);
                    if (loadingMessage) {
                        loadingMessage.style.display = 'none';
                        loadingMessage.innerHTML = ''; // Clear spinner and text
                    }
                    detectionResult.textContent = 'Error during analysis: ' + error.message;
                    detectionResult.style.display = 'block';
                    showToast('Error during analysis: ' + error.message, 'error');
                });
            }
        } else {
            console.warn('One or more dashboard elements (imageUpload, previewImage, loadingMessage, detectionResult) not found for processImage.');
        }
        // Initial load of history for dashboard page
        loadHistory();
    }

    // Initialize Contact Form Logic
    function initContactForm() {
        const contactForm = document.querySelector('form[aria-label="Contact form"]');
        if (contactForm) {
            contactForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const name = $('name')?.value.trim();
                const emailInput = $('email'); // Assuming 'email' is the ID for the contact form email
                const email = emailInput?.value.trim();
                const message = $('message')?.value.trim();

                let isValid = true;
                let missingFields = [];

                if (!name) {
                    missingFields.push('Name');
                    isValid = false;
                }
                if (!email) {
                    missingFields.push('Email');
                    isValid = false;
                } else {
                    // Basic email format validation
                    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (!emailPattern.test(email)) {
                        showToast('Please enter a valid email address.', 'error');
                        emailInput?.focus(); // Focus on the email field
                        return;
                    }
                }
                if (!message) {
                    missingFields.push('Message');
                    isValid = false;
                }

                if (!isValid) {
                    showToast(`Please fill out all required fields: ${missingFields.join(', ')}.`, 'error');
                    return;
                }
                showToast('Thank you for your message! (This is a demo, form data is not sent).', 'success');
                contactForm.reset();
            });
        }
    }
    initContactForm(); // Call the function to set up the contact form
});