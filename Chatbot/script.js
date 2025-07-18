// DOM Elements
const chatButton = document.getElementById('chatButton');
const chatSidebar = document.getElementById('chatSidebar');
const closeSidebar = document.getElementById('closeSidebar');
const messageInput = document.getElementById('messageInput');
const chatContent = document.getElementById('chatContent');
const attachmentMenu = document.getElementById('attachmentMenu');

// Event Listeners
chatButton.addEventListener('click', toggleSidebar);
closeSidebar.addEventListener('click', toggleSidebar);
messageInput.addEventListener('keypress', handleKeyPress);
document.addEventListener('click', handleClickOutside);

// Typing animation configuration
const typingAnimationConfig = {
    strings: ['Type your message...', 'Ask a question...', 'Send a file...'],
    typeSpeed: 50,
    backSpeed: 30,
    backDelay: 2000,
    loop: true,
    attr: 'placeholder'
};

// Toggle sidebar with animation
function toggleSidebar() {
    const isOpen = chatSidebar.classList.contains('open');
    
    // Animate the chat button
    chatButton.style.transform = isOpen ? 'scale(1)' : 'scale(0)';
    chatButton.style.opacity = isOpen ? '1' : '0';
    
    // Toggle sidebar
    chatSidebar.classList.toggle('open');
    
    // Focus input when opening
    if (!isOpen) {
        setTimeout(() => {
            messageInput.focus();
            chatButton.style.display = 'none';
        }, 300);
    } else {
        chatButton.style.display = 'flex';
    }
}

// Toggle chat history with smooth animation
function toggleHistory() {
    const historyHeader = document.querySelector('.history-header');
    const historyContent = document.getElementById('historyContent');
    const chevronIcon = historyHeader.querySelector('i');
    
    historyHeader.classList.toggle('expanded');
    
    if (historyContent.classList.contains('expanded')) {
        historyContent.style.maxHeight = '0px';
        setTimeout(() => {
            historyContent.classList.remove('expanded');
        }, 300);
    } else {
        historyContent.classList.add('expanded');
        historyContent.style.maxHeight = historyContent.scrollHeight + 'px';
    }
}

// Handle click outside of attachment menu
function handleClickOutside(e) {
    if (!e.target.closest('.attachment-options') && attachmentMenu.classList.contains('show')) {
        attachmentMenu.classList.remove('show');
    }
}

// Toggle attachment options with animation
function toggleAttachmentOptions() {
    attachmentMenu.classList.toggle('show');
}

// Handle key press (Enter to send message)
function handleKeyPress(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
}

// Send message with animation
function sendMessage() {
    const message = messageInput.value.trim();
    if (message) {
        addMessage(message, 'user');
        messageInput.value = '';
        messageInput.focus();
        
        // Simulate typing indicator
        showTypingIndicator();
        
        // Simulate bot response (you can replace this with actual API calls)
        setTimeout(() => {
            removeTypingIndicator();
            addMessage('This is a sample response from the chatbot.', 'bot');
        }, 2000);
    }
}

// Add message to chat with animation
function addMessage(text, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', sender);
    messageDiv.textContent = text;
    
    // Add animation class
    messageDiv.style.opacity = '0';
    messageDiv.style.transform = 'translateY(20px)';
    
    chatContent.appendChild(messageDiv);
    chatContent.scrollTop = chatContent.scrollHeight;
    
    // Trigger animation
    requestAnimationFrame(() => {
        messageDiv.style.opacity = '1';
        messageDiv.style.transform = 'translateY(0)';
    });
}

// Show typing indicator
function showTypingIndicator() {
    const typingDiv = document.createElement('div');
    typingDiv.classList.add('message', 'bot', 'typing-indicator');
    typingDiv.innerHTML = '<span></span><span></span><span></span>';
    chatContent.appendChild(typingDiv);
    chatContent.scrollTop = chatContent.scrollHeight;
}

// Remove typing indicator
function removeTypingIndicator() {
    const typingIndicator = chatContent.querySelector('.typing-indicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }
}

// Handle file upload with preview
function handleFileUpload() {
    const input = document.createElement('input');
    input.type = 'file';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const messageDiv = document.createElement('div');
            messageDiv.classList.add('message', 'user', 'file-message');
            messageDiv.innerHTML = `
                <i class="fas fa-file"></i>
                <span>${file.name}</span>
            `;
            addMessage(messageDiv.outerHTML, 'user');
        }
    };
    input.click();
    toggleAttachmentOptions();
}

// Handle image upload with preview
function handleImageUpload() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = document.createElement('img');
                img.src = e.target.result;
                img.style.maxWidth = '200px';
                img.style.borderRadius = '12px';
                const messageDiv = document.createElement('div');
                messageDiv.classList.add('message', 'user');
                messageDiv.appendChild(img);
                chatContent.appendChild(messageDiv);
                chatContent.scrollTop = chatContent.scrollHeight;
            };
            reader.readAsDataURL(file);
        }
    };
    input.click();
    toggleAttachmentOptions();
}

// Handle voice recording with animation
function handleVoiceRecord() {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
                const mediaRecorder = new MediaRecorder(stream);
                const audioChunks = [];
                
                // Add recording indicator with animation
                const recordingDiv = document.createElement('div');
                recordingDiv.classList.add('message', 'user', 'recording');
                recordingDiv.innerHTML = `
                    <i class="fas fa-microphone-alt"></i>
                    <span>Recording... Click anywhere to stop</span>
                `;
                chatContent.appendChild(recordingDiv);
                chatContent.scrollTop = chatContent.scrollHeight;
                
                mediaRecorder.addEventListener('dataavailable', event => {
                    audioChunks.push(event.data);
                });
                
                mediaRecorder.addEventListener('stop', () => {
                    const audioBlob = new Blob(audioChunks);
                    const audioUrl = URL.createObjectURL(audioBlob);
                    const audio = document.createElement('audio');
                    audio.src = audioUrl;
                    audio.controls = true;
                    
                    recordingDiv.remove();
                    const messageDiv = document.createElement('div');
                    messageDiv.classList.add('message', 'user');
                    messageDiv.appendChild(audio);
                    chatContent.appendChild(messageDiv);
                    chatContent.scrollTop = chatContent.scrollHeight;
                });
                
                mediaRecorder.start();
                
                // Stop recording after 10 seconds or when clicked again
                const stopRecording = () => {
                    mediaRecorder.stop();
                    stream.getTracks().forEach(track => track.stop());
                    document.removeEventListener('click', stopRecording);
                };
                
                document.addEventListener('click', stopRecording);
                setTimeout(stopRecording, 10000); // Max 10 seconds recording
            })
            .catch(error => {
                console.error('Error accessing microphone:', error);
                addMessage('Error accessing microphone. Please check permissions.', 'bot');
            });
    } else {
        addMessage('Voice recording is not supported in your browser.', 'bot');
    }
    toggleAttachmentOptions();
} 