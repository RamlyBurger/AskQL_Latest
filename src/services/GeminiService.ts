import axios, { AxiosError } from 'axios';
import { DatabaseService } from './DatabaseService';

export interface ChatMessage {
    id?: number;
    sender: 'user' | 'bot';
    content: string;
    timestamp: Date;
}

export default class GeminiService {
    private apiKey: string;
    private baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
    private systemPrompt = `I am an AI Database Assistant specializing in SQL and data analysis. I can:
- Answer questions about your database structure
- Help you write SQL queries in any SQL dialect (PostgreSQL, MySQL, SQLite, etc.)
- Analyze your data and provide insights
- Explain database concepts and query optimization
- Suggest best practices for database design and querying

I will provide SQL queries that are:
1. Clear and well-commented
2. Optimized for performance
3. Following best practices for the specific SQL dialect
4. Using appropriate features of the chosen SQL dialect

Important Guidelines:
- ALWAYS provide the SQL query when the user's question can be answered with data, even if you think there might be no results
- If there are no results, still show the SQL query and explain that no results were found
- For data questions, start with the SQL query first, then explain the results
- Use comments in SQL to explain complex logic
- Consider performance in larger datasets

When you ask about the database, I'll provide specific information about its structure and contents.
When you need a SQL query, I'll provide it in the most appropriate SQL dialect for your needs.`;
    private maxRetries = 3;
    private retryDelay = 1000; // 1 second

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    private async handleGeneralQuery(message: string, database?: any): Promise<string> {
        if (message.toLowerCase().match(/what (?:can|could) you do/i) || 
            message.toLowerCase().includes('your capabilities') ||
            message.toLowerCase().includes('what do you do')) {
            let response = `I am an AI Database Assistant specializing in SQL and data analysis. I can:
- Answer questions about your database structure
- Help you write SQL queries in any SQL dialect (PostgreSQL, MySQL, SQLite, etc.)
- Analyze your data and provide insights
- Explain database concepts and query optimization
- Suggest best practices for database design and querying\n`;

            if (database) {
                response += `\nCurrent Database Information:
Database: ${database.name}
Tables: ${database.tables.map((t: any) => t.name).join(', ')}

Each table's structure:`;
                
                for (const table of database.tables) {
                    response += `\n\n${table.name}:`;
                    try {
                        const tableDetails = await DatabaseService.getTableById(table.id);
                        if (tableDetails && tableDetails.attributes) {
                            tableDetails.attributes.forEach((attr: any) => {
                                response += `\n- ${attr.name} (${attr.data_type})`;
                            });
                        } else {
                            response += '\n(No attributes defined)';
                        }
                    } catch (error) {
                        console.error(`Error fetching table details for ${table.name}:`, error);
                        response += '\n(Error fetching table details)';
                    }
                }
            }

            return response;
        }

        return `I'm here to help you work with databases and write SQL queries in any dialect. What would you like to know?`;
    }

    private async callGeminiAPI(message: string, retryCount = 0): Promise<string> {
        try {
            if (!this.apiKey) {
                throw new Error('API key is not configured');
            }

            const response = await axios.post(
                `${this.baseUrl}?key=${this.apiKey}`,
                {
                    contents: [{
                        parts: [{
                            text: message
                        }]
                    }]
                }
            );

            if (!response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
                throw new Error('Invalid response format from Gemini API');
            }

            return response.data.candidates[0].content.parts[0].text;
        } catch (error) {
            if (error instanceof AxiosError) {
                // Handle specific HTTP errors
                switch (error.response?.status) {
                    case 503:
                        if (retryCount < this.maxRetries) {
                            console.log(`Gemini API temporarily unavailable, retrying in ${this.retryDelay}ms...`);
                            await new Promise(resolve => setTimeout(resolve, this.retryDelay));
                            return this.callGeminiAPI(message, retryCount + 1);
                        }
                        throw new Error('Gemini API is temporarily unavailable. Please try again later.');
                    
                    case 401:
                        throw new Error('Invalid API key. Please check your Gemini API configuration.');
                    
                    case 400:
                        throw new Error('Invalid request to Gemini API. Please check your input.');
                    
                    case 429:
                        throw new Error('Rate limit exceeded. Please try again later.');
                    
                    default:
                        throw new Error(`Gemini API error: ${error.response?.data?.error || error.message}`);
                }
            }
            throw error;
        }
    }

    async sendMessage(message: string, database?: any): Promise<string> {
        try {
            // Check if it's a general chatbot question
            if (this.isGeneralQuery(message)) {
                return await this.handleGeneralQuery(message, database);
            }

            if (!database) {
                return "I don't have access to the database information. Please make sure you're viewing a database. However, I can still help you with general questions about databases!";
            }

            // Check if it's a basic database info question
            const isBasicInfoQuery = this.isBasicInfoQuery(message);
            if (isBasicInfoQuery) {
                return this.getBasicDatabaseInfo(message, database);
            }

            // Check if the message is asking for SQL query
            const isQueryRequest = this.isQueryRequest(message);
            
            let contextualizedMessage = `${this.systemPrompt}\n\n`;
            const tableContext = await this.buildDatabaseContext(database);
            
            contextualizedMessage += `Database Context:
${tableContext}

Question: "${message}"

${isQueryRequest ? `Please provide:
1. The SQL query first in \`\`\`sql format with comments
2. Brief explanation of what the query does
3. Expected results or explanation if no results found
4. Any performance considerations

Rules:
- ALWAYS provide the SQL query even if you think there might be no results
- Use appropriate SQL dialect features
- Use exact table/column names
- Include WHERE, JOIN, GROUP BY, ORDER BY, LIMIT as needed
- Add comments for complex parts of the query
- Consider query performance and optimization` : 'Please provide a clear and direct answer.'}`;

            return await this.callGeminiAPI(contextualizedMessage);
        } catch (error) {
            console.error('Error in Gemini API call:', error);
            if (error instanceof Error) {
                throw error; // Preserve the specific error message
            }
            throw new Error('An unexpected error occurred while getting AI response');
        }
    }

    private async buildDatabaseContext(database: any): Promise<string> {
        if (!database || !database.tables) return '';

        let context = `Database: ${database.name}
Tables: ${database.tables.map((t: any) => t.name).join(', ')}

Structure:`;

        for (const table of database.tables) {
            context += `\n\n${table.name}:`;
            
            // Get table details to ensure we have attributes
            try {
                const tableDetails = await DatabaseService.getTableById(table.id);
                if (tableDetails && tableDetails.attributes) {
                    tableDetails.attributes.forEach((attr: any) => {
                        context += `\n- ${attr.name} (${attr.data_type})`;
                    });
                } else {
                    context += '\n(No attributes defined)';
                }

                // Get sample data
                try {
                    const sampleData = await DatabaseService.getTableData(table.id, 1, 5);
                    if (sampleData && sampleData.data && sampleData.data.length > 0) {
                        context += '\n\nSample Data (5 rows):';
                        sampleData.data.forEach((row: any) => {
                            context += '\n' + JSON.stringify(row.row_data);
                        });
                    }
                } catch (error) {
                    console.error(`Error fetching sample data for table ${table.name}:`, error);
                    context += '\n(Error fetching sample data)';
                }
            } catch (error) {
                console.error(`Error fetching table details for ${table.name}:`, error);
                context += '\n(Error fetching table details)';
            }

            context += '\n---';
        }

        return context;
    }

    private isGeneralQuery(message: string): boolean {
        const generalPatterns = [
            /what (?:can|could) you do/i,
            /help me/i,
            /who are you/i,
            /what are you/i,
            /your capabilities/i,
            /what do you do/i,
            /how do you work/i,
            /tell me about yourself/i,
            /introduce yourself/i
        ];

        return generalPatterns.some(pattern => pattern.test(message));
    }

    private isBasicInfoQuery(message: string): boolean {
        const basicInfoPatterns = [
            /what (?:are|is) the tables?/i,
            /show (?:me )?(?:the )?tables/i,
            /list (?:the )?tables/i,
            /tables? in (?:the )?database/i,
            /describe (?:the )?database/i,
            /database structure/i,
            /schema/i
        ];

        return basicInfoPatterns.some(pattern => pattern.test(message));
    }

    private isQueryRequest(message: string): boolean {
        // Don't treat basic info queries as SQL queries
        if (this.isBasicInfoQuery(message)) {
            return false;
        }

        const queryKeywords = [
            'sql', 'query', 'select', 'show', 'list', 'find', 'get',
            'top', 'best', 'worst', 'most', 'least', 'average', 'count',
            'how many', 'which', 'what are', 'display', 'give me',
            'join', 'group by', 'order by', 'where', 'having',
            'aggregate', 'filter', 'sort', 'rank', 'analyze'
        ];

        const lowercaseMessage = message.toLowerCase();
        return queryKeywords.some(keyword => lowercaseMessage.includes(keyword));
    }

    private getBasicDatabaseInfo(message: string, database: any): string {
        const tableCount = database.tables.length;
        const tableNames = database.tables.map((table: any) => table.name).join(', ');

        if (message.toLowerCase().includes('what are the tables') || 
            message.toLowerCase().includes('list tables') ||
            message.toLowerCase().includes('show tables')) {
            if (tableCount === 0) {
                return "There are no tables in this database yet.";
            } else if (tableCount === 1) {
                return `There is 1 table: ${tableNames}`;
            } else {
                return `There are ${tableCount} tables: ${tableNames}`;
            }
        }

        let response = `Database: ${database.name}\n`;
        response += `Tables: ${tableCount}\n\n`;
        
        database.tables.forEach((table: any) => {
            response += `${table.name}:\n`;
            table.attributes.forEach((attr: any) => {
                response += `- ${attr.name} (${attr.data_type})\n`;
            });
            response += '\n';
        });

        return response;
    }
} 