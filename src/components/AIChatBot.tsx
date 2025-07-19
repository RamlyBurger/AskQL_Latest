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
import type { MessageType } from '../services/GeminiService';

// Add/update type definitions at the top of the file
type ExtendedMessageType = 'text' | 'image' | 'file' | 'voice' | 'combined';

interface AIResponse {
    response: string;
    success: boolean;
    stage: string;
}

interface ChatMessage {
    sender: 'user' | 'bot';
    content: string;
    timestamp: Date;
    sql?: string;
    type?: ExtendedMessageType;
    fileUrl?: string;
    fileName?: string;
    stage?: string;
    attachments?: Array<{
        type: string;
        url: string;
        fileName: string;
    }>;
}

interface ChatMessageDB {
    id?: string;
    session_id: string;
    sender: 'user' | 'bot';
    content: string;
    message_type: string;
    stage?: string;
    sql_query?: string;
    file_url?: string;
    file_name?: string;
}

interface Attachment {
    id: string;
    file: File;
    type: 'image' | 'file' | 'voice';
    previewUrl?: string;
    duration?: number;
    aiResponse?: string;
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

const MAX_ATTACHMENTS = 5;

// Add interfaces for action handling
interface Action {
    type: string;
    explanation: string;
    priority: number;
}

interface ActionResponse {
    type: string;
    explanation: string;
    response: string;
}

interface AIResponse {
    actionPlan: Action[];
    responses: ActionResponse[];
}

// Update ThinkingProcess component to handle database-focused actions
const ThinkingProcess: React.FC<{ actions: Action[]; currentActionIndex: number }> = ({ actions, currentActionIndex }) => {
    const [dots, setDots] = useState('');
    const [stage, setStage] = useState(0);

    const stages = {
        'SQL_QUERY': [
            'Analyzing query intent...',
            'Understanding database schema...',
            'Generating SQL query...',
            'Preparing explanation...'
        ],
        'DATABASE_MODIFICATION': [
            'Analyzing modification request...',
            'Checking database schema...',
            'Planning changes...',
            'Preparing implementation steps...'
        ],
        'GENERAL': [
            'Understanding question...',
            'Analyzing database concepts...',
            'Preparing explanation...'
        ],
        'NOT_RELEVANT': [
            'Analyzing query...',
            'Checking database relevance...',
            'Preparing response...'
        ]
    };

    useEffect(() => {
        const dotsInterval = setInterval(() => {
            setDots(prev => prev.length >= 3 ? '' : prev + '.');
        }, 500);

        const stageInterval = setInterval(() => {
            setStage(prev => {
                const currentAction = actions[currentActionIndex];
                const maxStages = (stages[currentAction.type as keyof typeof stages] || stages['NOT_RELEVANT']).length;
                return prev < maxStages - 1 ? prev + 1 : prev;
            });
        }, 2000);

        return () => {
            clearInterval(dotsInterval);
            clearInterval(stageInterval);
        };
    }, [currentActionIndex, actions]);

    const currentAction = actions[currentActionIndex];
    const currentStages = stages[currentAction.type as keyof typeof stages] || stages['NOT_RELEVANT'];

    // Get appropriate color based on action type
    const getActionColor = (type: string) => {
        switch (type) {
            case 'SQL_QUERY':
                return 'text-blue-600';
            case 'DATABASE_MODIFICATION':
                return 'text-orange-600';
            case 'GENERAL':
                return 'text-green-600';
            case 'NOT_RELEVANT':
            default:
                return 'text-gray-600';
        }
    };

    return (
        <div className="flex flex-col space-y-2 p-3 bg-white rounded-[18px] rounded-bl-[4px] shadow-sm max-w-[85%]">
            <div className="flex items-center space-x-2">
                <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce delay-100" />
                    <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce delay-200" />
                </div>
                <div className="flex flex-col">
                    <span className="text-sm text-gray-500">AI is thinking...</span>
                    <span className={`text-xs ${getActionColor(currentAction.type)}`}>
                        {currentStages[stage]}{dots}
                    </span>
                </div>
            </div>
            <div className="text-xs text-gray-500">
                Action {currentActionIndex + 1} of {actions.length}: {currentAction.explanation}
            </div>
            {currentActionIndex > 0 && (
                <div className="text-xs text-green-600">
                    ✓ Completed {currentActionIndex} previous actions
                </div>
            )}
        </div>
    );
};

const IntentAnalysisLoader: React.FC<{ currentStage: string }> = ({ currentStage }) => {
    const [dots, setDots] = useState('');

    useEffect(() => {
        const interval = setInterval(() => {
            setDots(prev => prev.length >= 3 ? '' : prev + '.');
        }, 500);
        return () => clearInterval(interval);
    }, []);

    // Log the current stage for debugging
    useEffect(() => {
        console.log('Current Stage in Loader:', currentStage);
    }, [currentStage]);

    const stages = {
        'GetDatabaseInfo': {
            title: 'Getting Database Information',
            description: 'Retrieving basic database information (name, description)',
            color: 'blue'
        },
        'GetTablesList': {
            title: 'Fetching Tables List',
            description: 'Getting list of all tables in the database',
            color: 'indigo'
        },
        'GetTableSchema': {
            title: 'Reading Table Schema',
            description: 'Getting detailed schema for the specified table',
            color: 'purple'
        },
        'ExecuteSQL': {
            title: 'Executing SQL Query',
            description: 'Running SQL query and processing results',
            color: 'green'
        },
        'Remember': {
            title: 'Storing Information',
            description: 'Saving important information for future reference',
            color: 'yellow'
        },
        'Respond': {
            title: 'Responding',
            description: 'Preparing response based on the information',
            color: 'orange'
        }
    };

    // Ensure we're using the correct stage key
    const normalizedStage = currentStage.includes('Get') ? currentStage : 
                          currentStage.toLowerCase() === 'processing' ? 'processing' :
                          Object.keys(stages).find(key => key.toLowerCase() === currentStage.toLowerCase()) || 'processing';

    const currentStageInfo = stages[normalizedStage as keyof typeof stages] || stages['processing'];

    return (
        <div className="flex flex-col space-y-2 p-4 bg-white rounded-[18px] rounded-bl-[4px] shadow-sm max-w-[85%]">
            <div className="flex items-center space-x-3">
                <div className="flex space-x-1">
                    <div className={`w-2 h-2 bg-${currentStageInfo.color}-500 rounded-full animate-pulse`} />
                    <div className={`w-2 h-2 bg-${currentStageInfo.color}-500 rounded-full animate-pulse delay-100`} />
                    <div className={`w-2 h-2 bg-${currentStageInfo.color}-500 rounded-full animate-pulse delay-200`} />
                </div>
                <div className="flex flex-col">
                    <span className={`text-sm font-medium text-${currentStageInfo.color}-600`}>
                        {currentStageInfo.title}{dots}
                    </span>
                    <span className="text-xs text-gray-500">
                        {currentStageInfo.description}
                    </span>
                </div>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                    className={`h-full bg-${currentStageInfo.color}-500 rounded-full transition-all duration-300`}
                    style={{ width: '100%' }}
                />
            </div>
        </div>
    );
};

const ActionDisplay: React.FC<{ action: string; params?: any; sql?: string }> = ({ action, params, sql }) => {
    const actionDescriptions = {
        'GetDatabaseInfo': 'Getting basic database information (name, description)',
        'GetTablesList': 'Getting list of all tables in the database',
        'GetTableSchema': 'Getting detailed schema for specific table',
        'ExecuteSQL': 'Executing SQL query',
        'Remember': 'Storing important information',
        'Respond': 'Communicating with user'
    };

    return (
        <div className="bg-gray-50 rounded-lg p-3 mb-2 text-sm">
            <div className="flex items-center space-x-2">
                <span className="font-medium text-indigo-600">Action:</span>
                <span>{actionDescriptions[action as keyof typeof actionDescriptions] || action}</span>
            </div>
            {params && (
                <div className="mt-1">
                    <span className="font-medium text-gray-600">Parameters: </span>
                    <code className="bg-gray-100 px-1 rounded">{JSON.stringify(params)}</code>
                </div>
            )}
            {sql && (
                <div className="mt-1">
                    <span className="font-medium text-gray-600">SQL: </span>
                    <code className="bg-gray-100 px-1 rounded">{sql}</code>
                </div>
            )}
        </div>
    );
};

// Update the main component
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
    const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
    
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const geminiService = useRef<GeminiService>(new GeminiService(apiKey));
    const fileInputRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();

    // Add state for image modal
    const [modalImage, setModalImage] = useState<string | null>(null);
    const [thinkingType, setThinkingType] = useState<string>('GENERAL');
    const [currentActionIndex, setCurrentActionIndex] = useState(0);
    const [actions, setActions] = useState<Action[]>([]);
    const [analysisStage, setAnalysisStage] = useState<string>('intent');
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    // Function to open image modal
    const openImageModal = (imageUrl: string) => {
        setModalImage(imageUrl);
    };

    // Function to close image modal
    const closeImageModal = () => {
        setModalImage(null);
    };

    // Load chat sessions from database on mount and when database changes
    useEffect(() => {
        if (database?.id) {
            loadChatSessions();
        } else {
            setChatSessions([]);
            setCurrentSessionId(null);
            setMessages([]);
        }
    }, [database?.id]);

    // Load chat sessions
    const loadChatSessions = async () => {
        try {
            if (!database?.id) return;
            setError(null);
            const sessions = await ChatService.getSessions(database.id);
            setChatSessions(sessions);

            // If we have sessions but no current session, load the most recent one
            if (sessions.length > 0 && !currentSessionId) {
                await loadChatSession(sessions[0].id);
            }
        } catch (error) {
            console.error('Error loading chat sessions:', error);
            setError('Failed to load chat history');
        }
    };

    // Create a new chat session
    const createNewChat = async () => {
        try {
            if (!database?.id) return;
            setError(null);
            const newSession = await ChatService.createSession(
                database.id,
                `Chat ${new Date().toLocaleString()}`
            );
            setChatSessions(prev => [newSession, ...prev]);
            setCurrentSessionId(newSession.id);
            setMessages([]);
            setIsHistoryExpanded(false);
        } catch (error) {
            console.error('Error creating new chat:', error);
            setError('Failed to create new chat');
        }
    };

    // Load a chat session from history
    const loadChatSession = async (sessionId: string) => {
        try {
            setError(null);
            const sessionMessages = await ChatService.getSessionMessages(sessionId);
            const formattedMessages: ChatMessage[] = sessionMessages.map(msg => {
                let content = msg.content;
                let attachments;
                
                // Try to parse JSON content
                if (msg.message_type === 'combined') {
                    try {
                        const parsedContent = JSON.parse(msg.content);
                        content = parsedContent.text || '';
                        attachments = parsedContent.attachments;
                    } catch (e) {
                        console.error('Error parsing message content:', e);
                        content = msg.content;
                    }
                }

                return {
                    sender: msg.sender,
                    content: content,
                    timestamp: new Date(msg.created_at),
                    sql: msg.sql_query,
                    type: msg.message_type,
                    fileUrl: msg.file_url,
                    fileName: msg.file_name,
                    attachments: attachments,
                    stage: msg.stage // Load stage from DB
                };
            });
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

    // Update handleSend function
    const handleSend = async () => {
        if ((!inputMessage.trim() && pendingAttachments.length === 0) || !apiKey) {
            return;
        }
        if (!currentSessionId) {
            await createNewChat();
        }

        setError(null);
        setIsAnalyzing(true);
        // Start with GetDatabaseInfo since we're initiating a new request
        setAnalysisStage('GetDatabaseInfo');

        try {
            // First, upload all attachments
            const uploadedAttachments = await Promise.all(
                pendingAttachments.map(async (attachment) => {
                    let response;
                    if (attachment.type === 'image') {
                        // For images, we'll use the Gemini endpoint directly
                        const formData = new FormData();
                        formData.append('image', attachment.file);
                        formData.append('apiKey', apiKey);
                        formData.append('message', inputMessage.trim());

                        // Log the form data
                        console.log('Form data entries:');
                        for (let [key, value] of formData.entries()) {
                            console.log(key, ':', value);
                        }

                        response = await fetch('/api/gemini/process-image', {
                            method: 'POST',
                            body: formData,
                        });
                    } else if (attachment.type === 'voice') {
                        // For voice messages
                        const formData = new FormData();
                        formData.append('audio', attachment.file);
                        formData.append('apiKey', apiKey);
                        response = await fetch('/api/gemini/transcribe-voice', {
                            method: 'POST',
                            body: formData,
                        });
                    } else {
                        // For other files
                        const formData = new FormData();
                        formData.append('file', attachment.file);
                        response = await fetch('/api/chat/upload', {
                            method: 'POST',
                            body: formData,
                        });
                    }

                    if (!response.ok) {
                        throw new Error(`Upload failed: ${response.statusText}`);
                    }

                    const data = await response.json();
                    return {
                        ...attachment,
                        url: data.data?.url || data.url,
                        aiResponse: data.description || data.response || data.content
                    };
                })
            );

            // Handle multiple images together if present
            const imageAttachments = uploadedAttachments.filter(a => a.type === 'image');
            if (imageAttachments.length > 1) {
                const formData = new FormData();
                imageAttachments.forEach((attachment) => {
                    formData.append('images', attachment.file);
                });
                formData.append('apiKey', apiKey);
                formData.append('message', inputMessage.trim());

                // Log the form data for multiple images
                console.log('Multiple images form data entries:');
                for (let [key, value] of formData.entries()) {
                    console.log(key, ':', value);
                }

                const response = await fetch('/api/gemini/process-images', {
                    method: 'POST',
                    body: formData,
                });

                if (!response.ok) {
                    throw new Error(`Failed to process images: ${response.statusText}`);
                }

                const data = await response.json();
                const aiResponse = data.response;

                // Save the AI response
                await ChatService.addMessage({
                    session_id: currentSessionId!,
                    sender: 'bot',
                    content: aiResponse,
                    message_type: 'text'
                });

                setMessages(prev => [...prev, {
                    sender: 'bot',
                    content: aiResponse,
                    timestamp: new Date(),
                    type: 'text'
                }]);
            }

            // Create a single message that combines text and attachments
            const messageContent = {
                text: inputMessage.trim(),
                attachments: uploadedAttachments.map(attachment => ({
                    type: attachment.type,
                    url: attachment.url,
                    fileName: attachment.file.name
                }))
            };

            // Save the combined message
            await ChatService.addMessage({
                session_id: currentSessionId!,
                sender: 'user',
                content: JSON.stringify(messageContent),
                message_type: 'combined'
            });

            // Update UI with combined message
            setMessages(prev => [...prev, {
                sender: 'user',
                content: messageContent.text,
                timestamp: new Date(),
                type: 'combined',
                attachments: messageContent.attachments
            }]);

            // Text only
            const aiResponse = await geminiService.current.sendMessage(
                inputMessage.trim(),
                database,
                'text'
            );

            console.log('AI Response:', aiResponse);

            // Only update stage if we get a valid stage from the response
            if (aiResponse.stage && aiResponse.stage !== 'processing' && aiResponse.stage !== 'planning') {
                console.log('Setting stage to:', aiResponse.stage);
                setAnalysisStage(aiResponse.stage);
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            // Save the AI response
            await ChatService.addMessage({
                session_id: currentSessionId!,
                sender: 'bot',
                content: aiResponse.response,
                message_type: 'text',
                stage: aiResponse.stage
            });

            setMessages(prev => [...prev, {
                sender: 'bot',
                content: aiResponse.response,
                timestamp: new Date(),
                type: 'text',
                stage: aiResponse.stage
            }]);

            // Clear input and attachments
            setInputMessage('');
            
            // Clean up preview URLs before clearing attachments
            pendingAttachments.forEach(attachment => {
                if (attachment.previewUrl) {
                    URL.revokeObjectURL(attachment.previewUrl);
                }
            });
            setPendingAttachments([]);

        } catch (error) {
            console.error('Error in chat communication:', error);
            const errorMessage = error instanceof Error ? error.message : 'An error occurred while processing your message';
            setError(errorMessage);
        } finally {
            setIsAnalyzing(false);
            setIsThinking(false);
            setCurrentActionIndex(0);
            setActions([]);
        }
    };

    const extractSQLQuery = (content: string): string | undefined => {
        const sqlMatch = content.match(/```sql\n([\s\S]*?)\n```/);
        return sqlMatch ? sqlMatch[1].trim() : undefined;
    };

    // Handle file uploads
    const handleFileUpload = async (type: 'file' | 'image') => {
        if (pendingAttachments.length >= MAX_ATTACHMENTS) {
            setError(`Maximum ${MAX_ATTACHMENTS} attachments allowed at a time.`);
            return;
        }

        if (fileInputRef.current) {
            fileInputRef.current.accept = type === 'image' ? 'image/*' : '*/*';
            fileInputRef.current.multiple = type === 'image'; // Allow multiple files only for images
            fileInputRef.current.click();
        }
    };

    const processFile = async (file: File) => {
        if (pendingAttachments.length >= MAX_ATTACHMENTS) {
            setError(`Maximum ${MAX_ATTACHMENTS} attachments allowed at a time.`);
            return;
        }

        // Add file size limit (10MB)
        const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
        if (file.size > MAX_FILE_SIZE) {
            setError(`File size exceeds 10MB limit. Please choose a smaller file.`);
            return;
        }

        const isImage = file.type.startsWith('image/');
        const attachmentId = Math.random().toString(36).substring(7);

        // Create preview URL for images
        let previewUrl: string | undefined;
        if (isImage) {
            previewUrl = URL.createObjectURL(file);
        }

        // Add to pending attachments
        setPendingAttachments(prev => [...prev, {
            id: attachmentId,
            file,
            type: isImage ? 'image' : 'file',
            previewUrl
        }]);
    };

    const removeAttachment = (attachmentId: string) => {
        setPendingAttachments(prev => {
            const attachment = prev.find(a => a.id === attachmentId);
            if (attachment?.previewUrl) {
                URL.revokeObjectURL(attachment.previewUrl);
            }
            return prev.filter(a => a.id !== attachmentId);
        });
    };

    // Enhance voice recording error handling
    const startRecording = async () => {
        if (pendingAttachments.length >= MAX_ATTACHMENTS) {
            setError(`Maximum ${MAX_ATTACHMENTS} attachments allowed at a time.`);
            return;
        }

        if (!currentSessionId) {
            await createNewChat();
        }

        setError(null);

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            const chunks: BlobPart[] = [];
            let startTime = Date.now();

            recorder.ondataavailable = (e) => chunks.push(e.data);
            recorder.onstop = async () => {
                const blob = new Blob(chunks, { type: 'audio/webm' });
                
                // Add size check for voice recording
                if (blob.size > 10 * 1024 * 1024) {
                    setError('Voice recording exceeds 10MB limit. Please record a shorter message.');
                    return;
                }

                const file = new File([blob], 'voice-message.webm', { type: 'audio/webm' });
                const attachmentId = Math.random().toString(36).substring(7);
                const previewUrl = URL.createObjectURL(blob);
                const duration = (Date.now() - startTime) / 1000; // Duration in seconds
                
                // Add to pending attachments
                setPendingAttachments(prev => [...prev, {
                    id: attachmentId,
                    file,
                    type: 'voice',
                    previewUrl,
                    duration
                }]);
            };

            recorder.start();
            setMediaRecorder(recorder);
            setIsRecording(true);
            setIsAttachmentMenuOpen(false);
        } catch (error) {
            console.error('Error accessing microphone:', error);
            setError('Could not access microphone. Please check browser permissions and try again.');
            setIsRecording(false);
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

    // Add delete functionality
    const handleDeleteSession = async (sessionId: string) => {
        try {
            await ChatService.deleteSession(sessionId);
            // Remove from local state
            setChatSessions(prev => prev.filter(session => session.id !== sessionId));
            // If we deleted the current session, clear messages
            if (sessionId === currentSessionId) {
                setCurrentSessionId(null);
                setMessages([]);
            }
        } catch (error) {
            console.error('Error deleting chat session:', error);
            setError('Failed to delete chat session');
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
            {/* Image Modal */}
            {modalImage && (
                <div 
                    className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[1001]"
                    onClick={closeImageModal}
                >
                    <div className="relative max-w-[90%] max-h-[90%]">
                        <img 
                            src={modalImage} 
                            alt="Enlarged view"
                            className="max-w-full max-h-[90vh] object-contain"
                        />
                        <button
                            onClick={closeImageModal}
                            className="absolute -top-4 -right-4 bg-white text-black rounded-full p-2 hover:bg-gray-200"
                        >
                            <FaTimes />
                        </button>
                    </div>
                </div>
            )}

            <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                multiple
                onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    const remainingSlots = MAX_ATTACHMENTS - pendingAttachments.length;
                    
                    if (files.length > remainingSlots) {
                        setError(`Can only add ${remainingSlots} more attachment${remainingSlots !== 1 ? 's' : ''}. Maximum ${MAX_ATTACHMENTS} attachments allowed.`);
                        // Only process the first N files that fit within the limit
                        files.slice(0, remainingSlots).forEach(file => processFile(file));
                    } else {
                        files.forEach(file => processFile(file));
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
                                                className={`px-5 py-3 flex items-center justify-between hover:bg-gray-100 cursor-pointer border-b border-gray-200 ${
                                                    currentSessionId === session.id ? 'bg-gray-100' : ''
                                                }`}
                                            >
                                                <div 
                                                    className="flex items-center space-x-2 flex-1"
                                                    onClick={() => loadChatSession(session.id)}
                                                >
                                                    <FaHistory className="text-gray-500" />
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-gray-700 truncate">{session.title}</div>
                                                        <div className="text-xs text-gray-500">
                                                            {new Date(session.created_at).toLocaleDateString()}
                                                        </div>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteSession(session.id);
                                                    }}
                                                    className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                                                    title="Delete chat"
                                                >
                                                    <FaTimes />
                                                </button>
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
                                {isAnalyzing && (
                                    <IntentAnalysisLoader currentStage={analysisStage} />
                                )}
                                {isThinking && actions.length > 0 && (
                                    <ThinkingProcess 
                                        actions={actions}
                                        currentActionIndex={currentActionIndex}
                                    />
                                )}
                                {isRecording && (
                                    <div className="flex items-center space-x-2 p-3 bg-red-100 rounded-[18px] rounded-br-[4px] shadow-sm max-w-[85%] ml-auto">
                                        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                                        <span className="text-sm text-red-700">Recording... Click to stop</span>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Pending Attachments */}
                            {pendingAttachments.length > 0 && (
                                <div className="border-t border-gray-200 p-2 bg-gray-50">
                                    <div className="flex items-center justify-between mb-2 px-1">
                                        <span className="text-sm text-gray-600">
                                            Attachments ({pendingAttachments.length}/{MAX_ATTACHMENTS})
                                        </span>
                                        {pendingAttachments.length > 0 && (
                                            <button
                                                onClick={() => {
                                                    // Clean up all preview URLs
                                                    pendingAttachments.forEach(attachment => {
                                                        if (attachment.previewUrl) {
                                                            URL.revokeObjectURL(attachment.previewUrl);
                                                        }
                                                    });
                                                    setPendingAttachments([]);
                                                }}
                                                className="text-xs text-red-500 hover:text-red-700"
                                            >
                                                Clear all
                                            </button>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {pendingAttachments.map(attachment => (
                                            <div key={attachment.id} className="relative group">
                                                {attachment.type === 'image' && attachment.previewUrl ? (
                                                    <img 
                                                        src={attachment.previewUrl} 
                                                        alt={attachment.file.name}
                                                        className="w-16 h-16 object-cover rounded"
                                                    />
                                                ) : attachment.type === 'voice' && attachment.previewUrl ? (
                                                    <div className="w-48 bg-white rounded-lg p-2 shadow-sm">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <FaMicrophone className="text-indigo-600" />
                                                            <span className="text-xs text-gray-600">
                                                                {attachment.duration ? `${Math.round(attachment.duration)}s` : 'Voice Message'}
                                                            </span>
                                                        </div>
                                                        <audio 
                                                            src={attachment.previewUrl} 
                                                            controls 
                                                            className="w-full h-8"
                                                            controlsList="nodownload"
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center">
                                                        <span className="text-xs text-gray-600">
                                                            {attachment.type === 'file' ? 'File' : 'Unknown'}
                                                        </span>
                                                    </div>
                                                )}
                                                <button
                                                    onClick={() => removeAttachment(attachment.id)}
                                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <FaTimes size={12} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

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
                                                    <span>Images</span>
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
                                        disabled={(!inputMessage.trim() && pendingAttachments.length === 0) || !apiKey}
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