import React, { useState, useEffect } from 'react';
import { Search, Menu, Video, Bell, User, Home, Compass, PlaySquare, Clock, ThumbsUp, MessageSquare, Send, Sparkles, Wand2, Mic, Volume2, Share2, Camera, Edit3, LogOut, Upload, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { geminiService } from './services/geminiService';
import { db, collection, query, orderBy, onSnapshot, addDoc, Timestamp, OperationType, handleFirestoreError, updateDoc, doc, where, limit, getDocs, deleteDoc, getDoc, storage, ref, uploadBytesResumable, getDownloadURL } from './firebase';
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
  isShort?: boolean;
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

interface ChannelData {
  uid: string;
  displayName: string;
  photoURL: string;
  bannerURL?: string;
  bio?: string;
  contactEmail?: string;
  subscriberCount?: number;
  createdAt: any;
}

const ProfilePage = ({ channelId, onClose, onVideoClick, onOpenProfile }: { channelId: string, onClose: () => void, onVideoClick: (v: VideoData) => void, onOpenProfile: (id: string) => void }) => {
  const { user } = useAuth();
  const [channel, setChannel] = useState<ChannelData | null>(null);
  const [videos, setVideos] = useState<VideoData[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editBio, setEditBio] = useState('');
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [activeTab, setActiveTab] = useState<'videos' | 'about'>('videos');

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'channels', channelId), (doc) => {
      if (doc.exists()) {
        const data = doc.data() as ChannelData;
        setChannel(data);
        setEditBio(data.bio || '');
        setEditName(data.displayName || '');
        setEditEmail(data.contactEmail || '');
      }
    });
    return () => unsubscribe();
  }, [channelId]);

  useEffect(() => {
    const q = query(collection(db, 'videos'), where('authorId', '==', channelId), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setVideos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VideoData)));
    });
    return () => unsubscribe();
  }, [channelId]);

  const handleUpdateProfile = async () => {
    try {
      await updateDoc(doc(db, 'channels', channelId), {
        displayName: editName,
        bio: editBio,
        contactEmail: editEmail
      });
      setIsEditing(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'channels');
    }
  };

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    alert('Application link copied to clipboard!');
  };

  if (!channel) return null;

  return (
    <div className="fixed inset-0 bg-white z-[70] overflow-y-auto pt-14">
      <div className="w-full h-48 sm:h-64 bg-gray-200 relative">
        {channel.bannerURL ? (
          <img src={channel.bannerURL} className="w-full h-full object-cover" alt="Banner" />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-gray-200 to-gray-300" />
        )}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full hover:bg-black/70"
        >
          ✕
        </button>
      </div>

      <div className="max-w-7xl mx-auto px-4">
        <div className="flex flex-col sm:flex-row gap-6 -mt-12 sm:-mt-16 items-start sm:items-end mb-8">
          <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-white overflow-hidden bg-white shadow-lg">
            <img src={channel.photoURL} className="w-full h-full object-cover" alt={channel.displayName} />
          </div>
          <div className="flex-1 pb-2">
            {isEditing ? (
              <div className="space-y-2">
                <input 
                  value={editName} 
                  onChange={e => setEditName(e.target.value)}
                  className="text-2xl font-bold border-b border-gray-300 outline-none focus:border-black w-full"
                />
                <textarea 
                  value={editBio} 
                  onChange={e => setEditBio(e.target.value)}
                  className="text-sm text-gray-600 border border-gray-200 rounded p-2 w-full outline-none focus:border-black"
                  placeholder="Tell us about your channel..."
                />
                <input 
                  value={editEmail} 
                  onChange={e => setEditEmail(e.target.value)}
                  className="text-sm text-gray-600 border border-gray-200 rounded p-2 w-full outline-none focus:border-black"
                  placeholder="Contact Email (e.g. your@email.com)"
                />
                <div className="flex gap-2">
                  <button onClick={handleUpdateProfile} className="bg-black text-white px-4 py-1 rounded-full text-sm font-bold">Save</button>
                  <button onClick={() => setIsEditing(false)} className="bg-gray-100 px-4 py-1 rounded-full text-sm font-bold">Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <h1 className="text-2xl sm:text-3xl font-bold mb-1">{channel.displayName}</h1>
                <p className="text-sm text-gray-500 mb-2">@channel_{channel.uid.slice(0, 5)} • {channel.subscriberCount || 0} subscribers • {videos.length} videos</p>
                <p className="text-sm text-gray-600 max-w-2xl mb-1">{channel.bio || 'No bio yet.'}</p>
                {channel.contactEmail && (
                  <p className="text-xs text-blue-600 font-medium">Contact: {channel.contactEmail}</p>
                )}
              </>
            )}
          </div>
          <div className="flex gap-2 pb-2">
            {user?.uid === channelId ? (
              <button 
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-full text-sm font-bold hover:bg-gray-200"
              >
                <Edit3 size={16} />
                Edit Profile
              </button>
            ) : (
              <button className="bg-black text-white px-6 py-2 rounded-full text-sm font-bold hover:bg-gray-800">
                Subscribe
              </button>
            )}
            <button 
              onClick={handleShare}
              className="p-2 bg-gray-100 rounded-full hover:bg-gray-200"
              title="Share Application"
            >
              <Share2 size={20} />
            </button>
          </div>
        </div>

        <div className="border-b border-gray-200 mb-8">
          <div className="flex gap-8">
            <button 
              onClick={() => setActiveTab('videos')}
              className={cn("pb-4 font-bold text-sm transition-colors", activeTab === 'videos' ? "border-b-2 border-black text-black" : "text-gray-500 hover:text-black")}
            >
              Videos
            </button>
            <button 
              onClick={() => setActiveTab('about')}
              className={cn("pb-4 font-bold text-sm transition-colors", activeTab === 'about' ? "border-b-2 border-black text-black" : "text-gray-500 hover:text-black")}
            >
              About
            </button>
          </div>
        </div>

        {activeTab === 'videos' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-8 pb-20">
            {videos.map(video => (
              <VideoCard 
                key={video.id} 
                video={video} 
                onClick={() => onVideoClick(video)} 
                onOpenProfile={onOpenProfile}
              />
            ))}
            {videos.length === 0 && (
              <div className="col-span-full py-20 text-center text-gray-400">
                <Video size={48} className="mx-auto mb-4 opacity-20" />
                <p>No videos uploaded yet.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="max-w-2xl py-8 space-y-8 pb-20">
            <section>
              <h3 className="text-lg font-bold mb-4">Description</h3>
              <p className="text-gray-600 whitespace-pre-wrap">{channel.bio || 'No description provided.'}</p>
            </section>
            
            <section className="pt-8 border-t border-gray-100">
              <h3 className="text-lg font-bold mb-4">Details</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                    <Bell size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-bold">{channel.subscriberCount || 0} subscribers</p>
                    <p className="text-xs text-gray-500">Total channel reach</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                    <Video size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-bold">{videos.length} videos</p>
                    <p className="text-xs text-gray-500">Content uploaded</p>
                  </div>
                </div>
                {channel.contactEmail && (
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                      <User size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-bold">{channel.contactEmail}</p>
                      <p className="text-xs text-gray-500">Business inquiries & contact</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                    <Clock size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-bold">Joined {new Date(channel.createdAt?.seconds * 1000).toLocaleDateString()}</p>
                    <p className="text-xs text-gray-500">Member since</p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
};

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

const Navbar = ({ initialQuery, onSearch, onOpenStudio, onOpenProfile }: { initialQuery: string, onSearch: (q: string) => void, onOpenStudio: () => void, onOpenProfile: (id: string) => void }) => {
  const { user, signIn, signOut } = useAuth();
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [showNotifs, setShowNotifs] = useState(false);

  useEffect(() => {
    setSearchQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'notifications'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'), limit(20));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setNotifications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as NotificationData)));
    });
    return () => unsubscribe();
  }, [user]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleShareApp = () => {
    const url = window.location.origin;
    navigator.clipboard.writeText(url);
    alert('Application link copied to clipboard! Share it with your friends.');
  };

  return (
    <nav className="fixed top-0 left-0 right-0 h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 z-50">
      <div className="flex items-center gap-4">
        <button className="p-2 hover:bg-gray-100 rounded-full">
          <Menu size={20} />
        </button>
        <div className="flex items-center gap-1 text-red-600 font-bold text-xl tracking-tighter cursor-pointer" onClick={() => window.location.reload()}>
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
        <button 
          onClick={handleShareApp}
          className="p-2 hover:bg-gray-100 rounded-full text-gray-600"
          title="Share Application"
        >
          <Share2 size={20} />
        </button>
        {user ? (
          <>
            <button 
              onClick={onOpenStudio}
              className="hidden md:flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-full text-sm font-bold hover:bg-red-700 transition-all shadow-sm hover:shadow-md active:scale-[0.98]"
            >
              <Upload size={18} />
              <span>Upload</span>
            </button>
            <button 
              onClick={onOpenStudio}
              className="p-2 hover:bg-gray-100 rounded-full flex items-center gap-2 text-sm font-medium md:hidden"
            >
              <Video size={20} />
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
            <button 
              onClick={() => onOpenProfile(user.uid)} 
              className="ml-2"
              title="View Profile"
            >
              <img src={user.photoURL || ''} alt="User" className="w-8 h-8 rounded-full border border-gray-200" />
            </button>
            <button 
              onClick={signOut}
              className="p-2 hover:bg-gray-100 rounded-full text-gray-500"
              title="Sign Out"
            >
              <LogOut size={20} />
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

const Sidebar = ({ onOpenProfile }: { onOpenProfile: (id: string) => void }) => {
  const { user } = useAuth();
  const items = [
    { icon: Home, label: 'Home', active: true },
    { icon: Compass, label: 'Explore' },
    { icon: PlaySquare, label: 'Subscriptions' },
    { icon: User, label: 'Your Channel', onClick: () => user && onOpenProfile(user.uid) },
    { icon: Clock, label: 'History' },
  ];

  return (
    <aside className="fixed left-0 top-14 bottom-0 w-64 bg-white hidden lg:block overflow-y-auto p-2">
      {items.map((item) => (
        <button
          key={item.label}
          onClick={item.onClick}
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

const VideoCard = ({ video, onClick, onOpenProfile }: { video: VideoData, onClick: () => void, onOpenProfile?: (id: string) => void }) => {
  const isShort = video.isShort;

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("cursor-pointer group", isShort && "max-w-[240px]")}
      onClick={onClick}
    >
      <div className={cn(
        "relative rounded-xl overflow-hidden bg-gray-100 mb-3",
        isShort ? "aspect-[9/16]" : "aspect-video"
      )}>
        <img 
          src={video.thumbnailUrl} 
          alt={video.title} 
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          referrerPolicy="no-referrer"
        />
        {!isShort && (
          <div className="absolute bottom-2 right-2 bg-black/80 text-white text-[10px] px-1 rounded font-medium">
            10:00
          </div>
        )}
        {isShort && (
          <div className="absolute top-2 left-2 bg-red-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 shadow-lg">
            <Sparkles size={10} />
            SHORTS
          </div>
        )}
      </div>
      <div className="flex gap-3">
        {!isShort && (
          <div 
            className="w-9 h-9 rounded-full bg-gray-200 flex-shrink-0 overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
            onClick={(e) => {
              if (onOpenProfile) {
                e.stopPropagation();
                onOpenProfile(video.authorId);
              }
            }}
          >
            <img src={`https://picsum.photos/seed/${video.authorId}/100/100`} alt="" referrerPolicy="no-referrer" />
          </div>
        )}
        <div className={cn(isShort && "px-1")}>
          <h3 className={cn("font-semibold text-sm line-clamp-2 mb-1 leading-tight", isShort && "text-sm")}>{video.title}</h3>
          <p 
            className="text-xs text-gray-500 mb-0.5 hover:text-black transition-colors cursor-pointer"
            onClick={(e) => {
              if (onOpenProfile) {
                e.stopPropagation();
                onOpenProfile(video.authorId);
              }
            }}
          >
            {video.authorName}
          </p>
          <p className="text-xs text-gray-500">
            {(video.views || 0).toLocaleString()} views
          </p>
        </div>
      </div>
    </motion.div>
  );
};

const CreatorStudio = ({ onClose }: { onClose: () => void }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'ai' | 'manual'>('ai');
  
  // AI State
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<{ video?: string, thumb?: string } | null>(null);
  const [status, setStatus] = useState('');

  // Manual State
  const [manualTitle, setManualTitle] = useState('');
  const [manualDesc, setManualDesc] = useState('');
  const [manualVideoUrl, setManualVideoUrl] = useState('');
  const [manualThumbUrl, setManualThumbUrl] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbFile, setThumbFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isShort, setIsShort] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('video/')) {
      setVideoFile(file);
      if (!manualTitle) setManualTitle(file.name.split('.')[0]);
    }
  };

  const uploadFile = (file: File, path: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const storageRef = ref(storage, path);
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on('state_changed', 
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
        }, 
        (error) => reject(error), 
        () => {
          getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
            resolve(downloadURL);
          });
        }
      );
    });
  };

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

  const handlePublishAI = async () => {
    if (!result?.video || !user) return;
    setIsPublishing(true);
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
        isShort: false,
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
      setPublishSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'videos');
    } finally {
      setIsPublishing(false);
    }
  };

  const handlePublishManual = async () => {
    if (!manualTitle || (!manualVideoUrl && !videoFile) || !user) return;
    setIsPublishing(true);
    setUploadProgress(0);
    try {
      let finalVideoUrl = manualVideoUrl;
      let finalThumbUrl = manualThumbUrl;

      if (videoFile) {
        // Use the /upload endpoint for video files
        const formData = new FormData();
        formData.append('video', videoFile);
        formData.append('title', manualTitle);

        const uploadResult = await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('POST', '/upload');
          
          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              const progress = (event.loaded / event.total) * 100;
              setUploadProgress(progress);
            }
          };

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                resolve(JSON.parse(xhr.responseText));
              } catch (e) {
                reject(new Error('Invalid response from server'));
              }
            } else {
              reject(new Error(`Upload failed with status ${xhr.status}`));
            }
          };

          xhr.onerror = () => reject(new Error('Network error during upload'));
          xhr.send(formData);
        }) as any;

        finalVideoUrl = uploadResult.video.path;
      }

      if (thumbFile) {
        finalThumbUrl = await uploadFile(thumbFile, `thumbnails/${user.uid}/${Date.now()}_${thumbFile.name}`);
      }

      const videoRef = collection(db, 'videos');
      const newVideo = {
        title: manualTitle,
        description: manualDesc,
        thumbnailUrl: finalThumbUrl || `https://picsum.photos/seed/${manualTitle}/1280/720`,
        videoUrl: finalVideoUrl,
        authorId: user.uid,
        authorName: user.displayName || 'Anonymous',
        views: 0,
        likes: 0,
        isShort: isShort,
        createdAt: Timestamp.now(),
        tags: isShort ? ['Shorts'] : []
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
          message: `uploaded a new ${isShort ? 'short' : 'video'}: ${manualTitle}`,
          videoId: docRef.id,
          creatorId: user.uid,
          creatorName: user.displayName || 'Anonymous',
          read: false,
          createdAt: Timestamp.now()
        });
      });
      
      await Promise.all(notificationPromises);
      setPublishSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'videos');
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl"
      >
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Video className="text-red-600" />
              Creator Studio
            </h2>
            <p className="text-xs text-gray-500">Create or upload your content</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">✕</button>
        </div>

        <div className="flex border-b border-gray-100">
          <button 
            onClick={() => setActiveTab('ai')}
            className={cn(
              "flex-1 py-3 text-sm font-bold transition-colors",
              activeTab === 'ai' ? "border-b-2 border-black text-black" : "text-gray-500 hover:text-black"
            )}
          >
            AI Generation
          </button>
          <button 
            onClick={() => setActiveTab('manual')}
            className={cn(
              "flex-1 py-3 text-sm font-bold transition-colors flex items-center justify-center gap-2",
              activeTab === 'manual' ? "border-b-2 border-black text-black" : "text-gray-500 hover:text-black"
            )}
          >
            <Upload size={16} />
            Manual Upload
          </button>
        </div>

        <div className="p-8 max-h-[70vh] overflow-y-auto">
          {publishSuccess ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center shadow-inner">
                <Check size={40} />
              </div>
              <div className="text-center">
                <h3 className="text-2xl font-bold text-gray-900">Successfully Published!</h3>
                <p className="text-gray-500">Your video is now live on TubeGen AI.</p>
              </div>
              <p className="text-xs text-gray-400 animate-pulse">Closing studio...</p>
            </div>
          ) : activeTab === 'ai' ? (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold mb-2">What should the video be about?</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="A cat playing the piano in space..."
                    className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-red-500"
                  />
                  <button 
                    onClick={handleGenerate}
                    disabled={isGenerating || !prompt}
                    className="bg-black text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 disabled:opacity-50"
                  >
                    {isGenerating ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Sparkles size={18} />}
                    Generate
                  </button>
                </div>
              </div>

              {status && (
                <div className="p-4 bg-gray-50 rounded-xl flex items-center gap-3 text-sm text-gray-600">
                  <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse" />
                  {status}
                </div>
              )}

              {result && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-gray-500 uppercase">Thumbnail</p>
                    <div className="aspect-video rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
                      {result.thumb ? <img src={result.thumb} alt="Thumbnail" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Camera className="text-gray-300" /></div>}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-gray-500 uppercase">Video Preview</p>
                    <div className="aspect-video rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
                      {result.video ? <video src={result.video} controls className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Video className="text-gray-300" /></div>}
                    </div>
                  </div>
                </div>
              )}

              {result?.video && (
                <button 
                  onClick={handlePublishAI}
                  disabled={isPublishing}
                  className="w-full bg-red-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {isPublishing ? 'Publishing...' : 'Publish to Channel'}
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {!videoFile && !manualVideoUrl ? (
                <div 
                  onDragOver={onDragOver}
                  onDragLeave={onDragLeave}
                  onDrop={onDrop}
                  className={cn(
                    "border-2 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center gap-4 transition-all",
                    isDragging ? "border-red-500 bg-red-50" : "border-gray-200 hover:border-gray-300 bg-gray-50"
                  )}
                >
                  <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center text-gray-400">
                    <Upload size={32} />
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-lg">Drag and drop video files to upload</p>
                    <p className="text-sm text-gray-500">Your videos will be private until you publish them</p>
                  </div>
                  <label className="bg-black text-white px-6 py-2.5 rounded-full font-bold text-sm cursor-pointer hover:bg-gray-800 transition-colors">
                    Select Files
                    <input 
                      type="file" 
                      accept="video/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        setVideoFile(file);
                        if (file && !manualTitle) setManualTitle(file.name.split('.')[0]);
                      }}
                    />
                  </label>
                  <div className="flex items-center gap-2 w-full max-w-xs mt-4">
                    <div className="h-px bg-gray-200 flex-1" />
                    <span className="text-[10px] text-gray-400 font-bold uppercase">OR PASTE URL</span>
                    <div className="h-px bg-gray-200 flex-1" />
                  </div>
                  <input 
                    type="text" 
                    value={manualVideoUrl}
                    onChange={(e) => setManualVideoUrl(e.target.value)}
                    placeholder="https://example.com/video.mp4"
                    className="w-full max-w-md px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-black text-sm text-center"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="aspect-video bg-black rounded-xl overflow-hidden relative group">
                      {videoFile ? (
                        <video src={URL.createObjectURL(videoFile)} className="w-full h-full object-cover" />
                      ) : (
                        <video src={manualVideoUrl} className="w-full h-full object-cover" />
                      )}
                      <button 
                        onClick={() => { setVideoFile(null); setManualVideoUrl(''); }}
                        className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={14} />
                      </button>
                    </div>
                    
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Title (required)</label>
                      <input 
                        type="text" 
                        value={manualTitle}
                        onChange={(e) => setManualTitle(e.target.value)}
                        placeholder="Add a title that describes your video"
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-black"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Description</label>
                      <textarea 
                        value={manualDesc}
                        onChange={(e) => setManualDesc(e.target.value)}
                        placeholder="Tell viewers about your video"
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-black h-32 resize-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Thumbnail</label>
                      <div className="grid grid-cols-1 gap-2">
                        <div 
                          className={cn(
                            "aspect-video rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors",
                            thumbFile || manualThumbUrl ? "border-solid border-gray-200" : "border-gray-200 hover:border-gray-300 bg-gray-50"
                          )}
                          onClick={() => document.getElementById('thumbInput')?.click()}
                        >
                          {thumbFile ? (
                            <img src={URL.createObjectURL(thumbFile)} className="w-full h-full object-cover rounded-lg" alt="" />
                          ) : manualThumbUrl ? (
                            <img src={manualThumbUrl} className="w-full h-full object-cover rounded-lg" alt="" />
                          ) : (
                            <>
                              <Camera size={24} className="text-gray-400" />
                              <p className="text-[10px] font-bold text-gray-500">Upload Thumbnail</p>
                            </>
                          )}
                        </div>
                        <input 
                          id="thumbInput"
                          type="file" 
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => setThumbFile(e.target.files?.[0] || null)}
                        />
                        <input 
                          type="text" 
                          value={manualThumbUrl}
                          onChange={(e) => setManualThumbUrl(e.target.value)}
                          placeholder="Or paste thumbnail URL"
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-black text-xs"
                        />
                      </div>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <PlaySquare size={16} className="text-red-600" />
                          <span className="text-sm font-bold">Shorts Format</span>
                        </div>
                        <input 
                          type="checkbox" 
                          checked={isShort}
                          onChange={(e) => setIsShort(e.target.checked)}
                          className="w-5 h-5 accent-red-600"
                        />
                      </div>
                      <p className="text-[10px] text-gray-500 leading-relaxed">
                        If your video is vertical (9:16) and under 60 seconds, it will be automatically categorized as a Short.
                      </p>
                    </div>

                    {isPublishing && uploadProgress > 0 && (
                      <div className="space-y-2 p-4 bg-red-50 rounded-xl">
                        <div className="flex justify-between text-[10px] font-bold text-red-600 uppercase">
                          <span>Uploading to secure storage...</span>
                          <span>{Math.round(uploadProgress)}%</span>
                        </div>
                        <div className="w-full bg-red-200 rounded-full h-2 overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${uploadProgress}%` }}
                            className="bg-red-600 h-full"
                          />
                        </div>
                      </div>
                    )}

                    <button 
                      onClick={handlePublishManual}
                      disabled={isPublishing || !manualTitle}
                      className="w-full bg-red-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-red-700 shadow-lg shadow-red-200 transition-all disabled:opacity-50 active:scale-[0.98]"
                    >
                      {isPublishing ? 'Processing...' : 'Publish Video'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

const VideoPlayer = ({ video, onClose, onOpenProfile }: { video: VideoData, onClose: () => void, onOpenProfile: (id: string) => void }) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<CommentData[]>([]);
  const [newComment, setNewComment] = useState('');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isReading, setIsReading] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subId, setSubId] = useState<string | null>(null);
  const [channel, setChannel] = useState<ChannelData | null>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'channels', video.authorId), (doc) => {
      if (doc.exists()) {
        setChannel(doc.data() as ChannelData);
      }
    });
    return () => unsubscribe();
  }, [video.authorId]);

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
      const channelRef = doc(db, 'channels', video.authorId);
      if (isSubscribed && subId) {
        await deleteDoc(doc(db, 'subscriptions', subId));
        await updateDoc(channelRef, {
          subscriberCount: Math.max(0, (channel?.subscriberCount || 0) - 1)
        });
      } else {
        await addDoc(collection(db, 'subscriptions'), {
          subscriberId: user.uid,
          creatorId: video.authorId,
          createdAt: Timestamp.now()
        });
        await updateDoc(channelRef, {
          subscriberCount: (channel?.subscriberCount || 0) + 1
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
              <div 
                className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden cursor-pointer"
                onClick={() => onOpenProfile(video.authorId)}
              >
                <img src={`https://picsum.photos/seed/${video.authorId}/100/100`} alt="" />
              </div>
              <div className="cursor-pointer" onClick={() => onOpenProfile(video.authorId)}>
                <p className="font-bold text-sm">{video.authorName}</p>
                <p className="text-xs text-gray-500">{channel?.subscriberCount || 0} subscribers</p>
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
              <button 
                onClick={() => {
                  const url = window.location.origin;
                  navigator.clipboard.writeText(url);
                  alert('Application link copied to clipboard!');
                }}
                className="bg-gray-100 p-2 rounded-full hover:bg-gray-200"
                title="Share Application"
              >
                <Share2 size={18} />
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
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [isStudioOpen, setIsStudioOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [externalResults, setExternalResults] = useState<any[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'videos'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setVideos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VideoData)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'videos'));
    return () => unsubscribe();
  }, []);

  const handleSearch = async (q: string) => {
    setSearchQuery(q);
    if (!q) {
      setExternalResults([]);
      return;
    }
    
    setIsSearching(true);
    try {
      // In a real app, we'd filter Firestore or use Search Grounding to find external videos
      const results = await geminiService.searchVideos(q);
      setExternalResults(results || []);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const filteredVideos = videos.filter(v => 
    v.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.authorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.tags?.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <AuthProvider>
      <div className="min-h-screen bg-white text-gray-900 font-sans">
        <Navbar initialQuery={searchQuery} onSearch={handleSearch} onOpenStudio={() => setIsStudioOpen(true)} onOpenProfile={setSelectedChannelId} />
        <Sidebar onOpenProfile={setSelectedChannelId} />
        
        <main className="pt-20 lg:ml-64 px-4 pb-20">
          <div className="max-w-[1800px] mx-auto">
            {!searchQuery && <NearbyCreators />}
            
            {/* Tags bar */}
            <div className="flex gap-3 overflow-x-auto pb-6 no-scrollbar">
              {['All', 'AI', 'Veo', 'Gemini', 'Music', 'Gaming', 'Tutorials', 'Vlogs', 'Shorts'].map(tag => (
                <button 
                  key={tag} 
                  onClick={() => handleSearch(tag === 'All' ? '' : tag)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors",
                    searchQuery === tag || (tag === 'All' && !searchQuery) 
                      ? "bg-black text-white" 
                      : "bg-gray-100 hover:bg-gray-200 text-gray-900"
                  )}
                >
                  {tag}
                </button>
              ))}
            </div>

            {searchQuery && (
              <div className="mb-8 flex items-center justify-between">
                <h2 className="text-xl font-bold">Results for "{searchQuery}"</h2>
                <button 
                  onClick={() => handleSearch('')}
                  className="text-sm text-blue-600 font-bold hover:underline"
                >
                  Clear Search
                </button>
              </div>
            )}

            {isSearching && (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="w-10 h-10 border-4 border-gray-200 border-t-red-600 rounded-full animate-spin" />
                <p className="text-sm text-gray-500 font-medium">Searching the platform and the web...</p>
              </div>
            )}

            {/* Shorts Shelf (Only show if not searching or if search matches shorts) */}
            {!isSearching && filteredVideos.some(v => v.isShort) && (
              <section className="mb-12">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="text-red-600" size={24} />
                  <h2 className="text-xl font-bold">Shorts</h2>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
                  {filteredVideos.filter(v => v.isShort).map(video => (
                    <div key={video.id} className="flex-shrink-0 w-[200px] sm:w-[240px]">
                      <VideoCard 
                        video={video} 
                        onClick={() => setSelectedVideo(video)} 
                        onOpenProfile={setSelectedChannelId}
                      />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {!isSearching && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-x-4 gap-y-8">
                {filteredVideos.filter(v => !v.isShort).map(video => (
                  <VideoCard 
                    key={video.id} 
                    video={video} 
                    onClick={() => setSelectedVideo(video)} 
                    onOpenProfile={setSelectedChannelId}
                  />
                ))}
                
                {/* External Results from Gemini */}
                {externalResults.map((video, i) => (
                  <VideoCard 
                    key={`ext-${i}`} 
                    video={{
                      id: `ext-${i}`,
                      title: video.title,
                      description: video.description,
                      thumbnailUrl: video.thumbnailUrl || `https://picsum.photos/seed/ext${i}/1280/720`,
                      videoUrl: video.videoUrl,
                      authorId: 'external',
                      authorName: video.author || 'Web Creator',
                      views: Math.floor(Math.random() * 1000000),
                      likes: 0,
                      createdAt: Timestamp.now(),
                      tags: video.tags || []
                    }} 
                    onClick={() => setSelectedVideo({
                      id: `ext-${i}`,
                      title: video.title,
                      description: video.description,
                      thumbnailUrl: video.thumbnailUrl || `https://picsum.photos/seed/ext${i}/1280/720`,
                      videoUrl: video.videoUrl,
                      authorId: 'external',
                      authorName: video.author || 'Web Creator',
                      views: Math.floor(Math.random() * 1000000),
                      likes: 0,
                      createdAt: Timestamp.now(),
                      tags: video.tags || []
                    })} 
                  />
                ))}

                {filteredVideos.length === 0 && externalResults.length === 0 && !isSearching && searchQuery && (
                  <div className="col-span-full py-20 text-center">
                    <Search size={48} className="mx-auto mb-4 opacity-20" />
                    <p className="text-gray-500">No videos found for "{searchQuery}"</p>
                  </div>
                )}

                {/* Fallback mock videos if empty and not searching */}
                {videos.length === 0 && !searchQuery && Array.from({ length: 10 }).map((_, i) => (
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
          )}
        </div>
      </main>

        <AnimatePresence>
          {isStudioOpen && <CreatorStudio onClose={() => setIsStudioOpen(false)} />}
          {selectedVideo && <VideoPlayer video={selectedVideo} onClose={() => setSelectedVideo(null)} onOpenProfile={setSelectedChannelId} />}
          {selectedChannelId && (
            <ProfilePage 
              channelId={selectedChannelId} 
              onClose={() => setSelectedChannelId(null)} 
              onVideoClick={setSelectedVideo}
              onOpenProfile={setSelectedChannelId}
            />
          )}
        </AnimatePresence>

        <AIAssistant />
      </div>
    </AuthProvider>
  );
}
