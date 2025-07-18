import axios from 'axios';

export type MessageType = 'text' | 'image' | 'file' | 'voice' | 'combined';

export interface QueryType {
    type: string;
    explanation: string;
}

export interface AIResponse {
    response: string;
    queryType?: QueryType;
}

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
    ): Promise<AIResponse> {
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
                return response.data;
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
                    case 'image':
                        endpoint = 'process-image';
                        break;
                }

                const response = await axios.post(`${this.baseUrl}/gemini/${endpoint}`, formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                });

                return {
                    response: messageType === 'voice' ? response.data.transcription : response.data.content
                };
            } else {
                // Handle text message
                payload = {
                    ...payload,
                    message: content,
                    messageType: 'text'
                };

                const response = await axios.post(`${this.baseUrl}/gemini/chat`, payload);
                return response.data;
            }
        } catch (error) {
            console.error('Error in sendMessage:', error);
            throw error;
        }
    }
}

export default GeminiService; 