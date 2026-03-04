import React, { useState, useEffect } from 'react';
import { Search, Menu, Video, Bell, User, Home, Compass, PlaySquare, Clock, ThumbsUp, MessageSquare, Send, Sparkles, Wand2, Mic, Volume2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { geminiService } from './services/geminiService';
import { db, collection, query, orderBy, onSnapshot, addDoc, Timestamp, OperationType, handleFirestoreError, updateDoc, doc, where, limit, getDocs, deleteDoc } from './firebase';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

import { AIAssistant } from './components/AIAssistant';
import { MapPin } from 'lucide-react';

// --- Types ---
interface CreatorLocation {
  uri: string;
  title: string;
}
interface VideoData {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  videoUrl: string;
  authorId: string;
  authorName: string;
  views: number;
  likes: number;
  createdAt: any;
  tags: string[];
}

interface CommentData {
  id: string;
  videoId: string;
  authorId: string;
  authorName: string;
  text: string;
  createdAt: any;
}

interface NotificationData {
  id: string;
  userId: string;
  type: 'new_video' | 'live_stream';
  message: string;
  videoId?: string;
  creatorId: string;
  creatorName: string;
  read: boolean;
  createdAt: any;
}

// --- Helper ---
function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

// --- Components ---

const NotificationDropdown = ({ notifications, onClose }: { notifications: NotificationData[], onClose: () => void }) => {
  const markAsRead = async (notifId: string) => {
    try {
      await updateDoc(doc(db, 'notifications', notifId), { read: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'notifications');
    }
  };

  return (
    <div className="absolute top-full right-0 mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-2xl z-[100] overflow-hidden">
      <div className="p-4 border-b border-gray-100 flex justify-between items-center">
        <h3 className="font-bold text-sm">Notifications</h3>
        <button onClick={onClose} className="text-xs text-gray-500 hover:text-black">Close</button>
      </div>
      <div className="max-h-96 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">No notifications yet</div>
        ) : (
          notifications.map(n => (
            <div 
              key={n.id} 
              className={cn(
                "p-4 border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors",
                !n.read && "bg-blue-50/50"
              )}
              onClick={() => markAsRead(n.id)}
            >
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                  <Video size={18} className="text-purple-600" />
                </div>
                <div>
                  <p className="text-xs leading-snug">
                    <span className="font-bold">{n.creatorName}</span> {n.message}
                  </p>
                  <p className="text-[10px] text-gray-500 mt-1">
                    {new Date(n.createdAt?.seconds * 1000).toLocaleDateString()}
                  </p>
                </div>
                {!n.read && <div className="w-2 h-2 rounded-full bg-blue-600 self-center" />}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const Navbar = ({ onSearch, onOpenStudio }: { onSearch: (q: string) => void, onOpenStudio: () => void }) => {
  const { user, signIn, signOut } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [showNotifs, setShowNotifs] = useState(false);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'notifications'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'), limit(20));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setNotifications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as NotificationData)));
    });
    return () => unsubscribe();
  }, [user]);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <nav className="fixed top-0 left-0 right-0 h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 z-50">
      <div className="flex items-center gap-4">
        <button className="p-2 hover:bg-gray-100 rounded-full">
          <Menu size={20} />
        </button>
        <div className="flex items-center gap-1 text-red-600 font-bold text-xl tracking-tighter">
          <Video size={28} fill="currentColor" />
          <span>TubeGen</span>
        </div>
      </div>

      <div className="flex-1 max-w-2xl px-8">
        <div className="flex">
          <input
            type="text"
            placeholder="Search"
            className="w-full px-4 py-2 border border-gray-300 rounded-l-full focus:outline-none focus:border-blue-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSearch(searchQuery)}
          />
          <button 
            className="px-5 bg-gray-50 border border-l-0 border-gray-300 rounded-r-full hover:bg-gray-100"
            onClick={() => onSearch(searchQuery)}
          >
            <Search size={18} />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {user ? (
          <>
            <button 
              onClick={onOpenStudio}
              className="p-2 hover:bg-gray-100 rounded-full flex items-center gap-2 text-sm font-medium"
            >
              <Video size={20} />
              <span className="hidden sm:inline">Create</span>
            </button>
            <div className="relative">
              <button 
                onClick={() => setShowNotifs(!showNotifs)}
                className="p-2 hover:bg-gray-100 rounded-full relative"
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 bg-red-600 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center border-2 border-white">
                    {unreadCount}
                  </span>
                )}
              </button>
              {showNotifs && <NotificationDropdown notifications={notifications} onClose={() => setShowNotifs(false)} />}
            </div>
            <button onClick={signOut} className="ml-2">
              <img src={user.photoURL || ''} alt="User" className="w-8 h-8 rounded-full border border-gray-200" />
            </button>
          </>
        ) : (
          <button 
            onClick={signIn}
            className="flex items-center gap-2 px-3 py-1.5 text-blue-600 border border-gray-300 rounded-full hover:bg-blue-50 font-medium"
          >
            <User size={20} />
            Sign In
          </button>
        )}
      </div>
    </nav>
  );
};

const Sidebar = () => {
  const items = [
    { icon: Home, label: 'Home', active: true },
    { icon: Compass, label: 'Explore' },
    { icon: PlaySquare, label: 'Subscriptions' },
    { icon: Clock, label: 'History' },
  ];

  return (
    <aside className="fixed left-0 top-14 bottom-0 w-64 bg-white hidden lg:block overflow-y-auto p-2">
      {items.map((item) => (
        <button
          key={item.label}
          className={cn(
            "w-full flex items-center gap-6 px-4 py-2.5 rounded-lg hover:bg-gray-100 transition-colors",
            item.active && "bg-gray-100 font-medium"
          )}
        >
          <item.icon size={20} />
          <span className="text-sm">{item.label}</span>
        </button>
      ))}
      <hr className="my-4 border-gray-200" />
      <div className="px-4 py-2">
        <h3 className="text-sm font-medium text-gray-500 mb-2 uppercase tracking-wider text-[10px]">AI Features</h3>
        <div className="space-y-1">
          <button className="w-full flex items-center gap-6 px-4 py-2.5 rounded-lg hover:bg-gray-100 text-sm">
            <Sparkles size={18} className="text-purple-600" />
            <span>AI Studio</span>
          </button>
          <button className="w-full flex items-center gap-6 px-4 py-2.5 rounded-lg hover:bg-gray-100 text-sm">
            <Mic size={18} className="text-green-600" />
            <span>Live Chat</span>
          </button>
        </div>
      </div>
    </aside>
  );
};

const VideoCard = ({ video, onClick }: { video: VideoData, onClick: () => void }) => {
  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="cursor-pointer group"
      onClick={onClick}
    >
      <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-100 mb-3">
        <img 
          src={video.thumbnailUrl} 
          alt={video.title} 
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          referrerPolicy="no-referrer"
        />
        <div className="absolute bottom-2 right-2 bg-black/80 text-white text-[10px] px-1 rounded font-medium">
          10:00
        </div>
      </div>
      <div className="flex gap-3">
        <div className="w-9 h-9 rounded-full bg-gray-200 flex-shrink-0 overflow-hidden">
          <img src={`https://picsum.photos/seed/${video.authorId}/100/100`} alt="" referrerPolicy="no-referrer" />
        </div>
        <div>
          <h3 className="font-semibold text-sm line-clamp-2 mb-1 leading-tight">{video.title}</h3>
          <p className="text-xs text-gray-500 mb-0.5">{video.authorName}</p>
          <p className="text-xs text-gray-500">
            {video.views.toLocaleString()} views • {new Date(video.createdAt?.seconds * 1000).toLocaleDateString()}
          </p>
        </div>
      </div>
    </motion.div>
  );
};

const CreatorStudio = ({ onClose }: { onClose: () => void }) => {
  const { user } = useAuth();
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<{ video?: string, thumb?: string } | null>(null);
  const [status, setStatus] = useState('');

  const handleGenerate = async () => {
    if (!prompt) return;
    setIsGenerating(true);
    setStatus('Generating thumbnail...');
    try {
      const thumb = await geminiService.generateThumbnail(prompt);
      setResult({ thumb: thumb || undefined });
      
      setStatus('Generating video with Veo (this may take a minute)...');
      const videoUrl = await geminiService.generateVideo(prompt);
      setResult(prev => ({ ...prev, video: videoUrl || undefined }));
      
      setStatus('Ready to publish!');
    } catch (error) {
      console.error(error);
      setStatus('Error generating content.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePublish = async () => {
    if (!result?.video || !user) return;
    try {
      const videoRef = collection(db, 'videos');
      const newVideo = {
        title: prompt,
        description: `AI generated video about: ${prompt}`,
        thumbnailUrl: result.thumb || 'https://picsum.photos/seed/thumb/1280/720',
        videoUrl: result.video,
        authorId: user.uid,
        authorName: user.displayName || 'Anonymous',
        views: 0,
        likes: 0,
        createdAt: Timestamp.now(),
        tags: ['AI', 'Veo', 'Gemini']
      };
      const docRef = await addDoc(videoRef, newVideo);

      // Notify subscribers
      const subsQuery = query(collection(db, 'subscriptions'), where('creatorId', '==', user.uid));
      const subsSnapshot = await getDocs(subsQuery);
      
      const notificationPromises = subsSnapshot.docs.map(subDoc => {
        const subData = subDoc.data();
        return addDoc(collection(db, 'notifications'), {
          userId: subData.subscriberId,
          type: 'new_video',
          message: `uploaded a new video: ${prompt}`,
          videoId: docRef.id,
          creatorId: user.uid,
          creatorName: user.displayName || 'Anonymous',
          read: false,
          createdAt: Timestamp.now()
        });
      });
      
      await Promise.all(notificationPromises);

      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'videos');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl"
      >
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Sparkles className="text-purple-600" />
            Creator Studio AI
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">✕</button>
        </div>
        
        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">What video should I create?</label>
            <textarea
              className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none min-h-[100px]"
              placeholder="e.g. A futuristic city with flying cars in a cyberpunk style..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="aspect-video bg-gray-100 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden">
              {result?.thumb ? (
                <img src={result.thumb} className="w-full h-full object-cover" alt="Thumbnail" />
              ) : (
                <span className="text-xs text-gray-400">Thumbnail Preview</span>
              )}
            </div>
            <div className="aspect-video bg-gray-100 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden">
              {result?.video ? (
                <video src={result.video} className="w-full h-full object-cover" controls />
              ) : (
                <span className="text-xs text-gray-400">Video Preview</span>
              )}
            </div>
          </div>

          {status && <p className="text-sm text-center text-purple-600 font-medium animate-pulse">{status}</p>}

          <div className="flex gap-3">
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !prompt}
              className="flex-1 bg-purple-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isGenerating ? 'Generating...' : <><Wand2 size={20} /> Generate with AI</>}
            </button>
            {result?.video && (
              <button
                onClick={handlePublish}
                className="flex-1 bg-black text-white py-3 rounded-xl font-bold"
              >
                Publish Video
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const VideoPlayer = ({ video, onClose }: { video: VideoData, onClose: () => void }) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<CommentData[]>([]);
  const [newComment, setNewComment] = useState('');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isReading, setIsReading] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subId, setSubId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, `videos/${video.id}/comments`), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setComments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CommentData)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, `videos/${video.id}/comments`));
    return () => unsubscribe();
  }, [video.id]);

  useEffect(() => {
    if (!user || user.uid === video.authorId) return;
    const q = query(
      collection(db, 'subscriptions'), 
      where('subscriberId', '==', user.uid), 
      where('creatorId', '==', video.authorId)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        setIsSubscribed(true);
        setSubId(snapshot.docs[0].id);
      } else {
        setIsSubscribed(false);
        setSubId(null);
      }
    });
    return () => unsubscribe();
  }, [user, video.authorId]);

  const handleToggleSubscription = async () => {
    if (!user) return;
    try {
      if (isSubscribed && subId) {
        await deleteDoc(doc(db, 'subscriptions', subId));
      } else {
        await addDoc(collection(db, 'subscriptions'), {
          subscriberId: user.uid,
          creatorId: video.authorId,
          createdAt: Timestamp.now()
        });
      }
    } catch (error) {
      handleFirestoreError(error, isSubscribed ? OperationType.DELETE : OperationType.CREATE, 'subscriptions');
    }
  };

  const handleAddComment = async () => {
    if (!newComment || !user) return;
    try {
      await addDoc(collection(db, `videos/${video.id}/comments`), {
        videoId: video.id,
        authorId: user.uid,
        authorName: user.displayName || 'Anonymous',
        text: newComment,
        createdAt: Timestamp.now()
      });
      setNewComment('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `videos/${video.id}/comments`);
    }
  };

  const handleTTS = async () => {
    if (isReading) {
      setAudioUrl(null);
      setIsReading(false);
      return;
    }
    setIsReading(true);
    const url = await geminiService.textToSpeech(video.description);
    setAudioUrl(url);
  };

  return (
    <div className="fixed inset-0 bg-white z-[60] overflow-y-auto pt-14">
      <div className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="aspect-video bg-black rounded-2xl overflow-hidden mb-4 shadow-xl">
            <video src={video.videoUrl} controls autoPlay className="w-full h-full" />
          </div>
          
          <div className="flex justify-between items-start mb-4">
            <h1 className="text-xl font-bold leading-tight">{video.title}</h1>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">✕</button>
          </div>

          <div className="flex items-center justify-between py-4 border-y border-gray-100 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden">
                <img src={`https://picsum.photos/seed/${video.authorId}/100/100`} alt="" />
              </div>
              <div>
                <p className="font-bold text-sm">{video.authorName}</p>
                <p className="text-xs text-gray-500">1.2M subscribers</p>
              </div>
              {user && user.uid !== video.authorId && (
                <button 
                  onClick={handleToggleSubscription}
                  className={cn(
                    "ml-4 px-4 py-2 rounded-full text-sm font-medium transition-colors",
                    isSubscribed 
                      ? "bg-gray-100 text-gray-600 hover:bg-gray-200" 
                      : "bg-black text-white hover:bg-gray-800"
                  )}
                >
                  {isSubscribed ? 'Subscribed' : 'Subscribe'}
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex bg-gray-100 rounded-full overflow-hidden">
                <button className="flex items-center gap-2 px-4 py-2 hover:bg-gray-200 border-r border-gray-300">
                  <ThumbsUp size={18} />
                  <span className="text-sm font-medium">{video.likes}</span>
                </button>
                <button className="px-4 py-2 hover:bg-gray-200">
                  <ThumbsUp size={18} className="rotate-180" />
                </button>
              </div>
              <button className="bg-gray-100 p-2 rounded-full hover:bg-gray-200">
                <Send size={18} />
              </button>
            </div>
          </div>

          <div className="bg-gray-100 rounded-xl p-4 mb-8">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-bold">{video.views.toLocaleString()} views • {new Date(video.createdAt?.seconds * 1000).toLocaleDateString()}</p>
              <button 
                onClick={handleTTS}
                className="flex items-center gap-2 text-xs font-bold text-blue-600 hover:underline"
              >
                {isReading ? <Volume2 size={14} /> : <Volume2 size={14} className="opacity-50" />}
                {isReading ? 'Stop Reading' : 'Listen to Description'}
              </button>
            </div>
            <p className="text-sm whitespace-pre-wrap">{video.description}</p>
            {audioUrl && <audio src={audioUrl} autoPlay onEnded={() => setIsReading(false)} className="hidden" />}
          </div>

          <div className="space-y-6">
            <h3 className="font-bold text-lg">{comments.length} Comments</h3>
            {user && (
              <div className="flex gap-4">
                <img src={user.photoURL || ''} className="w-10 h-10 rounded-full" alt="" />
                <div className="flex-1 border-b border-gray-300 focus-within:border-black transition-colors">
                  <input
                    type="text"
                    placeholder="Add a comment..."
                    className="w-full py-1 outline-none text-sm"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                  />
                </div>
              </div>
            )}
            <div className="space-y-6">
              {comments.map(comment => (
                <div key={comment.id} className="flex gap-4">
                  <img src={`https://picsum.photos/seed/${comment.authorId}/100/100`} className="w-10 h-10 rounded-full" alt="" />
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold">@{comment.authorName}</span>
                      <span className="text-[10px] text-gray-500">{new Date(comment.createdAt?.seconds * 1000).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm">{comment.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="font-bold text-sm mb-4">Up Next</h3>
          {/* Mock related videos */}
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="flex gap-2 group cursor-pointer">
              <div className="w-40 aspect-video bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                <img src={`https://picsum.photos/seed/rel${i}/320/180`} className="w-full h-full object-cover" alt="" />
              </div>
              <div>
                <h4 className="text-xs font-bold line-clamp-2 mb-1">More AI Generated Content {i}</h4>
                <p className="text-[10px] text-gray-500">TubeGen AI</p>
                <p className="text-[10px] text-gray-500">100K views</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const NearbyCreators = () => {
  const [creators, setCreators] = useState<CreatorLocation[]>([]);
  const [loading, setLoading] = useState(false);

  const findNearby = async () => {
    setLoading(true);
    try {
      const response = await geminiService.findNearbyCreators();
      setCreators(response);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-blue-50 rounded-xl p-4 mb-8 border border-blue-100">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-blue-700">
          <MapPin size={20} />
          <h3 className="font-bold">Nearby Creators & Studios</h3>
        </div>
        <button 
          onClick={findNearby}
          disabled={loading}
          className="text-xs bg-blue-600 text-white px-3 py-1 rounded-full font-bold disabled:opacity-50"
        >
          {loading ? 'Searching...' : 'Find Nearby'}
        </button>
      </div>
      {creators.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {creators.map((c, i) => (
            <a 
              key={i} 
              href={c.uri} 
              target="_blank" 
              rel="noopener noreferrer"
              className="bg-white p-2 rounded-lg border border-blue-200 text-xs font-medium hover:bg-blue-100 transition-colors flex justify-between items-center"
            >
              <span>{c.title}</span>
              <span className="text-[10px] text-blue-500 underline">View on Maps</span>
            </a>
          ))}
        </div>
      ) : (
        <p className="text-xs text-blue-500 italic">Discover creators and production studios in your area.</p>
      )}
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [videos, setVideos] = useState<VideoData[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<VideoData | null>(null);
  const [isStudioOpen, setIsStudioOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'videos'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setVideos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VideoData)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'videos'));
    return () => unsubscribe();
  }, []);

  const handleSearch = async (q: string) => {
    setSearchQuery(q);
    if (!q) return;
    // In a real app, we'd filter Firestore or use Search Grounding to find external videos
    const externalVideos = await geminiService.searchVideos(q);
    // Combine or show external results
    console.log("Search results:", externalVideos);
  };

  return (
    <AuthProvider>
      <div className="min-h-screen bg-white text-gray-900 font-sans">
        <Navbar onSearch={handleSearch} onOpenStudio={() => setIsStudioOpen(true)} />
        <Sidebar />
        
        <main className="pt-20 lg:ml-64 px-4 pb-20">
          <div className="max-w-[1800px] mx-auto">
            <NearbyCreators />
            {/* Tags bar */}
            <div className="flex gap-3 overflow-x-auto pb-6 no-scrollbar">
              {['All', 'AI', 'Veo', 'Gemini', 'Music', 'Gaming', 'Tutorials', 'Vlogs', 'Shorts'].map(tag => (
                <button key={tag} className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium whitespace-nowrap transition-colors">
                  {tag}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-x-4 gap-y-8">
              {videos.map(video => (
                <VideoCard key={video.id} video={video} onClick={() => setSelectedVideo(video)} />
              ))}
              {/* Fallback mock videos if empty */}
              {videos.length === 0 && Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="aspect-video bg-gray-200 rounded-xl mb-3" />
                  <div className="flex gap-3">
                    <div className="w-9 h-9 rounded-full bg-gray-200" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-3/4" />
                      <div className="h-3 bg-gray-200 rounded w-1/2" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>

        <AnimatePresence>
          {isStudioOpen && <CreatorStudio onClose={() => setIsStudioOpen(false)} />}
          {selectedVideo && <VideoPlayer video={selectedVideo} onClose={() => setSelectedVideo(null)} />}
        </AnimatePresence>

        <AIAssistant />
      </div>
    </AuthProvider>
  );
}
