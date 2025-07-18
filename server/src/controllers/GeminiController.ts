import { Request, Response } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { fileTypeFromBuffer } from 'file-type';
import * as fs from 'fs';
import * as path from 'path';

export class GeminiController {
    static async detectColumnTypes(req: Request, res: Response) {
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

            console.log('Analyzing column types with prompt:', prompt);

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            console.log('Gemini Response:', text);

            // Parse the JSON response
            try {
                const jsonMatch = text.match(/\{[\s\S]*\}/);
                if (!jsonMatch) {
                    throw new Error('No JSON found in response');
                }
                const parsedResult = JSON.parse(jsonMatch[0]);

                console.log('Parsed Result:', parsedResult);

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

    static async processImage(req: Request, res: Response) {
        try {
            if (!req.file) {
                return res.status(400).json({ error: 'No image file provided' });
            }

            const { apiKey, message } = req.body;
            if (!apiKey) {
                return res.status(400).json({ error: 'API key is required' });
            }

            const genAI = new GoogleGenerativeAI(apiKey);
            const imageBuffer = await fs.promises.readFile(req.file.path);
            const mimeType = (await fileTypeFromBuffer(imageBuffer))?.mime || 'image/jpeg';
            const base64Image = imageBuffer.toString('base64');

            // Create parts array with text prompt and image
            const parts = [
                { text: message || "Please analyze this image and describe what you see in detail." },
                {
                    inlineData: {
                        data: base64Image,
                        mimeType: mimeType
                    }
                }
            ];

            // Use the vision model
            const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
            const result = await model.generateContent(parts);
            const response = await result.response;
            
            // Clean up the temporary file
            await fs.promises.unlink(req.file.path);

            res.json({ description: response.text() });
        } catch (error) {
            console.error('Error processing image:', error);
            res.status(500).json({ error: 'Failed to process image' });
        }
    }

    static async processImages(req: Request, res: Response) {
        try {
            if (!req.files || !Array.isArray(req.files)) {
                return res.status(400).json({ error: 'No images provided or invalid format' });
            }

            const { message, apiKey } = req.body;
            if (!apiKey) {
                return res.status(400).json({ error: 'API key is required' });
            }

            const genAI = new GoogleGenerativeAI(apiKey);
            
            // Process each image file into base64 format
            const imagePromises = (req.files as Express.Multer.File[]).map(async (file) => {
                const imageBuffer = await fs.promises.readFile(file.path);
                const mimeType = (await fileTypeFromBuffer(imageBuffer))?.mime || 'image/jpeg';
                const base64Data = imageBuffer.toString('base64');
                
                // Clean up the temporary file
                await fs.promises.unlink(file.path);
                
                return {
                    inlineData: {
                        data: base64Data,
                        mimeType: mimeType
                    }
                };
            });

            const processedImages = await Promise.all(imagePromises);
            
            // Create parts array with text prompt and images
            const parts = [
                { text: message || "Please analyze these images and describe what you see in detail." },
                ...processedImages
            ];

            // Use the vision model
            const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
            const result = await model.generateContent(parts);
            const response = await result.response;

            res.json({ response: response.text() });
        } catch (error) {
            console.error('Error processing images:', error);
            res.status(500).json({ error: 'Failed to process images' });
        }
    }

    static async processFile(req: Request, res: Response) {
        try {
            if (!req.file) {
                return res.status(400).json({ error: 'No file provided' });
            }

            const { apiKey } = req.body;
            if (!apiKey) {
                return res.status(400).json({ error: 'API key is required' });
            }

            const genAI = new GoogleGenerativeAI(apiKey);
            const fileContent = await fs.promises.readFile(req.file.path, 'utf-8');
            
            // Use the model directly for file content
            const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
            const result = await model.generateContent(fileContent);
            const response = await result.response;
            
            // Clean up the temporary file
            await fs.promises.unlink(req.file.path);

            res.json({ content: response.text() });
        } catch (error) {
            console.error('Error processing file:', error);
            res.status(500).json({ error: 'Failed to process file' });
        }
    }

    static async transcribeVoice(req: Request, res: Response) {
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
            
            // Convert audio to base64 and create a prompt
            const base64Audio = audioBuffer.toString('base64');
            const prompt = `Please transcribe and analyze this audio content:\n${base64Audio}`;
            
            const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
            const result = await model.generateContent(prompt);
            const response = await result.response;

            // Clean up the temporary file
            await fs.promises.unlink(req.file.path);

            res.json({ transcription: response.text() });
        } catch (error) {
            console.error('Error transcribing voice:', error);
            res.status(500).json({ error: 'Failed to transcribe voice message' });
        }
    }
} 