import React, { useState, useRef, useEffect, useCallback } from 'react';
import { sendChatMessage } from '../../services/geminiService';
import type { ChatMessage } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { languages } from '../../i18n';
import { getChatHistory, saveChatHistory, addMessageToQueue } from '../../services/offlineService';
import { useOfflineStatus } from '../../hooks/useOfflineStatus';

type LanguageCode = keyof typeof languages;

// --- START: AI Response Formatting ---

/**
 * Parses inline markdown-style text (bold, italic, inline code) into React elements.
 * @param text The plain text string to parse.
 * @returns A React Node with formatted text.
 */
const parseInlineMarkdown = (text: string): React.ReactNode => {
    const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g);

    return (
        <>
            {parts.filter(part => part).map((part, index) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                    return <strong key={index}>{part.slice(2, -2)}</strong>;
                }
                if (part.startsWith('*') && part.endsWith('*')) {
                    return <em key={index}>{part.slice(1, -1)}</em>;
                }
                if (part.startsWith('`') && part.endsWith('`')) {
                    return <code key={index} className="bg-gray-200 dark:bg-gray-600 rounded px-1.5 py-0.5 font-mono text-sm">{part.slice(1, -1)}</code>;
                }
                return part;
            })}
        </>
    );
};


/**
 * A component that formats a block of text from the AI, converting
 * markdown for lists, code blocks, and paragraphs into styled React elements.
 * @param {object} props - The component props.
 * @param {string} props.text - The text to format.
 */
const FormattedAIResponse: React.FC<{ text: string }> = ({ text }) => {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let currentList: React.ReactNode[] = [];
    let isCodeBlock = false;
    let codeBlockContent: string[] = [];

    const flushList = () => {
        if (currentList.length > 0) {
            elements.push(<ul key={`ul-${elements.length}`} className="list-disc list-inside space-y-1 my-2">{currentList}</ul>);
            currentList = [];
        }
    };
    
    const flushCodeBlock = () => {
        if (codeBlockContent.length > 0) {
            elements.push(
                <pre key={`pre-${elements.length}`} className="bg-gray-100 dark:bg-gray-900 rounded-md p-3 my-2 overflow-x-auto">
                    <code className="font-mono text-sm">{codeBlockContent.join('\n')}</code>
                </pre>
            );
            codeBlockContent = [];
        }
    };

    lines.forEach((line, index) => {
        if (line.trim().startsWith('```')) {
            if (isCodeBlock) {
                flushCodeBlock();
                isCodeBlock = false;
            } else {
                flushList();
                isCodeBlock = true;
            }
        } else if (isCodeBlock) {
            codeBlockContent.push(line);
        } else {
            const listItemMatch = line.match(/^(\*|-)\s(.*)/);
            if (listItemMatch) {
                flushList();
                currentList.push(<li key={index}>{parseInlineMarkdown(listItemMatch[2])}</li>);
            } else {
                flushList();
                if (line.trim() !== '') {
                    elements.push(<p key={index}>{parseInlineMarkdown(line)}</p>);
                }
            }
        }
    });

    flushList();
    flushCodeBlock();

    return <>{elements}</>;
};


// --- END: AI Response Formatting ---


const PaperclipIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
  </svg>
);

const SendIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
    <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
  </svg>
);

const MicrophoneIcon: React.FC<{ isRecording?: boolean }> = ({ isRecording }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${isRecording ? 'text-red-500 animate-pulse' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
    </svg>
);

const TrashCanIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
);

const CheckmarkIcon = () => (
     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
);


const XCircleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
  </svg>
);

const VideoIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
);

const SpeakerOnIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
       <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
   </svg>
);

const SpeakerWaveIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-brand-light-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
       <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072M19.071 4.929a10 10 0 010 14.142M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
   </svg>
);

const VoiceCommandIcon: React.FC<{ isListening?: boolean }> = ({ isListening }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${isListening ? 'text-red-500 animate-pulse' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
    </svg>
);

const ClockIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const ExclamationIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
);


const FilePreview: React.FC<{ file: File, preview: string, onRemove: () => void }> = ({ file, preview, onRemove }) => (
  <div className="relative p-2 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center space-x-2 max-w-xs">
    {file.type.startsWith('image/') ? (
      <img src={preview} alt={file.name} className="h-12 w-12 rounded-md object-cover" />
    ) : file.type.startsWith('audio/') ? (
       <div className="h-12 w-12 flex items-center justify-center bg-gray-200 dark:bg-gray-600 rounded-md">
            <MicrophoneIcon />
       </div>
    ) : file.type.startsWith('video/') ? (
        <div className="h-12 w-12 flex items-center justify-center bg-gray-200 dark:bg-gray-600 rounded-md">
            <VideoIcon />
        </div>
    ) : (
      <div className="h-12 w-12 flex items-center justify-center bg-gray-200 dark:bg-gray-600 rounded-md">
        <PaperclipIcon />
      </div>
    )}
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{file.name}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400">{(file.size / 1024).toFixed(1)} KB</p>
    </div>
    <button onClick={onRemove} className="absolute -top-1 -right-1 text-gray-500 bg-white dark:bg-gray-800 rounded-full hover:text-red-500">
      <XCircleIcon />
    </button>
  </div>
);

const TypingIndicator = () => (
    <div className="flex items-start gap-3 flex-row">
        <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white bg-brand-brown flex-shrink-0">AI</div>
        <div className="max-w-xl p-4 rounded-xl shadow-md bg-white dark:bg-gray-700">
            <div className="flex items-center justify-center space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse [animation-delay:-0.3s]"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse [animation-delay:-0.15s]"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
            </div>
        </div>
    </div>
);

const CopyButton: React.FC<{ text: string }> = ({ text }) => {
    const [copied, setCopied] = useState(false);
    const handleCopy = () => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    return (
        <button onClick={handleCopy} className="p-1.5 bg-gray-200/50 dark:bg-gray-800/50 rounded-lg hover:bg-gray-300/70 dark:hover:bg-gray-900/70 transition" aria-label="Copy text">
            {copied ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
            )}
        </button>
    );
};


const ChatBubble: React.FC<{ message: ChatMessage; messageIndex: number; speakingMessageIndex: number | null; onToggleSpeech: (index: number, text: string) => void; }> = ({ message, messageIndex, speakingMessageIndex, onToggleSpeech }) => {
    const isUser = message.role === 'user';
    const isSpeaking = messageIndex === speakingMessageIndex;

    const renderMedia = () => {
        if (!message.filePreview || !message.fileMimeType) return null;

        if (isUser && message.fileMimeType.startsWith('audio/')) {
            return (
                <div className="flex items-center space-x-2 mb-2 bg-green-800/50 p-2 rounded-lg">
                    <audio controls src={message.filePreview} className="w-full h-10" style={{ filter: 'brightness(0) invert(1)' }}></audio>
                    <a 
                        href={message.filePreview} 
                        download={message.fileName || 'recording.webm'}
                        className="flex-shrink-0 p-2 bg-brand-light-green rounded-full hover:bg-green-500 transition-colors"
                        aria-label="Download audio"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                    </a>
                </div>
            );
        }
        
        if (message.fileMimeType.startsWith('image/')) {
            return <img src={message.filePreview} alt={message.fileName} className="mb-2 rounded-lg max-h-64" />;
        }
        if (message.fileMimeType.startsWith('audio/')) {
            return <audio controls src={message.filePreview} className="mb-2 w-full"></audio>;
        }
        if (message.fileMimeType.startsWith('video/')) {
            return <video controls src={message.filePreview} className="mb-2 rounded-lg max-h-64 w-full"></video>;
        }
        return null;
    };

    const StatusIndicator = () => {
      if(!isUser || !message.status || message.status === 'sent') return null;
      return (
        <div className="absolute -left-6 top-1/2 -translate-y-1/2" title={message.status}>
            {message.status === 'pending' && <ClockIcon className="h-4 w-4 text-gray-400 animate-spin"/>}
            {message.status === 'failed' && <ExclamationIcon className="h-4 w-4 text-red-500" />}
        </div>
      );
    }

    return (
        <div className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${isUser ? 'bg-brand-light-green' : 'bg-brand-brown'} flex-shrink-0`}>
                {isUser ? 'You' : 'AI'}
            </div>
            <div className={`group relative max-w-xl p-4 rounded-xl shadow-md ${isUser ? 'bg-brand-green text-white' : 'bg-white text-gray-800 dark:bg-gray-700 dark:text-gray-200'}`}>
                <StatusIndicator />
                {renderMedia()}
                {message.text && <FormattedAIResponse text={message.text} />}
                {!isUser && message.text && (
                     <div className="absolute top-2 right-2 flex items-center space-x-1 opacity-0 group-hover:opacity-100">
                        <button 
                            onClick={() => onToggleSpeech(messageIndex, message.text)} 
                            className="p-1.5 bg-gray-200/50 dark:bg-gray-800/50 rounded-lg hover:bg-gray-300/70 dark:hover:bg-gray-900/70 transition" 
                            aria-label={isSpeaking ? "Stop speech" : "Read aloud"}
                        >
                            {isSpeaking ? <SpeakerWaveIcon /> : <SpeakerOnIcon />}
                        </button>
                        <CopyButton text={message.text} />
                    </div>
                )}
            </div>
        </div>
    );
};


export const AIChat: React.FC<{ theme: string, lang: LanguageCode }> = ({ lang }) => {
    const [messages, setMessages] = useState<ChatMessage[]>(() => getChatHistory());
    const [input, setInput] = useState('');
    const [attachedFile, setAttachedFile] = useState<File | null>(null);
    const [filePreview, setFilePreview] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [speakingMessageIndex, setSpeakingMessageIndex] = useState<number | null>(null);
    const [messageToSpeak, setMessageToSpeak] = useState<{ index: number; text: string } | null>(null);
    const [isListeningForCommands, setIsListeningForCommands] = useState(false);
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
    const { t } = useLanguage();
    const isOnline = useOfflineStatus();

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const recordingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const formRef = useRef<HTMLFormElement>(null);
    const recognitionRef = useRef<any>(null);
    const commandHandlerRef = useRef<(command: string) => void>(() => {});
    const isListeningRef = useRef(isListeningForCommands);

    useEffect(() => {
        isListeningRef.current = isListeningForCommands;
    }, [isListeningForCommands]);
    
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, loading]);

    // Populate speech synthesis voices
    useEffect(() => {
        const updateVoices = () => {
            setVoices(window.speechSynthesis.getVoices());
        };
        // The list of voices is loaded asynchronously.
        window.speechSynthesis.onvoiceschanged = updateVoices;
        updateVoices(); // Call it once to try and get the initial list.

        return () => {
            window.speechSynthesis.onvoiceschanged = null;
        };
    }, []);

    // Listen for storage changes to sync UI from background sync
    useEffect(() => {
        const handleStorageChange = (event: StorageEvent) => {
            if (event.key === 'ai-farmer-assistant-chatHistory') {
                setMessages(getChatHistory());
            }
        };
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    const stopSpeech = useCallback(() => {
        if (window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
            setSpeakingMessageIndex(null);
        }
    }, []);

    const handleToggleSpeech = useCallback((index: number, text: string) => {
        if (speakingMessageIndex === index) {
            stopSpeech();
        } else {
            stopSpeech(); // Stop any currently playing speech first
            
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = lang;
            
            // Find a suitable voice that matches the selected language
            const matchingVoices = voices.filter(voice => voice.lang.startsWith(lang));
            
            // Prioritize higher-quality network voices if available
            const voice = 
                matchingVoices.find(v => v.lang === lang && !v.localService) || // Exact match, network voice
                matchingVoices.find(v => v.lang === lang) || // Exact match, any voice
                matchingVoices.find(v => !v.localService) || // Partial match, network voice
                matchingVoices[0]; // First available partial match

            if (voice) {
                utterance.voice = voice;
            }

            utterance.onerror = (event: SpeechSynthesisErrorEvent) => {
                // Don't log or show an error for interruptions, which are common and expected user actions.
                if (event.error === 'canceled' || event.error === 'interrupted') {
                    setSpeakingMessageIndex(null);
                    return;
                }
                
                console.error('SpeechSynthesisUtterance.onerror', event.error, event);

                let friendlyError = `Could not play audio. Your browser may not support a voice for ${languages[lang].name}.`;
                
                switch (event.error) {
                    case 'language-unavailable':
                        friendlyError = `The language '${languages[lang].name}' is not supported by your browser's speech engine.`;
                        break;
                    case 'voice-unavailable':
                        friendlyError = `A suitable voice for '${languages[lang].name}' could not be found in your browser.`;
                        break;
                    case 'synthesis-failed':
                        friendlyError = 'The text-to-speech service failed. Please try again.';
                        break;
                    case 'network':
                        friendlyError = 'A network error occurred while fetching the voice data. Please check your connection.';
                        break;
                    case 'audio-busy':
                        friendlyError = 'The audio device is busy. Please try again in a moment.';
                        break;
                    case 'not-allowed':
                        friendlyError = 'Audio playback is not allowed. Please check your browser permissions for this site.';
                        break;
                    default:
                         friendlyError = `An unknown audio error occurred (${event.error}).`;
                }

                setError(friendlyError);
                setSpeakingMessageIndex(null);
            };

            utterance.onend = () => setSpeakingMessageIndex(null);
            
            utteranceRef.current = utterance;
            window.speechSynthesis.speak(utterance);
            setSpeakingMessageIndex(index);
        }
    }, [lang, speakingMessageIndex, stopSpeech, voices]);
    
    useEffect(() => {
        if (messageToSpeak) {
            handleToggleSpeech(messageToSpeak.index, messageToSpeak.text);
            setMessageToSpeak(null);
        }
    }, [messageToSpeak, handleToggleSpeech]);


    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            stopSpeech();
            setAttachedFile(file);
            setFilePreview(URL.createObjectURL(file));
        }
    };

    const removeAttachedFile = useCallback(() => {
        setAttachedFile(null);
        if(filePreview){
            URL.revokeObjectURL(filePreview);
            setFilePreview(null);
        }
    }, [filePreview]);

    const startRecording = useCallback(() => {
        if (isRecording) return;
        stopSpeech();
        navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
            const recorder = new MediaRecorder(stream);
            mediaRecorderRef.current = recorder;
            audioChunksRef.current = [];

            recorder.ondataavailable = (event) => audioChunksRef.current.push(event.data);
            recorder.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const audioFile = new File([audioBlob], `recording-${Date.now()}.webm`, { type: 'audio/webm' });
                setAttachedFile(audioFile);
                setFilePreview(URL.createObjectURL(audioFile));
                stream.getTracks().forEach(track => track.stop());
            };
            
            recorder.start();
            setIsRecording(true);
            setRecordingTime(0);
            recordingIntervalRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
        }).catch(err => {
            console.error("Error starting recording:", err);
            setError("Could not start recording. Please ensure microphone permissions are granted.");
        });
    }, [isRecording, stopSpeech]);

    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
        }
    }, [isRecording]);

    const cancelRecording = useCallback(() => {
         if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
            mediaRecorderRef.current = null;
            setIsRecording(false);
            if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
            audioChunksRef.current = [];
        }
    }, [isRecording]);

    const sendMessage = useCallback(async (prompt: string, file: File | null) => {
        if (!prompt.trim() && !file) return;

        stopSpeech();
        setLoading(true);
        setError(null);
        
        const messageId = `${Date.now()}-${Math.random()}`;
        const userMessage: ChatMessage = {
            id: messageId,
            role: 'user',
            text: prompt,
            status: isOnline ? 'sent' : 'pending',
            ...(file && {
                filePreview: URL.createObjectURL(file),
                fileName: file.name,
                fileMimeType: file.type,
            }),
        };
        
        const newMessages = [...messages, userMessage];
        setMessages(newMessages);
        saveChatHistory(newMessages);

        if (!isOnline) {
            await addMessageToQueue({ prompt, file, id: messageId, lang });
            setLoading(false);
            setInput('');
            removeAttachedFile();
            return;
        }

        const lastMessageIndex = newMessages.length;
        let apiPrompt = prompt;
        if (file && !prompt.trim()) {
            apiPrompt = "Please analyze the attached file and provide a helpful response.";
        }

        try {
            const stream = sendChatMessage(apiPrompt, file, lang);
            
            let fullResponse = "";
            let firstChunkReceived = false;

            for await (const chunk of stream) {
                if (!firstChunkReceived) {
                    firstChunkReceived = true;
                    setLoading(false);
                    const aiMessage: ChatMessage = { id: `${messageId}-model`, role: 'model', text: '' };
                    setMessages(prev => {
                        const updated = [...prev, aiMessage];
                        saveChatHistory(updated);
                        return updated;
                    });
                }
                fullResponse += chunk;
                setMessages(prev => {
                    const newMessages = [...prev];
                    if (newMessages.length > 0 && newMessages[newMessages.length - 1].role === 'model') {
                        newMessages[newMessages.length - 1].text = fullResponse;
                    }
                    saveChatHistory(newMessages);
                    return newMessages;
                });
            }
            
            if (fullResponse) {
                setMessageToSpeak({ index: lastMessageIndex, text: fullResponse });
            }

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    }, [lang, messages, stopSpeech, isOnline, removeAttachedFile]);

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        sendMessage(input, attachedFile);
        setInput('');
        removeAttachedFile();
    }, [input, attachedFile, sendMessage, removeAttachedFile]);

    const handleSuggestionClick = useCallback((prompt: string) => {
        sendMessage(prompt, null);
    }, [sendMessage]);
    
    useEffect(() => {
        commandHandlerRef.current = (command: string) => {
            if (command.includes(t('aiChat.sendMessage', 'send message'))) {
                if (formRef.current && (input.trim() || attachedFile)) {
                     formRef.current.requestSubmit();
                }
            } else if (command.includes(t('aiChat.startRecording', 'start recording'))) {
                startRecording();
            } else if (command.includes(t('aiChat.stopRecording', 'stop recording'))) {
                stopRecording();
            } else if (command.includes(t('aiChat.cancelRecording', 'cancel recording'))) {
                cancelRecording();
            } else if (command.includes(t('aiChat.stopSpeech', 'stop speech'))) {
                stopSpeech();
            }
        };
    }, [input, attachedFile, startRecording, stopRecording, cancelRecording, stopSpeech, t]);

    useEffect(() => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.warn("Speech recognition not supported by this browser.");
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.lang = lang;

        recognition.onresult = (event: any) => {
            const transcript = event.results[event.results.length - 1][0].transcript.trim().toLowerCase();
            commandHandlerRef.current(transcript);
        };
        recognition.onerror = (event: any) => {
            console.error('Speech recognition error:', event.error);
            if(isListeningRef.current) setIsListeningForCommands(false);
        };
        recognition.onend = () => {
             if (isListeningRef.current) {
                try { recognition.start(); } 
                catch(e) { console.error("Recognition restart failed", e); setIsListeningForCommands(false); }
            }
        };
        recognitionRef.current = recognition;

        return () => {
            isListeningRef.current = false; 
            recognition.abort();
        };
    }, [lang]);

    const toggleCommandListening = useCallback(() => {
        if (!recognitionRef.current) return;
        const nextState = !isListeningForCommands;
        setIsListeningForCommands(nextState);
        if (nextState) {
            try { recognitionRef.current.start(); } 
            catch (e) { console.error("Could not start speech recognition:", e); setIsListeningForCommands(false); }
        } else {
            recognitionRef.current.stop();
        }
    }, [isListeningForCommands]);
    
    const suggestionPrompts = [
      { icon: '🌱', text: t('aiChat.suggestion1') },
      { icon: '🐞', text: t('aiChat.suggestion2') },
      { icon: '💰', text: t('aiChat.suggestion3') },
      { icon: '❓', text: t('aiChat.suggestion4') },
    ];

    return (
        <div className="flex flex-col h-full bg-brand-beige dark:bg-gray-900">
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
                 {messages.length === 0 && !loading ? (
                    <div className="flex-1 flex flex-col justify-center items-center h-full">
                        <div className="text-center mb-8">
                            <h2 className="text-3xl font-bold text-brand-green dark:text-brand-light-green">{t('aiChat.assistantTitle')}</h2>
                            <p className="text-gray-600 dark:text-gray-400 mt-2">{t('aiChat.howCanIHelp')}</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-3xl">
                            {suggestionPrompts.map((prompt, index) => (
                                <button 
                                    key={index} 
                                    onClick={() => handleSuggestionClick(prompt.text)} 
                                    className="text-left p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg hover:-translate-y-1 transition-all duration-200 flex items-center"
                                >
                                    <span className="text-2xl mr-4">{prompt.icon}</span>
                                    <span className="font-medium text-gray-700 dark:text-gray-200">{prompt.text}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                 ) : (
                    messages.map((msg, index) => (
                        <ChatBubble 
                            key={msg.id || index} 
                            message={msg} 
                            messageIndex={index}
                            speakingMessageIndex={speakingMessageIndex}
                            onToggleSpeech={handleToggleSpeech}
                        />
                    ))
                 )}
                {loading && isOnline && <TypingIndicator />}
                 <div ref={messagesEndRef} />
            </div>

            {error && (
                <div className="p-4 text-red-700 bg-red-100 dark:bg-red-900/50 dark:text-red-300 border-t border-red-200 dark:border-gray-700">
                    <strong>{t('aiChat.errorPrefix')}:</strong> {error}
                </div>
            )}
            
            <div className="p-4 bg-white border-t border-gray-200 dark:bg-gray-800 dark:border-gray-700">
                {attachedFile && filePreview && (
                    <div className="mb-2">
                         <FilePreview file={attachedFile} preview={filePreview} onRemove={removeAttachedFile} />
                    </div>
                )}
                
                {isRecording ? (
                    <div className="flex items-center justify-between p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                        <div className="flex items-center space-x-2">
                             <MicrophoneIcon isRecording />
                             <span className="font-mono text-gray-700 dark:text-gray-200">
                                {new Date(recordingTime * 1000).toISOString().substr(14, 5)}
                             </span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <button onClick={cancelRecording} className="p-2 text-gray-600 hover:text-red-500 dark:text-gray-300 dark:hover:text-red-400" aria-label="Cancel recording">
                                <TrashCanIcon />
                            </button>
                             <button onClick={stopRecording} className="p-2 text-white bg-brand-green rounded-full hover:bg-brand-light-green" aria-label="Stop recording">
                                <CheckmarkIcon />
                            </button>
                        </div>
                    </div>
                ) : (
                    <form ref={formRef} onSubmit={handleSubmit} className="flex items-center space-x-1 sm:space-x-2">
                        <input
                            ref={r => r?.focus()}
                            type="file"
                            id="file-upload"
                            className="hidden"
                            onChange={handleFileChange}
                            accept="image/*,video/*,audio/*"
                        />
                        <label htmlFor="file-upload" className="p-2 text-gray-500 rounded-full hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 cursor-pointer">
                            <PaperclipIcon />
                        </label>
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => {
                                setInput(e.target.value);
                                stopSpeech();
                            }}
                            placeholder={t('aiChat.inputPlaceholder')}
                            disabled={loading}
                            className="flex-1 px-4 py-2 bg-gray-100 border border-transparent rounded-full focus:outline-none focus:ring-2 focus:ring-brand-light-green text-gray-900 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                        />
                         <button type="button" onClick={toggleCommandListening} disabled={loading} className="p-2 text-gray-500 rounded-full hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700" aria-label="Activate voice commands">
                            <VoiceCommandIcon isListening={isListeningForCommands} />
                        </button>
                         <button type="button" onClick={startRecording} disabled={loading} className="p-2 text-gray-500 rounded-full hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700">
                            <MicrophoneIcon />
                        </button>
                        <button type="submit" disabled={loading || (!input.trim() && !attachedFile)} className="p-2 text-white bg-brand-green rounded-full hover:bg-brand-light-green disabled:bg-gray-400 disabled:cursor-not-allowed">
                            <SendIcon />
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};