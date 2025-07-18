# AskQL - Natural Language Data Analytics Platform

## The Problem

Small businesses and non-technical users often struggle to analyze their financial and business data due to complex tools, the need for SQL or programming knowledge, and expensive analytics solutions. Traditional platforms require technical expertise, making it difficult to:
- Integrate data from various sources
- Clean and model data visually
- Ask questions in plain English
- Automate reporting and workflows
- Detect trends, anomalies, and risks
- Simulate business scenarios
- Visualize and export insights

These barriers prevent many organizations from making data-driven decisions, predicting issues, and understanding their financial health affordably and intuitively.

![AskQL Logo](src/assets/askql_logo_rect.png)

## Overview

AskQL is a powerful, intuitive data analytics platform designed specifically for small business owners and non-technical users. Transform your business data into actionable insights using natural language queries - no SQL or programming skills required.

## 🚀 Key Features

### 📊 Data Integration
- Upload CSV/Excel files directly
- Connect to accounting software and databases
- Automated data cleaning and validation
- Multiple data source support
- Real-time database monitoring
- Performance metrics and analytics
- Automated backup and recovery
- Database health monitoring

### 🎯 Database Features

#### 🔒 Security & Access Control
- Role-based access control (RBAC)
- Row-level security policies
- Audit logging and tracking
- Encryption at rest and in transit
- SSL/TLS secure connections
- Password policies and management
- IP whitelisting capabilities

#### 🚀 Performance Optimization
- Query performance monitoring
- Automated index recommendations
- Query plan visualization
- Connection pooling
- Cache management
- Resource usage analytics
- Performance bottleneck detection

#### 🔄 High Availability
- Automated failover
- Load balancing
- Read replicas support
- Point-in-time recovery
- Transaction log shipping
- Continuous backup
- Zero-downtime migrations

#### 📈 Scalability
- Horizontal and vertical scaling
- Sharding capabilities
- Connection load balancing
- Query distribution
- Auto-scaling configurations
- Resource allocation management

#### 🛠 Administration Tools
- Visual query builder
- Schema management interface
- Backup and restore GUI
- User management dashboard
- Performance monitoring tools
- Log analysis utilities
- Database comparison tools

#### 🔍 Monitoring & Alerts
- Real-time performance metrics
- Custom alert thresholds
- Email/Slack notifications
- Resource usage tracking
- Query performance alerts
- Security incident notifications
- Health check monitoring

#### 🔄 Data Migration
- Schema migration tools
- Data import/export wizards
- ETL pipeline support
- Version control integration
- Rollback capabilities
- Migration scheduling
- Progress tracking

#### 📊 Analytics & Reporting
- Custom report builder
- Scheduled report generation
- Export in multiple formats
- Dashboard creation
- Trend analysis
- Performance reporting
- Usage statistics

### 🎨 Visual Data Modeling
- Automatically generated Entity Relationship Diagrams (ERDs)
- Interactive schema visualization
- Drag-and-drop data relationship mapping
- Real-time schema editing

### 💬 Natural Language Interface
- Ask business questions in plain English
- AI-powered query translation
- Conversational data exploration
- Voice-to-text support

### 🤖 Automated Workflows
- Build custom data pipelines
- Schedule automated reports
- Email notifications and alerts
- Workflow automation (Airflow DAGs)

### 🧠 AI-Powered Insights
- Anomaly detection
- Trend prediction
- Personalized business recommendations
- Risk assessment and alerts

### 🎙️ Voice & Chatbot Interaction
- Hands-free analytics
- Conversational querying
- Voice commands
- Interactive AI assistant

### 🔬 Simulation & Experimentation
- "What-if" scenario modeling
- Business change simulation
- Outcome projection
- Performance benchmarking

### 📈 Visualization & Reporting
- Interactive dashboards
- Custom charts and graphs
- Exportable reports
- Real-time monitoring

## 🛤️ User Journey

1. **Home** → Start your analytics journey
2. **Database Page** → Create, select, upload, or connect your data sources
3. **ERD Page** → Visualize and edit your data schema
4. **Insights & Analytics Page** → Chat with your data, run analysis, create simulations, and export results

## 🎯 Goal

Help small businesses understand their financial health, make data-driven decisions, predict potential issues, benchmark performance, and get actionable insights - all affordably and intuitively.

## 🚀 Getting Started

### Prerequisites

- [Node.js (v18 or higher)](https://nodejs.org/)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- [PostgreSQL](https://www.postgresql.org/download/) (optional, for production database)
  - Download and install PostgreSQL from the official website for your operating system.
  - Ensure the PostgreSQL service is running and accessible.

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd AskQL_Latest
   ```

2. **Install frontend dependencies**
   ```bash
   npm install
   ```

3. **Install backend dependencies**
   ```bash
   cd server
   npm install
   cd ..
   ```

### Development Setup

1. **Start the frontend development server**
   ```bash
   npm run dev
   ```
   The frontend will be available at `http://localhost:5173`

2. **Start the backend server** (in a new terminal)
   ```bash
   cd server
   npm run dev
   ```
   The backend API will be available at `http://localhost:3000`

### Environment Configuration

Create a `.env` file in the server directory with the following variables:

```env
# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/askql

# AI Configuration
GEMINI_API_KEY=your_gemini_api_key_here

# Server Configuration
PORT=3000
NODE_ENV=development
```

## 📁 Project Structure

```
AskQL_Latest/
├── src/                    # Frontend React application
│   ├── components/         # Reusable UI components
│   ├── pages/             # Application pages
│   ├── services/          # API services
│   ├── styles/            # CSS styles
│   └── utils/             # Utility functions
├── server/                # Backend Node.js application
│   ├── src/
│   │   ├── controllers/   # API controllers
│   │   ├── entities/      # Database entities
│   │   ├── routes/        # API routes
│   │   ├── services/      # Business logic
│   │   └── utils/         # Server utilities
│   └── public/            # Static files
├── datasets/              # Sample datasets
└── public/                # Frontend static assets
```

## 🛠️ Available Scripts

### Frontend
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Backend
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm run start` - Start production server
- `npm run migration:generate` - Generate database migrations
- `npm run migration:run` - Run database migrations

## 🔧 Technology Stack

### Frontend
- **React 19** - Modern UI library
- **TypeScript** - Type-safe JavaScript
- **Vite** - Fast build tool
- **Tailwind CSS** - Utility-first CSS framework
- **Framer Motion** - Animation library
- **Chart.js** - Data visualization
- **React Query** - Data fetching and caching

### Backend
- **Node.js** - JavaScript runtime
- **Express** - Web framework
- **TypeScript** - Type-safe JavaScript
- **TypeORM** - Database ORM
- **PostgreSQL** - Primary database
- **SQLite** - In-memory database (via sql.js)
- **Google Gemini AI** - Natural language processing

## 📊 Features in Detail

### Data Upload & Import
- Drag-and-drop CSV/Excel upload
- Real-time data validation
- Automatic data type detection
- Data preview and confirmation

### Natural Language Queries
- "Show me our revenue trends for the last 6 months"
- "Which products are performing best?"
- "What's our customer acquisition cost?"
- "Find anomalies in our sales data"

### Visual Analytics
- Interactive charts and graphs
- Customizable dashboards
- Real-time data updates
- Export capabilities (PDF, PNG, CSV)

### AI-Powered Insights
- Automated pattern detection
- Predictive analytics
- Risk assessment
- Personalized recommendations

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support, email support@askql.com or join our community Discord server.

## 🙏 Acknowledgments

- Built with modern web technologies
- Powered by Google Gemini AI
- Designed for small business success

---

**AskQL** - Making data analytics accessible to everyone, one question at a time.