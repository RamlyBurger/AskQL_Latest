import express from 'express';
import cors from 'cors';
import path from 'path';
import { AppDataSource } from './config/database';
import databaseRoutes from './routes/databaseRoutes';
import tableRoutes from './routes/tableRoutes';
import attributeRoutes from './routes/attributeRoutes';
import tableDataRoutes from './routes/tableDataRoutes';
import csvImportRoutes from './routes/csvImportRoutes';
import geminiRoutes from './routes/geminiRoutes';

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use(express.static('public'));

// Initialize database connection
AppDataSource.initialize()
    .then(() => {
        console.log('Database connection initialized');

        // Routes
        app.use('/api/databases', databaseRoutes);
        app.use('/api/tables', tableRoutes);
        app.use('/api/attributes', attributeRoutes);
        app.use('/api/table-data', tableDataRoutes);
        app.use('/api/csv-import', csvImportRoutes);
        app.use('/api/gemini', geminiRoutes);

        // Start server
        app.listen(port, () => {
            console.log(`Server is running on port ${port}`);
        });
    })
    .catch((error) => {
        console.error('Error initializing database connection:', error);
    }); 