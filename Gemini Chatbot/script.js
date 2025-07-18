// DOM Elements
const chatMessages = document.getElementById('chat-messages');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');
const apiKeyInput = document.getElementById('api-key');
const saveApiKeyButton = document.getElementById('save-api-key');
const imageUpload = document.getElementById('image-upload');
const voiceRecordButton = document.getElementById('voice-record-button');
const stopRecordingButton = document.getElementById('stop-recording-button');
const recordingIndicator = document.getElementById('recording-indicator');
const recordingTime = document.getElementById('recording-time');
const previewContainer = document.getElementById('preview-container');

// Variables
let apiKey = localStorage.getItem('gemini-api-key') || '';
let mediaFiles = []; // Array to store media files (images or audio)
let mediaType = ''; // 'image' or 'audio'
let recorder = null;
let audioChunks = [];
let recordingTimer = null;
let recordingDuration = 0;

// Initialize
function init() {
    // Set API key from local storage if available
    if (apiKey) {
        apiKeyInput.value = '••••••••••••••••••';
    }

    // Auto resize textarea as user types
    userInput.addEventListener('input', () => {
        userInput.style.height = 'auto';
        userInput.style.height = (userInput.scrollHeight) + 'px';
        // Reset to default height if empty
        if (userInput.value === '') {
            userInput.style.height = '';
        }
    });

    // Create image modal for enlarged view
    createImageModal();

    // Event listeners
    sendButton.addEventListener('click', handleSendMessage);
    userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    });
    saveApiKeyButton.addEventListener('click', saveApiKey);
    
    // Image upload event
    imageUpload.addEventListener('change', handleImageUpload);
    
    // Voice recording events
    voiceRecordButton.addEventListener('click', startVoiceRecording);
    stopRecordingButton.addEventListener('click', stopVoiceRecording);
}

// Create image modal for enlarged view
function createImageModal() {
    const modal = document.createElement('div');
    modal.classList.add('image-modal');
    
    const modalImg = document.createElement('img');
    modal.appendChild(modalImg);
    
    const closeButton = document.createElement('button');
    closeButton.classList.add('image-modal-close');
    closeButton.innerHTML = '<i class="fas fa-times"></i>';
    closeButton.addEventListener('click', () => {
        modal.classList.remove('active');
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });
    
    modal.appendChild(closeButton);
    document.body.appendChild(modal);
}

// Open image in modal
function openImageModal(imageSrc) {
    const modal = document.querySelector('.image-modal');
    const modalImg = modal.querySelector('img');
    modalImg.src = imageSrc;
    modal.classList.add('active');
}

// Save API Key
function saveApiKey() {
    const newApiKey = apiKeyInput.value;
    if (newApiKey) {
        apiKey = newApiKey;
        localStorage.setItem('gemini-api-key', newApiKey);
        apiKeyInput.value = '••••••••••••••••••';
        showBotMessage('API key saved successfully! You can now chat with me.');
    } else {
        showBotMessage('Please enter a valid API key to continue.');
    }
}

// Handle image upload
function handleImageUpload(e) {
    const files = e.target.files;
    if (!files.length) return;
    
    // Clear any existing audio files if present
    if (mediaType === 'audio') {
        clearMediaPreviews();
    }
    
    mediaType = 'image';
    
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.type.startsWith('image/')) {
            // Only add the file if it's an image
            addImagePreview(file);
            mediaFiles.push(file);
        }
    }
    
    // Reset the input to allow selecting the same file again
    imageUpload.value = '';
}

// Add image preview
function addImagePreview(file) {
    const reader = new FileReader();
    
    reader.onload = function(e) {
        const previewEl = document.createElement('div');
        previewEl.classList.add('image-preview');
        
        const img = document.createElement('img');
        img.src = e.target.result;
        
        const removeButton = document.createElement('button');
        removeButton.classList.add('remove-image');
        removeButton.innerHTML = '<i class="fas fa-times"></i>';
        removeButton.addEventListener('click', () => {
            const index = mediaFiles.indexOf(file);
            if (index > -1) {
                mediaFiles.splice(index, 1);
            }
            previewEl.remove();
            if (mediaFiles.length === 0) {
                mediaType = '';
            }
        });
        
        previewEl.appendChild(img);
        previewEl.appendChild(removeButton);
        previewContainer.appendChild(previewEl);
    };
    
    reader.readAsDataURL(file);
}

// Start voice recording
async function startVoiceRecording() {
    try {
        // Check if browser supports MediaRecorder
        if (!window.MediaRecorder) {
            showBotMessage('Your browser does not support voice recording. Please use a modern browser like Chrome or Firefox.');
            return;
        }
        
        // Clear any existing files if present
        clearMediaPreviews();
        
        // Reset audio chunks
        audioChunks = [];
        
        // Get user media
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // Create media recorder
        recorder = new MediaRecorder(stream);
        
        // Set recorder events
        recorder.addEventListener('dataavailable', (e) => {
            audioChunks.push(e.data);
        });
        
        recorder.addEventListener('stop', () => {
            // Create audio blob
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            mediaFiles = [audioBlob];
            mediaType = 'audio';
            
            // Add audio preview
            addAudioPreview(audioBlob);
            
            // Stop all tracks
            stream.getTracks().forEach(track => track.stop());
            
            // Hide recording indicator
            recordingIndicator.classList.remove('active');
            
            // Clear timer
            clearInterval(recordingTimer);
            recordingDuration = 0;
            recordingTime.textContent = '0:00';
        });
        
        // Start recording
        recorder.start();
        
        // Show recording indicator
        recordingIndicator.classList.add('active');
        
        // Start timer
        startRecordingTimer();
        
    } catch (error) {
        console.error('Error starting voice recording:', error);
        showBotMessage('Could not access your microphone. Please ensure you have given permission and try again.');
    }
}

// Start recording timer
function startRecordingTimer() {
    recordingTimer = setInterval(() => {
        recordingDuration++;
        const minutes = Math.floor(recordingDuration / 60);
        const seconds = recordingDuration % 60;
        recordingTime.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        // Auto stop after 5 minutes
        if (recordingDuration >= 300) {
            stopVoiceRecording();
        }
    }, 1000);
}

// Stop voice recording
function stopVoiceRecording() {
    if (recorder && recorder.state !== 'inactive') {
        recorder.stop();
    }
}

// Add audio preview
function addAudioPreview(audioBlob) {
    const audioURL = URL.createObjectURL(audioBlob);
    
    const previewEl = document.createElement('div');
    previewEl.classList.add('audio-preview');
    
    const icon = document.createElement('i');
    icon.classList.add('fas', 'fa-microphone');
    
    const audio = document.createElement('audio');
    audio.controls = true;
    audio.src = audioURL;
    
    const removeButton = document.createElement('button');
    removeButton.classList.add('remove-audio');
    removeButton.innerHTML = '<i class="fas fa-times"></i>';
    removeButton.addEventListener('click', () => {
        mediaFiles = [];
        mediaType = '';
        previewEl.remove();
    });
    
    previewEl.appendChild(icon);
    previewEl.appendChild(audio);
    previewEl.appendChild(removeButton);
    previewContainer.appendChild(previewEl);
}

// Clear all media previews
function clearMediaPreviews() {
    previewContainer.innerHTML = '';
    mediaFiles = [];
    mediaType = '';
}

// Handle sending a message
function handleSendMessage() {
    const message = userInput.value.trim();
    
    // Check if there's any content (text or media) to send
    if (!message && mediaFiles.length === 0) return;

    // Check if API key is set
    if (!apiKey) {
        showBotMessage('Please enter your Gemini API key to continue.');
        return;
    }

    // Create user message content
    let userMessageContent = '';
    
    if (message) {
        userMessageContent += `<p>${message}</p>`;
    }
    
    // Add the message with media to chat
    showUserMessage(userMessageContent, mediaFiles, mediaType);
    
    // Clear input field and reset height
    userInput.value = '';
    userInput.style.height = '';
    
    // Show typing indicator
    const typingIndicator = createTypingIndicator();
    chatMessages.appendChild(typingIndicator);
    
    // Scroll to bottom
    scrollToBottom();
    
    // Send message to Gemini API
    if (mediaType === 'image') {
        generateResponseWithImage(message, mediaFiles, typingIndicator);
    } else if (mediaType === 'audio') {
        // For audio, we'll first convert to text using the Web Speech API
        processVoiceToText(mediaFiles[0], message, typingIndicator);
    } else {
        // Text-only message
        generateResponse(message, typingIndicator);
    }
    
    // Clear media files and preview
    clearMediaPreviews();
}

// Process voice to text using Web Speech API
function processVoiceToText(audioBlob, additionalText, typingIndicator) {
    // Currently, the Web Speech API doesn't directly accept audio blobs for transcription
    // As a workaround, we'll just send the audio as an attachment in the chat
    // and send any additional text to the API
    
    // Get audio URL for display
    const audioUrl = URL.createObjectURL(audioBlob);
    
    // Send whatever text message the user typed along with the audio
    const messageText = additionalText || "I've sent a voice message";
    generateResponse(messageText, typingIndicator);
}

// Generate response using Gemini API for text only
async function generateResponse(message, typingIndicator) {
    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
        
        const payload = {
            contents: [{
                parts: [{
                    text: message
                }]
            }]
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        
        // Remove typing indicator
        typingIndicator.remove();
        
        handleApiResponse(data);
    } catch (error) {
        // Remove typing indicator
        typingIndicator.remove();
        
        console.error('Error generating response:', error);
        showBotMessage('An error occurred while connecting to the Gemini API. Please check your internet connection and API key.');
    }
    
    // Scroll to bottom after response
    scrollToBottom();
}

// Generate response with image using Gemini Vision API
async function generateResponseWithImage(message, imageFiles, typingIndicator) {
    try {
        // We'll use gemini-pro-vision model for image + text
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
        
        const parts = [];
        
        // Add text part if available
        if (message) {
            parts.push({
                text: message
            });
        }
        
        // Add image parts
        for (const imageFile of imageFiles) {
            // Convert image to base64
            const imageBase64 = await fileToBase64(imageFile);
            
            // Get mime type
            const mimeType = imageFile.type;
            
            // Add image part
            parts.push({
                inline_data: {
                    mime_type: mimeType,
                    data: imageBase64.split('base64,')[1] // Remove the data URL prefix
                }
            });
        }
        
        const payload = {
            contents: [{
                parts: parts
            }]
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        
        // Remove typing indicator
        typingIndicator.remove();
        
        handleApiResponse(data);
    } catch (error) {
        // Remove typing indicator
        typingIndicator.remove();
        
        console.error('Error generating response with image:', error);
        showBotMessage('An error occurred while processing your image. This could be due to image size limits or a connection issue. Please try a different image or check your connection.');
    }
    
    // Scroll to bottom after response
    scrollToBottom();
}

// Convert file to base64
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

// Handle API response data
function handleApiResponse(data) {
    if (data.error) {
        // Handle API error
        showBotMessage(`Error: ${data.error.message || 'Something went wrong. Please check your API key and try again.'}`);
    } else if (data.candidates && data.candidates.length > 0) {
        // Extract response text
        const responseContent = data.candidates[0].content;
        
        if (responseContent && responseContent.parts && responseContent.parts.length > 0) {
            const responseText = responseContent.parts[0].text || "I don't have a response for that.";
            showBotMessage(responseText);
        } else {
            showBotMessage("I received a response but couldn't parse it correctly.");
        }
    } else {
        showBotMessage("I couldn't generate a response. Please try again.");
    }
}

// Add user message to chat
function showUserMessage(messageContent, mediaFiles = [], mediaType = '') {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', 'user-message');
    
    const contentElement = document.createElement('div');
    contentElement.classList.add('message-content');
    
    if (messageContent) {
        contentElement.innerHTML = messageContent;
    }
    
    // Add media if available
    if (mediaFiles.length > 0) {
        if (mediaType === 'image') {
            // Handle images
            for (const imageFile of mediaFiles) {
                const imageURL = URL.createObjectURL(imageFile);
                const img = document.createElement('img');
                img.src = imageURL;
                img.classList.add('message-image');
                img.addEventListener('click', () => openImageModal(imageURL));
                contentElement.appendChild(img);
            }
        } else if (mediaType === 'audio') {
            // Handle audio
            const audioURL = URL.createObjectURL(mediaFiles[0]);
            const audio = document.createElement('audio');
            audio.controls = true;
            audio.src = audioURL;
            audio.classList.add('message-audio');
            contentElement.appendChild(audio);
        }
    }
    
    messageElement.appendChild(contentElement);
    chatMessages.appendChild(messageElement);
    
    scrollToBottom();
}

// Add bot message to chat
function showBotMessage(message) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', 'bot-message');
    
    const contentElement = document.createElement('div');
    contentElement.classList.add('message-content');
    
    const textElement = document.createElement('p');
    
    // Handle markdown-like formatting for code blocks and links
    const formattedMessage = formatMessage(message);
    textElement.innerHTML = formattedMessage;
    
    contentElement.appendChild(textElement);
    messageElement.appendChild(contentElement);
    chatMessages.appendChild(messageElement);
    
    scrollToBottom();
}

// Format message with markdown-like syntax
function formatMessage(message) {
    // Replace code blocks (```code```)
    let formatted = message.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
    
    // Replace inline code (`code`)
    formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // Replace line breaks
    formatted = formatted.replace(/\n/g, '<br>');
    
    // Replace URLs with links
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    formatted = formatted.replace(urlRegex, '<a href="$1" target="_blank">$1</a>');
    
    return formatted;
}

// Create typing indicator
function createTypingIndicator() {
    const typingElement = document.createElement('div');
    typingElement.classList.add('typing-indicator');
    
    for (let i = 0; i < 3; i++) {
        const dot = document.createElement('span');
        typingElement.appendChild(dot);
    }
    
    return typingElement;
}

// Scroll to bottom of chat
function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Initialize the app
init();
