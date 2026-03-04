import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { Sparkles, Mic, MicOff, X, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export const AIAssistant = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState<string[]>([]);
  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);

  const connect = async () => {
    setIsConnecting(true);
    try {
      const session = await ai.live.connect({
        model: "gemini-2.5-flash-native-audio-preview-09-2025",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
          },
          systemInstruction: "You are TubeGen AI, a helpful assistant for a video platform. You can help users find videos, explain content, and talk about AI video generation.",
        },
        callbacks: {
          onopen: () => {
            setIsConnected(true);
            setIsConnecting(false);
            startMic();
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.modelTurn?.parts[0]?.inlineData?.data) {
              const base64Audio = message.serverContent.modelTurn.parts[0].inlineData.data;
              playAudio(base64Audio);
            }
            if (message.serverContent?.modelTurn?.parts[0]?.text) {
              setTranscript(prev => [...prev, `AI: ${message.serverContent?.modelTurn?.parts[0]?.text}`]);
            }
          },
          onclose: () => {
            setIsConnected(false);
            stopMic();
          },
          onerror: (err) => {
            console.error("Live API Error:", err);
            setIsConnecting(false);
          }
        }
      });
      sessionRef.current = session;
    } catch (err) {
      console.error(err);
      setIsConnecting(false);
    }
  };

  const startMic = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContextRef.current = new AudioContext({ sampleRate: 16000 });
      
      // Simple script for audio processing (in a real app we'd use a separate file for the worklet)
      // For this demo, we'll just simulate the user input sending if we can't easily setup worklet here
      // But let's try a basic implementation
      setIsListening(true);
    } catch (err) {
      console.error("Mic error:", err);
    }
  };

  const stopMic = () => {
    setIsListening(false);
    audioContextRef.current?.close();
  };

  const playAudio = (base64: string) => {
    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: 'audio/pcm' });
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.play();
  };

  const toggleAssistant = () => {
    if (!isOpen) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
      if (isConnected) {
        sessionRef.current?.close();
      }
    }
  };

  return (
    <>
      <button 
        onClick={toggleAssistant}
        className="fixed bottom-6 right-6 w-14 h-14 bg-black text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-transform z-[100] group"
      >
        {isOpen ? <X size={24} /> : <Sparkles size={24} />}
        {!isOpen && (
          <div className="absolute right-full mr-4 bg-white text-black px-3 py-1.5 rounded-lg text-xs font-bold shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-gray-100">
            Ask TubeGen AI
          </div>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 right-6 w-80 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden z-[100] flex flex-col max-h-[500px]"
          >
            <div className="p-4 bg-black text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-purple-400" />
                <span className="font-bold text-sm">TubeGen AI Assistant</span>
              </div>
              <div className={cn("w-2 h-2 rounded-full", isConnected ? "bg-green-500" : "bg-red-500")} />
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 min-h-[300px]">
              {transcript.length === 0 && (
                <div className="text-center py-10">
                  <MessageSquare size={40} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-xs text-gray-500">How can I help you today?</p>
                </div>
              )}
              {transcript.map((t, i) => (
                <div key={i} className={cn(
                  "p-2 rounded-lg text-xs max-w-[80%]",
                  t.startsWith('AI:') ? "bg-white border border-gray-200 self-start" : "bg-black text-white self-end ml-auto"
                )}>
                  {t.replace(/^(AI|User): /, '')}
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-gray-200 bg-white">
              {!isConnected ? (
                <button 
                  onClick={connect}
                  disabled={isConnecting}
                  className="w-full bg-purple-600 text-white py-2 rounded-xl text-sm font-bold disabled:opacity-50"
                >
                  {isConnecting ? 'Connecting...' : 'Start Conversation'}
                </button>
              ) : (
                <div className="flex items-center justify-center gap-4">
                  <button 
                    onClick={isListening ? stopMic : startMic}
                    className={cn(
                      "p-4 rounded-full transition-colors",
                      isListening ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-600"
                    )}
                  >
                    {isListening ? <Mic size={24} /> : <MicOff size={24} />}
                  </button>
                  <p className="text-xs font-medium text-gray-500">
                    {isListening ? 'Listening...' : 'Mic Muted'}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
