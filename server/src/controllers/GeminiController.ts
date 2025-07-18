import { Request, Response } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export class GeminiController {
    static async detectColumnTypes(req: Request, res: Response) {
        try {
            const { columnNames, sampleData } = req.body;

            if (!columnNames || !sampleData || !Array.isArray(columnNames)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid input format'
                });
            }

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
            const response = result.response;
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
} 