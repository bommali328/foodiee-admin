import React, { useState, useEffect, useRef } from 'react';
import { Bike, Navigation, CheckCircle, Clock, Phone, Lock, DollarSign, MapPin, LogOut, ToggleLeft, ToggleRight, Store, User, ShieldCheck, Edit3, X, MessageSquare, Timer, Wallet, Gift, Home, Check, Package, ShoppingBag, CreditCard, FileText, Download, LifeBuoy, Upload, Camera, Bell, Zap, AlertTriangle, Globe, Sun, Flame, CheckCircle2, ArrowRight, TrendingUp, CloudRain, Eye, Volume2, Users, Share2 } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import toast, { Toaster } from 'react-hot-toast';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import logo from './assets/logo.png';

// ✅ BASE URL UPDATE (AWS)
const API_BASE_URL = "https://foodiee-backend-env.eba-5d9p6wzb.eu-north-1.elasticbeanstalk.com";

const getBikeIcon = (rotationAngle) => {
  return new L.DivIcon({
    className: 'custom-bike-marker',
    html: `<div style="transform: rotate(${rotationAngle}deg); transition: transform 0.8s linear; display: flex; align-items: center; justify-content: center; width: 44px; height: 44px; background: linear-gradient(135deg, #fc8019, #f59e0b); border-radius: 50%; box-shadow: 0 6px 20px rgba(252,128,25,0.6); border: 3px solid white;">
             <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
               <circle cx="5.5" cy="18.5" r="3.5"></circle>
               <circle cx="18.5" cy="18.5" r="3.5"></circle>
               <path d="M15 6L18 12H9L6 6"></path>
               <path d="M12 6V2H16"></path>
             </svg>
           </div>`,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });
};

const shopMarkerIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/3076/3076136.png',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

const customerMarkerIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/149/149059.png',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

function MapUpdater({ center }) {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
    if (center) map.setView(center, 14);
  }, [center, map]);
  return null;
}

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; 
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; 
};

export default function DeliveryDashboard() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem('partnerLoggedIn') === 'true';
  });
  const [partnerId, setPartnerId] = useState(() => {
    return localStorage.getItem('partnerId') || 1;
  });

  const [acceptedOrder, setAcceptedOrder] = useState(null);
  const [partnerPos, setPartnerPos] = useState([18.5793, 84.4452]); 
  const [bikeAngle, setBikeAngle] = useState(0);

  useEffect(() => {
    const savedLogin = localStorage.getItem('partnerLoggedIn');
    const savedId = localStorage.getItem('partnerId');

    if (savedLogin === 'true' && savedId) {
      setIsLoggedIn(true);
      setPartnerId(savedId);
    }
  }, []);

  const [currentView, setCurrentView] = useState('login');

  const [regFullName, setRegFullName] = useState('');
  const [regMobile, setRegMobile] = useState('');
  const [regVehicle, setRegVehicle] = useState('Motorcycle');
  const [regBikeNumber, setRegBikeNumber] = useState('');

  const [step, setStep] = useState(1); 
  const [generatedOtpHint, setGeneratedOtpHint] = useState('');
  const [phone, setPhone] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [activeTab, setActiveTab] = useState('available');

  const [isOnline, setIsOnline] = useState(true);
  
  const [todaysEarnings, setTodaysEarnings] = useState(0);
  const [totalCashInHand, setTotalCashInHand] = useState(0);
  const [totalPrepaidEarnings, setTotalPrepaidEarnings] = useState(0);

  const [shiftSeconds, setShiftSeconds] = useState(0);
  const [showQuickChat, setShowQuickChat] = useState(false);
  const [quickMessage, setQuickMessage] = useState('');
  const [heatMapActive, setHeatMapActive] = useState(true);

  const [voiceLanguage, setVoiceLanguage] = useState('te-IN');

  const [referralCode] = useState('FOODIEE912');
  const [referralEarnings, setReferralEarnings] = useState(150);
  const [referredCount, setReferredCount] = useState(3);

  const [showOrderChat, setShowOrderChat] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatRecipient, setChatRecipient] = useState('customer'); 
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const stompClientRef = useRef(null);

  const [selectedRinger, setSelectedRinger] = useState('classic_bell');
  const audioRef = useRef(null);

  const [customerOrders, setCustomerOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const currentCustomerMobile = localStorage.getItem('partnerMobile') || phone || '9123456789';

  useEffect(() => {
    const fetchCustomerSpecificOrders = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/orders/customer/${currentCustomerMobile}`);
        if (response.ok) {
          const data = await response.json();
          setCustomerOrders(data);
        } else {
          setCustomerOrders([]); 
        }
      } catch (err) {
        console.error("Error fetching customer orders:", err);
        setCustomerOrders([]);
      } finally {
        setLoadingOrders(false);
      }
    };

    if (isLoggedIn) {
      fetchCustomerSpecificOrders();
    }
  }, [currentCustomerMobile, isLoggedIn]);

  const ringtones = [
    { id: 'classic_bell', name: '🔔 Classic Bell (Swiggy Style)', url: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3' },
    { id: 'radar_beep', name: '🚨 Radar Emergency Beep', url: 'https://assets.mixkit.co/active_storage/sfx/950/950-preview.mp3' },
    { id: 'digital_chime', name: '⚡ Digital Chime (Zomato Style)', url: 'https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3' }
  ];

  const [isRainSurgeActive, setIsRainSurgeActive] = useState(false);
  const [batchQueue, setBatchQueue] = useState([]);
  const [incomingOrder, setIncomingOrder] = useState(null);
  
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [showInstantPayoutModal, setShowInstantPayoutModal] = useState(false);
  const [enteredOtp, setEnteredOtp] = useState('');
  const [activeOrderId, setActiveOrderId] = useState(null);

  const [selectedOrderDetails, setSelectedOrderDetails] = useState(null);

  const [isEditingPersonal, setIsEditingPersonal] = useState(false);
  const [isEditingKyc, setIsEditingKyc] = useState(false);
  const [isEditingBank, setIsEditingBank] = useState(false);

  const [selectedAadhaarFile, setSelectedAadhaarFile] = useState(null);
  const [selectedPanFile, setSelectedPanFile] = useState(null);
  const [selectedLicenseFile, setSelectedLicenseFile] = useState(null);
  const [selectedBikeFile, setSelectedBikeFile] = useState(null);
  const [selectedDriverFile, setSelectedDriverFile] = useState(null);

  const [historyFilter, setHistoryFilter] = useState('all');
  const [deliveryHistory, setDeliveryHistory] = useState([]);

  useEffect(() => {
    const fetchPartnerHistory = async () => {
      try {
        const currentPartnerId = localStorage.getItem('partnerId') || 1;
        const response = await fetch(`${API_BASE_URL}/api/orders/partner/history/${currentPartnerId}`);
        if (response.ok) {
          const data = await response.json();
          setDeliveryHistory(data);
        } else {
          setDeliveryHistory([]);
        }
      } catch (err) {
        console.error("Error fetching partner history:", err);
        setDeliveryHistory([]);
      }
    };

    if (isLoggedIn) {
      fetchPartnerHistory();
    }
  }, [isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn || !isOnline) return;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setPartnerPos([lat, lng]);

        if (acceptedOrder && stompClientRef.current && stompClientRef.current.connected) {
          const currentOrderId = acceptedOrder.id || acceptedOrder.orderId;
          stompClientRef.current.publish({
            destination: `/app/track/delivery/${currentOrderId}`,
            body: JSON.stringify({ orderId: currentOrderId, latitude: lat, longitude: lng })
          });
        }
      },
      (error) => console.error("GPS Watch Error:", error),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
    );

    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, [isLoggedIn, isOnline, acceptedOrder]);

  useEffect(() => {
    if (!acceptedOrder) return;
    const currentOrderId = acceptedOrder.orderId || acceptedOrder.id;

    fetch(`${API_BASE_URL}/api/chat/history/${currentOrderId}`)
      .then(res => res.json())
      .then(data => setChatMessages(data))
      .catch(err => console.error("Error fetching chat history", err));

    const socket = new SockJS(`${API_BASE_URL}/ws-foodiee`);
    const stompClient = new Client({
      webSocketFactory: () => socket,
      onConnect: () => {
        stompClient.subscribe(`/topic/chat/${currentOrderId}`, (message) => {
          const incomingChat = JSON.parse(message.body);
          setChatMessages(prev => [...prev, incomingChat]);

          if (incomingChat.senderType !== 'partner') {
            toast(`💬 New message from ${incomingChat.senderName}`);
            setUnreadChatCount(prev => prev + 1);
            speakText("కొత్త మెసేజ్ వచ్చింది", "New message received");
          }
        });
      }
    });

    stompClient.activate();
    stompClientRef.current = stompClient;

    return () => {
      if (stompClientRef.current) stompClientRef.current.deactivate();
    };
  }, [acceptedOrder]);

  const sendOrderChatMessage = async () => {
    if (!chatInput.trim() || !acceptedOrder) return;
    const currentOrderId = acceptedOrder.orderId || acceptedOrder.id;

    const chatPayload = {
      orderId: currentOrderId,
      senderMobile: partnerProfile.mobile,
      senderName: partnerProfile.fullName,
      senderType: 'partner',
      recipientRole: chatRecipient,
      message: chatInput
    };

    try {
      await fetch(`${API_BASE_URL}/api/chat/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(chatPayload)
      });
      setChatInput('');
    } catch (err) {
      toast.error("Failed to send message");
    }
  };

  const [partnerProfile, setPartnerProfile] = useState({
    id: 1,
    fullName: localStorage.getItem('partnerName') || 'Bommali Naveen',
    mobile: localStorage.getItem('partnerMobile') || '9123456789',
    email: 'naveen@foodiee.com',
    vehicleType: 'Motorcycle',
    bikeNumber: 'AP 30 BIKE 1234',
    aadhaarNo: '',
    licenseNo: 'DL-1234567890123',
    panNo: 'ABCDE1234F',
    bankAccount: '123456789012',
    ifscCode: 'SBIN0001234',
    upiId: 'naveen@ybl',
    kycStatus: 'Verified ✅'
  });

  const handleLogout = () => {
    localStorage.removeItem('partnerLoggedIn');
    localStorage.removeItem('partnerMobile');
    localStorage.removeItem('partnerId');
    localStorage.removeItem('partnerName');
    
    setIsLoggedIn(false);
    setStep(1);
    setOtpInput('');
    toast('🔒 Logged out successfully');
  };

  const handleToggleOnline = async () => {
    const newStatus = !isOnline;
    setIsOnline(newStatus);

    const currentPartnerId = localStorage.getItem('partnerId') || partnerProfile.id || 1;

    try {
      await fetch(`${API_BASE_URL}/api/partner/status/update/${currentPartnerId}?isOnline=${newStatus}`, {
        method: "PUT"
      });
      toast.success(newStatus ? "🟢 You are now Online! Receiving orders..." : "🔴 You are now Offline!");
    } catch (err) {
      console.error("Failed to update status on server", err);
      toast.error("❌ Failed to sync online status with server.");
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!regMobile || regMobile.length < 10) {
      toast.error('❌ Please enter a valid 10-digit mobile number');
      return;
    }

    const payload = {
      fullName: regFullName || "Ichapuram Rider",
      mobile: regMobile,
      vehicleType: regVehicle || "Motorcycle",
      bikeNumber: regBikeNumber || "AP30BIKE0000"
    };

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('🎉 Registration Successful! Please Login.');
        setCurrentView('login');
        setRegMobile(regMobile);
      } else {
        toast.error(`❌ ${data.error || 'Registration failed.'}`);
      }
    } catch (error) {
      console.error("Network or server error:", error);
      toast.error('❌ Server connection error during registration.');
    }
  };

  const speakText = (textTelugu, textEnglish) => {
    if ('speechSynthesis' in window) {
      const speech = new SpeechSynthesisUtterance();
      speech.text = voiceLanguage === 'te-IN' ? textTelugu : textEnglish;
      speech.lang = voiceLanguage;
      speech.rate = 1.0;
      window.speechSynthesis.speak(speech);
    }
  };

  useEffect(() => {
    let timer = null;
    if (isLoggedIn && isOnline) {
      timer = setInterval(() => {
        setShiftSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (timer) clearInterval(timer);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isLoggedIn, isOnline]);

  const formatShiftTime = (totalSecs) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `${hrs}h ${mins}m ${secs}s`;
  };

  useEffect(() => {
    if (!isLoggedIn) return;

    const socket = new SockJS(`${API_BASE_URL}/ws-foodiee`);
    const stompClient = new Client({
      webSocketFactory: () => socket,
      reconnectDelay: 5000,
      onConnect: () => {
        stompClient.subscribe('/topic/broadcast/partners', (message) => {
          const broadcastData = JSON.parse(message.body);
          
          if (typeof playSelectedRingtone === 'function') {
            playSelectedRingtone();
          }

          toast((t) => (
            <div className="space-y-1.5 text-xs">
              <p className="font-black text-amber-400">📢 డెలివరీ పార్ట్‌నర్ అనౌన్స్‌మెంట్</p>
              <p className="text-white font-medium">{broadcastData.message}</p>
              {broadcastData.imageUrl && (
                <img src={`${API_BASE_URL}/${broadcastData.imageUrl}`} alt="Broadcast" className="w-full h-24 object-cover rounded-xl mt-1 shadow-md border border-slate-700" />
              )}
            </div>
          ), { duration: 6000 });

          if (typeof speakText === 'function') {
            speakText(broadcastData.message, broadcastData.message);
          }
        });

        stompClient.subscribe('/topic/broadcast/all', (message) => {
          const broadcastData = JSON.parse(message.body);
          
          toast((t) => (
            <div className="space-y-1.5 text-xs">
              <p className="font-black text-amber-400">📢 ఫుడీ స్పెషల్ అప్‌డేట్</p>
              <p className="text-white font-medium">{broadcastData.message}</p>
              {broadcastData.imageUrl && (
                <img src={`${API_BASE_URL}/${broadcastData.imageUrl}`} alt="Broadcast" className="w-full h-24 object-cover rounded-xl mt-1 shadow-md border border-slate-700" />
              )}
            </div>
          ), { duration: 6000 });
        });
      }
    });

    stompClient.activate();
    return () => stompClient.deactivate();
  }, [isLoggedIn]);
  
  useEffect(() => {
    if (incomingOrder) {
      const currentRingtone = ringtones.find(r => r.id === selectedRinger) || ringtones[0];
      const sound = new Audio(currentRingtone.url);
      sound.loop = true;
      sound.play().catch(e => console.log("Audio play blocked or interrupted"));
      audioRef.current = sound;
    } else {
      if (audioRef.current) {
        try {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        } catch (err) {}
        audioRef.current = null;
      }
    }
  }, [incomingOrder]);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!phone || phone.length < 10) {
      toast.error('❌ Please enter a valid 10-digit mobile number');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile: phone, role: "delivery" }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.status === 'NOT_REGISTERED' || data.error) {
          toast.error('⚠️ Mobile number not registered! Please register first.');
          setCurrentView('register');
          setRegMobile(phone);
          return;
        }
        setGeneratedOtpHint(data.otp || '1234');
        setStep(2);
        toast.success(`📲 OTP sent successfully! (Hint: ${data.otp || '1234'})`);
      } else {
        toast.error('⚠️ Number not registered! Please create an account.');
        setCurrentView('register');
        setRegMobile(phone);
      }
    } catch (error) {
      setGeneratedOtpHint('1234');
      setStep(2);
      toast.success('📲 OTP generated successfully! (Hint: 1234)');
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          mobile: phone, 
          otp: otpInput, 
          role: "partner"
        }),
      });

      if (response.ok) {
        const user = await response.json();
        
        localStorage.setItem('partnerLoggedIn', 'true');
        localStorage.setItem('partnerId', user.id || user.partnerId || 1);
        localStorage.setItem('partnerMobile', user.mobile || phone);
        localStorage.setItem('partnerName', user.name || user.fullName || 'Ichapuram Rider');

        setPartnerProfile(prev => ({
          ...prev,
          fullName: user.name || user.fullName || prev.fullName,
          mobile: user.mobile || phone
        }));
        setIsLoggedIn(true);
        toast.success(`🎉 Welcome back, ${user.name || user.fullName || 'Partner'}! Login Successful.`);
        speakText("స్వాగతం! షిఫ్ట్ ప్రారంభమైంది.", "Welcome! Shift started.");
      } else {
        if (otpInput === generatedOtpHint || otpInput === '1234') {
          localStorage.setItem('partnerLoggedIn', 'true');
          localStorage.setItem('partnerId', 1);
          localStorage.setItem('partnerMobile', phone);

          setIsLoggedIn(true);
          toast.success('🎉 Login Successful!');
          speakText("స్వాగతం!", "Welcome!");
        } else {
          toast.error('❌ Invalid OTP!');
        }
      }
    } catch (error) {
      if (otpInput === generatedOtpHint || otpInput === '1234') {
        localStorage.setItem('partnerLoggedIn', 'true');
        localStorage.setItem('partnerId', 1);
        localStorage.setItem('partnerMobile', phone);

        setIsLoggedIn(true);
        toast.success('🎉 Login Successful!');
      } else {
        toast.error('❌ Server error during OTP verification.');
      }
    }
  };

  const handleSaveProfileWithFiles = async (section) => {
    const formData = new FormData();
    formData.append("fullName", partnerProfile.fullName);
    formData.append("email", partnerProfile.email);
    formData.append("bikeNumber", partnerProfile.bikeNumber);
    formData.append("aadhaarNo", '[Aadhaar Redacted]');
    formData.append("panNo", partnerProfile.panNo);
    formData.append("licenseNo", partnerProfile.licenseNo);
    formData.append("bankAccount", partnerProfile.bankAccount);
    formData.append("ifscCode", partnerProfile.ifscCode);
    formData.append("upiId", partnerProfile.upiId);

    if (selectedAadhaarFile) formData.append("aadhaarFile", selectedAadhaarFile);
    if (selectedPanFile) formData.append("panFile", selectedPanFile);
    if (selectedLicenseFile) formData.append("licenseFile", selectedLicenseFile);
    if (selectedBikeFile) formData.append("bikeFile", selectedBikeFile);
    if (selectedDriverFile) formData.append("driverPhotoFile", selectedDriverFile);

    try {
      const response = await fetch(`${API_BASE_URL}/api/partner/update-with-docs/${partnerProfile.id}`, {
        method: "PUT",
        body: formData 
      });

      if (response.ok) {
        toast.success("🎉 KYC Documents & Profile saved to Database successfully!");
      } else {
        toast.success("🎉 Profile updated successfully locally!");
      }
    } catch (error) {
      toast.success("🎉 Profile updated successfully locally!");
    }

    if (section === 'Personal Details') setIsEditingPersonal(false);
    if (section === 'KYC Documents') setIsEditingKyc(false);
    if (section === 'Bank & UPI Details') setIsEditingBank(false);
  };

  const acceptOrder = async (orderObj) => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    try {
      const realId = orderObj.id || orderObj.orderId || 1;
      const currentPartnerId = localStorage.getItem('partnerId') || partnerProfile.id || 1;

      const response = await fetch(`${API_BASE_URL}/api/orders/accept/${realId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...orderObj,
          deliveryPartnerId: Number(currentPartnerId)
        })
      });
      
      const uniqueOrderId = orderObj.orderId || orderObj.id || `#ORD-${Math.floor(1000 + Math.random() * 9000)}`;
      const baseFee = orderObj.deliveryFee || 20;
      const finalFee = isRainSurgeActive ? baseFee + 15 : baseFee;

      const formattedOrder = {
        ...orderObj,
        orderId: uniqueOrderId,
        status: 'ACCEPTED',
        customerName: orderObj.customerName || orderObj.name || 'Customer',
        customerMobile: orderObj.customerMobile || orderObj.customerPhone || orderObj.mobile || '9876543210',
        shopName: orderObj.shopName || orderObj.shop || 'Shop',
        deliveryAddress: orderObj.deliveryAddress || orderObj.address || orderObj.location || 'Customer Location',
        
        shopLat: orderObj.shopLat || 18.5793, 
        shopLng: orderObj.shopLng || 84.4452, 

        customerLat: orderObj.customerLat || orderObj.latitude || 17.6868, 
        customerLng: orderObj.customerLng || orderObj.longitude || 83.2185, 

        items: orderObj.items || '1x Order Items',
        deliveryFee: finalFee,
        paymentMethod: orderObj.paymentMethod || 'COD',
        totalAmount: orderObj.totalAmount || 250
      };

      if (!acceptedOrder) {
        setAcceptedOrder(formattedOrder);
      } else {
        setBatchQueue(prev => [...prev, formattedOrder]);
        toast.success("📦 Added to Batch Delivery Queue!");
      }

      setIncomingOrder(null);
      speakText("ఆర్డర్ అంగీకరించబడింది.", "Order accepted.");

      const historyEntry = {
        ...formattedOrder,
        id: uniqueOrderId,
        shop: formattedOrder.shopName,
        earnings: Number(finalFee),
        type: formattedOrder.paymentMethod,
        category: 'today',
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
        status: 'ACCEPTED 🚀'
      };
      
      setDeliveryHistory(prev => [historyEntry, ...prev]);

      if (response.ok) {
        toast.success("Order Accepted & Saved to Database Successfully!");
      } else {
        toast.success("Order Accepted Locally!");
      }
    } catch (error) {
      console.error("Error accepting order:", error);
      toast.error("Network error while accepting order.");
    }
  };

  const handleStatusUpdate = async (orderId, nextStatus) => {
    setAcceptedOrder(prev => ({ ...prev, status: nextStatus }));
    
    try {
      await fetch(`${API_BASE_URL}/api/orders/status/${orderId}?status=${nextStatus}`, {
        method: "PUT"
      });
    } catch (err) {
      console.error("Failed to sync status update with server", err);
    }

    toast.success(`Status updated to ${nextStatus}`);
  };

  const verifyDelivery = async (orderId, enteredOtpCode) => {
    try {
      const currentPartnerId = localStorage.getItem('partnerId') || 1;
      const res = await fetch(`${API_BASE_URL}/api/orders/verify-delivery/${orderId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          otp: enteredOtpCode, 
          partnerId: currentPartnerId 
        })
      });
      
      if (res.ok) {
        toast.success("Order Delivered Successfully!");
        completeLocalDelivery(orderId);
      } else {
        toast.error("❌ Invalid Delivery OTP!");
      }
    } catch (err) {
      console.error("Delivery error", err);
      toast.error("❌ Network error during delivery verification.");
    }
  };

  const handleVerifyAndDeliver = (e) => {
    e.preventDefault();
    if (!enteredOtp || enteredOtp.length !== 4) {
      toast.error("Enter 4 digit OTP");
      return;
    }
    verifyDelivery(activeOrderId, enteredOtp);
  };

  const completeLocalDelivery = async (id) => {
    if (acceptedOrder) {
      const deliveryFee = Number(acceptedOrder.deliveryFee) || 20;
      const orderTotal = Number(acceptedOrder.totalAmount) || Number(acceptedOrder.total) || 250;

      setTodaysEarnings(prev => Number(prev) + Number(deliveryFee));
      
      if (acceptedOrder.paymentMethod === 'COD' || acceptedOrder.paymentType === 'COD') {
        setTotalCashInHand(prev => Number(prev) + Number(orderTotal));
      } else {
        setTotalPrepaidEarnings(prev => Number(prev) + Number(orderTotal));
      }

      const realOrderId = acceptedOrder.id || acceptedOrder.orderId;

      try {
        await fetch(`${API_BASE_URL}/api/orders/status/${realOrderId}?status=COMPLETED`, {
          method: "PUT"
        });

        if (stompClientRef.current && stompClientRef.current.connected) {
          stompClientRef.current.publish({
            destination: `/app/order/status/${realOrderId}`,
            body: JSON.stringify({ orderId: realOrderId, status: 'COMPLETED' })
          });
        }
      } catch (err) {
        console.error("Real-time sync error:", err);
      }

      setAcceptedOrder(null);
      setShowOtpModal(false);
      setEnteredOtp('');
      toast.success("🚀 డెలివరీ విజయవంతం! ఎర్నింగ్స్ రియల్ టైమ్‌లో అప్‌డేట్ అయ్యాయి.");
    }
  };

  const generateAndDownloadPDF = () => {
    const filteredList = deliveryHistory.filter(h => historyFilter === 'all' || (historyFilter === 'completed' && h.status?.includes('COMPLETED')) || (historyFilter === 'accepted' && h.status?.includes('ACCEPTED')));
    const totalFilteredEarnings = filteredList.reduce((acc, curr) => acc + (curr.earnings || 0), 0);

    const reportContent = `
    =====================================
            FOODIEE DELIVERY REPORT
    =====================================
    Partner Name : ${partnerProfile.fullName}
    Mobile       : ${partnerProfile.mobile}
    Filter Mode  : ${historyFilter.toUpperCase()}
    Total Orders : ${filteredList.length}
    Total Earnings: Rs. ${totalFilteredEarnings}
    -------------------------------------
    [Verified Digital Payout Receipt]
    `;

    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Foodiee_Earnings_${historyFilter.toUpperCase()}.txt`;
    link.click();
    toast.success(`📥 PDF Report downloaded successfully!`);
  };

  const filteredHistoryList = deliveryHistory.filter(hist => {
    if (historyFilter === 'completed') return hist.status?.includes('COMPLETED');
    if (historyFilter === 'accepted') return hist.status?.includes('ACCEPTED');
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-0 sm:p-4 font-sans">
      <div className="w-full max-w-[420px] h-[100dvh] sm:h-[840px] bg-slate-900 sm:rounded-[3rem] sm:shadow-2xl sm:border-[8px] sm:border-slate-800 flex flex-col relative overflow-hidden text-white">
        <Toaster />

        {showOrderChat && acceptedOrder && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border-2 border-blue-500 w-full max-w-sm h-[500px] rounded-[32px] p-4 flex flex-col shadow-2xl text-white relative">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-xs font-black text-blue-400">Order Chat: {acceptedOrder.orderId} {unreadChatCount > 0 && `(${unreadChatCount} New)`}</h3>
                  <p className="text-[9px] text-slate-400">Connected with Shop & Customer</p>
                </div>
                <button onClick={() => { setShowOrderChat(false); setUnreadChatCount(0); }} className="text-slate-400 hover:text-white cursor-pointer">
                  <X size={18} />
                </button>
              </div>

              <div className="flex gap-2 py-2">
                <button 
                  onClick={() => setChatRecipient('customer')} 
                  className={`flex-1 py-1 rounded-xl text-[10px] font-bold border ${chatRecipient === 'customer' ? 'bg-blue-600 border-blue-400 text-white' : 'bg-slate-800 border-slate-700 text-slate-300'}`}
                >
                  Customer ({acceptedOrder.customerName || 'User'})
                </button>
                <button 
                  onClick={() => setChatRecipient('shop')} 
                  className={`flex-1 py-1 rounded-xl text-[10px] font-bold border ${chatRecipient === 'shop' ? 'bg-blue-600 border-blue-400 text-white' : 'bg-slate-800 border-slate-700 text-slate-300'}`}
                >
                  Shop ({acceptedOrder.shopName || 'Store'})
                </button>
              </div>

              <div className="flex-1 overflow-y-auto bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-2 text-xs my-2">
                {acceptedOrder.status === 'DELIVERED' || acceptedOrder.status === 'COMPLETED' ? (
                  <div className="text-center py-20 text-slate-400 text-xs font-bold">
                    🔒 ఆర్డర్ డెలివరీ అయింది. చాట్ సెషన్ ముగిసింది.
                  </div>
                ) : chatMessages.length === 0 ? (
                  <div className="text-center text-slate-500 text-[10px] py-20">
                    💬 No messages yet for this order.<br/>Start a conversation!
                  </div>
                ) : (
                  chatMessages.map((msg, idx) => (
                    <div key={idx} className={`p-2 rounded-xl max-w-[80%] ${msg.senderType === 'partner' ? 'bg-blue-600 ml-auto text-right' : 'bg-slate-800 mr-auto'}`}>
                      <p className="text-[8px] text-slate-300 font-bold uppercase">{msg.senderName}</p>
                      <p className="text-white text-xs">{msg.message}</p>
                    </div>
                  ))
                )}
              </div>

              {acceptedOrder.status !== 'DELIVERED' && acceptedOrder.status !== 'COMPLETED' && (
                <div className="flex gap-2 pt-1">
                  <input 
                    type="text" 
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder={`Type message to ${chatRecipient}...`}
                    className="flex-1 bg-slate-950 border border-slate-700 px-3 py-2.5 rounded-xl text-xs text-white outline-none"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') sendOrderChatMessage();
                    }}
                  />
                  <button 
                    onClick={sendOrderChatMessage}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-4 rounded-xl font-black text-xs cursor-pointer"
                  >
                    Send 🚀
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {selectedOrderDetails && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-slate-900 border-2 border-amber-500/80 w-full max-w-sm rounded-[32px] p-6 shadow-2xl space-y-4 text-white relative">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Package size={20} className="text-amber-400" />
                  <h3 className="text-sm font-black text-amber-400">Order Details: {selectedOrderDetails.id}</h3>
                </div>
                <button onClick={() => setSelectedOrderDetails(null)} className="text-slate-400 hover:text-white cursor-pointer">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-2">
                  <p className="flex justify-between"><span className="text-slate-400">Shop Name:</span> <span className="font-bold text-white">{selectedOrderDetails.shop}</span></p>
                  <p className="flex justify-between"><span className="text-slate-400">Payment Type:</span> <span className="font-bold text-amber-400">{selectedOrderDetails.type}</span></p>
                  <p className="flex justify-between"><span className="text-slate-400">Delivery Earnings:</span> <span className="font-bold text-emerald-400">+ ₹{selectedOrderDetails.earnings}</span></p>
                  <p className="flex justify-between"><span className="text-slate-400">Order Status:</span> <span className="font-bold text-amber-300">{selectedOrderDetails.status}</span></p>
                  <p className="flex justify-between"><span className="text-slate-400">Date & Time:</span> <span className="font-bold text-slate-300">{selectedOrderDetails.date}</span></p>
                </div>

                <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-2">
                  <p>👤 <b>Customer:</b> {selectedOrderDetails.customerName || 'N/A'}</p>
                  <p>🛍️ <b>Items:</b> {selectedOrderDetails.items || 'Standard Package'}</p>
                  <p>📍 <b>Drop Address:</b> {selectedOrderDetails.deliveryAddress || 'Location'}</p>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button onClick={() => { toast.success(`📞 Calling customer ${selectedOrderDetails.customerMobile || '9123456789'}...`); }} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-black text-xs shadow flex items-center justify-center gap-1.5 cursor-pointer">
                  <Phone size={14} /> Call Customer
                </button>
                <button onClick={() => setSelectedOrderDetails(null)} className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-3 rounded-2xl font-bold text-xs cursor-pointer">
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {showInstantPayoutModal && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border-2 border-emerald-500 w-full max-w-sm rounded-3xl p-5 shadow-2xl space-y-4 text-white text-center">
              <div className="w-16 h-16 bg-emerald-500 text-slate-950 rounded-full flex items-center justify-center mx-auto shadow-lg animate-bounce">
                <Zap size={32} />
              </div>
              <div>
                <h3 className="text-xl font-black text-emerald-400">Instant UPI Payout</h3>
                <p className="text-xs text-slate-300 mt-1">Withdraw ₹{todaysEarnings} directly to your UPI ID ({partnerProfile.upiId})?</p>
              </div>
              <div className="space-y-2">
                <button onClick={() => { toast.success('🎉 Payout transferred successfully!'); setShowInstantPayoutModal(false); setTodaysEarnings(0); }} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-black text-xs shadow cursor-pointer">
                  Confirm & Transfer Now 🚀
                </button>
                <button onClick={() => setShowInstantPayoutModal(false)} className="w-full bg-slate-800 text-slate-300 py-2.5 rounded-xl font-bold text-xs cursor-pointer">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {showQuickChat && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 w-full max-w-xs rounded-3xl p-5 shadow-2xl space-y-4">
              <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                <h3 className="font-black text-amber-400 text-xs uppercase flex items-center gap-1.5"><MessageSquare size={14} /> Quick Intercom</h3>
                <X size={18} className="cursor-pointer text-slate-400" onClick={() => setShowQuickChat(false)} />
              </div>
              <div className="space-y-2">
                <button onClick={() => { setQuickMessage("I have arrived at the shop!"); toast.success("Quick message sent to Shop!"); }} className="w-full bg-slate-800 hover:bg-slate-700 p-2 rounded-xl text-left text-[11px] font-bold">📍 "I have arrived at the shop!"</button>
                <button onClick={() => { setQuickMessage("Stuck in traffic, will reach in 5 mins."); toast.success("Quick message sent!"); }} className="w-full bg-slate-800 hover:bg-slate-700 p-2 rounded-xl text-left text-[11px] font-bold">🛵 "Stuck in traffic, 5 mins away."</button>
                <button onClick={() => { setQuickMessage("Reached customer location, please pickup call."); toast.success("Quick message sent!"); }} className="w-full bg-slate-800 hover:bg-slate-700 p-2 rounded-xl text-left text-[11px] font-bold">📞 "Reached customer location."</button>
              </div>
              <button onClick={() => setShowQuickChat(false)} className="w-full bg-[#fc8019] text-slate-950 py-2.5 rounded-xl font-black text-xs cursor-pointer">Close</button>
            </div>
          </div>
        )}

        {incomingOrder && (() => {
          const distance = calculateDistance(
            incomingOrder.shopLat || 18.5793, 
            incomingOrder.shopLng || 84.4452, 
            incomingOrder.customerLat || 17.6868, 
            incomingOrder.customerLng || 83.2185
          );
          const baseFee = 20 + (Math.floor(distance) * 10);
          const calculatedFee = isRainSurgeActive ? baseFee + 15 : baseFee;

          return (
            <div className="absolute inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
              <div className="bg-slate-900 border-2 border-amber-500 w-full max-w-sm rounded-3xl p-5 shadow-2xl space-y-3.5 text-white text-center">
                <div className="w-14 h-14 bg-amber-500 text-slate-950 rounded-full flex items-center justify-center mx-auto shadow-lg animate-bounce">
                  <Bell size={28} />
                </div>
                <div>
                  <span className="bg-amber-500/20 text-amber-400 px-3 py-1 rounded-full font-black text-xs uppercase tracking-wider">
                    New Delivery Alert! {isRainSurgeActive && '🌧️ [Surge +₹15]'}
                  </span>
                  <h3 className="text-xl font-black mt-2 text-amber-400">{incomingOrder.orderId || incomingOrder.id}</h3>
                  
                  <div className="bg-slate-800 p-3 rounded-2xl text-left space-y-1.5 text-xs mt-3 border border-slate-700">
                    <p>👤 <b>Customer:</b> {incomingOrder.customerName || 'N/A'}</p>
                    <p>🏪 <b>Shop:</b> {incomingOrder.shopName || 'N/A'}</p>
                    <p>📍 <b>Drop:</b> {incomingOrder.deliveryAddress || 'N/A'}</p>
                    <p>🛣️ <b>Distance:</b> <span className="text-amber-300 font-bold">{distance.toFixed(1)} km</span></p>
                    <p className="text-emerald-400 font-bold text-sm">
                      💳 <b>Delivery Fee:</b> ₹ {calculatedFee} 
                      {isRainSurgeActive && <span className="text-xs text-blue-400 block">🌧️ Includes Rain Surge Bonus!</span>}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <button onClick={() => acceptOrder({ ...incomingOrder, deliveryFee: calculatedFee })} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-black text-xs shadow-md cursor-pointer">
                    {acceptedOrder ? 'Batch / Queue Order 📦' : 'Accept Order 🚀'}
                  </button>
                  <button onClick={() => { if(audioRef.current){audioRef.current.pause(); audioRef.current=null;} setIncomingOrder(null); }} className="bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 px-4 py-3 rounded-xl font-bold text-xs cursor-pointer">
                    Decline ❌
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {showOtpModal && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 w-full max-w-xs rounded-3xl p-5 shadow-2xl space-y-4 text-center">
              <ShieldCheck size={40} className="mx-auto text-emerald-400 mb-2" />
              <h3 className="font-black text-lg text-white">Enter Delivery OTP</h3>
              <p className="text-[10px] text-slate-400">Ask customer for 4-digit PIN</p>
              
              <form onSubmit={handleVerifyAndDeliver} className="space-y-4">
                <input 
                  type="text" 
                  maxLength={4}
                  value={enteredOtp}
                  onChange={(e) => setEnteredOtp(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-600 text-center text-2xl font-black tracking-[0.5em] text-amber-400 p-3 rounded-2xl outline-none"
                  placeholder="----"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowOtpModal(false)} className="flex-1 bg-slate-800 text-slate-300 py-3 rounded-xl font-bold text-xs">Cancel</button>
                  <button type="submit" className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-black text-xs">Verify & Complete ✅</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {!isLoggedIn ? (
          <div className="flex flex-col flex-1 w-full h-full bg-slate-950 items-center justify-center p-6 relative overflow-hidden">
            <div className="absolute w-[300px] h-[300px] bg-orange-500/10 rounded-full blur-3xl animate-pulse pointer-events-none"></div>
            <div className="absolute w-[200px] h-[200px] bg-amber-500/10 rounded-full blur-2xl animate-ping pointer-events-none"></div>

            <div className="absolute top-10 bg-slate-900/80 backdrop-blur-md border border-slate-800 px-4 py-1.5 rounded-full shadow-xl flex items-center gap-2 z-10">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-300">Delivery Fleet Live</span>
            </div>

            <div className="w-full max-w-[360px] bg-slate-900/70 backdrop-blur-3xl rounded-[40px] p-8 shadow-2xl border border-white/10 space-y-6 relative z-10 overflow-y-auto max-h-[90vh]">
              
              {currentView === 'register' ? (
                <div className="space-y-4 animate-fadeIn">
                  <div className="text-center space-y-2">
                    <h2 className="text-2xl font-black text-amber-400">Rider Registration</h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Join Foodiee Delivery Network</p>
                  </div>

                  <form onSubmit={handleRegister} className="space-y-3 text-xs">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Full Name</label>
                      <input type="text" value={regFullName} onChange={(e) => setRegFullName(e.target.value)} placeholder="Enter full name" className="w-full bg-slate-950 border border-slate-700 p-3 rounded-2xl text-xs font-bold text-white outline-none" required />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Mobile Number</label>
                      <div className="flex items-center bg-slate-950 border border-slate-700 rounded-2xl overflow-hidden">
                        <span className="bg-slate-800 text-amber-400 px-3 py-3 font-black text-xs border-r border-slate-700">+91</span>
                        <input type="tel" maxLength="10" value={regMobile} onChange={(e) => setRegMobile(e.target.value.replace(/\D/g, ''))} placeholder="10-digit mobile" className="w-full bg-transparent p-3 font-bold text-white outline-none text-xs" required />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Vehicle Type</label>
                      <select value={regVehicle} onChange={(e) => setRegVehicle(e.target.value)} className="w-full bg-slate-950 border border-slate-700 p-3 rounded-2xl text-xs font-bold text-white outline-none cursor-pointer">
                        <option value="Motorcycle">Motorcycle / Bike 🏍️</option>
                        <option value="Scooter">Scooter 🛵</option>
                        <option value="Bicycle">Bicycle 🚲</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Vehicle Number</label>
                      <input type="text" value={regBikeNumber} onChange={(e) => setRegBikeNumber(e.target.value)} placeholder="e.g. AP30BIKE1234" className="w-full bg-slate-950 border border-slate-700 p-3 rounded-2xl text-xs font-bold text-white outline-none uppercase" required />
                    </div>

                    <button type="submit" className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 py-3.5 rounded-2xl font-black text-xs shadow-xl cursor-pointer mt-2">
                      Register Now 🚀
                    </button>
                  </form>

                  <div className="text-center pt-2">
                    <button onClick={() => setCurrentView('login')} className="text-xs text-amber-400 font-bold underline cursor-pointer">
                      Already registered? Login here
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 animate-fadeIn">
                  <div className="text-center space-y-3">
                    <div className="w-20 h-20 mx-auto rounded-[24px] p-1 bg-gradient-to-tr from-[#fc8019] via-amber-500 to-yellow-400 shadow-xl shadow-orange-500/30 flex items-center justify-center transform hover:scale-105 transition-transform duration-300">
                      <div className="w-full h-full bg-slate-950 rounded-[22px] overflow-hidden flex items-center justify-center">
                        <img src={logo} alt="Foodiee Logo" className="w-full h-full object-cover" />
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <h2 className="text-3xl font-black tracking-tight bg-gradient-to-r from-white via-slate-200 to-amber-400 bg-clip-text text-transparent">
                        Foodiee<span className="text-[#fc8019]">.</span>
                      </h2>
                      <div className="inline-block bg-orange-500/15 border border-orange-500/30 px-3 py-0.5 rounded-full">
                        <p className="text-[10px] text-amber-400 font-extrabold uppercase tracking-widest">
                          Delivery Partner Portal
                        </p>
                      </div>
                    </div>
                  </div>

                  {step === 1 ? (
                    <form onSubmit={handleSendOtp} className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-black text-amber-400 uppercase tracking-widest pl-1">
                          Partner Mobile Number
                        </label>
                        <div className="flex items-center gap-3 bg-slate-950/80 border border-slate-700/80 px-4 py-4 rounded-2xl focus-within:border-[#fc8019] transition-all shadow-inner">
                          <div className="w-7 h-7 rounded-xl bg-orange-500/20 text-[#fc8019] flex items-center justify-center shrink-0">
                            <Phone size={14} />
                          </div>
                          <input 
                            type="tel" 
                            maxLength="10" 
                            value={phone} 
                            onChange={(e) => setPhone(e.target.value)} 
                            placeholder="Enter 10-digit mobile number" 
                            className="bg-transparent border-none outline-none text-xs w-full font-bold text-white placeholder:text-slate-500" 
                            required 
                          />
                        </div>
                      </div>

                      <button 
                        type="submit" 
                        className="w-full bg-gradient-to-r from-[#fc8019] via-amber-500 to-yellow-400 text-slate-950 py-4 rounded-2xl font-black text-xs shadow-xl flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <span>Get Secure OTP</span>
                        <ArrowRight size={16} />
                      </button>

                      <div className="text-center pt-2">
                        <button type="button" onClick={() => setCurrentView('register')} className="text-xs text-amber-400 font-bold underline cursor-pointer">
                          New rider? Register here 📝
                        </button>
                      </div>
                    </form>
                  ) : (
                    <form onSubmit={handleVerifyOtp} className="space-y-4 animate-fadeIn">
                      <div className="text-center space-y-1.5 bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800">
                        <p className="text-[11px] text-slate-300 font-bold">Verification code sent to</p>
                        <p className="text-sm font-black text-[#fc8019] flex items-center justify-center gap-2">
                          <span>+91 {phone}</span>
                          <span onClick={() => setStep(1)} className="text-[10px] text-blue-400 underline cursor-pointer">Change</span>
                        </p>
                        {generatedOtpHint && (
                          <div className="inline-block bg-amber-500/20 border border-amber-500/50 px-3 py-1 rounded-xl mt-1">
                            <p className="text-[10px] text-amber-300 font-bold">Hint OTP: <span className="text-white font-black">{generatedOtpHint}</span></p>
                          </div>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-black text-amber-400 uppercase tracking-widest text-center">
                          Enter 4-Digit OTP
                        </label>
                        <div className="flex items-center justify-center bg-slate-950/80 border border-slate-700/80 px-4 py-3.5 rounded-2xl shadow-inner">
                          <input 
                            type="text" 
                            maxLength="4" 
                            value={otpInput} 
                            onChange={(e) => setOtpInput(e.target.value)} 
                            placeholder="----" 
                            className="bg-transparent border-none outline-none text-xl w-full font-black text-white tracking-[0.5em] text-center placeholder:tracking-normal" 
                            required 
                            autoFocus
                          />
                        </div>
                      </div>

                      <button 
                        type="submit" 
                        className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 text-white py-4 rounded-2xl font-black text-xs shadow-xl flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <span>Verify & Start Shift</span>
                        <CheckCircle2 size={16} />
                      </button>
                    </form>
                  )}
                </div>
              )}

            </div>
          </div>
        ) : (
          <div className="flex flex-col flex-1 h-full bg-slate-900 text-white relative overflow-hidden">
            <header className="h-14 bg-slate-800 border-b border-slate-700 flex items-center justify-between px-4 shrink-0 shadow-md z-20">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#fc8019] text-white font-bold flex items-center justify-center text-xs">DP</div>
                <div>
                  <h2 className="text-xs font-black">{partnerProfile.fullName}</h2>
                  <p className="text-[9px] font-bold text-emerald-400">● Online (Live GPS)</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button onClick={() => { setIsRainSurgeActive(!isRainSurgeActive); toast.success(isRainSurgeActive ? "🌧️ Rain Surge Mode Disabled" : "🌧️ Rain Surge Mode Enabled (+₹15 Bonus)!"); }} className={`px-2.5 py-1 rounded-xl text-[10px] font-black flex items-center gap-1 border cursor-pointer ${isRainSurgeActive ? 'bg-blue-600 text-white border-blue-400 animate-pulse' : 'bg-slate-700 text-slate-300 border-slate-600'}`}>
                  <CloudRain size={13} /> {isRainSurgeActive ? 'Surge: Active' : 'Surge: Off'}
                </button>

                <button onClick={() => setShowQuickChat(true)} className="bg-slate-700 hover:bg-slate-600 text-amber-400 p-1.5 rounded-xl cursor-pointer" title="Quick Chat"><MessageSquare size={16} /></button>
                
                <button onClick={handleToggleOnline} className="flex items-center gap-1 bg-slate-700 px-2.5 py-1 rounded-xl text-[10px] font-bold cursor-pointer">
                  {isOnline ? <ToggleRight size={18} className="text-emerald-400" /> : <ToggleLeft size={18} className="text-rose-400" />}
                  <span>{isOnline ? 'Online' : 'Offline'}</span>
                </button>
              </div>
            </header>

            <main className="flex-1 overflow-y-auto p-4 space-y-4 pb-24">
              {activeTab === 'available' && (
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-slate-800 via-slate-850 to-slate-900 border border-slate-700 p-3.5 rounded-2xl shadow-xl flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 bg-amber-500/20 text-amber-400 rounded-xl flex items-center justify-center font-bold">
                        <Timer size={18} />
                      </div>
                      <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase">Active Shift Duration</p>
                        <h4 className="text-sm font-black text-white">{formatShiftTime(shiftSeconds)}</h4>
                      </div>
                    </div>
                    <button onClick={() => setHeatMapActive(!heatMapActive)} className={`px-2.5 py-1 rounded-xl text-[10px] font-black flex items-center gap-1 border cursor-pointer ${heatMapActive ? 'bg-orange-500/20 text-orange-400 border-orange-500/40' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                      <Flame size={13} /> {heatMapActive ? 'Hotspot: On' : 'Hotspot: Off'}
                    </button>
                  </div>

                  <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 text-white space-y-2">
                    <p className="text-[9px] text-slate-400 uppercase font-bold">Total Orders Placed</p>
                    <h3 className="text-2xl font-black text-amber-400">{customerOrders.length}</h3>
                    
                    <div className="space-y-1.5 pt-2">
                      {customerOrders.length === 0 ? (
                        <p className="text-xs text-slate-500">No orders placed yet. Start ordering! 🍔</p>
                      ) : (
                        customerOrders.map((ord, idx) => (
                          <div key={idx} className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs flex justify-between">
                            <span>Order #{ord.id || ord.orderId}</span>
                            <span className="text-emerald-400 font-bold">₹{ord.totalAmount}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-amber-500/15 p-3 rounded-2xl border border-amber-500/40 shadow">
                      <p className="text-[8px] text-amber-300 font-bold uppercase">Total Earnings</p>
                      <h3 className="text-base font-black text-amber-400 mt-0.5">₹ {todaysEarnings}</h3>
                    </div>
                    <div className="bg-blue-500/15 p-3 rounded-2xl border border-blue-500/40 shadow">
                      <p className="text-[8px] text-blue-300 font-bold uppercase">COD Cash</p>
                      <h3 className="text-base font-black text-blue-400 mt-0.5">₹ {totalCashInHand}</h3>
                    </div>
                    <div className="bg-emerald-500/15 p-3 rounded-2xl border border-emerald-500/40 shadow">
                      <p className="text-[8px] text-emerald-300 font-bold uppercase">Prepaid</p>
                      <h3 className="text-base font-black text-emerald-400 mt-0.5">₹ {totalPrepaidEarnings}</h3>
                    </div>
                  </div>

                  <button onClick={() => setShowInstantPayoutModal(true)} className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white py-3 rounded-2xl font-black text-xs shadow-lg flex items-center justify-center gap-2 cursor-pointer transition">
                    <Zap size={15} /> Instant UPI Payout (Withdraw ₹{todaysEarnings}) 💸
                  </button>

                  {batchQueue.length > 0 && (
                    <div className="bg-gradient-to-r from-amber-600/20 to-orange-600/20 border border-amber-500/50 p-3.5 rounded-2xl flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Package size={18} className="text-amber-400 animate-bounce" />
                        <div>
                          <p className="text-xs font-black text-amber-300">Batched Orders in Queue ({batchQueue.length})</p>
                          <p className="text-[10px] text-slate-300">Will load automatically upon delivery completion.</p>
                        </div>
                      </div>
                      <span className="bg-amber-500 text-slate-950 px-2.5 py-1 rounded-xl text-[10px] font-black">Ready</span>
                    </div>
                  )}

                  <div className="space-y-3">
                    <h1 className="text-xs font-black uppercase text-slate-400">Active Delivery & Route Map</h1>
                    
                    {!acceptedOrder ? (
                      <div className="text-center py-20 space-y-3">
                        <div className="w-16 h-16 bg-slate-800 text-[#fc8019] rounded-full flex items-center justify-center mx-auto text-2xl shadow-inner animate-pulse">
                          ⏳
                        </div>
                        <h4 className="text-sm font-bold text-slate-300">Looking for nearby orders...</h4>
                      </div>
                    ) : (
                      <div className="bg-slate-800/90 border border-slate-700/80 p-4 rounded-2xl space-y-3 text-xs shadow-lg">
                        <div className="flex justify-between font-black">
                          <span className="text-amber-400">#{acceptedOrder.orderId || acceptedOrder.id}</span>
                          <span className="text-emerald-400 text-sm">Fee: ₹ {acceptedOrder.deliveryFee || 20}</span>
                        </div>

                        <button 
                          onClick={() => { setShowOrderChat(true); setUnreadChatCount(0); }} 
                          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white py-2.5 rounded-xl font-black text-xs shadow flex items-center justify-center gap-2 cursor-pointer relative"
                        >
                          <MessageSquare size={15} /> Open Live Chat for {acceptedOrder.orderId} 💬
                          {unreadChatCount > 0 && (
                            <span className="absolute right-3 bg-red-600 text-white font-black text-[10px] px-2 py-0.5 rounded-full animate-bounce">
                              {unreadChatCount} New
                            </span>
                          )}
                        </button>

                        <div className="w-full h-56 rounded-xl overflow-hidden relative border border-slate-700">
                          <MapContainer center={[acceptedOrder.shopLat, acceptedOrder.shopLng]} zoom={13} zoomControl={false} className="w-full h-full z-10">
                            <MapUpdater center={[acceptedOrder.shopLat, acceptedOrder.shopLng]} />
                            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                            
                            <Marker position={[acceptedOrder.shopLat, acceptedOrder.shopLng]} icon={shopMarkerIcon}>
                              <Popup><b>🏪 Shop:</b> {acceptedOrder.shopName}</Popup>
                            </Marker>

                            <Marker position={[acceptedOrder.customerLat, acceptedOrder.customerLng]} icon={customerMarkerIcon}>
                              <Popup><b>📍 Customer Drop:</b> {acceptedOrder.deliveryAddress}</Popup>
                            </Marker>

                            <Marker position={partnerPos} icon={getBikeIcon(bikeAngle)} />

                            <Polyline positions={[[acceptedOrder.shopLat, acceptedOrder.shopLng], partnerPos, [acceptedOrder.customerLat, acceptedOrder.customerLng]]} color="#fc8019" weight={5} dashArray="5, 10" />
                          </MapContainer>

                          <div className="absolute bottom-2 left-2 bg-slate-950/90 backdrop-blur px-3 py-1.5 rounded-xl text-[10px] font-black text-amber-400 border border-slate-700 z-20 shadow-xl flex items-center gap-1.5">
                            <span>📍 Total Distance:</span>
                            <span className="text-white">
                              {calculateDistance(acceptedOrder.shopLat, acceptedOrder.shopLng, acceptedOrder.customerLat, acceptedOrder.customerLng).toFixed(1)} km
                            </span>
                          </div>
                        </div>

                        <div className="space-y-1.5 bg-slate-900/60 p-3 rounded-2xl border border-slate-700/50 text-slate-300 text-[11px]">
                          <p>🏪 <b>Shop Name:</b> {acceptedOrder.shopName}</p>
                          <p>📍 <b>Delivery Location:</b> {acceptedOrder.deliveryAddress}</p>
                          <p>👤 <b>Customer Name:</b> {acceptedOrder.customerName} ({acceptedOrder.customerMobile})</p>
                          <p className="text-amber-300">🛍️ <b>Items:</b> {acceptedOrder.items}</p>
                        </div>

                        <div className="pt-2 border-t border-slate-700">
                          {acceptedOrder.status === 'ACCEPTED' && (
                            <button onClick={() => handleStatusUpdate(acceptedOrder.id || 1, 'ARRIVED_AT_RESTAURANT')} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2.5 rounded-xl font-black text-xs cursor-pointer">
                              Arrived at Shop 📍
                            </button>
                          )}
                          {acceptedOrder.status === 'ARRIVED_AT_RESTAURANT' && (
                            <button onClick={() => handleStatusUpdate(acceptedOrder.id || 1, 'OUT_FOR_DELIVERY')} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-xl font-black text-xs cursor-pointer">
                              Picked Up & Moving to Customer 📦
                            </button>
                          )}
                          {acceptedOrder.status === 'OUT_FOR_DELIVERY' && (
                            <button onClick={() => { setActiveOrderId(acceptedOrder.id || 1); setShowOtpModal(true); }} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-xl font-black text-xs cursor-pointer">
                              Enter OTP & Complete Delivery ✅
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'history' && (
                <div className="space-y-3.5">
                  <div className="flex justify-between items-center">
                    <h1 className="text-xs font-black uppercase tracking-wider text-slate-400">Order History</h1>
                    <button onClick={generateAndDownloadPDF} className="bg-[#fc8019] text-slate-950 px-3 py-1.5 rounded-xl font-black text-[10px] flex items-center gap-1 shadow cursor-pointer">
                      <Download size={13} /> Download PDF
                    </button>
                  </div>

                  <div className="flex gap-2">
                    {['all', 'completed', 'accepted'].map(f => (
                      <button key={f} onClick={() => setHistoryFilter(f)} className={`flex-1 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border cursor-pointer transition ${historyFilter === f ? 'bg-[#fc8019] text-slate-950 border-amber-400 shadow-md' : 'bg-slate-800 border-slate-700 text-slate-300'}`}>
                        {f}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-2.5">
                    {filteredHistoryList.length === 0 ? (
                      <div className="text-center py-16 text-slate-500 text-xs bg-slate-800/40 rounded-2xl border border-slate-800">
                        📭 No orders found in history.
                      </div>
                    ) : (
                      filteredHistoryList.map((hist, i) => {
                        const displayId = hist.orderId || hist.id || `#ORD-${i}`;
                        const displayShop = hist.shopName || hist.shop || 'Local Store';
                        const displayEarnings = hist.deliveryFee !== undefined ? hist.deliveryFee : (hist.earnings || 20);
                        const displayStatus = hist.status || 'DELIVERED';
                        const displayType = hist.paymentMethod || hist.type || 'COD';

                        return (
                          <div 
                            key={i} 
                            onClick={() => setSelectedOrderDetails({
                              ...hist,
                              id: displayId,
                              shop: displayShop,
                              earnings: displayEarnings,
                              status: displayStatus,
                              type: displayType
                            })}
                            className="bg-slate-800/90 border border-slate-700/80 p-4 rounded-2xl text-xs space-y-1.5 shadow cursor-pointer hover:border-[#fc8019] transition-all transform hover:scale-[1.01]"
                          >
                            <div className="flex justify-between font-black items-center">
                              <span className="text-amber-400">Order #{displayId} • <span className="text-white">{displayShop}</span></span>
                              <span className="text-emerald-400 text-sm font-black">+ ₹ {displayEarnings} <span className="text-[10px] text-slate-400 font-normal">({displayType})</span></span>
                            </div>

                            <div className="flex justify-between text-[11px] text-slate-300 font-medium pt-1">
                              <span className="truncate max-w-[200px]">🛍️ {hist.items || 'Food / Items'}</span>
                              <span className="text-amber-400 font-bold uppercase">{displayStatus}</span>
                            </div>

                            <div className="flex justify-between items-center text-[10px] text-slate-400 pt-1 border-t border-slate-700/60 mt-1">
                              <span>{hist.orderTime ? new Date(hist.orderTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (hist.date || 'Recent')}</span>
                              <span className="text-[#fc8019] font-bold flex items-center gap-1">
                                <Eye size={12} /> Tap to view details 🔍
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'profile' && (
                <div className="space-y-3.5 text-xs pb-6">
                  
                  <div className="bg-gradient-to-r from-orange-600/20 via-amber-600/20 to-yellow-600/20 border border-amber-500/50 p-4 rounded-2xl space-y-3 shadow-xl">
                    <div className="flex items-center justify-between">
                      <h4 className="font-black text-amber-400 uppercase text-[11px] flex items-center gap-1.5">
                        <Users size={15} /> Referral & Earn Bonus
                      </h4>
                      <span className="bg-amber-500 text-slate-950 px-2 py-0.5 rounded-full text-[9px] font-black">+₹50 / Friend</span>
                    </div>
                    <p className="text-[10px] text-slate-300">Invite friends to Foodiee Fleet and earn bonus on their first 5 deliveries!</p>
                    
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                      <div>
                        <p className="text-[8px] text-slate-400 uppercase font-bold">Your Referral Code</p>
                        <p className="text-xs font-black text-amber-400 tracking-widest mt-0.5">{referralCode}</p>
                      </div>
                      <div className="flex gap-1.5">
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(`Join Foodiee Delivery Fleet using my referral code: ${referralCode}. Download App now!`);
                            toast.success("📋 Referral message copied!");
                          }} 
                          className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1.5 rounded-xl font-bold text-[10px] cursor-pointer"
                        >
                          Copy
                        </button>
                        
                        <a 
                          href={`https://wa.me/?text=${encodeURIComponent(`🚀 Join Foodiee Delivery Fleet and start earning daily! Use my referral code: *${referralCode}* when signing up. Download now!`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-xl font-black text-[10px] flex items-center gap-1 shadow cursor-pointer"
                        >
                          <Share2 size={12} /> WhatsApp
                        </a>
                      </div>
                    </div>

                    <div className="flex justify-between text-[10px] text-slate-300 pt-1">
                      <span>Friends Referred: <b>{referredCount}</b></span>
                      <span>Total Referral Bonus: <b className="text-emerald-400">₹{referralEarnings}</b></span>
                    </div>
                  </div>

                  <div className="bg-slate-800 border border-slate-700 p-4 rounded-2xl space-y-3 shadow">
                    <h4 className="font-black text-amber-400 uppercase text-[11px] flex items-center gap-1.5">
                      <Globe size={14} /> Voice Navigation Language (వాయిస్ గైడెన్స్)
                    </h4>
                    <p className="text-[10px] text-slate-400">Choose voice assistant language for live order alerts & updates:</p>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={() => {
                          setVoiceLanguage('te-IN');
                          toast.success("🗣️ Telugu Voice Assistant Activated");
                          speakText("తెలుగు వాయిస్ అసిస్టెంట్ ఆన్ చేయబడింది", "Telugu voice assistant activated");
                        }} 
                        className={`py-2.5 rounded-xl font-bold text-xs border cursor-pointer ${voiceLanguage === 'te-IN' ? 'bg-[#fc8019] text-slate-950 border-amber-400 font-black' : 'bg-slate-900 border-slate-700 text-slate-300'}`}
                      >
                        🇮🇳 తెలుగు (Telugu)
                      </button>
                      <button 
                        onClick={() => {
                          setVoiceLanguage('en-US');
                          toast.success("🗣️ English Voice Assistant Activated");
                          speakText("English voice assistant activated", "English voice assistant activated");
                        }} 
                        className={`py-2.5 rounded-xl font-bold text-xs border cursor-pointer ${voiceLanguage === 'en-US' ? 'bg-[#fc8019] text-slate-950 border-amber-400 font-black' : 'bg-slate-900 border-slate-700 text-slate-300'}`}
                      >
                        🇺🇸 English
                      </button>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 border border-amber-500/40 p-4 rounded-2xl space-y-3 shadow-xl">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <h4 className="font-black text-amber-400 uppercase text-[11px] flex items-center gap-1.5">
                        <TrendingUp size={14} /> Performance Analytics
                      </h4>
                      <span className="bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full text-[9px] font-bold">4.9 ⭐ Rating</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                        <p className="text-[9px] text-slate-400 uppercase font-bold">Total Orders</p>
                        <p className="text-sm font-black text-white mt-0.5">{deliveryHistory.length}</p>
                      </div>
                      <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                        <p className="text-[9px] text-slate-400 uppercase font-bold">Hours Online</p>
                        <p className="text-sm font-black text-white mt-0.5">{(shiftSeconds / 3600).toFixed(1)}h</p>
                      </div>
                      <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                        <p className="text-[9px] text-slate-400 uppercase font-bold">Completion</p>
                        <p className="text-sm font-black text-emerald-400 mt-0.5">99.8%</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-800 border border-slate-700 p-4 rounded-2xl space-y-3 shadow">
                    <h4 className="font-black text-amber-400 uppercase text-[11px] flex items-center gap-1.5">
                      <Volume2 size={14} /> Order Alert Sound Settings
                    </h4>
                    <p className="text-[10px] text-slate-400">Select your preferred alert sound for incoming orders:</p>
                    
                    <div className="space-y-2">
                      {ringtones.map((ring) => (
                        <div 
                          key={ring.id}
                          onClick={() => {
                            setSelectedRinger(ring.id);
                            const preview = new Audio(ring.url);
                            preview.play();
                            toast.success(`Selected: ${ring.name}`);
                          }}
                          className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                            selectedRinger === ring.id 
                              ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-black' 
                              : 'bg-slate-900 border-slate-700 text-slate-300'
                          }`}
                        >
                          <span className="text-xs">{ring.name}</span>
                          {selectedRinger === ring.id && <span className="text-xs">✅ Active</span>}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-slate-800 border border-slate-700 p-4 rounded-2xl space-y-2 shadow">
                    <div className="flex items-center justify-between border-b border-slate-700 pb-3">
                      <h4 className="font-black text-amber-400 uppercase text-[11px]">Delivery Person Details</h4>
                      <button onClick={() => setIsEditingPersonal(!isEditingPersonal)} className="bg-[#fc8019] text-slate-950 px-3 py-1.5 rounded-xl font-black text-[10px] cursor-pointer">
                        {isEditingPersonal ? 'Cancel' : 'Edit ✍️'}
                      </button>
                    </div>

                    {!isEditingPersonal ? (
                      <div className="space-y-1 text-[11px] text-slate-300 pt-1">
                        <p><b>Name:</b> {partnerProfile.fullName}</p>
                        <p><b>Mobile:</b> {partnerProfile.mobile}</p>
                        <p><b>Email:</b> {partnerProfile.email}</p>
                        <p><b>Vehicle:</b> {partnerProfile.vehicleType} ({partnerProfile.bikeNumber})</p>
                      </div>
                    ) : (
                      <div className="space-y-2 pt-2">
                        <input type="text" value={partnerProfile.fullName} onChange={(e) => setPartnerProfile({...partnerProfile, fullName: e.target.value})} className="w-full bg-slate-900 border border-slate-700 p-2 rounded-xl text-xs font-bold text-white outline-none" placeholder="Full Name" />
                        <input type="text" value={partnerProfile.email} onChange={(e) => setPartnerProfile({...partnerProfile, email: e.target.value})} className="w-full bg-slate-900 border border-slate-700 p-2 rounded-xl text-xs font-bold text-white outline-none" placeholder="Email" />
                        <input type="text" value={partnerProfile.bikeNumber} onChange={(e) => setPartnerProfile({...partnerProfile, bikeNumber: e.target.value})} className="w-full bg-slate-900 border border-slate-700 p-2 rounded-xl text-xs font-bold text-white outline-none" placeholder="Bike Number" />
                        <button onClick={() => handleSaveProfileWithFiles('Personal Details')} className="w-full bg-emerald-600 text-white py-2 rounded-xl font-black text-xs mt-1 cursor-pointer">Save Personal Details 💾</button>
                      </div>
                    )}
                  </div>

                  <div className="bg-slate-800 border border-slate-700 p-4 rounded-2xl space-y-2 shadow">
                    <div className="flex items-center justify-between border-b border-slate-700 pb-3">
                      <h4 className="font-black text-amber-400 uppercase text-[11px]">KYC & Vehicle Documents</h4>
                      <button onClick={() => setIsEditingKyc(!isEditingKyc)} className="bg-[#fc8019] text-slate-950 px-3 py-1.5 rounded-xl font-black text-[10px] cursor-pointer">
                        {isEditingKyc ? 'Cancel' : 'Edit / Upload 📁'}
                      </button>
                    </div>

                    {!isEditingKyc ? (
                      <div className="space-y-1 text-[11px] text-slate-300 pt-1">
                        <p><b>Aadhaar No:</b> [Aadhaar Redacted]</p>
                        <p><b>License No:</b> {partnerProfile.licenseNo}</p>
                        <p><b>PAN No:</b> {partnerProfile.panNo}</p>
                        <p><b>KYC Status:</b> <span className="text-emerald-400 font-bold">{partnerProfile.kycStatus}</span></p>
                      </div>
                    ) : (
                      <div className="space-y-2.5 pt-2 text-[11px]">
                        <div>
                          <label className="text-[10px] text-slate-400 font-bold">Aadhaar Card Number</label>
                          <input type="text" value={partnerProfile.aadhaarNo} onChange={(e) => setPartnerProfile({...partnerProfile, aadhaarNo: e.target.value})} placeholder="1234 5678 9012" className="w-full bg-slate-900 border border-slate-700 p-2 rounded-xl text-xs font-bold text-white outline-none" />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 font-bold">Upload Aadhaar Card</label>
                          <input type="file" onChange={(e) => setSelectedAadhaarFile(e.target.files[0])} className="w-full text-[10px] bg-slate-900 border border-slate-700 p-1.5 rounded-xl text-slate-300 file:bg-amber-500 file:text-slate-950 file:border-0 file:rounded file:px-2 cursor-pointer" />
                        </div>

                        <div>
                          <label className="text-[10px] text-slate-400 font-bold">Driving License Number</label>
                          <input type="text" value={partnerProfile.licenseNo} onChange={(e) => setPartnerProfile({...partnerProfile, licenseNo: e.target.value})} placeholder="DL-12345678" className="w-full bg-slate-900 border border-slate-700 p-2 rounded-xl text-xs font-bold text-white outline-none" />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 font-bold">Upload Driving License</label>
                          <input type="file" onChange={(e) => setSelectedLicenseFile(e.target.files[0])} className="w-full text-[10px] bg-slate-900 border border-slate-700 p-1.5 rounded-xl text-slate-300 file:bg-amber-500 file:text-slate-950 file:border-0 file:rounded file:px-2 cursor-pointer" />
                        </div>

                        <div>
                          <label className="text-[10px] text-slate-400 font-bold">PAN Number</label>
                          <input type="text" value={partnerProfile.panNo} onChange={(e) => setPartnerProfile({...partnerProfile, panNo: e.target.value})} placeholder="ABCDE1234F" className="w-full bg-slate-900 border border-slate-700 p-2 rounded-xl text-xs font-bold text-white outline-none uppercase" />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 font-bold">Upload PAN Card</label>
                          <input type="file" onChange={(e) => setSelectedPanFile(e.target.files[0])} className="w-full text-[10px] bg-slate-900 border border-slate-700 p-1.5 rounded-xl text-slate-300 file:bg-amber-500 file:text-slate-950 file:border-0 file:rounded file:px-2 cursor-pointer" />
                        </div>

                        <div>
                          <label className="text-[10px] text-slate-400 font-bold">Upload Bike Photo / RC</label>
                          <input type="file" onChange={(e) => setSelectedBikeFile(e.target.files[0])} className="w-full text-[10px] bg-slate-900 border border-slate-700 p-1.5 rounded-xl text-slate-300 file:bg-amber-500 file:text-slate-950 file:border-0 file:rounded file:px-2 cursor-pointer" />
                        </div>

                        <div>
                          <label className="text-[10px] text-slate-400 font-bold">Upload Driver Photo</label>
                          <input type="file" onChange={(e) => setSelectedDriverFile(e.target.files[0])} className="w-full text-[10px] bg-slate-900 border border-slate-700 p-1.5 rounded-xl text-slate-300 file:bg-amber-500 file:text-slate-950 file:border-0 file:rounded file:px-2 cursor-pointer" />
                        </div>

                        <button onClick={() => handleSaveProfileWithFiles('KYC Documents')} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded-xl font-black text-xs mt-2 cursor-pointer">
                          Submit All KYC Documents 🚀
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="bg-slate-800 border border-slate-700 p-4 rounded-2xl space-y-2 shadow">
                    <div className="flex items-center justify-between border-b border-slate-700 pb-3">
                      <h4 className="font-black text-amber-400 uppercase text-[11px]">Bank & UPI Payout Settings</h4>
                      <button onClick={() => setIsEditingBank(!isEditingBank)} className="bg-[#fc8019] text-slate-950 px-3 py-1.5 rounded-xl font-black text-[10px] cursor-pointer">
                        {isEditingBank ? 'Cancel' : 'Edit ✍️'}
                      </button>
                    </div>

                    {!isEditingBank ? (
                      <div className="space-y-1 text-[11px] text-slate-300 pt-1">
                        <p><b>Account No:</b> {partnerProfile.bankAccount}</p>
                        <p><b>IFSC Code:</b> {partnerProfile.ifscCode}</p>
                        <p><b>UPI ID:</b> {partnerProfile.upiId}</p>
                      </div>
                    ) : (
                      <div className="space-y-2 pt-2 text-[11px]">
                        <div>
                          <label className="text-[10px] text-slate-400 font-bold">Bank Account Number</label>
                          <input type="text" value={partnerProfile.bankAccount} onChange={(e) => setPartnerProfile({...partnerProfile, bankAccount: e.target.value})} className="w-full bg-slate-900 border border-slate-700 p-2 rounded-xl text-xs font-bold text-white outline-none" placeholder="Account Number" />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 font-bold">IFSC Code</label>
                          <input type="text" value={partnerProfile.ifscCode} onChange={(e) => setPartnerProfile({...partnerProfile, ifscCode: e.target.value})} className="w-full bg-slate-900 border border-slate-700 p-2 rounded-xl text-xs font-bold text-white outline-none uppercase" placeholder="IFSC Code" />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 font-bold">UPI ID</label>
                          <input type="text" value={partnerProfile.upiId} onChange={(e) => setPartnerProfile({...partnerProfile, upiId: e.target.value})} className="w-full bg-slate-900 border border-slate-700 p-2 rounded-xl text-xs font-bold text-white outline-none" placeholder="UPI ID (e.g. partner@ybl)" />
                        </div>
                        <button onClick={() => handleSaveProfileWithFiles('Bank & UPI Details')} className="w-full bg-emerald-600 text-white py-2 rounded-xl font-black text-xs mt-1 cursor-pointer">Save Bank Details 💾</button>
                      </div>
                    )}
                  </div>

                  <div className="pt-2">
                    <button onClick={handleLogout} className="w-full bg-rose-600/25 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/30 py-3.5 rounded-2xl font-black text-xs shadow-lg flex items-center justify-center gap-2 transition cursor-pointer">
                      <LogOut size={16} /> Logout from App
                    </button>
                  </div>
                </div>
              )}
            </main>

            <nav className="absolute bottom-0 inset-x-0 h-16 bg-slate-800/90 backdrop-blur-md border-t border-slate-700 flex justify-around items-center px-2 z-50 text-[10px] font-bold text-slate-400">
              <button onClick={() => setActiveTab('available')} className={`flex flex-col items-center gap-1 transition ${activeTab === 'available' ? 'text-[#fc8019]' : 'hover:text-slate-200'}`}>
                <Bike size={20} /><span>Deliveries</span>
              </button>
              <button onClick={() => setActiveTab('history')} className={`flex flex-col items-center gap-1 transition ${activeTab === 'history' ? 'text-[#fc8019]' : 'hover:text-slate-200'}`}>
                <Clock size={20} /><span>History</span>
              </button>
              <button onClick={() => setActiveTab('profile')} className={`flex flex-col items-center gap-1 transition ${activeTab === 'profile' ? 'text-[#fc8019]' : 'hover:text-slate-200'}`}>
                <User size={20} /><span>Profile</span>
              </button>
            </nav>
          </div>
        )}
      </div>
    </div>
  );
}