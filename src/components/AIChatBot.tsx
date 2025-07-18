import React, { useState, useRef, useEffect } from 'react';
import { FaComments, FaTimes, FaPaperPlane, FaPlus, FaMicrophone, FaPaperclip, FaImage, FaHistory, FaChevronDown } from 'react-icons/fa';
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
    sql?: string;
}

interface AIChatBotProps {
    apiKey: string;
    database?: any;
}

const AIChatBot: React.FC<AIChatBotProps> = ({ apiKey, database }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
    const [isAttachmentMenuOpen, setIsAttachmentMenuOpen] = useState(false);
    
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const geminiService = useRef<GeminiService>(new GeminiService(apiKey));
    const navigate = useNavigate();

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isThinking]);

    // Initialize SQLite database when database prop changes
    useEffect(() => {
        const initDatabase = async () => {
            if (!database?.id) return;

            try {
                const sqlService = SQLService.getInstance();
                
                const tables = await Promise.all(
                    database.tables.map(async (table: any) => {
                        const data = await DatabaseService.getTableData(table.id);
                        return {
                            ...table,
                            data: data.data
                        };
                    })
                );

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
            const response = await geminiService.current.sendMessage(inputMessage, database);
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

    const extractSQLQuery = (content: string): string | undefined => {
        const sqlMatch = content.match(/```sql\n([\s\S]*?)\n```/);
        return sqlMatch ? sqlMatch[1].trim() : undefined;
    };

    const handleAttachment = (type: 'voice' | 'file' | 'image') => {
        setIsAttachmentMenuOpen(false);
        // Implement attachment handling logic here
    };

    const handleBackgroundClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            setIsOpen(false);
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
            {!isOpen && (
                <motion.button
                    key="chat-fab"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    onClick={() => setIsOpen(true)}
                    className="fixed bottom-8 right-8 w-16 h-16 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 transition-all duration-300 flex items-center justify-center z-[1000] hover:scale-105 hover:-translate-y-1"
                >
                    <FaComments className="text-2xl" />
                </motion.button>
            )}

            {/* Chat Panel with Background Overlay */}
            {isOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-[998]" onClick={handleBackgroundClick}>
                    <motion.div
                        key="chat-panel"
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        className="fixed top-0 right-0 w-[400px] h-full bg-white shadow-xl z-[999] flex flex-col"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex justify-between items-center px-5 py-4 bg-indigo-600 text-white">
                            <div className="flex items-center space-x-2">
                                <FaComments className="text-xl" />
                                <h2 className="text-lg font-semibold">Chat Assistant</h2>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-2 hover:bg-indigo-700 rounded-full transition-colors"
                            >
                                <FaTimes />
                            </button>
                        </div>

                        {/* Chat History Section */}
                        <div className="border-b border-gray-200">
                            <div 
                                className="px-5 py-3 flex justify-between items-center cursor-pointer hover:bg-gray-50 transition-colors"
                                onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
                            >
                                <h3 className="font-medium text-gray-700">Chat History</h3>
                                <FaChevronDown className={`text-gray-500 transition-transform duration-300 ${isHistoryExpanded ? 'rotate-180' : ''}`} />
                            </div>
                            {isHistoryExpanded && (
                                <div className="max-h-60 overflow-y-auto bg-gray-50">
                                    {[1, 2, 3].map((_, i) => (
                                        <div key={i} className="px-5 py-3 flex items-center space-x-2 hover:bg-gray-100 cursor-pointer border-b border-gray-200 text-gray-600">
                                            <FaHistory />
                                            <span>Previous Chat {i + 1}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 m-4 rounded">
                                <span className="block sm:inline">{error}</span>
                            </div>
                        )}

                        {/* Messages Area */}
                        <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
                            {messages.map((message, index) => (
                                <div
                                    key={index}
                                    className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'} mb-4`}
                                >
                                    <div className={`relative max-w-[85%] rounded-[18px] p-3 ${
                                        message.sender === 'user'
                                            ? 'bg-indigo-600 text-white rounded-br-[4px]'
                                            : 'bg-white text-gray-800 rounded-bl-[4px] shadow-sm'
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
                                                                            className="absolute top-2 right-2 bg-green-500 hover:bg-green-600 text-white p-2 rounded"
                                                                            title="Run Query"
                                                                        >
                                                                            Run Query
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
                                                        <pre className={markdownStyles.pre}>{children}</pre>
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
                                <div className="flex items-center space-x-2 p-3 bg-white rounded-[18px] rounded-bl-[4px] shadow-sm max-w-[85%]">
                                    <div className="flex space-x-1">
                                        <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" />
                                        <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce delay-100" />
                                        <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce delay-200" />
                                    </div>
                                    <span className="text-sm text-gray-500">AI is thinking...</span>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="border-t border-gray-200 p-4 bg-white">
                            <div className="flex items-center space-x-2">
                                <div className="relative">
                                    <button
                                        onClick={() => setIsAttachmentMenuOpen(!isAttachmentMenuOpen)}
                                        className="w-10 h-10 flex items-center justify-center rounded-full border border-gray-200 hover:border-indigo-500 hover:text-indigo-600 transition-colors"
                                    >
                                        <FaPlus />
                                    </button>
                                    {isAttachmentMenuOpen && (
                                        <div className="absolute bottom-12 left-0 bg-white rounded-lg shadow-lg border border-gray-200 py-2 min-w-[120px]">
                                            <button
                                                onClick={() => handleAttachment('voice')}
                                                className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center space-x-2"
                                            >
                                                <FaMicrophone />
                                                <span>Voice</span>
                                            </button>
                                            <button
                                                onClick={() => handleAttachment('file')}
                                                className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center space-x-2"
                                            >
                                                <FaPaperclip />
                                                <span>File</span>
                                            </button>
                                            <button
                                                onClick={() => handleAttachment('image')}
                                                className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center space-x-2"
                                            >
                                                <FaImage />
                                                <span>Image</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <input
                                    type="text"
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
                                    className="flex-1 border border-gray-200 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100"
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={!inputMessage.trim() || !apiKey}
                                    className="w-10 h-10 bg-indigo-600 text-white rounded-full flex items-center justify-center disabled:opacity-50 hover:bg-indigo-700 transition-colors"
                                >
                                    <FaPaperPlane className="text-sm" />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default AIChatBot; 