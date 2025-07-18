import axios from 'axios';

export type MessageType = 'text' | 'image' | 'file' | 'voice' | 'combined';

class GeminiService {
    private apiKey: string;
    private baseUrl = 'http://localhost:3000/api';

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    private async fileToBase64(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                if (typeof reader.result === 'string') {
                    // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
                    const base64 = reader.result.split(',')[1];
                    resolve(base64);
                } else {
                    reject(new Error('Failed to convert file to base64'));
                }
            };
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(file);
        });
    }

    async sendMessage(
        content: string | File | File[],
        database: any,
        messageType: MessageType = 'text',
        textContext?: string
    ): Promise<string> {
        try {
            let payload: any = {
                database,
                apiKey: this.apiKey
            };

            if (messageType === 'image' && Array.isArray(content)) {
                // Handle multiple images
                const base64Images = await Promise.all(
                    content.map(async (file) => {
                        const base64 = await this.fileToBase64(file);
                        return {
                            data: base64,
                            mimeType: file.type
                        };
                    })
                );

                payload = {
                    ...payload,
                    messageType,
                    images: base64Images,
                    message: textContext || 'Please analyze these images.'
                };

                const response = await axios.post(`${this.baseUrl}/gemini/process-images`, payload);
                return response.data.response;
            } else if (content instanceof File) {
                // Handle single file (voice/file)
                const formData = new FormData();
                formData.append(messageType, content);
                formData.append('apiKey', this.apiKey);
                if (textContext) {
                    formData.append('message', textContext);
                }

                let endpoint = '';
                switch (messageType) {
                    case 'voice':
                        endpoint = 'transcribe-voice';
                        break;
                    case 'file':
                        endpoint = 'process-file';
                        break;
                }

                const response = await axios.post(`${this.baseUrl}/gemini/${endpoint}`, formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                });

                return messageType === 'voice' ? response.data.transcription : response.data.content;
            } else {
                // Handle text message
                payload = {
                    ...payload,
                    message: content,
                    messageType: 'text'
                };

                const response = await axios.post(`${this.baseUrl}/gemini/chat`, payload);
                return response.data.response;
            }
        } catch (error) {
            console.error('Error in GeminiService:', error);
            throw new Error('Failed to process message with AI');
        }
    }
}

export default GeminiService; 