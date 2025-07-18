# Advanced Gemini AI Chatbot

A powerful, feature-rich chatbot built with HTML, CSS, and JavaScript that uses Google's Gemini API for generating AI responses. This chatbot supports text, images, and voice messages!

## Features

- Clean, modern user interface
- Multimodal AI interactions using Google's Gemini Pro and Gemini Pro Vision APIs
- Image upload and analysis capabilities
- Voice message recording and playback
- Local storage of API key for convenience
- Markdown-like formatting for code blocks and links in responses
- Image previews with modal for enlarged viewing
- Voice recording with timer and visual indicator
- Responsive design for both desktop and mobile devices
- Typing indicators while waiting for responses

## How to Use

1. **Get a Gemini API Key**:
   - Visit the [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Sign in with your Google account
   - Create a new API key (or use an existing one)
   - The API key is free to use with certain usage limits

2. **Setup the Chatbot**:
   - Open `index.html` in your web browser
   - Enter your Gemini API key in the input field at the top
   - Click "Save Key" to store your API key locally
   - The key will be saved in your browser's local storage so you won't need to enter it again

3. **Start Chatting**:
   - Type your message in the input field at the bottom
   - Press Enter or click the send button to send text messages
   - Click the image icon to upload and analyze images
   - Click the microphone icon to record and send voice messages
   - The AI will respond based on your text input, images, or both!

## Working with Images

The chatbot uses the Gemini Pro Vision API to analyze and respond to images:

- Click the image icon to select an image from your device
- You can add optional text to provide context for the image
- Click send to receive AI analysis of your image
- Images can be clicked to view in an enlarged modal

## Working with Voice

The chatbot supports voice message recording:

- Click the microphone icon to start recording
- A recording indicator will appear with a timer
- Click the stop button when you're done
- The recording will be added to your message as an audio player
- Add optional text to provide context
- Voice recordings are sent as attachments in the chat

## Browser Compatibility

- This application uses modern JavaScript features and Web APIs including:
  - MediaRecorder API for voice recording
  - Web Audio API for audio processing
  - FileReader for image handling
  - Fetch API for network requests
- For best results, use Chrome, Firefox, Edge, or Safari in their latest versions

## Security Note

Your API key is stored only in your browser's local storage and is not sent anywhere except directly to Google's Gemini API. The application does not collect or store any of your conversation data.

## Requirements

- Modern web browser (Chrome, Firefox, Safari, Edge)
- Internet connection
- Gemini API key

## Development

This project uses vanilla HTML, CSS, and JavaScript without any external dependencies or build steps, making it very easy to modify and extend. Key features include:

- Async/await for API calls and media processing
- Promise-based file handling
- Modular JavaScript functions for maintainability
- CSS animations and transitions for smooth UI
- Responsive design with mobile considerations

## License

Feel free to use, modify, and distribute this code for personal or commercial purposes.

## Credits

Created with ❤️ using Google's Gemini API
