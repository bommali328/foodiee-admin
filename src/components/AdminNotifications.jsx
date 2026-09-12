import React, { useState } from 'react';
import { Send, Image as ImageIcon, Bell, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

// ✅ BASE URL UPDATE (AWS)
const API_BASE_URL = "http://Foodiee-backend-env.eba-5d9p6wzb.eu-north-1.elasticbeanstalk.com";

export default function AdminBroadcast() {
  const [targetAudience, setTargetAudience] = useState('All Users');
  const [message, setMessage] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // ఇమేజ్ అప్‌లోడ్ హ్యాండ్లర్ (Base64 లేదా URL)
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageUrl(reader.result);
        toast.success('📷 Image attached successfully!');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBroadcast = async (e) => {
    e.preventDefault();
    if (!message.trim()) {
      toast.error('❌ Please enter a message body');
      return;
    }

    const payload = {
      targetAudience,
      message,
      imageUrl,
      timestamp: 'Just now',
      unread: true
    };

    try {
      toast.loading('Broadcasting notification...');
      const response = await fetch(`${API_BASE_URL}/api/notifications/broadcast`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      toast.dismiss();

      if (response.ok) {
        toast.success(`🎉 Notification successfully sent to ${targetAudience}!`);
        setMessage('');
        setImageUrl('');
      } else {
        toast.error('❌ Failed to broadcast notification.');
      }
    } catch (error) {
      toast.dismiss();
      toast.error('❌ Server connection error.');
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 w-full max-w-xl mx-auto rounded-[32px] p-6 text-white shadow-2xl space-y-6">
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <Bell className="text-amber-400" size={22} />
        <h2 className="text-base font-black tracking-wide">Broadcast Push Notifications</h2>
      </div>

      <form onSubmit={handleBroadcast} className="space-y-4">
        {/* TARGET AUDIENCE SELECTOR */}
        <div className="space-y-1.5">
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">Target Audience</label>
          <select 
            value={targetAudience} 
            onChange={(e) => setTargetAudience(e.target.value)} 
            className="w-full bg-slate-950 border border-slate-700 p-3.5 rounded-2xl text-xs font-bold text-white outline-none focus:border-amber-500 cursor-pointer"
          >
            <option value="All Users">All Users (Customers, Partners & Shops)</option>
            <option value="Customers">Customers Only</option>
            <option value="Delivery Partners">Delivery Partners Only</option>
            <option value="Shop Owners">Shop Owners Only</option>
          </select>
        </div>

        {/* MESSAGE BODY */}
        <div className="space-y-1.5">
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">Message Body</label>
          <textarea 
            rows="4" 
            value={message} 
            onChange={(e) => setMessage(e.target.value)} 
            placeholder="Type announcement message..." 
            className="w-full bg-slate-950 border border-slate-700 p-3.5 rounded-2xl text-xs font-bold text-white outline-none focus:border-amber-500 resize-none" 
            required 
          />
        </div>

        {/* IMAGE UPLOAD / ATTACHMENT */}
        <div className="space-y-1.5">
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">Attach Banner Image (Optional)</label>
          <div className="flex items-center gap-3">
            <label className="flex-1 bg-slate-950 border border-slate-700 hover:border-amber-500 p-3 rounded-2xl text-xs font-bold text-slate-300 flex items-center justify-center gap-2 cursor-pointer transition">
              <ImageIcon size={16} className="text-amber-400" />
              <span>{imageUrl ? 'Change Image' : 'Upload Image from Device'}</span>
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </label>
            {imageUrl && (
              <div className="w-12 h-12 rounded-xl overflow-hidden border border-amber-500 shrink-0">
                <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
              </div>
            )}
          </div>
        </div>

        {/* BROADCAST BUTTON */}
        <button 
          type="submit" 
          className="w-full bg-gradient-to-r from-[#fc8019] via-amber-500 to-yellow-400 hover:opacity-90 text-slate-950 py-4 rounded-2xl font-black text-xs shadow-xl shadow-orange-500/25 flex items-center justify-center gap-2 cursor-pointer transition"
        >
          <Send size={16} />
          <span>Broadcast Now</span>
        </button>
      </form>
    </div>
  );
}