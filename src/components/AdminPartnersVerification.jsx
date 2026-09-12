import React, { useState, useEffect } from 'react';
import { Users, ShieldCheck, CheckCircle2, XCircle, FileText, Download, Eye, ChevronLeft, ChevronRight, Phone, AlertCircle } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

// ✅ BASE URL UPDATE (AWS)
const API_BASE_URL = "http://Foodiee-backend-env.eba-5d9p6wzb.eu-north-1.elasticbeanstalk.com";

export default function AdminPartnersVerification() {
  const [partners, setPartners] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedDocModal, setSelectedDocModal] = useState(null);

  const fetchPartners = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/partners/all`);
      if (res.ok) {
        const data = await res.json();
        setPartners(data);
      }
    } catch (err) {
      console.error("Error fetching partners:", err);
    }
  };

  useEffect(() => {
    fetchPartners();
    const interval = setInterval(fetchPartners, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleVerifyKyc = async (id, status) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/partners/verify-kyc/${id}?status=${encodeURIComponent(status)}`, {
        method: "PUT"
      });
      if (res.ok) {
        toast.success(`✓ Partner status updated to ${status}`);
        fetchPartners();
      } else {
        toast.error("❌ Failed to update status");
      }
    } catch (err) {
      toast.error("❌ Network error");
    }
  };

  // 👈 బైనరీ కోడ్ సమస్య రాకుండా సేఫ్‌గా ఫైల్ డౌన్‌లోడ్ చేసే ఫంక్షన్
 const handleDownload = async (fileUrl, title) => {
  try {
    const fullUrl = fileUrl.startsWith('http') ? fileUrl : `${API_BASE_URL}${fileUrl}`;
    
    // 👈 సర్వర్ నుండి బైనరీ/స్ట్రీమ్ డేటాను ఫెచ్ చేయడం
    const response = await fetch(fullUrl);
    if (!response.ok) throw new Error("File not found on server");
    
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    
    // 👈 ఒరిజినల్ ఫైల్ ఎక్స్‌టెన్షన్ (ఉదాహరణకు .pdf లేదా .jpg) ఆటోమేటిక్‌గా డిటెక్ట్ చేయడం
    const extension = fileUrl.split('.').pop() || 'pdf';
    const fileName = `${title.replace(/\s+/g, '_')}.${extension}`;

    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
    
    toast.success("📥 File downloaded successfully!");
  } catch (err) {
    console.error(err);
    toast.error("❌ Failed to download file. Check if file exists.");
  }
};

  const currentPartner = partners[currentIndex];

  return (
    <div className="min-h-screen bg-slate-950 p-6 text-white font-sans flex flex-col items-center">
      <Toaster />

      {/* --- DOCUMENT PREVIEW MODAL --- */}
      {selectedDocModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-amber-500/50 max-w-3xl w-full rounded-3xl p-6 shadow-2xl space-y-4 text-center relative">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-sm font-black text-amber-400 uppercase tracking-widest">{selectedDocModal.title}</h3>
              <button onClick={() => setSelectedDocModal(null)} className="text-slate-400 hover:text-white cursor-pointer">❌</button>
            </div>
            
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex items-center justify-center h-[60vh] overflow-hidden">
              {selectedDocModal.url.toLowerCase().endsWith('.pdf') ? (
                <iframe src={selectedDocModal.url} className="w-full h-full rounded-xl bg-white" title="PDF Preview"></iframe>
              ) : (
                <img src={selectedDocModal.url} alt="Document Preview" className="max-h-full object-contain rounded-xl shadow-lg" />
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button 
                onClick={() => handleDownload(selectedDocModal.url, selectedDocModal.title)}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-2xl font-black text-xs shadow-lg flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download size={16} /> Download File 📥
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- HEADER --- */}
      <div className="w-full max-w-3xl flex justify-between items-center bg-slate-900/80 backdrop-blur border border-slate-800 px-6 py-4 rounded-3xl shadow-xl mb-6">
        <div>
          <h1 className="text-lg font-black text-amber-400 tracking-tight flex items-center gap-2">
            <Users size={22} /> Delivery Partners & KYC Verification
          </h1>
          <p className="text-[11px] text-slate-400">Inspect rider basic details and document uploads one by one.</p>
        </div>
        <div className="bg-amber-500/20 border border-amber-500/40 text-amber-300 px-3 py-1 rounded-full text-xs font-black">
          {partners.length} Total Riders 📋
        </div>
      </div>

      {/* --- MAIN CARD CONTAINER --- */}
      <div className="w-full max-w-3xl">
        {partners.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-16 text-center space-y-3">
            <ShieldCheck size={48} className="mx-auto text-slate-600 animate-pulse" />
            <p className="text-sm font-bold text-slate-400">No delivery partners found in database.</p>
          </div>
        ) : (
          <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-[36px] p-8 shadow-2xl space-y-6 relative overflow-hidden transition-all duration-300">
            
            {/* Top Status & Navigation */}
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-400 animate-ping"></span>
                <span className="text-xs font-black uppercase text-amber-300 tracking-widest">
                  Rider {currentIndex + 1} of {partners.length}
                </span>
              </div>
              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                currentPartner.kycStatus?.includes('Verified') ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
              }`}>
                Status: {currentPartner.kycStatus || 'Pending ⏳'}
              </span>
            </div>

            {/* Rider Complete Basic Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 space-y-1 shadow-inner">
                <p className="text-[10px] text-slate-400 font-bold uppercase">Full Name</p>
                <p className="text-base font-black text-white">{currentPartner.fullName || currentPartner.name || 'N/A'}</p>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 space-y-1 shadow-inner">
                <p className="text-[10px] text-slate-400 font-bold uppercase">Mobile Number</p>
                <p className="text-sm font-black text-amber-400 flex items-center gap-1.5">
                  <Phone size={14} /> +91 {currentPartner.mobile || currentPartner.phone || 'N/A'}
                </p>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 space-y-1 shadow-inner">
                <p className="text-[10px] text-slate-400 font-bold uppercase">Vehicle Details</p>
                <p className="text-xs font-bold text-slate-200">🏍️ {currentPartner.vehicleType || 'Motorcycle'} • <span className="text-amber-300">{currentPartner.bikeNumber || 'N/A'}</span></p>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 space-y-1 shadow-inner">
                <p className="text-[10px] text-slate-400 font-bold uppercase">License & PAN Number</p>
                <p className="text-xs font-bold text-slate-200">DL: {currentPartner.licenseNo || 'N/A'} | PAN: {currentPartner.panNo || 'N/A'}</p>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 space-y-1 shadow-inner sm:col-span-2">
                <p className="text-[10px] text-slate-400 font-bold uppercase">Bank Account & IFSC</p>
                <p className="text-xs font-bold text-slate-200">A/C: {currentPartner.bankAccount || 'Not Provided'} | IFSC: {currentPartner.ifscCode || 'N/A'} | UPI: {currentPartner.upiId || 'N/A'}</p>
              </div>
            </div>

            {/* Uploaded Documents Grid */}
            <div className="space-y-2">
              <p className="text-xs font-black uppercase tracking-wider text-slate-400">KYC Documents Verification Status</p>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { title: 'Aadhaar Card', url: currentPartner.aadhaarUrl },
                  { title: 'PAN Card', url: currentPartner.panUrl },
                  { title: 'Driving License', url: currentPartner.licenseUrl },
                  { title: 'Bike RC / Photo', url: currentPartner.bikeUrl },
                  { title: 'Driver Selfie', url: currentPartner.driverPhotoUrl }
                ].map((doc, idx) => (
                  <div key={idx} className="bg-slate-950 border border-slate-800 p-3 rounded-2xl flex flex-col justify-between space-y-2 text-xs">
                    <div className="flex items-center gap-1.5 text-slate-300 font-bold">
                      <FileText size={14} className="text-amber-400" />
                      <span className="truncate">{doc.title}</span>
                    </div>

                    {doc.url ? (
                      <div className="flex gap-1.5 pt-1">
                        <button 
                          onClick={() => setSelectedDocModal({ title: doc.title, url: doc.url.startsWith('http') ? doc.url : `${API_BASE_URL}${doc.url}` })}
                          className="flex-1 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white py-1.5 rounded-xl font-bold text-[10px] flex items-center justify-center gap-1 transition cursor-pointer"
                        >
                          <Eye size={12} /> View
                        </button>
                        <button 
                          onClick={() => handleDownload(doc.url, doc.title)}
                          className="bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white px-2.5 py-1.5 rounded-xl font-bold text-[10px] flex items-center justify-center transition cursor-pointer"
                          title="Download"
                        >
                          <Download size={12} />
                        </button>
                      </div>
                    ) : (
                      <div className="bg-rose-500/10 border border-rose-500/20 py-1.5 px-2 rounded-xl text-center">
                        <span className="text-[10px] text-rose-400 font-bold flex items-center justify-center gap-1">
                          <AlertCircle size={10} /> Pending ⏳
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button 
                onClick={() => handleVerifyKyc(currentPartner.id, 'Verified ✅')}
                className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white py-3.5 rounded-2xl font-black text-xs shadow-lg flex items-center justify-center gap-2 cursor-pointer transition transform hover:scale-[1.01]"
              >
                <CheckCircle2 size={16} /> Verify & Approve KYC ✅
              </button>
              
              <button 
                onClick={() => handleVerifyKyc(currentPartner.id, 'Rejected ❌')}
                className="bg-rose-600/25 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/30 px-6 py-3.5 rounded-2xl font-black text-xs shadow-lg flex items-center gap-1.5 cursor-pointer transition"
              >
                <XCircle size={16} /> Reject ❌
              </button>
            </div>

            {/* Navigation Controls */}
            <div className="flex justify-between items-center pt-4 border-t border-slate-800">
              <button 
                onClick={() => setCurrentIndex(prev => (prev > 0 ? prev - 1 : partners.length - 1))}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft size={16} /> Previous Rider
              </button>

              <span className="text-xs font-black text-slate-400">
                {currentIndex + 1} / {partners.length}
              </span>

              <button 
                onClick={() => setCurrentIndex(prev => (prev < partners.length - 1 ? prev + 1 : 0))}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1 cursor-pointer"
              >
                Next Rider <ChevronRight size={16} />
              </button>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}