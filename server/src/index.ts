import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { AppDataSource } from './config/database';
import databaseRoutes from './routes/databaseRoutes';
import tableRoutes from './routes/tableRoutes';
import tableDataRoutes from './routes/tableDataRoutes';
import attributeRoutes from './routes/attributeRoutes';
import csvImportRoutes from './routes/csvImportRoutes';
import chatRoutes from './routes/chatRoutes';
import geminiRoutes from './routes/geminiRoutes';
import path from 'path';
import { Database } from './entities/Database';

const app = express();

// Enable CORS
app.use(cors());

// Parse JSON bodies
app.use(express.json());

// Serve static files from the uploads directory
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Add error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Error:', err);
    res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: err.message
    });
});

// Routes
app.use('/api/databases', databaseRoutes);
app.use('/api/tables', tableRoutes);
app.use('/api/tableData', tableDataRoutes);
app.use('/api/attributes', attributeRoutes);
app.use('/api/csv', csvImportRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/gemini', geminiRoutes);

// Initialize database connection
AppDataSource.initialize()
    .then(async () => {
        console.log('Data Source has been initialized!');

        // Verify database connection and tables
        try {
            // Check if Database table exists and has records
            const databaseRepo = AppDataSource.getRepository(Database);
            const databases = await databaseRepo.find();
            console.log(`Found ${databases.length} databases in the system`);

            // Log table information
            console.log('Database tables:', AppDataSource.entityMetadatas.map(metadata => metadata.tableName));

            // Start server
            const PORT = process.env.PORT || 3000;
            app.listen(PORT, () => {
                console.log(`Server is running on port ${PORT}`);
            });
        } catch (error) {
            console.error('Error verifying database setup:', error);
            process.exit(1);
        }
    })
    .catch((error) => {
        console.error('Error during Data Source initialization:', error);
        process.exit(1);
    }); 