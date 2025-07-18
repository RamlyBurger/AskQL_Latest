import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useParams } from 'react-router-dom';
import AIChatBot from './AIChatBot';
import { DatabaseService } from '../services/DatabaseService';
import type { Database } from '../services/DatabaseService';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

const DatabaseViewWrapper: React.FC = () => {
    const location = useLocation();
    const params = useParams();
    const [database, setDatabase] = useState<Database | null>(null);

    const fetchDatabase = async (databaseId: string) => {
        try {
            const data = await DatabaseService.getDatabaseById(parseInt(databaseId));
            setDatabase(data);
        } catch (error) {
            console.error('Error fetching database:', error);
        }
    };

    useEffect(() => {
        const getDatabaseId = async () => {
            try {
                let databaseId: string | null = null;

                // Extract database ID from URL
                if (location.pathname.includes('/database/')) {
                    databaseId = params.id!;
                } else if (location.pathname.includes('/table/')) {
                    // If we're on a table page, we need to get the database ID from the table
                    const tableId = params.id;
                    if (tableId) {
                        const table = await DatabaseService.getTableById(parseInt(tableId));
                        databaseId = table.database_id.toString();
                    }
                }

                if (databaseId) {
                    await fetchDatabase(databaseId);
                }
            } catch (error) {
                console.error('Error getting database ID:', error);
            }
        };

        getDatabaseId();
    }, [location.pathname, params.id]);

    const showChatBot = location.pathname.includes('/database/') || location.pathname.includes('/table/');

    return (
        <>
            <Outlet context={{ database, refreshDatabase: fetchDatabase }} />
            {showChatBot && database && (
                <AIChatBot
                    database={database}
                    apiKey={GEMINI_API_KEY}
                />
            )}
        </>
    );
};

export default DatabaseViewWrapper; 