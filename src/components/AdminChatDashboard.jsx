import React, { useState, useEffect, useRef } from 'react';
import SockJS from 'sockjs-client';
import { Stomp } from '@stomp/stompjs';
import axios from 'axios';
import { Send, User, MessageSquare, ShieldCheck, Paperclip, X } from 'lucide-react';

const AdminChatDashboard = () => {
    const [conversations, setConversations] = useState([]);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const stompClientRef = useRef(null);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        fetchConversations();
        
        const socket = new SockJS('[https://Foodiee-backend-env.eba-5d9p6wzb.eu-north-1.elasticbeanstalk.com](https://Foodiee-backend-env.eba-5d9p6wzb.eu-north-1.elasticbeanstalk.com)/ws-foodiee');
        const stompClient = Stomp.over(socket);
        stompClient.debug = () => {}; 
        stompClientRef.current = stompClient;

        stompClient.connect({}, () => {});

        return () => {
            if (stompClientRef.current) stompClientRef.current.disconnect();
        };
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const fetchConversations = async () => {
        try {
            const res = await axios.get('[https://Foodiee-backend-env.eba-5d9p6wzb.eu-north-1.elasticbeanstalk.com](https://Foodiee-backend-env.eba-5d9p6wzb.eu-north-1.elasticbeanstalk.com)/api/chat/admin/conversations');
            const uniqueCustomers = Array.from(new Set(res.data.map(m => m.senderMobile)))
                .map(mobile => {
                    const msg = res.data.find(m => m.senderMobile === mobile);
                    return { mobile, name: msg?.senderName || 'Customer' };
                });
            setConversations(uniqueCustomers);
        } catch (err) {
            console.error("Error fetching conversations", err);
        }
    };

    const selectCustomerForChat = (customer) => {
        setSelectedCustomer(customer);
        
        axios.get(`[https://Foodiee-backend-env.eba-5d9p6wzb.eu-north-1.elasticbeanstalk.com](https://Foodiee-backend-env.eba-5d9p6wzb.eu-north-1.elasticbeanstalk.com)/api/chat/history/${customer.mobile}`)
            .then(res => setMessages(res.data))
            .catch(err => console.error("Error loading history", err));

        if (stompClientRef.current && stompClientRef.current.connected) {
            stompClientRef.current.subscribe(`/topic/chat/${customer.mobile}`, (messageOutput) => {
                const receivedMessage = JSON.parse(messageOutput.body);
                setMessages(prev => [...prev, receivedMessage]);
            });
        }
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
        if (!inputMessage.trim() && !selectedFile) return;

        let messageContent = inputMessage;
        if (selectedFile) {
            messageContent = `<div class="space-y-2"><p>${inputMessage}</p>${selectedFile.type.includes('image') ? `<img src="${selectedFile.url}" class="rounded-xl max-h-40 object-cover" />` : `<a href="${selectedFile.url}" download="${selectedFile.name}" class="text-xs underline text-amber-300">📎 ${selectedFile.name}</a>`}</div>`;
        }

        const adminPayload = {
            senderMobile: selectedCustomer.mobile,
            senderName: "Super Admin",
            message: messageContent,
            senderType: "admin"
        };

        if (stompClientRef.current && stompClientRef.current.connected) {
            stompClientRef.current.send(`/app/send/${selectedCustomer.mobile}`, {}, JSON.stringify(adminPayload));
            setInputMessage('');
            setSelectedFile(null);
        }
    };

    return (
        <div className="flex h-[680px] bg-slate-900 border border-slate-800 rounded-[32px] overflow-hidden shadow-2xl">
            {/* Left Sidebar: Customers List */}
            <div className="w-1/3 bg-slate-950 border-r border-slate-800 flex flex-col">
                <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center gap-2">
                    <MessageSquare size={18} className="text-[#fc8019]" />
                    <span className="text-xs font-black text-white uppercase tracking-wider">Support Chats ({conversations.length})</span>
                </div>
                <div className="flex-1 overflow-y-auto divide-y divide-slate-900">
                    {conversations.length === 0 ? (
                        <p className="text-xs text-slate-500 text-center py-10">No active chats found.</p>
                    ) : (
                        conversations.map((cust, idx) => (
                            <div 
                                key={idx} 
                                onClick={() => selectCustomerForChat(cust)}
                                className={`p-4 cursor-pointer transition flex items-center gap-3 ${selectedCustomer?.mobile === cust.mobile ? 'bg-slate-900 border-l-4 border-[#fc8019]' : 'hover:bg-slate-900/50'}`}
                            >
                                <div className="w-10 h-10 rounded-2xl bg-[#fc8019]/20 text-[#fc8019] flex items-center justify-center font-black">
                                    <User size={18} />
                                </div>
                                <div>
                                    <h4 className="text-xs font-black text-white">{cust.name}</h4>
                                    <p className="text-[10px] text-[#fc8019] font-bold">+91 {cust.mobile}</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Right Side: Active Chat Window */}
            <div className="flex-1 flex flex-col bg-slate-900">
                {selectedCustomer ? (
                    <>
                        {/* Chat Header */}
                        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-xl bg-emerald-500/25 text-emerald-400 flex items-center justify-center font-black">
                                    <ShieldCheck size={16} />
                                </div>
                                <div>
                                    <h3 className="text-xs font-black text-white">{selectedCustomer.name}</h3>
                                    <p className="text-[10px] text-slate-400">Mobile: +91 {selectedCustomer.mobile}</p>
                                </div>
                            </div>
                            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full font-bold">● Live Connection</span>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 p-5 overflow-y-auto space-y-3 bg-slate-950/70">
                            {messages.map((msg, index) => {
                                const isAdmin = msg.senderType === 'admin';
                                return (
                                    <div key={index} className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}>
                                        <div className={`max-w-[70%] p-3.5 rounded-2xl shadow-md text-xs ${
                                            isAdmin 
                                                ? 'bg-[#fc8019] text-slate-950 rounded-br-none font-bold' 
                                                : 'bg-slate-800 text-white rounded-bl-none border border-slate-700'
                                        }`}>
                                            <span className={`block text-[9px] uppercase font-black mb-1 ${isAdmin ? 'text-slate-900' : 'text-[#fc8019]'}`}>
                                                {msg.senderName || (isAdmin ? 'Super Admin' : 'Customer')}
                                            </span>
                                            <div className="text-sm font-medium leading-relaxed" dangerouslySetInnerHTML={{ __html: msg.message }} />
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Selected File Preview */}
                        {selectedFile && (
                            <div className="px-4 py-2 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs">
                                <span className="text-amber-400 truncate max-w-[300px]">📎 {selectedFile.name}</span>
                                <button onClick={() => setSelectedFile(null)} className="text-rose-400 font-bold cursor-pointer">Remove</button>
                            </div>
                        )}

                        {/* Input Footer */}
                        <form onSubmit={sendAdminMessage} className="p-4 bg-slate-950 border-t border-slate-800 flex items-center gap-3">
                            <label className="text-slate-400 hover:text-white cursor-pointer p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                                <Paperclip size={18} />
                                <input type="file" onChange={handleFileUpload} className="hidden" accept="image/*,.pdf,.doc,.docx" />
                            </label>

                            <input
                                type="text"
                                value={inputMessage}
                                onChange={(e) => setInputMessage(e.target.value)}
                                placeholder="Type reply as admin..."
                                className="flex-1 bg-slate-900 border border-slate-800 px-4 py-3 rounded-xl text-xs font-bold text-white outline-none focus:border-[#fc8019] transition"
                            />
                            <button 
                                type="submit" 
                                className="bg-[#fc8019] hover:bg-amber-400 text-slate-950 px-6 py-3 rounded-xl font-black text-xs shadow-lg cursor-pointer flex items-center gap-2 transition"
                            >
                                <Send size={14} /> Send
                            </button>
                        </form>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center flex-1 text-slate-500 space-y-2">
                        <MessageSquare size={36} className="text-slate-700 animate-bounce" />
                        <p className="text-xs font-bold">Select a customer from the left list to start live chat.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminChatDashboard;