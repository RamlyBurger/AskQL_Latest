import { Request, Response } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { fileTypeFromBuffer } from 'file-type';
import * as fs from 'fs';
import * as path from 'path';
import { Readable } from 'stream';

class GeminiController {
    private static async processContent(genAI: GoogleGenerativeAI, content: string | Buffer | { data: string, mimeType: string }[], contentType: string, prompt: string): Promise<string> {
        try {
            const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
            
            if (Array.isArray(content)) {
                // For multiple images
                const imagePrompts = content.map(img => ({
                    inlineData: {
                        data: img.data,
                        mimeType: img.mimeType
                    }
                }));
                
                // Create parts array with text prompt first, followed by images
                const parts = [
                    { text: prompt },
                    ...imagePrompts
                ];

                const result = await model.generateContent(parts);
                const response = await result.response;
                return response.text();
            } else if (content instanceof Buffer) {
                // For binary content (audio)
                const base64Content = content.toString('base64');
                const mimeType = (await fileTypeFromBuffer(content))?.mime || 'application/octet-stream';
                
                const fullPrompt = `${prompt}\n\nContent Type: ${contentType}\nMIME Type: ${mimeType}\nBase64 Content: ${base64Content}`;
                const result = await model.generateContent(fullPrompt);
                const response = await result.response;
                return response.text();
            } else {
                // For text content
                const fullPrompt = `${prompt}\n\nContent: ${content}`;
                const result = await model.generateContent(fullPrompt);
                const response = await result.response;
                return response.text();
            }
        } catch (error) {
            console.error('Error processing content with Gemini:', error);
            throw new Error(`Failed to process ${contentType} content`);
        }
    }

    private static async extractTextFromFile(filePath: string): Promise<string> {
        try {
            const content = await fs.promises.readFile(filePath, 'utf-8');
            return content;
        } catch (error) {
            console.error('Error extracting text from file:', error);
            throw new Error('Failed to extract text from file');
        }
    }

    async detectColumnTypes(req: Request, res: Response) {
        try {
            const { columnNames, sampleData, apiKey } = req.body;

            if (!columnNames || !sampleData || !Array.isArray(columnNames)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid input format'
                });
            }

            if (!apiKey) {
                return res.status(400).json({ error: 'API key is required' });
            }

            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

            // Prepare the prompt
            const prompt = `Analyze the following data columns and determine their data types and formats. For each column, provide:
1. The most appropriate SQL data type (choose from: INTEGER, NUMERIC, TIMESTAMP, BOOLEAN, VARCHAR)
2. For TIMESTAMP columns, specify the exact format using standard format codes:
   - yyyy for 4-digit year
   - MM for 2-digit month
   - dd for 2-digit day
   - HH for 24-hour hours
   - mm for minutes
   - ss for seconds
   - SSS for milliseconds
   Examples:
   - "13:59" → format: "HH:mm"
   - "13:59:59" → format: "HH:mm:ss"
   - "2023-12-31" → format: "yyyy-MM-dd"
   - "31/12/2023 13:59" → format: "dd/MM/yyyy HH:mm"
3. Confidence level (0-1)
4. Brief explanation of why this type was chosen

Column names and sample values (first 10 rows):

${columnNames.map(name => {
    const samples = sampleData[name].slice(0, 10);
    return `Column "${name}":
${samples.map((val: string, i: number) => `${i + 1}. ${val}`).join('\n')}`;
}).join('\n\n')}

Respond in the following JSON format:
{
    "columns": [
        {
            "name": "column_name",
            "data_type": "SQL_TYPE",
            "format": "format_string_for_timestamps",  // Only for TIMESTAMP type
            "confidence": 0.95,
            "explanation": "Brief explanation"
        }
    ]
}`;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            // Parse the JSON response
            try {
                const jsonMatch = text.match(/\{[\s\S]*\}/);
                if (!jsonMatch) {
                    throw new Error('No JSON found in response');
                }
                const parsedResult = JSON.parse(jsonMatch[0]);

                return res.json({
                    success: true,
                    data: parsedResult.columns
                });
            } catch (parseError) {
                console.error('Error parsing Gemini response:', parseError);
                return res.status(500).json({
                    success: false,
                    message: 'Error parsing AI response'
                });
            }
        } catch (error) {
            console.error('Error in detectColumnTypes:', error);
            return res.status(500).json({
                success: false,
                message: 'Error detecting column types'
            });
        }
    }

    async chat(req: Request, res: Response) {
        try {
            const { message, messageType, additionalContext, apiKey } = req.body;

            if (!apiKey) {
                return res.status(400).json({ error: 'API key is required' });
            }

            const genAI = new GoogleGenerativeAI(apiKey);
            const prompt = additionalContext ? `${additionalContext}\n\nUser Message: ${message}` : message;
            const response = await GeminiController.processContent(genAI, message, 'text', prompt);
            res.json({ response });
        } catch (error) {
            console.error('Error in chat:', error);
            res.status(500).json({ error: 'Failed to process chat message' });
        }
    }

    async processImage(req: Request, res: Response) {
        try {
            if (!req.file) {
                return res.status(400).json({ error: 'No image file provided' });
            }

            const { apiKey } = req.body;
            if (!apiKey) {
                return res.status(400).json({ error: 'API key is required' });
            }

            const genAI = new GoogleGenerativeAI(apiKey);
            const imageBuffer = await fs.promises.readFile(req.file.path);
            
            const prompt = "Please analyze this image and describe what you see in detail. Include any relevant information such as text, objects, people, or other notable elements.";
            
            const description = await GeminiController.processContent(genAI, imageBuffer, 'image', prompt);
            
            // Clean up the temporary file
            await fs.promises.unlink(req.file.path);

            res.json({ description });
        } catch (error) {
            console.error('Error processing image:', error);
            res.status(500).json({ error: 'Failed to process image' });
        }
    }

    async processImages(req: Request, res: Response) {
        try {
            const { images, message, apiKey } = req.body;

            if (!images || !Array.isArray(images)) {
                return res.status(400).json({ error: 'No images provided or invalid format' });
            }

            if (!apiKey) {
                return res.status(400).json({ error: 'API key is required' });
            }

            const genAI = new GoogleGenerativeAI(apiKey);
            
            const prompt = message || "Please analyze these images and describe what you see in detail.";
            
            const response = await GeminiController.processContent(
                genAI,
                images,
                'image',
                prompt
            );

            res.json({ response });
        } catch (error) {
            console.error('Error processing images:', error);
            res.status(500).json({ error: 'Failed to process images' });
        }
    }

    async processFile(req: Request, res: Response) {
        try {
            if (!req.file) {
                return res.status(400).json({ error: 'No file provided' });
            }

            const { apiKey } = req.body;
            if (!apiKey) {
                return res.status(400).json({ error: 'API key is required' });
            }

            const genAI = new GoogleGenerativeAI(apiKey);
            
            // Extract text from the file
            const fileContent = await GeminiController.extractTextFromFile(req.file.path);
            
            const prompt = "Please analyze this file content and provide a meaningful response. Consider the context and type of content provided.";
            
            const content = await GeminiController.processContent(genAI, fileContent, 'file', prompt);
            
            // Clean up the temporary file
            await fs.promises.unlink(req.file.path);

            res.json({ content });
        } catch (error) {
            console.error('Error processing file:', error);
            res.status(500).json({ error: 'Failed to process file' });
        }
    }

    async transcribeVoice(req: Request, res: Response) {
        try {
            if (!req.file) {
                return res.status(400).json({ error: 'No audio file provided' });
            }

            const { apiKey } = req.body;
            if (!apiKey) {
                return res.status(400).json({ error: 'API key is required' });
            }

            const genAI = new GoogleGenerativeAI(apiKey);
            const audioBuffer = await fs.promises.readFile(req.file.path);
            
            const prompt = "Please transcribe and analyze this audio content. Provide both the transcription and any relevant context or insights from the audio.";
            
            const result = await GeminiController.processContent(genAI, audioBuffer, 'audio', prompt);

            // Clean up the temporary file
            await fs.promises.unlink(req.file.path);

            res.json({ transcription: result });
        } catch (error) {
            console.error('Error transcribing voice:', error);
            res.status(500).json({ error: 'Failed to transcribe voice message' });
        }
    }
}

export default new GeminiController(); 