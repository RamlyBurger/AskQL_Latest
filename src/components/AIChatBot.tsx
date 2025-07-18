import React, { useState, useRef, useEffect } from 'react';
import { FaComments, FaTimes, FaPaperPlane, FaPlus, FaMicrophone, FaPaperclip, FaImage, FaHistory, FaChevronDown } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import GeminiService from '../services/GeminiService';
import SQLService from '../services/SQLService';
import { useNavigate } from 'react-router-dom';
import { DatabaseService } from '../services/DatabaseService';
import ChatService from '../services/ChatService';
import type { ChatMessage as DBChatMessage, ChatSession } from '../services/ChatService';

interface ChatMessage {
    sender: 'user' | 'bot';
    content: string;
    timestamp: Date;
    sql?: string;
    type?: 'text' | 'image' | 'file' | 'voice';
    fileUrl?: string;
    fileName?: string;
}

interface ChatHistory {
    id: string;
    title: string;
    timestamp: Date;
    messages: ChatMessage[];
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
    const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
    
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const geminiService = useRef<GeminiService>(new GeminiService(apiKey));
    const fileInputRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();

    // Load chat sessions from database on mount
    useEffect(() => {
        if (database?.id) {
            loadChatSessions();
        }
    }, [database?.id]);

    // Load chat sessions
    const loadChatSessions = async () => {
        try {
            if (!database?.id) return;
            const sessions = await ChatService.getSessions(database.id);
            setChatSessions(sessions);
        } catch (error) {
            console.error('Error loading chat sessions:', error);
            setError('Failed to load chat history');
        }
    };

    // Create a new chat session
    const createNewChat = async () => {
        try {
            if (!database?.id) return;
            const newSession = await ChatService.createSession(
                database.id,
                `Chat ${chatSessions.length + 1}`
            );
            setChatSessions(prev => [...prev, newSession]);
            setCurrentSessionId(newSession.id);
            setMessages([]);
        } catch (error) {
            console.error('Error creating new chat:', error);
            setError('Failed to create new chat');
        }
    };

    // Load a chat session from history
    const loadChatSession = async (sessionId: string) => {
        try {
            const sessionMessages = await ChatService.getSessionMessages(sessionId);
            const formattedMessages: ChatMessage[] = sessionMessages.map(msg => ({
                sender: msg.sender,
                content: msg.content,
                timestamp: new Date(msg.created_at),
                sql: msg.sql_query,
                type: msg.message_type,
                fileUrl: msg.file_url,
                fileName: msg.file_name
            }));
            setCurrentSessionId(sessionId);
            setMessages(formattedMessages);
            setIsHistoryExpanded(false);
        } catch (error) {
            console.error('Error loading chat session:', error);
            setError('Failed to load chat session');
        }
    };

    // Update chat history when messages change
    useEffect(() => {
        if (currentSessionId && messages.length > 0) {
            // This useEffect is no longer needed as messages are saved to DB
            // setChatHistory(prev => prev.map(chat => 
            //     chat.id === currentChatId 
            //         ? { ...chat, messages, timestamp: new Date() }
            //         : chat
            // ));
        }
    }, [messages, currentSessionId]);

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
                        // Get both table data and table details (which includes attributes)
                        const [tableData, tableDetails] = await Promise.all([
                            DatabaseService.getTableData(table.id),
                            DatabaseService.getTableById(table.id)
                        ]);

                        // Ensure we have attributes
                        if (!tableDetails.attributes || tableDetails.attributes.length === 0) {
                            console.warn(`Table ${tableDetails.name} has no attributes, skipping...`);
                            return null;
                        }
                        
                        return {
                            ...tableDetails,
                            data: tableData.data
                        };
                    })
                );

                // Filter out any null tables (those without attributes)
                const validTables = tables.filter(table => table !== null);

                if (validTables.length > 0) {
                    await sqlService.createDatabase(database.id, validTables);
                    console.log('SQLite database initialized with tables:', validTables.map(t => t.name));
                } else {
                    console.warn('No valid tables to initialize');
                }
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
        if (!currentSessionId) {
            await createNewChat();
        }

        setError(null);
        const userMessage: ChatMessage = {
            sender: 'user',
            content: inputMessage,
            timestamp: new Date(),
            type: 'text'
        };

        try {
            // Save user message to database
            await ChatService.addMessage({
                session_id: currentSessionId!,
                sender: 'user',
                content: inputMessage,
                message_type: 'text'
            });

            setMessages(prev => [...prev, userMessage]);
            setInputMessage('');
            setIsThinking(true);

            const response = await geminiService.current.sendMessage(inputMessage, database);
            const sql = extractSQLQuery(response);

            // Save bot message to database
            await ChatService.addMessage({
                session_id: currentSessionId!,
                sender: 'bot',
                content: response,
                message_type: 'text',
                sql_query: sql
            });

            const botMessage: ChatMessage = {
                sender: 'bot',
                content: response,
                timestamp: new Date(),
                sql: sql,
                type: 'text'
            };
            
            setMessages(prev => [...prev, botMessage]);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An error occurred while processing your message';
            setError(errorMessage);
            console.error('Error in chat communication:', error);
        } finally {
            setIsThinking(false);
        }
    };

    const extractSQLQuery = (content: string): string | undefined => {
        const sqlMatch = content.match(/```sql\n([\s\S]*?)\n```/);
        return sqlMatch ? sqlMatch[1].trim() : undefined;
    };

    // Handle file uploads
    const handleFileUpload = async (type: 'file' | 'image') => {
        if (fileInputRef.current) {
            fileInputRef.current.accept = type === 'image' ? 'image/*' : '*/*';
            fileInputRef.current.click();
        }
    };

    const processFile = async (file: File) => {
        if (!currentSessionId) {
            await createNewChat();
        }

        const isImage = file.type.startsWith('image/');
        try {
            const { url } = await ChatService.uploadFile(file);
            
            await ChatService.addMessage({
                session_id: currentSessionId!,
                sender: 'user',
                content: file.name,
                message_type: isImage ? 'image' : 'file',
                file_url: url,
                file_name: file.name
            });

            const newMessage: ChatMessage = {
                sender: 'user',
                content: file.name,
                timestamp: new Date(),
                type: isImage ? 'image' : 'file',
                fileUrl: url,
                fileName: file.name
            };
            
            setMessages(prev => [...prev, newMessage]);
        } catch (error) {
            console.error('Error processing file:', error);
            setError('Failed to upload file');
        }
    };

    // Handle voice recording
    const startRecording = async () => {
        if (!currentSessionId) {
            await createNewChat();
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            const chunks: BlobPart[] = [];

            recorder.ondataavailable = (e) => chunks.push(e.data);
            recorder.onstop = async () => {
                const blob = new Blob(chunks, { type: 'audio/webm' });
                const file = new File([blob], 'voice-message.webm', { type: 'audio/webm' });
                
                try {
                    const { url } = await ChatService.uploadFile(file);
                    
                    await ChatService.addMessage({
                        session_id: currentSessionId!,
                        sender: 'user',
                        content: 'Voice message',
                        message_type: 'voice',
                        file_url: url,
                        file_name: 'voice-message.webm'
                    });

                    const newMessage: ChatMessage = {
                        sender: 'user',
                        content: 'Voice message',
                        timestamp: new Date(),
                        type: 'voice',
                        fileUrl: url
                    };
                    
                    setMessages(prev => [...prev, newMessage]);
                } catch (error) {
                    console.error('Error uploading voice message:', error);
                    setError('Failed to upload voice message');
                }
            };

            recorder.start();
            setMediaRecorder(recorder);
            setIsRecording(true);
            setIsAttachmentMenuOpen(false);
        } catch (error) {
            console.error('Error accessing microphone:', error);
            setError('Could not access microphone. Please check permissions.');
        }
    };

    const stopRecording = () => {
        if (mediaRecorder && isRecording) {
            mediaRecorder.stop();
            mediaRecorder.stream.getTracks().forEach(track => track.stop());
            setIsRecording(false);
        }
    };

    // Handle attachments
    const handleAttachment = async (type: 'voice' | 'file' | 'image') => {
        setIsAttachmentMenuOpen(false);
        
        switch (type) {
            case 'voice':
                await startRecording();
                break;
            case 'file':
            case 'image':
                await handleFileUpload(type);
                break;
        }
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
        <>
            <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                        processFile(file);
                    }
                }}
            />
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
                                        <button
                                            onClick={createNewChat}
                                            className="w-full px-5 py-3 text-left hover:bg-gray-100 text-indigo-600 font-medium border-b border-gray-200"
                                        >
                                            + New Chat
                                        </button>
                                        {chatSessions.map((session) => (
                                            <div
                                                key={session.id}
                                                onClick={() => loadChatSession(session.id)}
                                                className={`px-5 py-3 flex items-center space-x-2 hover:bg-gray-100 cursor-pointer border-b border-gray-200 ${
                                                    currentSessionId === session.id ? 'bg-gray-100' : ''
                                                }`}
                                            >
                                                <FaHistory className="text-gray-500" />
                                                <div className="flex-1">
                                                    <div className="text-gray-700">{session.title}</div>
                                                    <div className="text-xs text-gray-500">
                                                        {new Date(session.created_at).toLocaleDateString()}
                                                    </div>
                                                </div>
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
                                            {message.type === 'image' && message.fileUrl && (
                                                <img 
                                                    src={message.fileUrl} 
                                                    alt={message.fileName || 'Uploaded image'} 
                                                    className="max-w-full rounded-lg mb-2"
                                                />
                                            )}
                                            {message.type === 'voice' && message.fileUrl && (
                                                <audio controls src={message.fileUrl} className="max-w-full mb-2" />
                                            )}
                                            {message.type === 'file' && message.fileUrl && (
                                                <div className="flex items-center space-x-2 mb-2">
                                                    <FaPaperclip />
                                                    <a 
                                                        href={message.fileUrl} 
                                                        download={message.fileName}
                                                        className="underline"
                                                    >
                                                        {message.fileName}
                                                    </a>
                                                </div>
                                            )}
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
                                {isRecording && (
                                    <div className="flex items-center space-x-2 p-3 bg-red-100 rounded-[18px] rounded-br-[4px] shadow-sm max-w-[85%] ml-auto">
                                        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                                        <span className="text-sm text-red-700">Recording... Click to stop</span>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input Area */}
                            <div className="border-t border-gray-200 p-4 bg-white">
                                <div className="flex items-center space-x-2">
                                    <div className="relative">
                                        <button
                                            onClick={() => isRecording ? stopRecording() : setIsAttachmentMenuOpen(!isAttachmentMenuOpen)}
                                            className={`w-10 h-10 flex items-center justify-center rounded-full border transition-colors ${
                                                isRecording 
                                                    ? 'border-red-500 text-red-500 hover:bg-red-50'
                                                    : 'border-gray-200 hover:border-indigo-500 hover:text-indigo-600'
                                            }`}
                                        >
                                            {isRecording ? <FaMicrophone className="animate-pulse" /> : <FaPlus />}
                                        </button>
                                        {isAttachmentMenuOpen && !isRecording && (
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
                                        disabled={!apiKey || isRecording}
                                        className="flex-1 border border-gray-200 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100"
                                    />
                                    <button
                                        onClick={handleSend}
                                        disabled={(!inputMessage.trim() || !apiKey) && !isRecording}
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
        </>
    );
};

export default AIChatBot; 