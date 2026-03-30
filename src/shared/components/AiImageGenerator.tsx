import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import useRoomMutations from '../hooks/useRoomMutations';
import PopupOverlay from './PopupOverlay';
import './AiImageGenerator.css';

interface HistoryStep {
    url: string;
    prompt: string;
}

interface AiImageGeneratorProps {
    onClose: () => void;
}

export default function AiImageGenerator({ onClose }: AiImageGeneratorProps) {
    const { addRoomMutation } = useRoomMutations();
    const [file, setFile] = useState<File | null>(null);
    const [prompt, setPrompt] = useState('A pixel art cute minimalistic view from above of the room like in a video game, camera positioned up and to the side above the ceiling, birds view, every lamp visible, *miniature abstract room layout visible from up above*');
    const [loading, setLoading] = useState(false);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [history, setHistory] = useState<HistoryStep[]>([]);
    const [error, setError] = useState<string | null>(null);

    const handleStartChat = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file || !prompt) return;

        setLoading(true);
        setError(null);

        try {
            const formData = new FormData();
            formData.append('image', file);
            formData.append('prompt', prompt);

            const res = await fetch('/api/local/ai/start_chat', {
                method: 'POST',
                body: formData,
            });

            if (!res.ok) {
                throw new Error('Failed to start chat');
            }

            const data = await res.json();
            setSessionId(data.sessionId);
            setHistory([{ url: data.url || data.image, prompt }]);
            setPrompt('');
        } catch (err: any) {
            setError(err.message || 'Error occurred');
        } finally {
            setLoading(false);
        }
    };
    const sendChat = async (promptString: string) => {
        if (!sessionId) return;

        setLoading(true);
        setError(null);
        
        try {
            const res = await fetch(`/api/local/ai/chat/${sessionId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: promptString }),
            });

            if (!res.ok) {
                throw new Error('Failed to send chat');
            }

            const data = await res.json();
            setHistory(prev => [...prev, { url: data.url || data.image, prompt: promptString }]);
        } catch (err: any) {
            setError(err.message || 'Error occurred');
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const handleSendChat = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!prompt || !sessionId) return;
        
        const currentPrompt = prompt;
        setPrompt('');

        try {
            await sendChat(currentPrompt);
        } catch {
            setPrompt(currentPrompt); // Restore prompt
        }
    };

    const handleGenerateNighttime = async () => {
        try {
            await sendChat('Change the lighting to nighttime. Make it dark outside, with warm indoor lamps explicitly turned on, cozy lighting.');
        } catch {
            // Error is handled in sendChat
        }
    };
                            
    const handleCreateRoom = (imageUrl: string) => {
        const roomName = window.prompt('Enter new room name:');
        if (roomName) {
            addRoomMutation.mutate({
                id: uuidv4(),
                name: roomName,
                image: imageUrl,
                nightImage: null,
                bgColor: '#ffffff'
            });
            alert('Room created!');
            setLoading(false);
        }
    };

    return (
        <PopupOverlay onClose={onClose}>
            <div className="ai-image-generator" onClick={e => e.stopPropagation()}>
                <div className="ai-header">
                    <h3>AI Image Assistant</h3>
                    <button className="ai-close-button" onClick={onClose}>&times;</button>
                </div>
                
                {error && <div className="text-danger">{error}</div>}

                {history.length > 0 && (
                    <div className="ai-history">
                        {history.map((step, index) => (
                            <div key={index} className="ai-history-item">
                                {step.url && <img src={step.url} alt={`Generated step ${index + 1}`} />}
                                <p className="ai-history-prompt">"{step.prompt}"</p>
                                <div className="ai-action-buttons">
                                    <button type="button" className="ai-action-btn" onClick={() => handleCreateRoom(step.url)}>Set as New Room</button>
                                    {index === history.length - 1 && (
                                        <button type="button" className="ai-action-btn" onClick={handleGenerateNighttime}>Generate Nighttime Version</button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {loading && (
                    <div className="ai-loading-state">
                        <div className="spinner-border spinner-border-sm" role="status"></div>
                        <span>Processing your request...</span>
                    </div>
                )}

                {!sessionId ? (
                    <form className="ai-initial-form" onSubmit={handleStartChat}>
                        <div className="ai-form-group">
                            <label>Base Image</label>
                            <input 
                                type="file" 
                                accept="image/*" 
                                onChange={e => setFile(e.target.files?.[0] || null)} 
                                disabled={loading}
                            />
                        </div>
                        <div className="ai-form-group">
                            <label>Prompt</label>
                            <textarea 
                                value={prompt} 
                                onChange={e => setPrompt(e.target.value)} 
                                rows={3}
                                placeholder="Describe what you want to generate..."
                                disabled={loading}
                            />
                        </div>
                        <button type="submit" className="ai-submit-button" disabled={loading || !file || !prompt}>
                            Start Chat
                        </button>
                    </form>
                ) : (
                    <form className="ai-chat-form" onSubmit={handleSendChat}>
                        <div className="ai-form-group">
                            <label>Refine Image</label>
                            <textarea 
                                value={prompt} 
                                onChange={e => setPrompt(e.target.value)} 
                                rows={2}
                                placeholder="What changes would you like to make?"
                                disabled={loading}
                            />
                        </div>
                        <button type="submit" className="ai-submit-button" disabled={loading || !prompt}>
                            Send
                        </button>
                    </form>
                )}
            </div>
        </PopupOverlay>
    );
}
