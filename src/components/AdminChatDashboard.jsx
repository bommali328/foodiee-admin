import React, { useState, useEffect, useRef } from "react";
import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";
import axios from "axios";
import { Send, User, MessageSquare, ShieldCheck, Paperclip, Store, Bike } from "lucide-react";

const API_BASE_URL = "https://Foodiee-backend-env.eba-5d9p6wzb.eu-north-1.elasticbeanstalk.com";

const AdminChatDashboard = () => {
    const [activeTab, setActiveTab] = useState('customer'); // 'customer', 'partner', 'shop'
    const [conversations, setConversations] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null); 
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const [messagesMap, setMessagesMap] = useState({}); // { mobile: [messages] }
    const [unreadMap, setUnreadMap] = useState({}); // { mobile: true/false }
    const stompClientRef = useRef(null);
    const messagesEndRef = useRef(null);

    // 1. Initialize WebSocket & Fetch Conversations on Mount
    useEffect(() => {
        fetchAllConversations();
        
        const socket = new SockJS(`${API_BASE_URL}/ws-foodiee`);
        const stompClient = new Client({
            webSocketFactory: () => socket,
            debug: () => {},
            onConnect: () => {
                // గ్లోబల్ లిజనర్: కొత్త మెసేజ్ రాగానే లిస్ట్, లాస్ట్ టైమ్ మరియు అన్‌రీడ్ డాట్ ఆటోమేటిక్‌గా అప్‌డేట్ అవ్వడానికి
                stompClient.subscribe(`/topic/admin/chats`, (messageOutput) => {
                    const receivedMessage = JSON.parse(messageOutput.body);
                    const mob = receivedMessage.senderMobile || receivedMessage.partnerMobile || receivedMessage.mobile;

                    if (mob) {
                        setMessagesMap(prev => {
                            const userMsgs = prev[mob] || [];
                            const exists = userMsgs.some(m => 
                                m.message === receivedMessage.message && 
                                m.timestamp === receivedMessage.timestamp &&
                                m.senderType === receivedMessage.senderType
                            );
                            if (exists) return prev;
                            return { ...prev, [mob]: [...userMsgs, receivedMessage] };
                        });

                        // అడ్మిన్ ప్రస్తుతం ఆ యూజర్ చాట్ విండోలో లేకపోతేనే బ్లింకింగ్ డాట్ చూపించాలి
                        setSelectedUser(currentSelected => {
                            if (!currentSelected || String(currentSelected.mobile).trim() !== String(mob).trim()) {
                                setUnreadMap(prevUnread => ({ ...prevUnread, [mob]: true }));
                            }
                            return currentSelected;
                        });
                    }

                    fetchAllConversations();
                });
            }
        });

        stompClient.activate();
        stompClientRef.current = stompClient;

        return () => {
            if (stompClientRef.current) stompClientRef.current.deactivate();
        };
    }, []);

    // 2. Real-time Subscription for Selected User's Chat (Strong Duplicate Prevention)
    useEffect(() => {
        if (!selectedUser || !stompClientRef.current || !stompClientRef.current.connected) return;

        const subTopic = (selectedUser.role === 'partner' || selectedUser.role === 'shop')
            ? `/topic/chat/admin-partner/${selectedUser.mobile}`
            : `/topic/chat/${selectedUser.mobile}`;

        const subscription = stompClientRef.current.subscribe(subTopic, (messageOutput) => {
            const receivedMessage = JSON.parse(messageOutput.body);
            setMessages(prev => {
                const exists = prev.some(m => 
                    m.message === receivedMessage.message && 
                    m.timestamp === receivedMessage.timestamp &&
                    m.senderType === receivedMessage.senderType
                );
                if (exists) return prev;
                return [...prev, receivedMessage];
            });

            setMessagesMap(prev => ({
                ...prev,
                [selectedUser.mobile]: [...(prev[selectedUser.mobile] || []), receivedMessage]
            }));
        });

        return () => {
            if (subscription) subscription.unsubscribe();
        };
    }, [selectedUser]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const fetchAllConversations = async () => {
        try {
            const custRes = await axios.get(`${API_BASE_URL}/api/chat/admin/conversations`).catch(() => ({ data: [] }));
            const newMessagesMap = {};

            (custRes.data || []).forEach(m => {
                const mob = m.senderMobile || m.mobile;
                if (mob) {
                    if (!newMessagesMap[mob]) newMessagesMap[mob] = [];
                    newMessagesMap[mob].push(m);
                }
            });

            const customerChats = Object.keys(newMessagesMap).map(mob => ({
                mobile: mob,
                name: newMessagesMap[mob][0]?.senderName || newMessagesMap[mob][0]?.name || 'Foodie Customer',
                role: 'customer'
            }));

            const partnerRes = await axios.get(`${API_BASE_URL}/api/admin-chat/conversations`).catch(() => ({ data: [] }));
            
            (partnerRes.data || []).forEach(m => {
                const mob = m.partnerMobile || m.mobile;
                if (mob) {
                    if (!newMessagesMap[mob]) newMessagesMap[mob] = [];
                    newMessagesMap[mob].push(m);
                }
            });

            const partnerChats = (partnerRes.data || []).map(m => {
                const mob = m.partnerMobile || m.mobile;
                return {
                    mobile: mob,
                    name: m.partnerName || m.name || 'Delivery Partner / Merchant',
                    role: m.role || 'partner'
                };
            });

            setMessagesMap(newMessagesMap);

            const allMap = new Map();
            [...customerChats, ...partnerChats].forEach(c => {
                if (c.mobile) allMap.set(c.mobile, c);
            });

            setConversations(Array.from(allMap.values()));
        } catch (err) {
            console.error("Error fetching conversations", err);
        }
    };

    const selectUserForChat = (user) => {
        setSelectedUser(user);
        // యూజర్‌ని క్లిక్ చేయగానే బ్లింకింగ్ డాట్ ఆటోమేటిక్‌గా ఆగిపోతుంది
        setUnreadMap(prev => ({ ...prev, [user.mobile]: false }));
        
        const historyUrl = (user.role === 'partner' || user.role === 'shop')
            ? `${API_BASE_URL}/api/admin-chat/history/${user.mobile}`
            : `${API_BASE_URL}/api/chat/history/${user.mobile}`;

        axios.get(historyUrl)
            .then(res => {
                const data = res.data || [];
                setMessages(data);
                setMessagesMap(prev => ({ ...prev, [user.mobile]: data }));
            })
            .catch(err => console.error("Error loading history", err));
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setSelectedFile({ name: file.name, url: reader.result, type: file.type });
            };
            reader.readAsDataURL(file);
        }
    };

    const sendAdminMessage = (e) => {
        e.preventDefault();
        if ((!inputMessage.trim() && !selectedFile) || !selectedUser) return;

        let messageContent = inputMessage;
        if (selectedFile) {
            messageContent = `<div class="space-y-2"><p>${inputMessage}</p>${selectedFile.type.includes('image') ? `<img src="${selectedFile.url}" class="rounded-xl max-h-40 object-cover" />` : `<a href="${selectedFile.url}" download="${selectedFile.name}" class="text-xs underline text-amber-300">📎 ${selectedFile.name}</a>`}</div>`;
        }

        const timestamp = new Date().toISOString();

        if (selectedUser.role === 'partner' || selectedUser.role === 'shop') {
            const partnerPayload = {
                partnerMobile: selectedUser.mobile,
                partnerName: selectedUser.name,
                senderType: "admin",
                senderName: "Super Admin",
                message: messageContent,
                timestamp: timestamp
            };

            if (stompClientRef.current && stompClientRef.current.connected) {
                stompClientRef.current.publish({
                    destination: `/app/admin-partner/send`,
                    body: JSON.stringify(partnerPayload)
                });
                setInputMessage('');
                setSelectedFile(null);
            }
        } else {
            const adminPayload = {
                senderMobile: selectedUser.mobile,
                senderName: "Super Admin",
                message: messageContent,
                senderType: "admin",
                timestamp: timestamp
            };

            if (stompClientRef.current && stompClientRef.current.connected) {
                stompClientRef.current.publish({
                    destination: `/app/send/${selectedUser.mobile}`,
                    body: JSON.stringify(adminPayload)
                });
                setInputMessage('');
                setSelectedFile(null);
            }
        }
    };

    const filteredConversations = conversations.filter(c => {
        if (activeTab === 'customer') return c.role === 'customer';
        if (activeTab === 'partner') return c.role === 'partner';
        if (activeTab === 'shop') return c.role === 'shop';
        return true;
    });

    const renderGroupedChatMessages = (messagesList) => {
        const todayStr = new Date().toLocaleDateString();
        
        const grouped = messagesList.reduce((acc, msg) => {
            const msgDate = msg.timestamp ? new Date(msg.timestamp).toLocaleDateString() : todayStr;
            const dateKey = msgDate === todayStr ? 'Today' : msgDate;
            if (!acc[dateKey]) acc[dateKey] = [];
            acc[dateKey].push(msg);
            return acc;
        }, {});

        return Object.entries(grouped).map(([dateLabel, msgs], idx) => (
            <div key={idx} className="space-y-3">
                <div className="flex justify-center my-3">
                    <span className="bg-slate-800 text-slate-300 text-[10px] font-bold px-3 py-1 rounded-full shadow-inner border border-slate-700 uppercase tracking-wider">
                        {dateLabel}
                    </span>
                </div>

                {msgs.map((msg, mIdx) => {
                    const isAdmin = msg.senderType === 'admin';
                    return (
                        <div key={mIdx} className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'} space-y-0.5`}>
                            <div className={`max-w-[75%] p-3.5 rounded-2xl shadow-md text-xs relative ${
                                isAdmin 
                                    ? 'bg-[#005c4b] text-white rounded-br-none font-bold' 
                                    : 'bg-[#202c33] text-white rounded-bl-none border border-slate-700/50'
                            }`}>
                                <span className={`block text-[9px] uppercase font-black mb-1 ${isAdmin ? 'text-emerald-300' : 'text-[#fc8019]'}`}>
                                    {msg.senderName || (isAdmin ? 'Super Admin' : selectedUser?.name)}
                                </span>
                                <div className="text-xs font-medium leading-relaxed" dangerouslySetInnerHTML={{ __html: msg.message }} />
                                <span className="block text-[8px] text-slate-400 text-right mt-1">
                                    {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        ));
    };

    return (
        <div className="p-4 bg-slate-950 min-h-screen text-white font-sans">
            <div className="mb-4">
                <h1 className="text-xl font-black text-white">Live Support Chats</h1>
                <p className="text-xs text-slate-400">Select any user category to view their chats and reply directly in real-time.</p>
                
                <div className="flex gap-2 mt-3">
                    <button 
                        onClick={() => { setActiveTab('customer'); setSelectedUser(null); }} 
                        className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-2 ${activeTab === 'customer' ? 'bg-[#fc8019] text-slate-950 shadow-lg' : 'bg-slate-900 text-slate-300 border border-slate-800'}`}
                    >
                        <User size={14} /> Customers ({conversations.filter(c => c.role === 'customer').length})
                    </button>
                    <button 
                        onClick={() => { setActiveTab('partner'); setSelectedUser(null); }} 
                        className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-2 ${activeTab === 'partner' ? 'bg-[#fc8019] text-slate-950 shadow-lg' : 'bg-slate-900 text-slate-300 border border-slate-800'}`}
                    >
                        <Bike size={14} /> Delivery Partners ({conversations.filter(c => c.role === 'partner').length})
                    </button>
                    <button 
                        onClick={() => { setActiveTab('shop'); setSelectedUser(null); }} 
                        className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-2 ${activeTab === 'shop' ? 'bg-[#fc8019] text-slate-950 shadow-lg' : 'bg-slate-900 text-slate-300 border border-slate-800'}`}
                    >
                        <Store size={14} /> Shop Owners ({conversations.filter(c => c.role === 'shop').length})
                    </button>
                </div>
            </div>

            <div className="flex h-[640px] bg-[#0b141a] border border-slate-800 rounded-[32px] overflow-hidden shadow-2xl">
                
                <div className="w-1/3 bg-[#111b21] border-r border-slate-800 flex flex-col">
                    <div className="p-4 bg-[#202c33] border-b border-slate-800 flex items-center justify-between">
                        <span className="text-xs font-black text-white uppercase tracking-wider">Select {activeTab} to chat</span>
                        <span className="text-[10px] bg-slate-800 px-2.5 py-0.5 rounded-full text-amber-400 font-bold">{filteredConversations.length} Active</span>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto divide-y divide-slate-800/40">
                        {filteredConversations.length === 0 ? (
                            <div className="text-center py-20 text-slate-500 text-xs px-4">
                                <p>No active chats found in this category.</p>
                            </div>
                        ) : (
                            filteredConversations.map((user, idx) => {
                                const userMessages = messagesMap[user.mobile] || [];
                                const lastMsg = userMessages[userMessages.length - 1];
                                const hasUnread = unreadMap[user.mobile];

                                return (
                                    <div 
                                        key={idx} 
                                        onClick={() => selectUserForChat(user)}
                                        className={`p-4 cursor-pointer transition flex items-center justify-between ${selectedUser?.mobile === user.mobile ? 'bg-[#2a3942] border-l-4 border-[#00a884]' : 'hover:bg-[#202c33]/50'}`}
                                    >
                                        <div className="flex items-center gap-3 min-w-0 flex-1">
                                            {/* 🟢 Blinking Dot */}
                                            <div className="w-10 h-10 rounded-2xl bg-[#00a884]/20 text-[#00a884] flex items-center justify-center font-black relative shrink-0">
                                                {user.role === 'partner' ? <Bike size={18} /> : user.role === 'shop' ? <Store size={18} /> : <User size={18} />}
                                                
                                                {hasUnread && (
                                                    <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-[#111b21] rounded-full animate-ping"></span>
                                                )}
                                                {hasUnread && (
                                                    <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-[#111b21] rounded-full"></span>
                                                )}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <h4 className="text-xs font-black text-white truncate">{user.name}</h4>
                                                <p className="text-[10px] text-slate-400 font-bold">+91 {user.mobile}</p>
                                            </div>
                                        </div>

                                        {/* ⏱️ Last Message Time */}
                                        <div className="text-right shrink-0 pl-2">
                                            <span className="text-[10px] text-slate-400 font-bold">
                                                {lastMsg && lastMsg.timestamp 
                                                    ? new Date(lastMsg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
                                                    : ''}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                <div className="flex-1 flex flex-col bg-[#0b141a]">
                    {selectedUser ? (
                        <>
                            <div className="p-4 bg-[#202c33] border-b border-slate-800 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-full bg-[#00a884] text-white flex items-center justify-center font-black">
                                        <ShieldCheck size={18} />
                                    </div>
                                    <div>
                                        <h3 className="text-xs font-black text-white">{selectedUser.name}</h3>
                                        <p className="text-[10px] text-slate-400">Mobile: +91 {selectedUser.mobile} • Role: <span className="uppercase text-amber-400">{selectedUser.role}</span></p>
                                    </div>
                                </div>
                                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full font-bold">● Connected</span>
                            </div>

                            <div className="flex-1 p-5 overflow-y-auto space-y-3 bg-[radial-gradient(#111b21_1px,transparent_1px)] [background-size:16px_16px]">
                                {messages.length === 0 ? (
                                    <div className="text-center py-20 text-slate-500 space-y-1">
                                        <p className="text-xs font-bold">No messages in this conversation yet.</p>
                                        <p className="text-[10px]">Send a reply below to start chatting.</p>
                                    </div>
                                ) : (
                                    renderGroupedChatMessages(messages)
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {selectedFile && (
                                <div className="px-4 py-2 bg-[#202c33] border-t border-slate-800 flex items-center justify-between text-xs">
                                    <span className="text-amber-400 truncate max-w-[300px]">📎 {selectedFile.name}</span>
                                    <button onClick={() => setSelectedFile(null)} className="text-rose-400 font-bold cursor-pointer">Remove</button>
                                </div>
                            )}

                            <form onSubmit={sendAdminMessage} className="p-3 bg-[#202c33] border-t border-slate-800 flex items-center gap-3">
                                <label className="text-slate-400 hover:text-white cursor-pointer p-2.5 rounded-xl bg-[#2a3942] border border-slate-700/50">
                                    <Paperclip size={18} />
                                    <input type="file" onChange={handleFileUpload} className="hidden" accept="image/*,.pdf,.doc,.docx" />
                                </label>

                                <input
                                    type="text"
                                    value={inputMessage}
                                    onChange={(e) => setInputMessage(e.target.value)}
                                    placeholder="Type a message as admin..."
                                    className="flex-1 bg-[#2a3942] border border-slate-700/50 px-4 py-3 rounded-xl text-xs font-bold text-white outline-none focus:border-[#00a884] transition"
                                />
                                <button 
                                    type="submit" 
                                    className="bg-[#00a884] hover:bg-[#008f72] text-white px-6 py-3 rounded-xl font-black text-xs shadow-lg cursor-pointer flex items-center gap-2 transition"
                                >
                                    <Send size={14} /> Send
                                </button>
                            </form>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center flex-1 text-slate-500 space-y-2">
                            <MessageSquare size={36} className="text-slate-700 animate-bounce" />
                            <p className="text-xs font-bold">Select a user from the left list to start live chat.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminChatDashboard;