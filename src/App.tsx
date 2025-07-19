import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import DatabasePage from './pages/DatabasePage';
import DatabaseDetailPage from './pages/DatabaseDetailPage';
import TableDetailPage from './pages/TableDetailPage';
import QueryResultsPage from './pages/QueryResultsPage';
import ResetDatabasePage from './pages/ResetDatabasePage';
import Layout from './components/shared/Layout';
import DatabaseViewWrapper from './components/DatabaseViewWrapper';

function App() {
    return (
        <Router>
            <Layout>
                <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/database" element={<DatabasePage />} />
                    <Route element={<DatabaseViewWrapper />}>
                        <Route path="/database/:id" element={<DatabaseDetailPage />} />
                        <Route path="/table/:id" element={<TableDetailPage />} />
                    </Route>
                    <Route path="/queryresults" element={<QueryResultsPage />} />
                    <Route path="/reset-database" element={<ResetDatabasePage />} />
                </Routes>
            </Layout>
        </Router>
    );
}

export default App;
