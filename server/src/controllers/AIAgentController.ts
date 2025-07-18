import { Request, Response } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { DatabaseService } from '../services/DatabaseService';
import { Attribute } from '../entities/Attribute';
import { TableDataController } from './TableDataController';

interface DatabaseAction {
    Action: string;
    Params?: Record<string, any>;
    SQL?: string;
    Result?: string;
}

interface ActionResult {
    action: DatabaseAction;
    result: any;
}

export class AIAgentController {
    private static readonly AVAILABLE_ACTIONS = {
        GetDatabaseInfo: "Get basic database information (name, description). No parameters needed.",
        GetTablesList: "Get list of all tables in the database. No parameters needed.",
        GetTableSchema: "Get detailed schema for a specific table. Required params: { tableName: 'name_of_table' }",
        ExecuteSQL: "Execute a SQL query. Required: SQL field with the query. Example: { SQL: 'SELECT * FROM table LIMIT 10' }",
        Remember: "Store important information from the previous action's result. Required params: { key: 'what_to_remember', value: 'the_value' }",
        Summarize: "End the conversation and provide final summary."
        // Future actions (not implemented yet):
        // AnalyzeData: "Analyze data patterns and provide insights"
        // ExplainQuery: "Explain a SQL query in natural language"
        // SuggestOptimization: "Suggest optimizations for database or queries"
        // ValidateQuery: "Validate a SQL query before execution"
        // GenerateERD: "Generate Entity Relationship Diagram description"
    };

    static async chat(req: Request, res: Response) {
        try {
            console.log('\n====== Chat Request Started ======');
            const { 
                message, 
                apiKey, 
                database, 
                conversationHistory = [],
                previousActions = []
            } = req.body;

            if (!apiKey) {
                console.log('Error: API key missing');
                return res.status(400).json({ error: 'API key is required' });
            }

            const genAI = new GoogleGenerativeAI(apiKey);
            
            const response = await AIAgentController.processQuery(
                genAI,
                message,
                database,
                conversationHistory,
                previousActions
            );

            console.log('\nSending response to client');
            console.log('====== Chat Request Completed ======\n');
            
            res.json({ 
                response,
                success: true
            });
        } catch (error) {
            console.error('\nError in chat:', error);
            console.log('====== Chat Request Failed ======\n');
            res.status(500).json({ error: 'Failed to process chat message' });
        }
    }

    private static async processQuery(
        genAI: GoogleGenerativeAI,
        query: string,
        database: any,
        conversationHistory: Array<{ sender: string; content: string }> = [],
        previousActions: ActionResult[] = []
    ): Promise<string> {
        console.log('\n=== Processing Query ===');
        console.log('User Query:', query);
        console.log('Database:', database);

        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        // Build the prompt
        const prompt = `You are an AI Agent for AskQL, specialized in helping users interact with databases. You can perform various database operations and provide insights. 

AVAILABLE ACTIONS:
- GetDatabaseInfo: Get basic database information (name, description). No parameters needed.
- GetTablesList: Get list of all tables in the database. No parameters needed.
- GetTableSchema: Get detailed schema for a specific table. Required params: { tableName: 'name_of_table' }
- ExecuteSQL: Execute a SQL query. Required: SQL field with the query. Example: { SQL: 'SELECT * FROM table LIMIT 10' }
- Remember: Store important information from the previous action's result. Required params: { key: 'what_to_remember', value: 'the_value' }
- Summarize: End the conversation and provide final summary.

To perform any action, respond with a JSON object that includes:
{
    "Action": "ActionName",
    "Params": {optional parameters based on action requirements},
    "SQL": "SQL query if using ExecuteSQL action",
    "Result": "Any additional information or context"
}

ACTION USAGE EXAMPLES:
1. Get database structure:
   {"Action": "GetDatabaseInfo"}

2. List all tables:
   {"Action": "GetTablesList"}

3. Get table schema:
   {"Action": "GetTableSchema", "Params": {"tableName": "Users"}}

4. Execute SQL query:
   {"Action": "ExecuteSQL", "SQL": "SELECT COUNT(*) FROM Users LIMIT 10"}

5. Count table records:
   {"Action": "CountRecords", "Params": {"tableName": "Users"}}

6. Remember important info:
   {"Action": "Remember", "Params": {"key": "tables", "value": "Available tables: Users, Products"}}

7. End conversation:
   {"Action": "Summarize", "Result": "Found 1000 users in the database"}

RECENT CONVERSATION:
${conversationHistory.length > 0 ? conversationHistory.join('\n') : 'No conversation history.'}

LAST ACTION AND RESULT:
${previousActions.length > 0 ? `Last Action: ${previousActions[previousActions.length - 1].action.Action}
Result: ${JSON.stringify(previousActions[previousActions.length - 1].result, null, 2)}` : 'No previous actions.'}

USER QUERY: ${query}

DECISION MAKING GUIDELINES:
1. First, check if you already have the information you need:
   - Look at the last action's result
   - If it has what you need, use Remember to store it
   - Don't repeat actions unnecessarily
2. Choose appropriate actions to gather new information
3. After each action that returns useful information:
   - Use Remember to store it for future use
   - Then decide what to do next
4. Always end with Summarize action to:
   - Explain what was done
   - Show results
   - Provide recommendations
   - Highlight any concerns

Remember:
1. ALWAYS use Remember action to store important information from action results
2. Check previous action results before making redundant calls
3. For destructive operations (DROP, DELETE, etc.):
   - Validate the request
   - Check dependencies
   - Warn about consequences
4. For data analysis:
   - Start with count/sample queries
   - Refine based on results
   - Always respect 10-row limit
5. Chain multiple actions when needed
6. Always validate SQL queries
${!database ? '\n7. Note: No database is currently selected.' : ''}
`;

        console.log('Prompt:', prompt);

        try {
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            
            console.log('Gemini Response:', text);
            
            // Extract the action JSON and any explanatory text
            const lines = text.split('\n');
            let action: DatabaseAction | null = null;
            let explanation = '';
            let jsonText = '';
            let jsonStarted = false;
            let isCollectingJson = false;

            for (const line of lines) {
                const trimmedLine = line.trim();
                
                // Check for JSON block start
                if (trimmedLine.includes('```json') || trimmedLine === '```') {
                    isCollectingJson = true;
                    continue;
                }
                
                // Check for JSON block end
                if (isCollectingJson && trimmedLine === '```') {
                    isCollectingJson = false;
                    continue;
                }
                
                // Collect JSON content
                if (isCollectingJson) {
                    jsonText += line + '\n';
                    continue;
                }
                
                // Check for direct JSON object
                if (trimmedLine.startsWith('{') && !jsonStarted) {
                    jsonStarted = true;
                    jsonText = trimmedLine;
                    continue;
                }
                
                // Continue collecting direct JSON if started
                if (jsonStarted) {
                    jsonText += line;
                    if (trimmedLine.endsWith('}')) {
                        jsonStarted = false;
                    }
                    continue;
                }
                
                // Collect explanation text
                if (!isCollectingJson && !jsonStarted) {
                    explanation += line + '\n';
                }
            }

            console.log('Extracted JSON text:', jsonText);
            console.log('Extracted explanation:', explanation);

            if (jsonText) {
                try {
                    // Clean up the JSON text
                    jsonText = jsonText.replace(/[\r\n]/g, '').trim();
                    action = JSON.parse(jsonText) as DatabaseAction;
                    console.log('Parsed action:', action);

                    if (!action) {
                        throw new Error('Failed to parse action from JSON');
                    }

                    // Validate LIMIT clause in SQL queries
                    if (action.SQL) {
                        const sql = action.SQL.toLowerCase();
                        if (sql.includes('select')) {
                            if (!sql.includes('limit')) {
                                action.SQL = `${action.SQL} LIMIT 10`;
                                console.log('Added missing LIMIT clause');
                            } else {
                                const limitMatch = sql.match(/limit\s+(\d+)/i);
                                if (limitMatch && parseInt(limitMatch[1]) > 10) {
                                    action.SQL = action.SQL.replace(/limit\s+\d+/i, 'LIMIT 10');
                                    console.log('Adjusted LIMIT to maximum allowed (10)');
                                }
                            }
                        }
                    }

                    // Execute the action
                    let actionResult: any;
                    const currentAction = action; // Store action in a const to ensure TypeScript knows it's not null
                    switch (currentAction.Action) {
                        case 'GetDatabaseInfo':
                            actionResult = database ? {
                                id: database.id,
                                name: database.name,
                                description: database.description,
                                type: database.database_type
                            } : { error: 'No database selected' };
                            break;

                        case 'GetTablesList':
                            actionResult = database?.tables ? 
                                database.tables.map((t: any) => ({ 
                                    id: t.id, 
                                    name: t.name, 
                                    description: t.description 
                                })) : 
                                { error: 'No tables found' };
                            break;

                        case 'GetTableSchema':
                            if (!currentAction.Params?.tableName) {
                                actionResult = { error: 'Table name not provided' };
                                break;
                            }
                            const table = database?.tables?.find((t: any) => t.name === currentAction.Params?.tableName);
                            if (!table) {
                                actionResult = { error: 'Table not found' };
                                break;
                            }
                            try {
                                const tableData = await DatabaseService.getTableData(table.id, 1, 1);
                                actionResult = {
                                    name: table.name,
                                    description: table.description,
                                    columns: Object.entries(tableData.columnTypes).map(([name, type]) => ({
                                        name,
                                        type,
                                        description: table.attributes?.find((attr: Attribute) => attr.name === name)?.description || '',
                                        is_nullable: table.attributes?.find((attr: Attribute) => attr.name === name)?.is_nullable || false,
                                        is_primary_key: table.attributes?.find((attr: Attribute) => attr.name === name)?.is_primary_key || false,
                                        is_foreign_key: table.attributes?.find((attr: Attribute) => attr.name === name)?.is_foreign_key || false
                                    }))
                                };
                            } catch (error) {
                                console.error('Error fetching table schema:', error);
                                actionResult = {
                                    error: 'Failed to fetch table schema'
                                };
                            }
                            break;

                        case 'Remember':
                            if (!currentAction.Params?.key || !currentAction.Params?.value) {
                                actionResult = { error: 'Both key and value are required for Remember action' };
                                break;
                            }
                            actionResult = {
                                remembered: true,
                                key: currentAction.Params.key,
                                value: currentAction.Params.value
                            };
                            break;

                        case 'Summarize':
                            // No additional processing needed for Summarize
                            actionResult = { message: 'Conversation ended' };
                            break;

                        case 'ExecuteSQL':
                            if (!currentAction.SQL) {
                                actionResult = { error: 'SQL query not provided' };
                                break;
                            }
                            try {
                                // Create an instance of TableDataController
                                const tableDataController = new TableDataController();
                                
                                // Execute the query
                                const result = await tableDataController.executeQuery({
                                    body: {
                                        sql: currentAction.SQL,
                                        databaseId: database.id
                                    }
                                } as Request, {
                                    json: (data: any) => {
                                        actionResult = {
                                            success: true,
                                            ...data
                                        };
                                    },
                                    status: (code: number) => ({
                                        json: (data: any) => {
                                            actionResult = {
                                                success: false,
                                                error: data.error
                                            };
                                        }
                                    })
                                } as Response);
                            } catch (error) {
                                console.error('Error executing SQL query:', error);
                                actionResult = { error: 'Failed to execute SQL query' };
                            }
                            break;

                        default:
                            actionResult = { error: 'Action not implemented' };
                    }

                    // Keep only the current action result
                    previousActions = [{
                        action: currentAction,
                        result: actionResult
                    }];

                    // Format the response
                    let formattedResponse = '';
                    
                    if (currentAction.SQL) {
                        formattedResponse += `[SQL Query]\n\`\`\`sql\n${currentAction.SQL}\n\`\`\`\n\n`;
                    }

                    // If this is not a Summarize action, continue with next action
                    if (currentAction.Action !== 'Summarize') {
                        return await AIAgentController.processQuery(
                            genAI,
                            query,
                            database,
                            conversationHistory,
                            previousActions
                        );
                    }

                    // For Summarize action, use the Result field as the response
                    if (currentAction.Result) {
                        formattedResponse = currentAction.Result;
                    } else {
                        // Fallback to a default response if no Result field
                        formattedResponse = `I'm your database assistant. ${!database ? 
                            "I notice there's no database selected yet. Would you like me to help you work with a database?" : 
                            "How can I help you with your database today?"}`;
                    }

                    console.log('Formatted Response:', formattedResponse);
                    console.log('Action:', currentAction.Action);
                    console.log('=== Query Processing Complete ===\n');

                    return formattedResponse;
                } catch (e) {
                    console.error('Failed to parse action:', e);
                    console.error('JSON text was:', jsonText);
                }
            }

            // If no valid action found, create a default response for general conversation
            return `I'm your database assistant. ${!database ? 
                "I notice there's no database selected yet. Would you like me to help you work with a database?" : 
                "How can I help you with your database today?"}`;
        } catch (error) {
            console.error('Error processing query:', error);
            throw new Error('Failed to process query');
        }
    }
} 