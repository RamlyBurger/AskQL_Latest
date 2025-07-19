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
        GetTablesList: "Get list of all tables with their complete schema (columns, types, constraints). No parameters needed.",
        GetTableSchema: "Get detailed schema for a specific table. Required params: { tableName: 'name_of_table' }",
        ExecuteSQL: "Execute a SQL query. Required: SQL field with the query. Example: { SQL: 'SELECT * FROM table limit 3' }",
        Remember: "Store important information from the previous action's result. Required params: { key: 'what_to_remember', value: 'the_value' }",
        Respond: "Communicate directly with the user."
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

            // Validate database object
            if (!database) {
                console.log('Warning: No database provided');
                return res.status(400).json({ error: 'Database information is required' });
            }

            if (!database.tables) {
                console.log('Warning: Database has no tables');
                return res.status(400).json({ error: 'Database has no tables' });
            }

            console.log('Database Info:', {
                id: database.id,
                name: database.name,
                tableCount: database.tables.length,
                tables: database.tables.map((t: any) => t.name)
            });

            const genAI = new GoogleGenerativeAI(apiKey);
            
            const { response, stage } = await AIAgentController.processQuery(
                genAI,
                message,
                database,
                conversationHistory,
                previousActions
            );

            console.log('\nSending response to client');
            console.log('Current Stage:', stage);
            
            // Return response in the format expected by the frontend
            res.json({ 
                response,
                success: true,
                stage,
                action: previousActions.length > 0 ? previousActions[previousActions.length - 1].action : null
            });

            console.log('====== Chat Request Completed ======\n');
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
        previousActions: ActionResult[] = [],
        loopCount: number = 0
    ): Promise<{ response: string; stage: string }> {
        console.log('\n=== Processing Query ===');
        console.log('User Query:', query);
        console.log('Database:', database);
        console.log('Loop Count:', loopCount);

        // Prevent infinite loops by limiting to 3 iterations
        if (loopCount >= 3) {
            console.log('Reached maximum number of action loops (3), stopping...');
            return {
                response: previousActions.length > 0 
                    ? `Based on the actions taken: ${previousActions.map(a => a.action.Action).join(' → ')}`
                    : 'Reached maximum number of actions (3) without a clear result. Please try a more specific query.',
                stage: 'Respond'
            };
        }

        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        // Build the prompt
        const prompt = `You are an AI Agent for AskQL, specialized in helping users interact with databases. You can perform various database operations and provide insights. 

IMPORTANT: For ANY database-related questions, ALWAYS use GetTablesList first to understand the database structure before providing any other response.

WORKFLOW:
1. For ANY question about tables or data:
   - FIRST use GetTablesList to get table information
   - WAIT for the result in LAST ACTION AND RESULT
   - THEN proceed with your response based on the actual table information

2. For SQL queries:
   - FIRST use GetTablesList to get table information
   - WAIT for the result in LAST ACTION AND RESULT
   - THEN use Action "Respond" with the SQL query formatted in markdown
   - NEVER use ExecuteSQL action for user's SQL requests
   - ALWAYS include LIMIT 3 in SELECT queries
   - Use exact table and column names from GetTablesList result

GUIDELINES:
1. RESPONSE FORMAT:
   - ALWAYS reply with a JSON object
   - NEVER skip GetTablesList for database questions
   - Use exact table names from GetTablesList result

2. SQL Query Guidelines:
   - When user asks for SQL, only provide the query, DO NOT execute it
   - Format SQL queries in markdown code blocks
   - For SELECT queries, always include LIMIT 3
   - For CREATE/UPDATE/DELETE queries, add warning about potential impacts

AVAILABLE ACTIONS:
- GetDatabaseInfo: Get basic database information (name, description). No parameters needed.
  Example: {"Action": "GetDatabaseInfo"}

- GetTablesList: Get list of all tables with their complete schema (columns, types, constraints). No parameters needed.
  Example: {"Action": "GetTablesList"}

- GetTableSchema: Get detailed schema for a specific table. Required params: { tableName: 'name_of_table' }
  Example: {"Action": "GetTableSchema", "Params": {"tableName": "users"}}

- Respond: Communicate directly with the user.
  Example: {"Action": "Respond", "Result": "Here's the SQL query you requested:\n\`\`\`sql\nSELECT * FROM users LIMIT 3;\n\`\`\`"}

- Remember: Store important information from the previous action's result.
  Example: {"Action": "Remember", "Params": {"key": "table_count", "value": "Found 2 tables"}}

NOTE: ExecuteSQL action should NOT be used for user SQL requests. Only provide SQL queries in the response.

EXAMPLE FLOWS:
1. User asks: "What tables do I have?"
   Step 1: {"Action": "GetTablesList"}
   Step 2: {"Action": "Respond", "Result": "You have the following tables: [list from result]"}

2. User asks: "Give me SQL to show cars with horsepower > 150"
   Step 1: {"Action": "GetTablesList"}
   Step 2: {"Action": "Respond", "Result": "Here's the SQL query to find cars with horsepower > 150:\n\`\`\`sql\nSELECT * FROM Car WHERE horsepower > 150 LIMIT 3;\n\`\`\`"}

RECENT CONVERSATION:
${conversationHistory.length > 0 ? conversationHistory.join('\n') : 'No conversation history.'}

REMEMBERED INFORMATION:
${previousActions.some(action => action.action.Action === 'Remember') ? 
  previousActions
    .filter(action => action.action.Action === 'Remember')
    .map(action => `${action.action.Params?.key}: ${action.action.Params?.value}`)
    .join('\n') 
  : 'No remembered information.'}

LAST ACTION AND RESULT:
${previousActions.length > 0 ? `Last Action: ${previousActions[previousActions.length - 1].action.Action}
Result: ${JSON.stringify(previousActions[previousActions.length - 1].result, null, 2)}` : 'No previous actions.'}

USER QUERY: ${query}

Remember: ALWAYS use GetTablesList first for ANY database-related questions!`;

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
                                action.SQL = `${action.SQL} limit 3`;
                                console.log('Added missing LIMIT clause');
                            } else {
                                const limitMatch = sql.match(/limit\s+(\d+)/i);
                                if (limitMatch && parseInt(limitMatch[1]) > 10) {
                                    action.SQL = action.SQL.replace(/limit\s+\d+/i, 'limit 3');
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
                            if (!database?.tables) {
                                actionResult = { error: 'No tables found' };
                                break;
                            }

                            try {
                                // Get schema for all tables
                                actionResult = database.tables.map((table: any) => ({
                                    id: table.id,
                                    name: table.name,
                                    description: table.description,
                                    columns: table.attributes?.map((attr: Attribute) => ({
                                        name: attr.name,
                                        type: attr.data_type,
                                        is_nullable: attr.is_nullable || false,
                                        is_primary_key: attr.is_primary_key || false,
                                        is_foreign_key: attr.is_foreign_key || false
                                    })) || []
                                }));
                            } catch (error) {
                                console.error('Error fetching tables list:', error);
                                actionResult = { error: 'Failed to fetch tables list' };
                            }
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

                        case 'Respond':
                            // No additional processing needed for Respond
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

                    // If this is not a Respond action, continue with next action
                    if (currentAction.Action !== 'Respond') {
                        return await AIAgentController.processQuery(
                            genAI,
                            query,
                            database,
                            conversationHistory,
                            previousActions,
                            loopCount + 1
                        );
                    }

                    // For Respond action, use the Result field as the response
                    if (currentAction.Result) {
                        return {
                            response: currentAction.Result,
                            stage: currentAction.Action
                        };
                    }

                    // Fallback response
                    return {
                        response: `I'm your database assistant. ${!database ? 
                            "I notice there's no database selected yet. Would you like me to help you work with a database?" : 
                            "How can I help you with your database today?"}`,
                        stage: 'Respond'
                    };

                } catch (e) {
                    console.error('Failed to parse action:', e);
                    console.error('JSON text was:', jsonText);
                    return {
                        response: 'I encountered an error processing your request. Could you please rephrase it?',
                        stage: 'Respond'
                    };
                }
            }

            // If no valid action found, return default response
            return {
                response: `I'm your database assistant. ${!database ? 
                    "I notice there's no database selected yet. Would you like me to help you work with a database?" : 
                    "How can I help you with your database today?"}`,
                stage: 'Respond'
            };

        } catch (error) {
            console.error('Error processing query:', error);
            throw error;
        }
    }
} 