import React, { useState, useRef, useEffect } from 'react';
import { FaRobot, FaPaperPlane, FaTimes, FaPlay } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import GeminiService from '../services/GeminiService';
import SQLService from '../services/SQLService';
import { useNavigate } from 'react-router-dom';
import { DatabaseService } from '../services/DatabaseService';

interface ChatMessage {
    sender: 'user' | 'bot';
    content: string;
    timestamp: Date;
    sql?: string; // Optional SQL query if the message contains one
}

interface AIChatBotProps {
    apiKey: string;
    database?: any;
}

const MIN_WIDTH = 300;
const MAX_WIDTH = 800;

const AIChatBot: React.FC<AIChatBotProps> = ({ apiKey, database }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [width, setWidth] = useState(400);
    const [isDragging, setIsDragging] = useState(false);
    
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const geminiService = useRef<GeminiService>(new GeminiService(apiKey));
    const navigate = useNavigate();

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isThinking]);

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        e.preventDefault();
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging) {
                const newWidth = e.clientX;
                if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
                    setWidth(newWidth);
                }
            }
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging]);

    const extractSQLQuery = (content: string): string | undefined => {
        const sqlMatch = content.match(/```sql\n([\s\S]*?)\n```/);
        return sqlMatch ? sqlMatch[1].trim() : undefined;
    };

    // Initialize SQLite database when database prop changes
    useEffect(() => {
        const initDatabase = async () => {
            if (!database?.id) return;

            try {
                const sqlService = SQLService.getInstance();
                
                // Get tables with their data
                const tables = await Promise.all(
                    database.tables.map(async (table: any) => {
                        const data = await DatabaseService.getTableData(table.id);
                        return {
                            ...table,
                            data: data.data
                        };
                    })
                );

                // Initialize SQLite database with tables and data
                await sqlService.createDatabase(database.id, tables);
                console.log('SQLite database initialized with tables:', tables.map(t => t.name));
            } catch (error) {
                console.error('Error initializing SQLite database:', error);
                setError('Failed to initialize database for SQL queries');
            }
        };

        initDatabase();
    }, [database?.id]);

    const handleExecuteQuery = async (sql: string) => {
        try {
            // Open in new tab with the SQL query
            const queryUrl = `/query-results?sql=${encodeURIComponent(sql)}&dbId=${database?.id}`;
            window.open(queryUrl, '_blank');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to execute query';
            setError(errorMessage);
        }
    };

    const handleSend = async () => {
        if (!inputMessage.trim()) return;
        if (!apiKey) {
            setError('API key is not configured. Please set GEMINI_API_KEY in your environment.');
            return;
        }

        setError(null);
        const userMessage: ChatMessage = {
            sender: 'user',
            content: inputMessage,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInputMessage('');
        setIsThinking(true);

        try {
            // Get response from Gemini with database context
            const response = await geminiService.current.sendMessage(inputMessage, database);

            // Extract SQL query if present
            const sql = extractSQLQuery(response);

            const botMessage: ChatMessage = {
                sender: 'bot',
                content: response,
                timestamp: new Date(),
                sql: sql
            };
            
            setMessages(prev => [...prev, botMessage]);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An error occurred while processing your message';
            setError(errorMessage);
            console.error('Error in chat communication:', error);
            
            const errorBotMessage: ChatMessage = {
                sender: 'bot',
                content: `I apologize, but I encountered an error: ${errorMessage}`,
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorBotMessage]);
        } finally {
            setIsThinking(false);
        }
    };

    // Custom styles for markdown content
    const markdownStyles = {
        code: 'bg-gray-800 text-white px-2 py-1 rounded font-mono text-sm',
        pre: 'bg-gray-800 text-white p-4 rounded-lg overflow-x-auto my-2 relative group',
        a: 'text-blue-600 hover:text-blue-800 underline',
        ul: 'list-disc pl-4 my-2',
        ol: 'list-decimal pl-4 my-2',
        blockquote: 'border-l-4 border-gray-300 pl-4 my-2 italic',
    };

    return (
        <AnimatePresence>
            {/* Floating Action Button */}
            <motion.button
                key="chat-fab"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                onClick={() => setIsOpen(!isOpen)}
                className="fixed bottom-6 right-6 z-50 bg-blue-600 text-white rounded-full p-4 shadow-lg hover:bg-blue-700 transition-colors"
            >
                <FaRobot className="text-2xl" />
            </motion.button>

            {/* Chat Panel and Resizer */}
            {isOpen && (
                <motion.div
                    key="chat-container"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    <motion.div
                        key="chat-panel"
                        initial={{ x: '-100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '-100%' }}
                        style={{ width: `${width}px` }}
                        className="fixed left-0 top-0 h-full bg-white shadow-xl z-40 flex flex-col"
                    >
                        {/* Header */}
                        <div className="flex justify-between items-center px-4 py-3 bg-blue-600 text-white">
                            <div className="flex items-center space-x-2">
                                <FaRobot className="text-xl" />
                                <h2 className="text-lg font-semibold">AI Assistant</h2>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-2 hover:bg-blue-700 rounded"
                            >
                                <FaTimes />
                            </button>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative m-4">
                                <span className="block sm:inline">{error}</span>
                            </div>
                        )}

                        {/* Messages Area */}
                        <div className="flex-1 p-4 overflow-y-auto">
                            {messages.map((message, index) => (
                                <div
                                    key={index}
                                    className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'} mb-4`}
                                >
                                    <div className={`relative max-w-[80%] rounded-lg p-3 ${
                                        message.sender === 'user'
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-100'
                                    }`}>
                                        <div className={`prose ${message.sender === 'user' ? 'prose-invert' : ''} max-w-none`}>
                                            <ReactMarkdown
                                                components={{
                                                    code: ({children, className}) => {
                                                        if (className === 'language-sql' || message.sql) {
                                                            return (
                                                                <div className="relative">
                                                                    <pre className={markdownStyles.pre}>
                                                                        <code className={className}>
                                                                            {children}
                                                                        </code>
                                                                        <button
                                                                            onClick={() => handleExecuteQuery(message.sql || String(children))}
                                                                            className="absolute top-2 right-2 bg-green-500 hover:bg-green-600 text-white p-2 rounded flex items-center gap-2"
                                                                            title="Run Query"
                                                                        >
                                                                            <FaPlay />
                                                                        </button>
                                                                    </pre>
                                                                </div>
                                                            );
                                                        }
                                                        return (
                                                            <code className={markdownStyles.code}>
                                                                {children}
                                                            </code>
                                                        );
                                                    },
                                                    pre: ({children}) => (
                                                        <pre className={`${markdownStyles.pre} mt-8 mb-4`}>
                                                            {children}
                                                        </pre>
                                                    ),
                                                    a: ({href, children}) => (
                                                        <a href={href} className={markdownStyles.a} target="_blank" rel="noopener noreferrer">
                                                            {children}
                                                        </a>
                                                    ),
                                                    ul: ({children}) => <ul className={markdownStyles.ul}>{children}</ul>,
                                                    ol: ({children}) => <ol className={markdownStyles.ol}>{children}</ol>,
                                                    blockquote: ({children}) => (
                                                        <blockquote className={markdownStyles.blockquote}>{children}</blockquote>
                                                    ),
                                                }}
                                            >
                                                {message.content}
                                            </ReactMarkdown>
                                        </div>
                                        <p className="text-xs mt-1 opacity-70">
                                            {message.timestamp.toLocaleTimeString()}
                                        </p>
                                    </div>
                                </div>
                            ))}
                            {isThinking && (
                                <div className="flex items-center space-x-2 p-3 bg-gray-100 rounded-lg max-w-[80%]">
                                    <div className="flex space-x-1">
                                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" />
                                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-100" />
                                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-200" />
                                    </div>
                                    <span className="text-sm text-gray-500">AI is thinking...</span>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="border-t p-4">
                            <div className="flex items-center space-x-2">
                                <textarea
                                    value={inputMessage}
                                    onChange={(e) => setInputMessage(e.target.value)}
                                    onKeyPress={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSend();
                                        }
                                    }}
                                    placeholder={!apiKey ? 'API key not configured' : 'Type your message...'}
                                    disabled={!apiKey}
                                    className="flex-1 border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none disabled:bg-gray-100"
                                    rows={1}
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={!inputMessage.trim() || !apiKey}
                                    className="p-2 bg-blue-600 text-white rounded-full disabled:opacity-50"
                                >
                                    <FaPaperPlane />
                                </button>
                            </div>
                        </div>
                    </motion.div>

                    {/* Resizer Handle */}
                    <motion.div
                        key="resizer"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className={`fixed top-0 h-full w-1 bg-blue-600 cursor-col-resize z-50 hover:bg-blue-700 active:bg-blue-800 transition-colors ${isDragging ? 'select-none' : ''}`}
                        style={{ left: `${width}px` }}
                        onMouseDown={handleMouseDown}
                    />

                    {/* Overlay when dragging */}
                    {isDragging && (
                        <div className="fixed inset-0 z-40 bg-black bg-opacity-0" />
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default AIChatBot; 