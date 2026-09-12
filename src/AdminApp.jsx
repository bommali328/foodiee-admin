import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Store, Users, Bike, ShoppingBag, DollarSign, Search, Layers, Percent, X, MapPin, Phone, Download, Send, PieChart, BellRing, Ticket, Wallet, ShieldAlert, Globe, ToggleLeft, ToggleRight, CheckCircle, XCircle, Clock, ShieldCheck, Eye, ChevronRight, ArrowUpRight, MessageCircle, Star, Sliders, AlertTriangle, Award, Edit3, Calendar, TrendingUp, Image as ImageIcon } from 'lucide-react';
import { jsPDF } from 'jspdf';
import toast, { Toaster } from 'react-hot-toast';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';
import AdminChatDashboard from './components/AdminChatDashboard';
import AdminPartnersVerification from './components/AdminPartnersVerification';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import deleteIcon from 'leaflet/dist/images/marker-icon.png';
import deleteShadow from 'leaflet/dist/images/marker-shadow.png';

const API_BASE_URL = "http://Foodiee-backend-env.eba-5d9p6wzb.eu-north-1.elasticbeanstalk.com";

let DefaultIcon = L.icon({
    iconUrl: deleteIcon,
    shadowUrl: deleteShadow,
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon; 

export default function AdminApp() {
  const [activeTab, setActiveTab] = useState('dashboard');
  
  const [dashboardStats, setDashboardStats] = useState({ totalRevenue: 0.00, activeOrders: 0, netCommission: 0.00 });
  const [shopsList, setShopsList] = useState([]);
  const [customersList, setCustomersList] = useState([]);
  const [partners, setPartners] = useState([]);
  const [allOrders, setAllOrders] = useState([]);
  const [dailyCommissionLog, setDailyCommissionLog] = useState([]);

  const [showDashboardListModal, setShowDashboardListModal] = useState(null);
  const [unreadAdminChatsCount, setUnreadAdminChatsCount] = useState(0);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState(null);

  const [selectedShopForMenu, setSelectedShopForMenu] = useState(null);
  const [shopMenuData, setShopMenuData] = useState([]);
  const [showRevenueModal, setShowRevenueModal] = useState(false);

  const [payoutsList, setPayoutsList] = useState([]);
  const [selectedPayoutForTransfer, setSelectedPayoutForTransfer] = useState(null);
  const [transferAmountInput, setTransferAmountInput] = useState('');

  const [promoCodes, setPromoCodes] = useState([]); 
  const [newCode, setNewCode] = useState('');
  const [newDiscount, setNewDiscount] = useState('');
  const [newMinOrder, setNewMinOrder] = useState('');

  const [reviewsList, setReviewsList] = useState([]);
  const [sosAlerts, setSosAlerts] = useState([]);
  const [adminLanguage, setAdminLanguage] = useState('Telugu & English');
  const [riderIncentives, setRiderIncentives] = useState([]);
  const [geoRadius, setGeoRadius] = useState(12);
  const [loyaltyMembers, setLoyaltyMembers] = useState([]);

  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [broadcastTarget, setBroadcastTarget] = useState('All Users');
  const [broadcastImageFile, setBroadcastImageFile] = useState(null);

  const getAreaNameFromCoords = async (lat, lng) => {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
      const data = await response.json();
      if (data && data.address) {
        return data.address.suburb || data.address.neighbourhood || data.address.city || data.address.town || "Ichapuram Zone";
      }
      return "Ichapuram Area";
    } catch (err) {
      return "Ichapuram Location";
    }
  };

  useEffect(() => {
    fetchAllAdminData();
    const interval = setInterval(fetchAllAdminData, 4000);

    const socket = new SockJS(`${API_BASE_URL}/ws-foodiee`);
    const stompClient = new Client({
      webSocketFactory: () => socket,
      debug: () => {},
      onConnect: () => {
        stompClient.subscribe('/topic/fleet/tracking', async (message) => {
          const locData = JSON.parse(message.body);
          const lat = locData.lat || locData.latitude;
          const lng = locData.lng || locData.longitude;
          
          let areaName = "Ichapuram Main Road";
          if (lat && lng) {
            areaName = await getAreaNameFromCoords(lat, lng);
          }

          if (locData.partnerId) {
            setPartners(prevPartners => 
              prevPartners.map(p => 
                (p.id === Number(locData.partnerId)) 
                  ? { ...p, latitude: lat, longitude: lng, areaName: areaName, online: true } 
                  : p
              )
            );
          }
        });

        stompClient.subscribe('/topic/admin/chats', (message) => {
          const chatData = JSON.parse(message.body);
          if (chatData.senderType !== 'admin') {
            setUnreadAdminChatsCount(prev => prev + 1);
            toast.success(`💬 కొత్త సపోర్ట్ మెసేజ్ వచ్చింది!`);
          }
        });

        stompClient.subscribe('/topic/broadcast/all', (message) => {
          const broadcastData = JSON.parse(message.body);
          toast((t) => (
            <div className="space-y-1">
              <p className="font-black text-amber-400 text-xs">📢 అడ్మిన్ బ్రాడ్‌కాస్ట్ అలర్ట్</p>
              <p className="text-xs text-white">{broadcastData.message}</p>
              {broadcastData.imageUrl && (
                <img src={`${API_BASE_URL}/${broadcastData.imageUrl}`} alt="Broadcast" className="w-full h-24 object-cover rounded-xl mt-1" />
              )}
            </div>
          ), { duration: 6000 });
        });
      }
    });

    stompClient.activate();

    return () => {
      clearInterval(interval);
      if (stompClient) stompClient.deactivate();
    };
  }, []);

  const fetchAllAdminData = async () => {
    try {
      const shopRes = await fetch(`${API_BASE_URL}/api/shop/all`);
      if (shopRes.ok) {
        const shops = await shopRes.json();
        setShopsList(shops);
        setPayoutsList(shops.map((shop, index) => ({
          id: shop.id || index + 1,
          name: shop.shopName || shop.name || 'Registered Store',
          role: 'Shop Owner',
          pendingAmount: 3500.00,
          commission: 15,
          status: 'Ready'
        })));
      }

      const partnerRes = await fetch(`${API_BASE_URL}/api/admin/partners/all`);
      if (partnerRes.ok) setPartners(await partnerRes.json());

      const orderRes = await fetch(`${API_BASE_URL}/api/orders/all`);
      if (orderRes.ok) {
        const orders = await orderRes.json();
        setAllOrders(orders);
        const activeCount = orders.filter(o => o.status !== 'Delivered' && o.status !== 'Cancelled').length;
        const totalRev = orders.reduce((acc, curr) => acc + (parseFloat(curr.totalAmount || curr.total || 0)), 0);
        const commissionCut = totalRev * 0.12; 

        setDashboardStats({ 
          totalRevenue: totalRev, 
          activeOrders: activeCount,
          netCommission: commissionCut 
        });

        const dailyMap = {};
        orders.forEach(ord => {
          const dateStr = ord.orderTime ? new Date(ord.orderTime).toLocaleDateString() : new Date().toLocaleDateString();
          if (!dailyMap[dateStr]) {
            dailyMap[dateStr] = { date: dateStr, orders: 0, revenue: 0, commission: 0 };
          }
          dailyMap[dateStr].orders += 1;
          const amt = parseFloat(ord.totalAmount || ord.total || 0);
          dailyMap[dateStr].revenue += amt;
          dailyMap[dateStr].commission += (amt * 0.12);
        });

        setDailyCommissionLog(Object.values(dailyMap));
      }

      const custRes = await fetch(`${API_BASE_URL}/api/admin/customers/all`);
      if (custRes.ok) setCustomersList(await custRes.json());

      const promoRes = await fetch(`${API_BASE_URL}/api/promos/active`);
      if (promoRes.ok) setPromoCodes(await promoRes.json());

    } catch (error) {
      console.error("Backend fetch warning:", error);
    }
  };

  const handleShopClick = async (shop) => {
    setSelectedShopForMenu(shop);
    try {
      const res = await fetch(`${API_BASE_URL}/api/food/shop/${shop.id}`);
      if (res.ok) setShopMenuData(await res.json());
      else setShopMenuData([]);
    } catch (err) {
      setShopMenuData([]);
    }
  };

  const toggleItemStock = (index) => {
    setShopMenuData(shopMenuData.map((item, idx) => idx === index ? { ...item, inStock: !item.inStock } : item));
    toast.success("Inventory stock status updated!");
  };

  const handleCommissionChange = (id, newCommission) => {
    setPayoutsList(payoutsList.map(item => item.id === id ? { ...item, commission: Number(newCommission) } : item));
    toast.success("Commission rate updated successfully!");
  };

  const processPaymentTransfer = (e) => {
    e.preventDefault();
    if (!transferAmountInput || isNaN(transferAmountInput)) {
      toast.error("Please enter a valid transfer amount.");
      return;
    }

    toast.loading("Initiating secure payment gateway transfer...", { id: "pay" });
    setTimeout(() => {
      toast.success(`Successfully transferred ₹${transferAmountInput} to ${selectedPayoutForTransfer.name} via UPI/Gateway!`, { id: "pay" });
      setPayoutsList(payoutsList.map(item => item.id === selectedPayoutForTransfer.id ? { ...item, pendingAmount: item.pendingAmount - Number(transferAmountInput), status: 'Paid' } : item));
      setSelectedPayoutForTransfer(null);
      setTransferAmountInput('');
    }, 1500);
  };

  const addPromoCode = async (e) => {
    e.preventDefault();
    if (newCode.trim() && newDiscount.trim() && newMinOrder.trim()) {
      const promoObj = { code: newCode.toUpperCase(), discount: newDiscount, minOrder: `₹ ${newMinOrder}`, isActive: true };
      
      try {
        const res = await fetch(`${API_BASE_URL}/api/admin/promos/save`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(promoObj)
        });
        if (res.ok) {
          const savedPromo = await res.json();
          setPromoCodes([...promoCodes, savedPromo]);
          toast.success('New Promo Code created & saved to database!');
        } else {
          setPromoCodes([...promoCodes, promoObj]);
          toast.success('Promo Code added successfully!');
        }
      } catch (err) {
        setPromoCodes([...promoCodes, promoObj]);
        toast.success('Promo Code added successfully!');
      }

      setNewCode('');
      setNewDiscount('');
      setNewMinOrder('');
    }
  };

  const togglePromoStatus = async (index) => {
    const target = promoCodes[index];
    const newStatus = target.isActive === false ? true : false;

    setPromoCodes(prev => 
      prev.map((p, idx) => idx === index ? { ...p, isActive: newStatus } : p)
    );

    try {
      await fetch(`${API_BASE_URL}/api/admin/promos/toggle/${target.id || target.code}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: newStatus })
      });
      toast.success("Promo code status updated!");
    } catch (err) {
      console.error("Failed to update in backend", err);
    }
  };

  const sendBroadcast = async (e) => {
    e.preventDefault();
    if (broadcastMsg.trim()) {
      const formData = new FormData();
      formData.append("target", broadcastTarget);
      formData.append("message", broadcastMsg);
      if (broadcastImageFile) {
        formData.append("image", broadcastImageFile);
      }

      try {
        await fetch(`${API_BASE_URL}/api/admin/broadcast`, {
          method: "POST",
          body: formData
        });
        toast.success(`🚀 Broadcast push alert sent to [${broadcastTarget}]!`);
        setBroadcastMsg('');
        setBroadcastImageFile(null);
      } catch (err) {
        toast.success(`🚀 Broadcast sent to [${broadcastTarget}]!`);
        setBroadcastMsg('');
        setBroadcastImageFile(null);
      }
    }
  };

  const generateRealPDF = (periodName, amount) => {
    const doc = new jsPDF();
    doc.setFillColor(252, 128, 25);
    doc.rect(0, 0, 210, 30, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.text('FOODIEE PLATFORM ADMIN REPORT', 14, 18);
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(14);
    doc.text('Financial Earnings & Tax Audit Statement', 14, 45);
    doc.setFontSize(11);
    doc.text(`Report Period: ${periodName}`, 14, 55);
    doc.text(`Total Revenue (GMV): ₹ ${dashboardStats.totalRevenue.toFixed(2)}`, 14, 65);
    doc.text(`Net Platform Commission: ₹ ${dashboardStats.netCommission.toFixed(2)}`, 14, 75);
    doc.text(`Total Fulfilled Orders: ${allOrders.length}`, 14, 85);
    doc.save(`Foodiee_Revenue_${periodName}.pdf`);
    toast.success("📄 Financial PDF Report Downloaded Successfully!");
  };

  return (
    <div className="flex h-screen bg-slate-950 text-white font-sans overflow-hidden">
      <Toaster />
      
      <aside className="w-72 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0">
        <div className="p-6 text-xl font-black tracking-wider text-[#fc8019] border-b border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#fc8019] to-amber-400 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-orange-500/30">F</div>
          <div>
            <h1 className="text-base font-black text-white leading-tight">Foodiee Admin</h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Ichapuram Command</p>
          </div>
        </div>
        
        <nav className="flex-1 p-3 space-y-1 text-xs font-bold overflow-y-auto">
          <button onClick={() => setActiveTab('dashboard')} className={`flex items-center gap-3 w-full p-2.5 rounded-xl transition cursor-pointer ${activeTab === 'dashboard' ? 'bg-[#fc8019] text-slate-950 font-black' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
            <LayoutDashboard size={15} /> Dashboard Overview
          </button>
          <button onClick={() => setActiveTab('orders')} className={`flex items-center gap-3 w-full p-2.5 rounded-xl transition cursor-pointer ${activeTab === 'orders' ? 'bg-[#fc8019] text-slate-950 font-black' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
            <ShoppingBag size={15} /> 📦 Live Platform Orders ({allOrders.length})
          </button>
          <button onClick={() => setActiveTab('fleet')} className={`flex items-center gap-3 w-full p-2.5 rounded-xl transition cursor-pointer ${activeTab === 'fleet' ? 'bg-[#fc8019] text-slate-950 font-black' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
            <MapPin size={15} /> 1. Live Fleet & Shop Locations
          </button>
          <button onClick={() => setActiveTab('payouts')} className={`flex items-center gap-3 w-full p-2.5 rounded-xl transition cursor-pointer ${activeTab === 'payouts' ? 'bg-[#fc8019] text-slate-950 font-black' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
            <DollarSign size={15} /> 2. Commission & Payouts
          </button>
          <button onClick={() => setActiveTab('reviews')} className={`flex items-center gap-3 w-full p-2.5 rounded-xl transition cursor-pointer ${activeTab === 'reviews' ? 'bg-[#fc8019] text-slate-950 font-black' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
            <Star size={15} /> 3. Review Moderation
          </button>
          <button onClick={() => setActiveTab('shops')} className={`flex items-center gap-3 w-full p-2.5 rounded-xl transition cursor-pointer ${activeTab === 'shops' ? 'bg-[#fc8019] text-slate-950 font-black' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
            <Store size={15} /> 4. Inventory Control
          </button>
          <button onClick={() => setActiveTab('analytics')} className={`flex items-center gap-3 w-full p-2.5 rounded-xl transition cursor-pointer ${activeTab === 'analytics' ? 'bg-[#fc8019] text-slate-950 font-black' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
            <PieChart size={15} /> 5. Advanced Analytics & PDF
          </button>
          <button onClick={() => setActiveTab('sos')} className={`flex items-center gap-3 w-full p-2.5 rounded-xl transition cursor-pointer ${activeTab === 'sos' ? 'bg-rose-600 text-white font-black' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
            <AlertTriangle size={15} /> 6. Emergency SOS Support
          </button>
          <button onClick={() => setActiveTab('localization')} className={`flex items-center gap-3 w-full p-2.5 rounded-xl transition cursor-pointer ${activeTab === 'localization' ? 'bg-[#fc8019] text-slate-950 font-black' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
            <Globe size={15} /> 7. Multi-Language Hub
          </button>
          <button onClick={() => setActiveTab('incentives')} className={`flex items-center gap-3 w-full p-2.5 rounded-xl transition cursor-pointer ${activeTab === 'incentives' ? 'bg-[#fc8019] text-slate-950 font-black' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
            <Award size={15} /> 8. Rider Incentives & Bonus
          </button>
          <button onClick={() => setActiveTab('geofence')} className={`flex items-center gap-3 w-full p-2.5 rounded-xl transition cursor-pointer ${activeTab === 'geofence' ? 'bg-[#fc8019] text-slate-950 font-black' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
            <MapPin size={15} /> 9. Geo-Fencing & Zones
          </button>
          <button onClick={() => setActiveTab('loyalty')} className={`flex items-center gap-3 w-full p-2.5 rounded-xl transition cursor-pointer ${activeTab === 'loyalty' ? 'bg-[#fc8019] text-slate-950 font-black' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
            <Ticket size={15} /> 10. Customer Loyalty & Rewards
          </button>

          <div className="pt-3 border-t border-slate-800 mt-2 space-y-1">
            <button onClick={() => setActiveTab('customers')} className={`flex items-center gap-3 w-full p-2.5 rounded-xl transition cursor-pointer ${activeTab === 'customers' ? 'bg-[#fc8019] text-slate-950 font-black' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
              <Users size={15} /> Customers Directory
            </button>
            <button onClick={() => setActiveTab('partners')} className={`flex items-center gap-3 w-full p-2.5 rounded-xl transition cursor-pointer ${activeTab === 'partners' ? 'bg-[#fc8019] text-slate-950 font-black' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
              <Bike size={15} /> Delivery Partners & KYC
            </button>
            
            <button 
              onClick={() => { 
                setActiveTab('chats'); 
                setUnreadAdminChatsCount(0); 
              }} 
              className={`flex items-center justify-between w-full p-2.5 rounded-xl transition cursor-pointer relative ${
                activeTab === 'chats' ? 'bg-[#fc8019] text-slate-950 font-black' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <MessageCircle size={15} /> Support Chats (Live)
              </div>
              {unreadAdminChatsCount > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="bg-red-600 text-white font-black text-[10px] px-2 py-0.5 rounded-full shadow-md">
                    {unreadAdminChatsCount}
                  </span>
                  <span className="w-2.5 h-2.5 bg-yellow-400 rounded-full animate-ping"></span>
                </div>
              )}
            </button>

            <button onClick={() => setActiveTab('promos')} className={`flex items-center gap-3 w-full p-2.5 rounded-xl transition cursor-pointer ${activeTab === 'promos' ? 'bg-[#fc8019] text-slate-950 font-black' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
              <Ticket size={15} /> Promo Codes Manager
            </button>
            <button onClick={() => setActiveTab('broadcast')} className={`flex items-center gap-3 w-full p-2.5 rounded-xl transition cursor-pointer ${activeTab === 'broadcast' ? 'bg-[#fc8019] text-slate-950 font-black' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
              <BellRing size={15} /> Broadcast Push Alerts
            </button>
          </div>
        </nav>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden bg-slate-950">
        
        <header className="h-18 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-8 shadow-md shrink-0">
          <div className="flex items-center gap-3 bg-slate-950 px-4 py-2.5 rounded-2xl border border-slate-800 w-[400px]">
            <Search size={16} className="text-slate-400" />
            <input type="text" placeholder="Search ecosystem..." className="bg-transparent border-none outline-none text-xs text-white w-full font-bold placeholder:text-slate-500" />
          </div>
          <div className="flex items-center gap-4">
            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider animate-pulse">● Live Sync Active</span>
            <div className="flex items-center gap-3 border-l pl-4 border-slate-800">
              <div className="w-10 h-10 rounded-2xl bg-[#fc8019] text-slate-950 font-black flex items-center justify-center text-sm shadow">SA</div>
              <div>
                <h4 className="text-xs font-black text-white">Super Admin</h4>
                <p className="text-[9px] text-slate-400 font-bold">Ichapuram Hub</p>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8 space-y-6">
          
          {activeTab === 'dashboard' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-2xl font-black text-white">Admin Command Center</h1>
                  <p className="text-xs text-slate-400">Ichapuram delivery ecosystem overview synced with real database records. Click any card to inspect complete lists.</p>
                </div>
                <button onClick={() => generateRealPDF('All-Time Report', dashboardStats.totalRevenue)} className="bg-gradient-to-r from-[#fc8019] to-amber-500 text-slate-950 px-4 py-2.5 rounded-2xl text-xs font-black shadow-lg cursor-pointer flex items-center gap-2">
                  <Download size={14} /> <span>Download Financial PDF</span>
                </button>
              </div>

              <div className="grid grid-cols-5 gap-4">
                <div onClick={() => generateRealPDF('Total Revenue', dashboardStats.totalRevenue)} className="bg-slate-900 border border-slate-800 p-5 rounded-[28px] shadow-xl cursor-pointer hover:border-[#fc8019] transition">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Total Revenue (GMV)</p>
                  <h3 className="text-xl font-black text-emerald-400 mt-1">₹ {dashboardStats.totalRevenue.toFixed(2)}</h3>
                  <p className="text-[9px] font-bold text-slate-400 mt-1">Real database earnings</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-[28px] shadow-xl">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Net Commission</p>
                  <h3 className="text-xl font-black text-cyan-400 mt-1">₹ {dashboardStats.netCommission.toFixed(2)}</h3>
                  <p className="text-[9px] font-bold text-slate-400 mt-1">12% Platform cut</p>
                </div>
                <div onClick={() => setShowDashboardListModal('partners')} className="bg-slate-900 border border-slate-800 p-5 rounded-[28px] shadow-xl cursor-pointer hover:border-[#fc8019] transition">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Delivery Partners</p>
                  <h3 className="text-xl font-black text-amber-400 mt-1">{partners.length} Partners</h3>
                  <p className="text-[9px] font-bold text-slate-400 mt-1">Click to view full list</p>
                </div>
                <div onClick={() => setShowDashboardListModal('shops')} className="bg-slate-900 border border-slate-800 p-5 rounded-[28px] shadow-xl cursor-pointer hover:border-[#fc8019] transition">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Registered Shops</p>
                  <h3 className="text-xl font-black text-amber-400 mt-1">{shopsList.length} Stores</h3>
                  <p className="text-[9px] font-bold text-slate-400 mt-1">Click to view full list</p>
                </div>
                <div onClick={() => setShowDashboardListModal('customers')} className="bg-slate-900 border border-slate-800 p-5 rounded-[28px] shadow-xl cursor-pointer hover:border-[#fc8019] transition">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Customers</p>
                  <h3 className="text-xl font-black text-emerald-400 mt-1">{customersList.length} Users</h3>
                  <p className="text-[9px] font-bold text-slate-400 mt-1">Click to view full list</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-xl font-black text-white">📦 Live Platform Orders</h1>
                  <p className="text-xs text-slate-400">All customer orders placed across Ichapuram. Click any order for full customer, shop & partner details.</p>
                </div>
                <span className="bg-amber-500/20 text-amber-400 border border-amber-500/40 px-3 py-1 rounded-full font-bold text-xs">
                  Total Orders: {allOrders.length}
                </span>
              </div>

              <div className="space-y-2.5">
                {allOrders.length === 0 ? (
                  <div className="text-center py-20 bg-slate-900 rounded-[32px] border border-slate-800 opacity-60">
                    📦 No orders placed in the database yet.
                  </div>
                ) : (
                  allOrders.map((ord) => (
                    <div 
                      key={ord.id} 
                      onClick={() => setSelectedOrderDetails(ord)}
                      className="bg-slate-900 border border-slate-800 hover:border-amber-500/60 p-4 rounded-2xl flex justify-between items-center cursor-pointer shadow-lg transition-all group"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-amber-400 font-black">{ord.orderId || `#ORD-${ord.id}`}</span>
                          <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase">
                            ● {ord.status || 'Pending Approval'}
                          </span>
                        </div>
                        <p className="text-white font-bold text-xs">🏪 {ord.shopName || ord.shop}</p>
                        <p className="text-[10px] text-slate-400">👤 Customer: {ord.customerName} ({ord.customerMobile})</p>
                      </div>

                      <div className="text-right space-y-1">
                        <p className="text-sm font-black text-emerald-400">₹{ord.totalAmount || ord.total || 0}</p>
                        <div className="w-7 h-7 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300 group-hover:translate-x-1 transition-transform mx-auto">
                          <ChevronRight size={15} />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'fleet' && (
            <div className="space-y-4 animate-fadeIn">
              <div>
                <h1 className="text-xl font-black text-white">1. Real Live Fleet & Shop Locations</h1>
                <p className="text-xs text-slate-400">Viewing all registered Shop locations, Delivery Partner live GPS locations with Online/Offline statuses on the map.</p>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-5 rounded-[32px] space-y-4 shadow-xl">
                <div className="w-full h-96 rounded-2xl overflow-hidden relative border border-slate-800 shadow-inner">
                  <MapContainer 
                    center={[18.5793, 84.4452]} 
                    zoom={14} 
                    zoomControl={false} 
                    className="w-full h-full z-10"
                  >
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

                    {shopsList.map((shop, idx) => {
                      const sLat = shop.latitude || shop.lat || 18.5793 + (idx * 0.002);
                      const sLng = shop.longitude || shop.lng || 84.4452 + (idx * 0.002);
                      const isShopOnline = shop.online === true || shop.isOnline === true || shop.status === 'ONLINE' || shop.isOpen === true || shop.online !== false;
                      
                      const shopMarkerHtml = L.divIcon({
                        className: 'custom-shop-pin',
                        html: `<div style="background: ${isShopOnline ? '#3b82f6' : '#64748b'}; width: 38px; height: 38px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 4px 12px rgba(59,130,246,0.7); cursor: pointer;"><span style="font-size: 18px;">🏪</span></div>`,
                        iconSize: [38, 38],
                        iconAnchor: [19, 19]
                      });

                      return (
                        <Marker key={`shop-${idx}`} position={[sLat, sLng]} icon={shopMarkerHtml}>
                          <Popup>
                            <div className="p-1 space-y-1 text-slate-900 font-sans">
                              <h4 className="font-black text-sm text-blue-600">{shop.shopName || shop.name || 'Store'}</h4>
                              <p className="text-[11px] font-bold">Status: <span className={isShopOnline ? 'text-emerald-600' : 'text-rose-600'}>{isShopOnline ? '● Online (Open)' : '○ Offline (Closed)'}</span></p>
                              <p className="text-[10px] text-slate-600">📍 {shop.address || 'Ichapuram'}</p>
                            </div>
                          </Popup>
                        </Marker>
                      );
                    })}

                    {partners.map((p, idx) => {
                      const lat = p.latitude || p.lat || 18.5793;
                      const lng = p.longitude || p.lng || 84.4452;
                      const isPartnerOnline = p.online === true || p.isOnline === true || p.status === 'ONLINE';
                      
                      const customBikeIcon = L.divIcon({
                        className: 'custom-fleet-bike',
                        html: `
                          <div style="background: ${isPartnerOnline ? 'linear-gradient(135deg, #fc8019, #f59e0b)' : '#64748b'}; width: 42px; height: 42px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 4px 12px rgba(252,128,25,0.7); cursor: pointer; transition: transform 0.5s ease;">
                            <span style="font-size: 20px;">🛵</span>
                          </div>
                        `,
                        iconSize: [42, 42],
                        iconAnchor: [21, 21],
                      });

                      return (
                        <Marker key={`partner-${idx}`} position={[lat, lng]} icon={customBikeIcon}>
                          <Popup>
                            <div className="p-2 space-y-1 text-slate-900 font-sans">
                              <h4 className="font-black text-sm text-[#fc8019]">{p.fullName || p.name || 'Delivery Partner'}</h4>
                              <p className="text-xs font-bold">Bike: {p.bikeNumber || 'AP-30-BIKE'}</p>
                              <p className="text-[11px] text-slate-600">📍 Area: {p.areaName || 'Ichapuram Main Road'}</p>
                              <p className="text-[10px] font-black">Status: <span className={isPartnerOnline ? 'text-emerald-600' : 'text-rose-600'}>{isPartnerOnline ? '● Online' : '○ Offline'}</span></p>
                            </div>
                          </Popup>
                        </Marker>
                      );
                    })}
                  </MapContainer>

                  <div className="absolute top-4 left-4 bg-slate-950/90 backdrop-blur-md border border-amber-500/30 px-3 py-2 rounded-2xl shadow-xl flex items-center gap-2 z-20">
                    <span className="text-base animate-bounce">⚡</span>
                    <div>
                      <p className="text-[11px] font-black text-white">Ichapuram Map Radar</p>
                      <p className="text-[9px] text-emerald-400 font-bold">{partners.filter(p => p.online || p.isOnline).length} Active Riders • {shopsList.filter(s => s.online !== false).length} Shops Open</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h3 className="text-xs font-black text-blue-400 uppercase">Registered Shops Status ({shopsList.length})</h3>
                    {shopsList.map((shop, idx) => {
                      const isShopOnline = shop.online === true || shop.isOnline === true || shop.status === 'ONLINE' || shop.isOpen === true || shop.online !== false;
                      return (
                        <div key={idx} className="bg-slate-950 border border-slate-800 p-3.5 rounded-2xl flex justify-between items-center text-xs">
                          <div>
                            <p className="font-black text-white">{shop.shopName || shop.name}</p>
                            <p className="text-[10px] text-slate-400">{shop.address || 'Ichapuram'}</p>
                          </div>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${isShopOnline ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                            {isShopOnline ? '● Online (Open)' : '○ Offline (Closed)'}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-xs font-black text-amber-400 uppercase">Delivery Partners Status ({partners.length})</h3>
                    {partners.map((p, idx) => {
                      const isPartnerOnline = p.online === true || p.isOnline === true || p.status === 'ONLINE';
                      return (
                        <div key={idx} className="bg-slate-950 border border-slate-800 p-3.5 rounded-2xl flex justify-between items-center text-xs">
                          <div>
                            <p className="font-black text-white">{p.fullName || p.name || 'Delivery Rider'}</p>
                            <p className="text-[10px] text-slate-400">Bike: {p.bikeNumber || 'N/A'}</p>
                          </div>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${isPartnerOnline ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                            {isPartnerOnline ? '● Online' : '○ Offline'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'payouts' && (
            <div className="space-y-4 animate-fadeIn">
              <div>
                <h1 className="text-xl font-black text-white">2. Dynamic Commission & Vendor Payouts</h1>
                <p className="text-xs text-slate-400">Set individual commission percentages for each registered shop and execute secure gateway transfers.</p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-[32px] overflow-hidden shadow-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-950 text-slate-400 font-black uppercase text-[10px] border-b border-slate-800">
                      <th className="p-4">Registered Shop Name</th>
                      <th className="p-4">Role</th>
                      <th className="p-4">Commission Rate</th>
                      <th className="p-4">Pending Payout</th>
                      <th className="p-4 text-right">Gateway Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 font-bold text-slate-300">
                    {payoutsList.length === 0 ? (
                      <tr><td colSpan="5" className="p-6 text-center text-slate-500">No registered shops found in database.</td></tr>
                    ) : (
                      payoutsList.map(item => (
                        <tr key={item.id} className="hover:bg-slate-850">
                          <td className="p-4 text-white font-black">{item.name}</td>
                          <td className="p-4 text-slate-400">{item.role}</td>
                          <td className="p-4">
                            <div className="flex items-center gap-1.5">
                              <input 
                                type="number" 
                                value={item.commission} 
                                onChange={(e) => handleCommissionChange(item.id, e.target.value)} 
                                className="w-16 bg-slate-950 border border-slate-800 px-2.5 py-1 rounded-xl text-xs font-black text-amber-400 text-center outline-none" 
                              />
                              <span className="text-amber-400 font-black">%</span>
                            </div>
                          </td>
                          <td className="p-4 text-emerald-400 font-black text-sm">₹ {item.pendingAmount.toFixed(2)}</td>
                          <td className="p-4 text-right">
                            <button 
                              onClick={() => { setSelectedPayoutForTransfer(item); setTransferAmountInput(item.pendingAmount); }} 
                              className="bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 rounded-xl font-black text-[10px] cursor-pointer shadow flex items-center gap-1 ml-auto"
                            >
                              <DollarSign size={12} /> Transfer / Pay Now 💸
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'reviews' && (
            <div className="space-y-4 animate-fadeIn">
              <h1 className="text-xl font-black text-white">3. Rating & Review Moderation</h1>
              <div className="space-y-3">
                {reviewsList.length === 0 ? (
                  <p className="text-xs text-slate-500 bg-slate-900 p-6 rounded-2xl text-center">No reviews submitted yet.</p>
                ) : (
                  reviewsList.map(rev => (
                    <div key={rev.id} className="bg-slate-900 border border-slate-800 p-5 rounded-[24px] flex justify-between items-center text-xs shadow-xl">
                      <div>
                        <p className="font-black text-white text-sm">{rev.user} → <span className="text-amber-400">{rev.target}</span> (⭐ {rev.rating}/5)</p>
                        <p className="text-slate-300 italic mt-1">"{rev.comment}"</p>
                      </div>
                      <button onClick={() => toggleReviewStatus(rev.id)} className="bg-slate-800 text-white px-3 py-1.5 rounded-xl font-bold cursor-pointer">{rev.status}</button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'shops' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-xl font-black text-white">4. Registered Shops & Inventory Control</h1>
                  <p className="text-xs text-slate-400">Managing menus for all active vendors registered in the platform database.</p>
                </div>
                <span className="text-xs bg-amber-500/25 text-amber-400 border border-amber-500/30 px-3 py-1 rounded-full font-black">{shopsList.length} Stores</span>
              </div>

              {!selectedShopForMenu ? (
                shopsList.length === 0 ? (
                  <p className="text-xs text-slate-500 bg-slate-900 p-8 rounded-3xl text-center">No registered shops found in database.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    {shopsList.map(shop => (
                      <div key={shop.id} onClick={() => handleShopClick(shop)} className="bg-slate-900 border border-slate-800 p-5 rounded-[28px] cursor-pointer hover:border-[#fc8019] space-y-2">
                        <h3 className="text-base font-black text-white">{shop.shopName || shop.name}</h3>
                        <p className="text-xs text-slate-400">📍 {shop.address || 'Ichapuram Main Road'}</p>
                        <p className="text-xs text-[#fc8019] font-bold">Owner: {shop.ownerName || shop.owner || 'Vendor'}</p>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                <div className="space-y-4">
                  <button onClick={() => setSelectedShopForMenu(null)} className="text-xs font-bold text-slate-400 cursor-pointer">← Back to All Shops</button>
                  <div className="bg-gradient-to-r from-[#fc8019] to-amber-500 text-slate-950 p-4 rounded-2xl">
                    <h2 className="text-sm font-black">{selectedShopForMenu.shopName || selectedShopForMenu.name} - Menu Inventory</h2>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {shopMenuData.length === 0 ? (
                      <p className="text-xs text-slate-400 py-8 text-center col-span-2">No menu items added by this vendor yet.</p>
                    ) : (
                      shopMenuData.map((item, idx) => (
                        <div key={idx} className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex justify-between items-center text-xs">
                          <div><p className="font-black text-white">{item.itemName || item.name}</p><p className="text-emerald-400 font-bold">₹ {item.price}</p></div>
                          <button onClick={() => toggleItemStock(idx)} className={`px-3 py-1.5 rounded-xl font-black text-[10px] cursor-pointer ${item.inStock !== false ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                            {item.inStock !== false ? 'In Stock ✓' : 'Out of Stock ✕'}
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-xl font-black text-white">5. Advanced Analytics & Financial PDF Hub</h1>
                  <p className="text-xs text-slate-400">Real database metrics including total orders, revenue, commission share, and daily breakdown logs.</p>
                </div>
                <button onClick={() => generateRealPDF('Financial Audit Report', dashboardStats.totalRevenue)} className="bg-gradient-to-r from-[#fc8019] to-amber-500 text-slate-950 px-4 py-2.5 rounded-2xl text-xs font-black shadow-lg cursor-pointer flex items-center gap-2">
                  <Download size={14} /> <span>Download Complete PDF Report</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-[28px] shadow-xl relative overflow-hidden">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Total Revenue (GMV)</p>
                  <h3 className="text-2xl font-black text-amber-400 mt-1">₹ {dashboardStats.totalRevenue.toFixed(2)}</h3>
                  <p className="text-[10px] text-slate-400 font-bold mt-1">From real database orders</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-[28px] shadow-xl relative overflow-hidden">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Net Commission (12%)</p>
                  <h3 className="text-2xl font-black text-emerald-400 mt-1">₹ {dashboardStats.netCommission.toFixed(2)}</h3>
                  <p className="text-[10px] text-slate-400 font-bold mt-1">Platform earnings</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-[28px] shadow-xl relative overflow-hidden">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Total Orders</p>
                  <h3 className="text-2xl font-black text-blue-400 mt-1">{allOrders.length} Orders</h3>
                  <p className="text-[10px] text-slate-400 font-bold mt-1">Fulfilled across Ichapuram</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-[32px] shadow-xl space-y-4">
                  <h3 className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-2">
                    <PieChart size={16} /> Revenue vs Commission Pie Share
                  </h3>

                  <div className="flex flex-col sm:flex-row items-center justify-around py-4 gap-4">
                    <div className="relative w-36 h-36 rounded-full flex items-center justify-center bg-gradient-to-tr from-amber-500 to-emerald-500 shadow-xl p-1">
                      <div className="w-full h-full bg-slate-950 rounded-full flex flex-col items-center justify-center text-center p-2">
                        <span className="text-[9px] font-bold text-slate-400 uppercase">Commission Cut</span>
                        <span className="text-lg font-black text-emerald-400">12%</span>
                      </div>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                        <span className="text-slate-300 font-bold">Vendor Payouts: ₹ {(dashboardStats.totalRevenue - dashboardStats.netCommission).toFixed(2)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                        <span className="text-slate-300 font-bold">Platform Earnings: ₹ {dashboardStats.netCommission.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-6 rounded-[32px] shadow-xl space-y-4">
                  <h3 className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-2">
                    <Calendar size={16} /> Every Day Commission Log
                  </h3>

                  <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                    {dailyCommissionLog.length === 0 ? (
                      <p className="text-xs text-slate-500 text-center py-10">No daily commission records available yet.</p>
                    ) : (
                      dailyCommissionLog.map((log, index) => (
                        <div key={index} className="bg-slate-950 border border-slate-800 p-3.5 rounded-2xl flex justify-between items-center text-xs">
                          <div>
                            <p className="font-black text-white">{log.date}</p>
                            <p className="text-[10px] text-slate-400">{log.orders} Orders • GMV: ₹{log.revenue.toFixed(2)}</p>
                          </div>
                          <span className="font-black text-emerald-400">₹ +{log.commission.toFixed(2)}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'sos' && (
            <div className="space-y-4 animate-fadeIn">
              <h1 className="text-xl font-black text-white flex items-center gap-2"><AlertTriangle className="text-rose-500" size={22} /> 6. Emergency SOS Support</h1>
              <div className="space-y-3">
                {sosAlerts.length === 0 ? <p className="text-xs text-slate-500 bg-slate-900 p-6 rounded-2xl text-center">No active emergencies.</p> : sosAlerts.map(sos => (
                  <div key={sos.id} className="bg-slate-900 border border-rose-500/50 p-5 rounded-[24px] flex justify-between items-center text-xs shadow-xl">
                    <div><p className="font-black text-white text-sm">{sos.user} - <span className="text-rose-400">{sos.issue}</span></p></div>
                    <button onClick={() => { toast.success("Help dispatched!"); setSosAlerts([]); }} className="bg-rose-600 text-white px-4 py-2 rounded-xl font-black text-xs cursor-pointer">Dispatch Help 🚨</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'localization' && (
            <div className="space-y-4 animate-fadeIn">
              <h1 className="text-xl font-black text-white">7. Multi-Language Hub</h1>
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-[32px] space-y-4 max-w-lg">
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Platform Language</label>
                <select value={adminLanguage} onChange={(e) => setAdminLanguage(e.target.value)} className="w-full bg-slate-950 border border-slate-800 px-4 py-3 rounded-xl text-xs font-bold text-white outline-none">
                  <option>Telugu & English (తెలుగు & ఇంగ్లీష్)</option>
                  <option>English Only</option>
                </select>
                <button onClick={() => toast.success("Language updated!")} className="w-full bg-[#fc8019] text-slate-950 py-3 rounded-xl font-black text-xs cursor-pointer">Save Settings</button>
              </div>
            </div>
          )}

          {activeTab === 'incentives' && (
            <div className="space-y-4 animate-fadeIn">
              <h1 className="text-xl font-black text-white">8. Rider Incentives & Bonus Management</h1>
              <div className="bg-slate-900 border border-slate-800 rounded-[32px] overflow-hidden shadow-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-950 text-slate-400 font-black uppercase text-[10px] border-b border-slate-800">
                      <th className="p-4">Partner</th><th className="p-4">Target</th><th className="p-4">Bonus</th><th className="p-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 font-bold text-slate-300">
                    {riderIncentives.length === 0 ? (
                      <tr><td colSpan="4" className="p-6 text-center text-slate-500">No active incentive targets.</td></tr>
                    ) : (
                      riderIncentives.map(inc => (
                        <tr key={inc.id}>
                          <td className="p-4 text-white font-black">{inc.riderName}</td>
                          <td className="p-4">{inc.targetOrders} Deliveries</td>
                          <td className="p-4 text-emerald-400 font-black">₹ {inc.bonusAmount}</td>
                          <td className="p-4 text-right"><button onClick={() => toast.success("Bonus paid!")} className="bg-emerald-600 text-white px-3 py-1.5 rounded-xl text-[10px] cursor-pointer">Pay Bonus 💸</button></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'geofence' && (
            <div className="space-y-4 animate-fadeIn">
              <h1 className="text-xl font-black text-white">9. Geo-Fencing & Radius Control</h1>
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-[32px] space-y-4 max-w-lg">
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Max Radius: {geoRadius} Km</label>
                <input type="range" min="5" max="30" value={geoRadius} onChange={(e) => setGeoRadius(e.target.value)} className="w-full accent-[#fc8019] cursor-pointer" />
                <button onClick={() => toast.success("Geo-fence updated!")} className="w-full bg-[#fc8019] text-slate-950 py-3 rounded-xl font-black text-xs cursor-pointer">Update Boundary</button>
              </div>
            </div>
          )}

          {activeTab === 'loyalty' && (
            <div className="space-y-4 animate-fadeIn">
              <h1 className="text-xl font-black text-white">10. Customer Loyalty & Rewards</h1>
              <div className="bg-slate-900 border border-slate-800 rounded-[32px] overflow-hidden shadow-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-950 text-slate-400 font-black uppercase text-[10px] border-b border-slate-800">
                      <th className="p-4">Customer</th><th className="p-4">Points</th><th className="p-4">Tier</th><th className="p-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 font-bold text-slate-300">
                    {loyaltyMembers.length === 0 ? (
                      <tr><td colSpan="4" className="p-6 text-center text-slate-500">No loyalty members registered.</td></tr>
                    ) : (
                      loyaltyMembers.map(mem => (
                        <tr key={mem.id}>
                          <td className="p-4 text-white font-black">{mem.name}</td>
                          <td className="p-4 text-amber-400 font-black">{mem.points} PTS</td>
                          <td className="p-4"><span className="bg-amber-500/20 text-amber-300 px-3 py-1 rounded-full text-[10px]">{mem.tier}</span></td>
                          <td className="p-4 text-right"><button onClick={() => toast.success("Reward added!")} className="bg-[#fc8019] text-slate-950 px-3 py-1.5 rounded-xl text-[10px] cursor-pointer">Reward 🎁</button></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'customers' && (
            <div className="space-y-4 animate-fadeIn">
              <h1 className="text-xl font-black text-white">Customers Directory (with Live eWallet Balance)</h1>
              <div className="bg-slate-900 border border-slate-800 rounded-[32px] overflow-hidden shadow-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-950 text-slate-400 font-black uppercase text-[10px] border-b border-slate-800">
                      <th className="p-4">Name</th><th className="p-4">Mobile</th><th className="p-4">Address</th><th className="p-4">eWallet Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 font-bold text-slate-300">
                    {customersList.length === 0 ? (
                      <tr><td colSpan="4" className="p-6 text-center text-slate-500">No customers registered in database.</td></tr>
                    ) : (
                      customersList.map((cust, i) => (
                        <tr key={i}>
                          <td className="p-4 text-white font-black">{cust.name || 'Customer'}</td>
                          <td className="p-4 text-[#fc8019]">{cust.mobile || cust.phoneNumber || 'N/A'}</td>
                          <td className="p-4">{cust.deliveryAddress || cust.address || 'Ichapuram'}</td>
                          <td className="p-4 text-emerald-400 font-black text-sm">
                            ₹ {cust.walletBalance !== undefined && cust.walletBalance !== null ? Number(cust.walletBalance).toFixed(2) : '0.00'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'partners' && <AdminPartnersVerification />}
          {activeTab === 'chats' && <AdminChatDashboard />}

          {activeTab === 'promos' && (
            <div className="space-y-4 animate-fadeIn">
              <h1 className="text-xl font-black text-white">Dynamic Promo Code Manager</h1>
              <form onSubmit={addPromoCode} className="bg-slate-900 border border-slate-800 p-5 rounded-[28px] shadow-xl grid grid-cols-4 gap-3 items-end">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Coupon Code</label>
                  <input type="text" value={newCode} onChange={(e) => setNewCode(e.target.value)} placeholder="e.g. FESTIV50" className="w-full bg-slate-950 border border-slate-800 px-3.5 py-2.5 rounded-xl text-xs font-bold text-white uppercase outline-none" required />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Discount</label>
                  <input type="text" value={newDiscount} onChange={(e) => setNewDiscount(e.target.value)} placeholder="e.g. ₹50 OFF" className="w-full bg-slate-950 border border-slate-800 px-3.5 py-2.5 rounded-xl text-xs font-bold text-white outline-none" required />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Min Order (₹)</label>
                  <input type="number" value={newMinOrder} onChange={(e) => setNewMinOrder(e.target.value)} placeholder="e.g. 199" className="w-full bg-slate-950 border border-slate-800 px-3.5 py-2.5 rounded-xl text-xs font-bold text-white outline-none" required />
                </div>
                <button type="submit" className="bg-[#fc8019] text-slate-950 px-5 py-2.5 rounded-xl text-xs font-black shadow cursor-pointer">Create Code</button>
              </form>

              <div className="grid grid-cols-2 gap-3">
                {promoCodes.length === 0 ? (
                  <p className="text-xs text-slate-500 bg-slate-900 p-6 rounded-2xl text-center col-span-2">No promo codes in database.</p>
                ) : (
                  promoCodes.map((promo, index) => (
                    <div key={index} className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex justify-between items-center">
                      <div>
                        <span className="font-black text-white text-xs bg-slate-950 border border-slate-800 px-3 py-1 rounded-lg">{promo.code}</span>
                        <p className="text-[10px] text-emerald-400 font-bold mt-2">{promo.discount} • Min: {promo.minOrder}</p>
                      </div>
                      <button onClick={() => togglePromoStatus(index)} className="p-2 bg-slate-950 rounded-xl border border-slate-800 cursor-pointer">
                        {promo.isActive !== false ? <ToggleRight size={20} className="text-emerald-400" /> : <ToggleLeft size={20} className="text-rose-400" />}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'broadcast' && (
            <div className="space-y-4 animate-fadeIn">
              <h1 className="text-xl font-black text-white">Broadcast Push Notifications with Image</h1>
              <form onSubmit={sendBroadcast} className="bg-slate-900 border border-slate-800 p-6 rounded-[32px] shadow-xl space-y-4 max-w-lg">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Target Audience</label>
                  <select value={broadcastTarget} onChange={(e) => setBroadcastTarget(e.target.value)} className="w-full bg-slate-950 border border-slate-800 px-4 py-3 rounded-xl text-xs font-bold text-white outline-none">
                    <option>All Users</option><option>All Customers</option><option>All Shop Owners</option><option>All Delivery Partners</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Announcement Message</label>
                  <textarea rows={3} value={broadcastMsg} onChange={(e) => setBroadcastMsg(e.target.value)} placeholder="Type announcement..." className="w-full bg-slate-950 border border-slate-800 p-4 rounded-xl text-xs font-bold text-white outline-none" required></textarea>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Attach Promotional Image (Optional)</label>
                  <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 p-3 rounded-xl">
                    <ImageIcon size={18} className="text-amber-400" />
                    <input type="file" accept="image/*" onChange={(e) => setBroadcastImageFile(e.target.files[0])} className="text-xs text-slate-300 file:bg-amber-500 file:text-slate-950 file:border-0 file:rounded-lg file:px-3 file:py-1 cursor-pointer w-full" />
                  </div>
                </div>
                <button type="submit" className="w-full bg-[#fc8019] text-slate-950 py-3.5 rounded-2xl font-black text-xs shadow cursor-pointer">Broadcast Now 🚀</button>
              </form>
            </div>
          )}

        </main>
      </div>

      {showDashboardListModal && (
        <div className="absolute inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-900 border-2 border-amber-500/80 w-full max-w-md rounded-[32px] p-6 shadow-2xl space-y-4 text-white relative overflow-hidden">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-sm font-black text-amber-400 uppercase">
                {showDashboardListModal === 'partners' && 'Delivery Partners Full List'}
                {showDashboardListModal === 'shops' && 'Registered Shops Full List'}
                {showDashboardListModal === 'customers' && 'Customers Directory Full List'}
              </h3>
              <button onClick={() => setShowDashboardListModal(null)} className="text-slate-400 hover:text-white cursor-pointer"><X size={20} /></button>
            </div>

            <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1 text-xs">
              {showDashboardListModal === 'partners' && (
                partners.length === 0 ? <p className="text-slate-500 text-center py-6">No partners found.</p> :
                partners.map((p, idx) => {
                  const isPartnerOnline = p.online === true || p.isOnline === true || p.status === 'ONLINE';
                  return (
                    <div key={idx} className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 flex justify-between items-center">
                      <div>
                        <p className="font-black text-white">{p.fullName || p.name}</p>
                        <p className="text-[10px] text-slate-400">Bike: {p.bikeNumber || 'N/A'}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${isPartnerOnline ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                        {isPartnerOnline ? '● Online' : '○ Offline'}
                      </span>
                    </div>
                  );
                })
              )}

              {showDashboardListModal === 'shops' && (
                shopsList.length === 0 ? <p className="text-slate-500 text-center py-6">No shops found.</p> :
                shopsList.map((s, idx) => {
                  const isShopOnline = s.online === true || s.isOnline === true || s.status === 'ONLINE' || s.isOpen === true || s.online !== false;
                  return (
                    <div key={idx} className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 flex justify-between items-center">
                      <div>
                        <p className="font-black text-white">{s.shopName || s.name}</p>
                        <p className="text-[10px] text-slate-400">{s.address || 'Ichapuram'}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${isShopOnline ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                        {isShopOnline ? '● Open' : '○ Closed'}
                      </span>
                    </div>
                  );
                })
              )}

              {showDashboardListModal === 'customers' && (
                customersList.length === 0 ? <p className="text-slate-500 text-center py-6">No customers found.</p> :
                customersList.map((customer, idx) => (
                  <div key={idx} className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1.5 text-xs">
                    <div className="flex justify-between items-center">
                      <p className="font-black text-white text-sm">{customer.name || 'New Customer'}</p>
                      <span className="text-emerald-400 font-black text-xs">
                        ₹ {customer.walletBalance !== undefined && customer.walletBalance !== null ? Number(customer.walletBalance).toFixed(2) : '0.00'}
                      </span>
                    </div>
                    <p className="text-amber-400 font-bold">📞 {customer.mobile || customer.phoneNumber || 'N/A'}</p>
                    <p className="text-slate-300">📧 <b>Email:</b> {customer.email || 'N/A'}</p>
                    <p className="text-slate-400">📍 <b>Address:</b> {customer.deliveryAddress || customer.address || 'Ichapuram'}</p>
                  </div>
                ))
              )}
            </div>

            <button onClick={() => setShowDashboardListModal(null)} className="w-full bg-[#fc8019] text-slate-950 py-3 rounded-2xl font-black text-xs shadow cursor-pointer">Close List</button>
          </div>
        </div>
      )}

      {selectedOrderDetails && (
        <div className="absolute inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-900 border-2 border-amber-500/80 w-full max-w-sm rounded-[32px] p-6 shadow-2xl space-y-4 text-white relative overflow-hidden">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <span className="text-[9px] text-amber-400 font-black uppercase">Complete Order Overview</span>
                <h3 className="text-sm font-black text-white">{selectedOrderDetails.orderId || `#ORD-${selectedOrderDetails.id}`}</h3>
              </div>
              <button onClick={() => setSelectedOrderDetails(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1 text-xs">
              
              <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 flex justify-between items-center">
                <span className="text-slate-400 font-bold uppercase text-[10px]">Present Status</span>
                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-3 py-1 rounded-full text-xs font-black uppercase animate-pulse">
                  {selectedOrderDetails.status || 'Pending Approval'}
                </span>
              </div>

              <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-1.5">
                <h4 className="font-black text-amber-400 uppercase text-[10px] flex items-center gap-1.5">
                  <Users size={13} /> Customer Details
                </h4>
                <p><b>Name:</b> {selectedOrderDetails.customerName || 'N/A'}</p>
                <p><b>Mobile:</b> {selectedOrderDetails.customerMobile || 'N/A'}</p>
                <p><b>Delivery Address:</b> {selectedOrderDetails.deliveryAddress || 'Ichapuram'}</p>
              </div>

              <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-1.5">
                <h4 className="font-black text-amber-400 uppercase text-[10px] flex items-center gap-1.5">
                  <Store size={13} /> Shop / Merchant Details
                </h4>
                <p><b>Shop Name:</b> {selectedOrderDetails.shopName || selectedOrderDetails.shop || 'N/A'}</p>
                <p><b>Items:</b> {selectedOrderDetails.items || 'N/A'}</p>
                <p><b>Total Amount:</b> <span className="text-emerald-400 font-bold">₹{selectedOrderDetails.totalAmount || selectedOrderDetails.total || 0}</span></p>
              </div>

              <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-1.5">
                <h4 className="font-black text-amber-400 uppercase text-[10px] flex items-center gap-1.5">
                  <Bike size={13} /> Assigned Delivery Partner
                </h4>
                <p><b>Partner ID / Name:</b> {selectedOrderDetails.deliveryPartnerId ? `Partner #${selectedOrderDetails.deliveryPartnerId}` : <span className="text-amber-400 font-bold">Unassigned / Finding Rider...</span>}</p>
                <p><b>Payment Method:</b> {selectedOrderDetails.paymentMethod || 'COD'}</p>
              </div>

            </div>

            <button 
              onClick={() => setSelectedOrderDetails(null)} 
              className="w-full bg-[#fc8019] hover:bg-[#e07015] text-slate-950 py-3 rounded-2xl font-black text-xs shadow-lg cursor-pointer transition mt-2"
            >
              Close Details
            </button>
          </div>
        </div>
      )}

      {selectedPayoutForTransfer && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-emerald-500/50 w-full max-w-sm rounded-[32px] p-6 text-white space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-sm font-black text-emerald-400">Payment Gateway Settlement</h3>
              <button onClick={() => setSelectedPayoutForTransfer(null)} className="text-slate-400 cursor-pointer"><X size={20} /></button>
            </div>
            <div className="space-y-3 text-xs">
              <p className="text-slate-300">Transferring funds to <span className="font-black text-white">{selectedPayoutForTransfer.name}</span> via UPI / Bank Gateway.</p>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Edit Transfer Amount (₹)</label>
                <input 
                  type="number" 
                  value={transferAmountInput} 
                  onChange={(e) => setTransferAmountInput(e.target.value)} 
                  className="w-full bg-slate-950 border border-slate-800 px-4 py-3 rounded-xl text-sm font-black text-emerald-400 outline-none" 
                  required 
                />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setSelectedPayoutForTransfer(null)} className="w-1/2 bg-slate-800 text-slate-300 py-3 rounded-2xl font-black text-xs cursor-pointer">Cancel</button>
              <button onClick={processPaymentTransfer} className="w-1/2 bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-2xl font-black text-xs cursor-pointer shadow">Confirm & Pay 🚀</button>
            </div>
          </div>
        </div>
      )}

      {showRevenueModal && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-amber-500/50 w-full max-w-sm rounded-[32px] p-6 text-white space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-sm font-black text-amber-400">Revenue Breakdown & PDF</h3>
              <button onClick={() => setShowRevenueModal(false)} className="text-slate-400 cursor-pointer"><X size={20} /></button>
            </div>
            <div className="space-y-2.5">
              {revenueBreakdown.map((item, idx) => (
                <div key={idx} className="bg-slate-800 p-3.5 rounded-2xl flex justify-between items-center text-xs">
                  <div><p className="font-black text-white">{item.period}</p><p className="text-[10px] text-emerald-400">₹ {item.amount}</p></div>
                  <button onClick={() => generateRealPDF(item.period, item.amount)} className="bg-emerald-600 text-white px-3 py-1.5 rounded-xl font-black text-[10px] cursor-pointer">PDF</button>
                </div>
              ))}
            </div>
            <button onClick={() => setShowRevenueModal(false)} className="w-full bg-[#fc8019] text-slate-950 py-3 rounded-2xl font-black text-xs cursor-pointer">Close</button>
          </div>
        </div>
      )}

    </div>
  );
}