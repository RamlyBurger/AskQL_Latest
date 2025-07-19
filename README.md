# AskQL - Natural Language Data Analytics Platform

## The Problem

Many businesses, especially small and medium enterprises (SMEs), are transitioning from traditional data storage like Excel and CSVs to modern cloud databases. However, this transition creates a new challenge: decision-makers are often **locked out of their own data**.

They lack:
- **Technical Staff:** Most SMEs cannot afford dedicated data analysts who can write complex SQL or Python code.
- **Accessible Tools:** Traditional analytics platforms are complex, expensive, and not designed for non-technical users.
- **Immediate Answers:** Getting a simple answer to a question like, *"What was our best-selling product last quarter?"* can require waiting for technical teams or consultants.

This reliance on intermediaries slows down business intelligence, increases costs, and prevents organizations from making timely, data-driven decisions.

![AskQL Logo](src/assets/askql_logo.gif)
![AskQL Logo](src/assets/intro.gif)

## Overview

AskQL is a powerful, intuitive data analytics platform designed to bridge this gap. It empowers small business owners and non-technical users to transform their business data into actionable insights using plain English—no SQL or programming skills required.

## 🚀 Key Features

### 📊 Data Integration & Creation
- **AI Database Generation:** Describe your business needs in text, and AskQL will generate a complete database schema from scratch—perfect for startups.
- **Upload & Connect:** Easily upload CSV/Excel files or connect to existing accounting software and databases.
- **Automated Cleaning:** Data is automatically cleaned, validated, and prepared for analysis.
- **Multiple Data Sources:** Consolidate and analyze data from various sources in one place.

### 💬 Conversational AI Chatbot
- **Ask in Plain English:** Get answers to your business questions through an intuitive chat interface.
- **Follow-up Questions:** Engage in a conversation with your data. Ask follow-up questions to drill down and explore insights dynamically.
- **AI-Powered Translation:** Your natural language questions are automatically translated into precise database queries.
- **Voice-to-Text Support:** Ask questions hands-free using voice commands.

### 🔬 Simulation & Experimentation
- **"What-if" Scenarios:** Model the potential impact of business changes.
- **Outcome Projection:** Simulate different strategies to project future outcomes.

### 📈 Visualization & Reporting
- **Interactive Dashboards:** Create and customize dashboards with real-time data.
- **Custom Charts & Graphs:** Visualize your insights with a wide range of chart types.
- **Exportable Reports:** Export your dashboards and reports to PDF, PNG, or CSV.

### 🎯 Database Features

#### 🚀 Performance Optimization
- Query performance monitoring
- Automated index recommendations
- Query plan visualization
- Caching and connection pooling

#### 🔄 High Availability & Scalability
- Automated failover and load balancing
- Horizontal and vertical scaling support
- Point-in-time recovery and continuous backup

#### 🛠 Administration & Monitoring
- Visual query builder and schema management
- Real-time performance metrics and health monitoring
- Custom alerts with Email/Slack notifications

## 🛤️ User Journey

1.  **Home** → Start your analytics journey.
2.  **Database Page** → Create a new database with AI, upload files, or connect to your existing data sources.
3.  **ERD Page** → Visualize and model your data schema.
4.  **Insights & Analytics Page** → Chat with your data, run analysis, create simulations, and export results.

## 🎯 Goal

To help small businesses understand their financial health, make data-driven decisions, predict potential issues, and get actionable insights—all affordably and intuitively.

## 🚀 Getting Started

### Prerequisites

- [Node.js (v18 or higher)](https://nodejs.org/)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- [PostgreSQL](https://www.postgresql.org/download/) (optional, for production database)
  - Download and install PostgreSQL from the official website for your operating system.
  - Ensure the PostgreSQL service is running and accessible.

### Installation

1.  **Clone the repository**
    ````bash
    git clone <repository-url>
    cd AskQL_Latest
    ````

2.  **Install frontend dependencies**
    ````bash
    npm install
    ````

3.  **Install backend dependencies**
    ````bash
    cd server
    npm install
    cd ..
    ````

### Development Setup

1.  **Start the frontend development server**
    ````bash
    npm run dev
    ````
    The frontend will be available at `http://localhost:5173`

2.  **Start the backend server** (in a new terminal)
    ````bash
    cd server
    npm run dev
    ````
    The backend API will be available at `http://localhost:3000`

### Environment Configuration

Create a `.env` file in the `server` directory with the following variables:

````env
# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/askql

# AI Configuration
GEMINI_API_KEY=your_gemini_api_key_here

# Server Configuration
PORT=3000
NODE_ENV=development