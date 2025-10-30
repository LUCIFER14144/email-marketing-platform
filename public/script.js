document.addEventListener('DOMContentLoaded', function() {
    // Load user info and display username
    if (window.currentUser) {
        const usernameDisplay = document.getElementById('username-display');
        if (usernameDisplay) {
            usernameDisplay.textContent = `👤 ${window.currentUser.username}`;
        }
    }
    
    const emailForm = document.getElementById('emailForm');
    const sendBtn = document.getElementById('sendBtn');
    const btnText = document.querySelector('.btn-text');
    const spinner = document.querySelector('.spinner');
    const result = document.getElementById('result');
    const providerSelect = document.getElementById('providerId');
    const providerInfo = document.getElementById('providerInfo');
    const providerEmail = document.getElementById('providerEmail');
    const providersList = document.getElementById('providersList');
    
    // Bulk email elements
    const bulkEmailForm = document.getElementById('bulkEmailForm');
    const bulkProviderSelect = document.getElementById('bulkProviderId');
    const emailListFile = document.getElementById('emailListFile');
    const emailPreview = document.getElementById('emailPreview');
    const bulkSendBtn = document.getElementById('bulkSendBtn');
    const bulkProgress = document.getElementById('bulkProgress');
    
    // Upload elements
    const smtpUploadForm = document.getElementById('smtpUploadForm');
    const emailUploadForm = document.getElementById('emailUploadForm');
    const emailListPreview = document.getElementById('emailListPreview');
    
    // Tab elements
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    let availableProviders = [];
    let currentEmailList = [];

    // Load available email providers
    loadEmailProviders();

    // Tab switching
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.dataset.tab;
            
            // Update active tab button
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Update active tab content
            tabContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === `${tabName}-tab`) {
                    content.classList.add('active');
                }
            });
            
            // Load specific tab content
            if (tabName === 'stats') {
                loadCampaignStats();
            }
        });
    });

    // Handle provider selection for single email
    providerSelect.addEventListener('change', function() {
        const selectedProvider = availableProviders.find(p => p.id === this.value);
        if (selectedProvider) {
            providerEmail.textContent = selectedProvider.user;
            providerInfo.style.display = 'block';
        } else {
            providerInfo.style.display = 'none';
        }
    });
    
    // Handle email list file upload preview
    emailListFile.addEventListener('change', function() {
        const file = this.files[0];
        if (file) {
            uploadEmailListPreview(file);
        }
    });

    // Button builder functionality
    const buttonStyleSelect = document.getElementById('buttonStyle');
    const bulkButtonStyleSelect = document.getElementById('bulkButtonStyle');
    const customColors = document.getElementById('customColors');
    const bulkCustomColors = document.getElementById('bulkCustomColors');

    // Show/hide custom color options
    buttonStyleSelect.addEventListener('change', function() {
        customColors.style.display = this.value === 'custom' ? 'flex' : 'none';
    });

    bulkButtonStyleSelect.addEventListener('change', function() {
        bulkCustomColors.style.display = this.value === 'custom' ? 'flex' : 'none';
    });

    // Insert button functionality for single email
    document.getElementById('insertButton').addEventListener('click', function() {
        const text = document.getElementById('buttonText').value.trim();
        const link = document.getElementById('buttonLink').value.trim();
        const style = document.getElementById('buttonStyle').value;
        
        if (!text || !link) {
            alert('Please enter both button text and link');
            return;
        }

        const buttonHtml = generateButtonHtml(text, link, style, false);
        insertAtCursor(document.getElementById('message'), buttonHtml);
        
        // Clear inputs
        document.getElementById('buttonText').value = '';
        document.getElementById('buttonLink').value = '';
    });

    // Insert button functionality for bulk email
    document.getElementById('insertBulkButton').addEventListener('click', function() {
        const text = document.getElementById('bulkButtonText').value.trim();
        const link = document.getElementById('bulkButtonLink').value.trim();
        const style = document.getElementById('bulkButtonStyle').value;
        
        if (!text || !link) {
            alert('Please enter both button text and link');
            return;
        }

        const buttonHtml = generateButtonHtml(text, link, style, true);
        insertAtCursor(document.getElementById('bulkMessage'), buttonHtml);
        
        // Clear inputs
        document.getElementById('bulkButtonText').value = '';
        document.getElementById('bulkButtonLink').value = '';
    });

    emailForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Disable form and show loading state
        setLoadingState(true);
        hideResult();

        // Get form data
        const formData = new FormData(emailForm);
        const emailData = {
            providerId: formData.get('providerId'),
            from: formData.get('from'),
            to: formData.get('to'),
            subject: formData.get('subject'),
            message: formData.get('message')
        };

        // Client-side validation
        if (!validateForm(emailData)) {
            setLoadingState(false);
            return;
        }

        try {
            const response = await fetch('/send-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(emailData)
            });

            const data = await response.json();

            if (data.success) {
                showResult('Email sent successfully! ✅', 'success');
                emailForm.reset();
            } else {
                showResult(`Error: ${data.error} ❌`, 'error');
            }
        } catch (error) {
            console.error('Network error:', error);
            showResult('Network error. Please check your connection and try again. 🔌', 'error');
        } finally {
            setLoadingState(false);
        }
    });

    function validateForm(data) {
        // Check provider selection
        if (!data.providerId) {
            showResult('Please select an email provider. 📧', 'error');
            return false;
        }

        // Check required fields
        if (!data.to || !data.subject || !data.message) {
            showResult('Please fill in all required fields. 📝', 'error');
            return false;
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(data.to)) {
            showResult('Please enter a valid email address. 📧', 'error');
            return false;
        }

        // Check message length
        if (data.message.length < 10) {
            showResult('Message should be at least 10 characters long. ✏️', 'error');
            return false;
        }

        return true;
    }

    async function loadEmailProviders() {
        try {
            const response = await fetch('/api/providers');
            const data = await response.json();
            
            if (data.success) {
                availableProviders = data.providers;
                populateProviderSelect();
                displayProviderStatus();
            } else {
                console.error('Failed to load providers:', data.error);
                showProviderError('Failed to load email providers');
            }
        } catch (error) {
            console.error('Error loading providers:', error);
            showProviderError('Unable to connect to server');
        }
    }

    function populateProviderSelect() {
        // Update both single and bulk provider selects
        const selects = [providerSelect, bulkProviderSelect];
        
        selects.forEach(select => {
            if (!select) return;
            
            // Clear existing options except the first one
            select.innerHTML = '<option value="">Select an email provider...</option>';
            
            if (availableProviders.length === 0) {
                const option = document.createElement('option');
                option.value = '';
                option.textContent = 'No providers configured';
                option.disabled = true;
                select.appendChild(option);
                return;
            }

            availableProviders.forEach(provider => {
                const option = document.createElement('option');
                option.value = provider.id;
                option.textContent = provider.label;
                select.appendChild(option);
            });

            // Auto-select if only one provider
            if (availableProviders.length === 1) {
                select.value = availableProviders[0].id;
                select.dispatchEvent(new Event('change'));
            }
        });
    }

    function displayProviderStatus() {
        if (availableProviders.length === 0) {
            providersList.innerHTML = '<div class="provider-item"><span class="provider-name">⚠️ No email providers configured</span></div>';
            return;
        }

        const providersHTML = availableProviders.map(provider => `
            <div class="provider-item">
                <div>
                    <div class="provider-name">${provider.label}</div>
                    <div class="provider-email">${provider.user}</div>
                </div>
                <span class="provider-status-badge status-ready">Ready</span>
            </div>
        `).join('');

        providersList.innerHTML = providersHTML;
    }

    function showProviderError(message) {
        providersList.innerHTML = `<div class="provider-item"><span class="provider-name" style="color: #dc3545;">❌ ${message}</span></div>`;
    }

    // Copy to clipboard function
    window.copyToClipboard = function(text) {
        navigator.clipboard.writeText(text).then(() => {
            // Show brief success message
            const originalText = event.target.textContent;
            event.target.textContent = '✅';
            setTimeout(() => {
                event.target.textContent = originalText;
            }, 1000);
        });
    };

    function setLoadingState(loading) {
        sendBtn.disabled = loading;
        emailForm.classList.toggle('form-loading', loading);
        
        if (loading) {
            btnText.style.display = 'none';
            spinner.style.display = 'inline';
        } else {
            btnText.style.display = 'inline';
            spinner.style.display = 'none';
        }
    }

    function showResult(message, type) {
        result.textContent = message;
        result.className = `result ${type}`;
        result.style.display = 'block';
        
        // Auto-hide success messages after 5 seconds
        if (type === 'success') {
            setTimeout(() => {
                hideResult();
            }, 5000);
        }
    }

    function hideResult() {
        result.style.display = 'none';
    }

    // Add input animations and validation feedback
    const inputs = document.querySelectorAll('input, textarea');
    inputs.forEach(input => {
        input.addEventListener('focus', function() {
            this.parentElement.classList.add('focused');
        });

        input.addEventListener('blur', function() {
            this.parentElement.classList.remove('focused');
            validateInput(this);
        });

        input.addEventListener('input', function() {
            clearInputError(this);
        });
    });

    function validateInput(input) {
        const value = input.value.trim();
        
        if (input.hasAttribute('required') && !value) {
            showInputError(input, 'This field is required');
            return false;
        }

        if (input.type === 'email' && value && !isValidEmail(value)) {
            showInputError(input, 'Please enter a valid email address');
            return false;
        }

        clearInputError(input);
        return true;
    }

    function showInputError(input, message) {
        clearInputError(input);
        input.style.borderColor = '#dc3545';
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'input-error';
        errorDiv.style.color = '#dc3545';
        errorDiv.style.fontSize = '0.875em';
        errorDiv.style.marginTop = '5px';
        errorDiv.textContent = message;
        
        input.parentElement.appendChild(errorDiv);
    }

    function clearInputError(input) {
        input.style.borderColor = '';
        const errorDiv = input.parentElement.querySelector('.input-error');
        if (errorDiv) {
            errorDiv.remove();
        }
    }

    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Character counter for message field
    const messageField = document.getElementById('message');
    const messageGroup = messageField.parentElement;
    
    const counter = document.createElement('div');
    counter.className = 'char-counter';
    counter.style.textAlign = 'right';
    counter.style.fontSize = '0.875em';
    counter.style.color = '#6c757d';
    counter.style.marginTop = '5px';
    messageGroup.appendChild(counter);

    messageField.addEventListener('input', function() {
        const length = this.value.length;
        counter.textContent = `${length} characters`;
        
        if (length < 10) {
            counter.style.color = '#dc3545';
        } else {
            counter.style.color = '#6c757d';
        }
    });

    // Bulk email form submission
    bulkEmailForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        if (currentEmailList.length === 0) {
            showResult('Please upload an email list first. 📧', 'error');
            return;
        }
        
        setBulkLoadingState(true);
        hideResult();
        
        const formData = new FormData(bulkEmailForm);
        const bulkData = {
            providerId: formData.get('providerId'),
            from: formData.get('from'),
            subject: formData.get('subject'),
            message: formData.get('message'),
            trackingEnabled: document.getElementById('trackingEnabled').checked,
            emailList: currentEmailList
        };
        
        try {
            const response = await fetch('/api/send-bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bulkData)
            });
            
            const data = await response.json();
            
            if (data.success) {
                showResult(`Bulk email campaign completed! 📊 Campaign ID: ${data.campaignId}`, 'success');
                bulkEmailForm.reset();
                currentEmailList = [];
                updateEmailPreview();
            } else {
                showResult(`Error: ${data.error} ❌`, 'error');
            }
        } catch (error) {
            console.error('Bulk email error:', error);
            showResult('Network error during bulk email sending. 🔌', 'error');
        } finally {
            setBulkLoadingState(false);
        }
    });

    // SMTP upload form submission
    smtpUploadForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const formData = new FormData(smtpUploadForm);
        
        try {
            const response = await fetch('/api/upload-smtp', {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            
            if (data.success) {
                showResult(`SMTP configuration uploaded successfully! ${data.message} 🎉`, 'success');
                loadEmailProviders(); // Refresh provider list
                smtpUploadForm.reset();
            } else {
                showResult(`Error: ${data.error} ❌`, 'error');
            }
        } catch (error) {
            console.error('SMTP upload error:', error);
            showResult('Failed to upload SMTP configuration. 🔌', 'error');
        }
    });

    // Email upload form submission
    emailUploadForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const formData = new FormData(emailUploadForm);
        
        try {
            const response = await fetch('/api/upload-emails', {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            
            if (data.success) {
                emailListPreview.innerHTML = `
                    <h4>✅ Email List Preview (${data.totalCount} total)</h4>
                    <div class="email-list">
                        ${data.emails.map(email => `<div class="email-item">${email.email} ${email.name ? `(${email.name})` : ''}</div>`).join('')}
                        ${data.totalCount > 10 ? `<div class="more-emails">... and ${data.totalCount - 10} more</div>` : ''}
                    </div>
                `;
                emailListPreview.classList.add('show');
                emailUploadForm.reset();
            } else {
                showResult(`Error: ${data.error} ❌`, 'error');
            }
        } catch (error) {
            console.error('Email upload error:', error);
            showResult('Failed to upload email list. 🔌', 'error');
        }
    });

    // Upload email list for bulk sending
    async function uploadEmailListPreview(file) {
        const formData = new FormData();
        formData.append('emailFile', file);
        
        try {
            const response = await fetch('/api/upload-emails', {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            
            if (data.success) {
                currentEmailList = data.emails || [];
                updateEmailPreview();
            } else {
                showResult(`Error: ${data.error} ❌`, 'error');
            }
        } catch (error) {
            console.error('Email list preview error:', error);
            showResult('Failed to preview email list. 🔌', 'error');
        }
    }

    function updateEmailPreview() {
        if (currentEmailList.length > 0) {
            emailPreview.innerHTML = `
                <h4>📧 Email List Ready (${currentEmailList.length} recipients)</h4>
                <div class="email-list">
                    ${currentEmailList.slice(0, 5).map(email => `<div class="email-item">${email.email} ${email.name ? `(${email.name})` : ''}</div>`).join('')}
                    ${currentEmailList.length > 5 ? `<div class="more-emails">... and ${currentEmailList.length - 5} more</div>` : ''}
                </div>
            `;
            emailPreview.classList.add('show');
        } else {
            emailPreview.innerHTML = '';
            emailPreview.classList.remove('show');
        }
    }

    function setBulkLoadingState(loading) {
        bulkSendBtn.disabled = loading;
        bulkEmailForm.classList.toggle('form-loading', loading);
        
        const bulkBtnText = bulkSendBtn.querySelector('.btn-text');
        const bulkSpinner = bulkSendBtn.querySelector('.spinner');
        
        if (loading) {
            bulkBtnText.style.display = 'none';
            bulkSpinner.style.display = 'inline';
            bulkProgress.style.display = 'block';
        } else {
            bulkBtnText.style.display = 'inline';
            bulkSpinner.style.display = 'none';
            bulkProgress.style.display = 'none';
        }
    }

    // Load campaign statistics
    async function loadCampaignStats() {
        try {
            const response = await fetch('/api/campaigns');
            const data = await response.json();
            
            if (data.success) {
                displayCampaignStats(data.campaigns);
            }
        } catch (error) {
            console.error('Failed to load campaign stats:', error);
        }
    }

    function displayCampaignStats(campaigns) {
        const campaignsList = document.getElementById('campaignsList');
        
        if (campaigns.length === 0) {
            campaignsList.innerHTML = '<p>No campaigns yet. Send a bulk email to see statistics here.</p>';
            return;
        }
        
        campaignsList.innerHTML = campaigns.map(campaign => `
            <div class="campaign-card">
                <div class="campaign-header">
                    <div class="campaign-title">${campaign.subject}</div>
                    <span class="campaign-status status-${campaign.status}">${campaign.status}</span>
                </div>
                <div class="campaign-info">
                    <small>Campaign ID: ${campaign.id}</small><br>
                    <small>Started: ${new Date(campaign.startTime).toLocaleString()}</small>
                </div>
                <div class="campaign-metrics">
                    <div class="metric-item">
                        <span class="metric-value">${campaign.totalEmails}</span>
                        <div class="metric-label">Total Emails</div>
                    </div>
                    <div class="metric-item">
                        <span class="metric-value">${campaign.sentCount}</span>
                        <div class="metric-label">Sent</div>
                    </div>
                    <div class="metric-item">
                        <span class="metric-value">${campaign.openCount}</span>
                        <div class="metric-label">Opens</div>
                    </div>
                    <div class="metric-item">
                        <span class="metric-value">${campaign.openRate}</span>
                        <div class="metric-label">Open Rate</div>
                    </div>
                    <div class="metric-item">
                        <span class="metric-value">${campaign.clickCount}</span>
                        <div class="metric-label">Clicks</div>
                    </div>
                    <div class="metric-item">
                        <span class="metric-value">${campaign.clickRate}</span>
                        <div class="metric-label">Click Rate</div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    // Insert text at cursor position
    function insertAtCursor(textarea, text) {
        const startPos = textarea.selectionStart;
        const endPos = textarea.selectionEnd;
        const scrollTop = textarea.scrollTop;
        
        textarea.value = textarea.value.substring(0, startPos) + text + textarea.value.substring(endPos);
        
        textarea.focus();
        textarea.selectionStart = startPos + text.length;
        textarea.selectionEnd = startPos + text.length;
        textarea.scrollTop = scrollTop;
        
        // Trigger input event to update character counter
        textarea.dispatchEvent(new Event('input'));
    }

    // Initialize character counter
    messageField.dispatchEvent(new Event('input'));
    
    // Initialize character counter for bulk message field
    const bulkMessageField = document.getElementById('bulkMessage');
    if (bulkMessageField) {
        const bulkMessageGroup = bulkMessageField.parentElement;
        
        const bulkCounter = document.createElement('div');
        bulkCounter.className = 'char-counter';
        bulkCounter.style.textAlign = 'right';
        bulkCounter.style.fontSize = '0.875em';
        bulkCounter.style.color = '#6c757d';
        bulkCounter.style.marginTop = '5px';
        bulkMessageGroup.appendChild(bulkCounter);

        bulkMessageField.addEventListener('input', function() {
            const length = this.value.length;
            bulkCounter.textContent = `${length} characters`;
            
            if (length < 10) {
                bulkCounter.style.color = '#dc3545';
            } else {
                bulkCounter.style.color = '#6c757d';
            }
        });
        
        bulkMessageField.dispatchEvent(new Event('input'));
    }

    // Initialize HTML upload functionality
    const htmlUploadForm = document.getElementById('htmlUploadForm');
    console.log('HTML upload form found:', htmlUploadForm ? 'Yes' : 'No');
    if (htmlUploadForm) {
        console.log('Adding event listener to HTML upload form');
        htmlUploadForm.addEventListener('submit', handleHtmlUpload);
        loadUserSession();
        loadUserHtmlFiles();
    }

    // Initialize link source toggle
    const linkSourceRadios = document.querySelectorAll('input[name="linkSource"]');
    if (linkSourceRadios.length > 0) {
        linkSourceRadios.forEach(radio => {
            radio.addEventListener('change', toggleLinkSource);
        });
    }
});

// Generate button HTML (moved outside DOMContentLoaded for global access)
function generateButtonHtml(text, link, style, isBulk) {
    let buttonStyles = {
        primary: { bg: '#007bff', text: '#ffffff' },
        success: { bg: '#28a745', text: '#ffffff' },
        warning: { bg: '#ffc107', text: '#212529' },
        danger: { bg: '#dc3545', text: '#ffffff' },
        custom: { 
            bg: isBulk ? document.getElementById('bulkBgColor')?.value : document.getElementById('bgColor')?.value,
            text: isBulk ? document.getElementById('bulkTextColor')?.value : document.getElementById('textColor')?.value
        }
    };

    const colors = buttonStyles[style] || buttonStyles.primary;
    
    return `
<div style="text-align: center; margin: 20px 0;">
    <a href="${link}" style="
        display: inline-block;
        padding: 12px 30px;
        background-color: ${colors.bg};
        color: ${colors.text};
        text-decoration: none;
        border-radius: 6px;
        font-weight: 600;
        font-size: 16px;
        font-family: Arial, sans-serif;
        border: none;
        cursor: pointer;
        transition: all 0.3s ease;
    " onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">
        ${text}
    </a>
</div>`;
}

// Load user session information
async function loadUserSession() {
    try {
        const response = await fetch('/api/user/session');
        const data = await response.json();
        
        const sessionInfo = document.getElementById('sessionInfo');
        if (sessionInfo && data.success) {
            sessionInfo.innerHTML = `
                <div><strong>Your IP:</strong> ${data.user.ip}</div>
                <div><strong>Session ID:</strong> ${data.user.sessionId}</div>
                <div><strong>Active since:</strong> ${new Date(data.user.createdAt).toLocaleString()}</div>
            `;
        }
    } catch (error) {
        console.error('Error loading session:', error);
    }
}

// Load user's HTML files
async function loadUserHtmlFiles() {
    try {
        const response = await fetch('/api/html-files');
        const data = await response.json();
        
        const htmlFilesList = document.getElementById('htmlFilesList');
        const desktopSelect = document.getElementById('desktopHtml');
        const mobileSelect = document.getElementById('mobileHtml');
        
        if (data.success && data.files && data.files.length > 0) {
            // Update file manager display
            if (htmlFilesList) {
                htmlFilesList.innerHTML = data.files.map(file => `
                    <div class="html-file-item">
                        <div class="file-info">
                            <div class="file-name">${file.originalName}</div>
                            <div class="file-meta">
                                Uploaded: ${new Date(file.uploadedAt).toLocaleString()}
                                <div class="device-badges">
                                    ${file.deviceType === 'desktop' || file.deviceType === 'both' ? '<span class="device-badge desktop">Desktop</span>' : ''}
                                    ${file.deviceType === 'mobile' || file.deviceType === 'both' ? '<span class="device-badge mobile">Mobile</span>' : ''}
                                </div>
                            </div>
                        </div>
                        <div class="file-actions">
                            <button class="action-btn preview-btn" onclick="previewHtmlFile('${file.publicUrl}')">Preview</button>
                            <button class="action-btn configure-btn" onclick="configureHtmlFile('${file.id}')">Configure</button>
                            <button class="action-btn delete-btn" onclick="deleteHtmlFile('${file.id}')">Delete</button>
                        </div>
                    </div>
                `).join('');
            }
            
            // Update select dropdowns
            if (desktopSelect && mobileSelect) {
                const options = data.files.map(file => 
                    `<option value="${file.id}">${file.originalName}</option>`
                ).join('');
                
                desktopSelect.innerHTML = '<option value="">Select HTML file for desktop users...</option>' + options;
                mobileSelect.innerHTML = '<option value="">Select HTML file for mobile users...</option>' + options;
            }
        } else {
            if (htmlFilesList) {
                htmlFilesList.innerHTML = '<div style="text-align: center; color: #6c757d; padding: 20px;">No HTML files uploaded yet.</div>';
            }
        }
    } catch (error) {
        console.error('Error loading HTML files:', error);
    }
}

// Handle HTML file upload
async function handleHtmlUpload(event) {
    console.log('HTML upload function called');
    event.preventDefault();
    
    const formData = new FormData();
    const files = document.getElementById('htmlFiles').files;
    console.log('Selected files:', files.length);
    
    if (!files || files.length === 0) {
        alert('Please select at least one HTML file to upload.');
        return;
    }
    
    for (let i = 0; i < files.length; i++) {
        formData.append('htmlFiles', files[i]);
    }
    
    try {
        const response = await fetch('/api/upload-html', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert(`Successfully uploaded ${data.files ? data.files.length : 'some'} HTML file(s)!`);
            document.getElementById('htmlUploadForm').reset();
            loadUserHtmlFiles(); // Refresh the file list
        } else {
            alert('Upload failed: ' + (data.message || data.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error uploading HTML files:', error);
        console.error('Error details:', error.message);
        alert('Error uploading files. Please try again. Error: ' + error.message);
    }
}

// Toggle between external URL and uploaded HTML sections
function toggleLinkSource() {
    const linkSource = document.querySelector('input[name="linkSource"]:checked').value;
    const externalSection = document.getElementById('externalUrlSection');
    const uploadedSection = document.getElementById('uploadedHtmlSection');
    
    if (linkSource === 'external') {
        externalSection.style.display = 'block';
        uploadedSection.style.display = 'none';
    } else {
        externalSection.style.display = 'none';
        uploadedSection.style.display = 'block';
    }
}

// Preview HTML file
function previewHtmlFile(publicUrl) {
    // publicUrl already contains the full path, just open it
    if (publicUrl) {
        window.open(publicUrl, '_blank');
    } else {
        alert('Preview URL not available');
    }
}

// Configure HTML file device settings
async function configureHtmlFile(fileId) {
    const deviceType = prompt('Enter device type: desktop, mobile, or both', 'both');
    
    if (deviceType !== null && ['desktop', 'mobile', 'both'].includes(deviceType.toLowerCase())) {
        try {
            const response = await fetch('/api/update-html-device', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    fileId: fileId,
                    deviceType: deviceType.toLowerCase()
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                alert('Device configuration updated successfully!');
                loadUserHtmlFiles(); // Refresh the list
            } else {
                alert('Configuration failed: ' + data.message);
            }
        } catch (error) {
            console.error('Error configuring file:', error);
            alert('Error updating configuration. Please try again.');
        }
    } else if (deviceType !== null) {
        alert('Invalid device type. Please enter: desktop, mobile, or both');
    }
}

// Delete HTML file
async function deleteHtmlFile(fileId) {
    if (confirm('Are you sure you want to delete this HTML file? This action cannot be undone.')) {
        try {
            const response = await fetch(`/api/html-files/${fileId}`, {
                method: 'DELETE'
            });
            
            const data = await response.json();
            
            if (data.success) {
                alert('HTML file deleted successfully!');
                loadUserHtmlFiles(); // Refresh the list
            } else {
                alert('Delete failed: ' + data.message);
            }
        } catch (error) {
            console.error('Error deleting file:', error);
            alert('Error deleting file. Please try again.');
        }
    }
}

// Generate button function for the dedicated button builder tab
function generateButton() {
    console.log('Generate button called');
    const linkSource = document.querySelector('input[name="linkSource"]:checked');
    console.log('Link source:', linkSource ? linkSource.value : 'not found');
    
    if (!linkSource) {
        alert('Please select a link source (External URL or Uploaded HTML File)');
        return;
    }
    
    const buttonText = document.getElementById('buttonText').value;
    const buttonStyle = document.getElementById('buttonStyle').value;
    
    let buttonUrl = '';
    
    if (linkSource.value === 'external') {
        buttonUrl = document.getElementById('buttonUrl').value;
        if (!buttonUrl) {
            alert('Please enter a button URL');
            return;
        }
    } else {
        const desktopHtml = document.getElementById('desktopHtml').value;
        const mobileHtml = document.getElementById('mobileHtml').value;
        
        console.log('Desktop HTML selected:', desktopHtml);
        console.log('Mobile HTML selected:', mobileHtml);
        
        if (!desktopHtml && !mobileHtml) {
            alert('Please select at least one HTML file');
            return;
        }
        
        // Create smart route URL with parameters
        const params = new URLSearchParams();
        if (desktopHtml) params.append('desktop', desktopHtml);
        if (mobileHtml) params.append('mobile', mobileHtml);
        
        // Get current host
        const host = window.location.origin;
        buttonUrl = `${host}/smart-route?${params.toString()}`;
        console.log('Generated smart route URL:', buttonUrl);
    }
    
    if (!buttonText) {
        alert('Please enter button text');
        return;
    }
    
    // Generate button HTML
    const buttonHtml = generateButtonHtml(buttonText, buttonUrl, buttonStyle, false);
    
    console.log('Generated button HTML:', buttonHtml);
    
    // Show preview
    const previewContainer = document.getElementById('previewContainer');
    const buttonPreview = document.getElementById('buttonPreview');
    const buttonCode = document.getElementById('buttonCode');
    const buttonHtmlTextarea = document.getElementById('buttonHtml');
    const buttonInfo = document.getElementById('buttonInfo');
    
    if (previewContainer) {
        previewContainer.innerHTML = buttonHtml;
    }
    
    if (buttonHtmlTextarea) {
        buttonHtmlTextarea.value = buttonHtml;
    }
    
    if (buttonInfo) {
        // Show info about the button
        if (linkSource.value === 'uploaded') {
            buttonInfo.textContent = '🎯 Smart button: Will automatically route users to the correct HTML file based on their device type (mobile/desktop)';
        } else {
            buttonInfo.textContent = '🔗 External link button: Will direct users to the specified URL';
        }
    }
    
    if (buttonPreview) buttonPreview.style.display = 'block';
    if (buttonCode) buttonCode.style.display = 'block';
    
    console.log('Button generation complete');
}

// Copy button code to clipboard
function copyButtonCode() {
    const buttonHtml = document.getElementById('buttonHtml');
    buttonHtml.select();
    buttonHtml.setSelectionRange(0, 99999); // For mobile devices
    
    navigator.clipboard.writeText(buttonHtml.value).then(() => {
        alert('Button HTML copied to clipboard!');
    }).catch(() => {
        // Fallback for older browsers
        document.execCommand('copy');
        alert('Button HTML copied to clipboard!');
    });
}

// Insert button into email body (for the dedicated builder tab)
function insertButtonToBody() {
    const buttonHtml = document.getElementById('buttonHtml').value;
    
    // Try to insert into single email tab
    const singleMessage = document.getElementById('message');
    if (singleMessage) {
        const cursorPos = singleMessage.selectionStart;
        const textBefore = singleMessage.value.substring(0, cursorPos);
        const textAfter = singleMessage.value.substring(cursorPos);
        singleMessage.value = textBefore + '\n\n' + buttonHtml + '\n\n' + textAfter;
    }
    
    // Also try to insert into bulk email tab
    const bulkMessage = document.getElementById('bulkMessage');
    if (bulkMessage) {
        const cursorPos = bulkMessage.selectionStart;
        const textBefore = bulkMessage.value.substring(0, cursorPos);
        const textAfter = bulkMessage.value.substring(cursorPos);
        bulkMessage.value = textBefore + '\n\n' + buttonHtml + '\n\n' + textAfter;
    }
    
    alert('Button inserted into email body! Switch to the Single Email or Bulk Email tab to see it.');
}

// Generate smart button with device-specific routing
function generateButton() {
    const linkSource = document.querySelector('input[name="linkSource"]:checked').value;
    const buttonText = document.getElementById('buttonText').value || 'Click Here';
    const buttonStyle = document.getElementById('buttonStyle').value;
    
    let buttonUrl = '';
    let buttonInfo = '';
    
    if (linkSource === 'external') {
        buttonUrl = document.getElementById('buttonUrl').value;
        if (!buttonUrl) {
            alert('Please enter a button URL.');
            return;
        }
        buttonInfo = 'External link - same for all devices';
    } else {
        const desktopHtml = document.getElementById('desktopHtml').value;
        const mobileHtml = document.getElementById('mobileHtml').value;
        
        if (!desktopHtml && !mobileHtml) {
            alert('Please select at least one HTML file (desktop or mobile).');
            return;
        }
        
        // Create smart routing URL
        buttonUrl = '/api/html/smart-route';
        if (desktopHtml && mobileHtml) {
            buttonUrl += `?desktop=${encodeURIComponent(desktopHtml)}&mobile=${encodeURIComponent(mobileHtml)}`;
            buttonInfo = 'Smart routing - different files for desktop and mobile';
        } else if (desktopHtml) {
            buttonUrl += `?file=${encodeURIComponent(desktopHtml)}`;
            buttonInfo = 'Single file - same for all devices';
        } else if (mobileHtml) {
            buttonUrl += `?file=${encodeURIComponent(mobileHtml)}`;
            buttonInfo = 'Single file - same for all devices';
        }
    }
    
    // Generate button HTML
    const buttonHtml = generateButtonHtml(buttonText, buttonUrl, buttonStyle, false);
    
    // Update preview and code sections
    const previewContainer = document.getElementById('previewContainer');
    const buttonHtmlTextarea = document.getElementById('buttonHtml');
    const buttonInfoElement = document.getElementById('buttonInfo');
    
    if (previewContainer) {
        previewContainer.innerHTML = buttonHtml;
    }
    
    if (buttonHtmlTextarea) {
        buttonHtmlTextarea.value = buttonHtml;
    }
    
    if (buttonInfoElement) {
        buttonInfoElement.textContent = buttonInfo;
        buttonInfoElement.style.color = linkSource === 'uploaded' ? '#28a745' : '#007bff';
    }
    
    // Show the preview and code sections
    document.getElementById('buttonPreview').style.display = 'block';
    document.getElementById('buttonCode').style.display = 'block';
}

// Copy button code to clipboard
function copyButtonCode() {
    const buttonHtml = document.getElementById('buttonHtml');
    buttonHtml.select();
    document.execCommand('copy');
    alert('Button HTML code copied to clipboard!');
}

// Insert button into email body
function insertButtonToBody() {
    const buttonHtml = document.getElementById('buttonHtml').value;
    const messageField = document.getElementById('message');
    
    if (messageField && buttonHtml) {
        const currentValue = messageField.value;
        const newValue = currentValue + (currentValue ? '\n\n' : '') + buttonHtml;
        messageField.value = newValue;
        alert('Button inserted into email body!');
    } else {
        alert('No button code to insert or message field not found.');
    }
}

// Logout function
async function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        try {
            const response = await fetch('/api/auth/logout', {
                method: 'POST'
            });
            
            const data = await response.json();
            
            if (data.success) {
                window.location.href = '/login.html';
            } else {
                alert('Logout failed. Please try again.');
            }
        } catch (error) {
            console.error('Logout error:', error);
            alert('Logout failed. Please try again.');
        }
    }
}