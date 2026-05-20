"use client";
import { useState, useEffect, useRef } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { 
  Plus, Trash2, Download, MessageCircle, RotateCcw, 
  User, Search, Banknote, Tag, Calculator, CheckCircle2, 
  Settings, Receipt, PenLine, CreditCard, Clock, Layers, Copy, Calendar
} from "lucide-react";

/* ─── Types ─────────────────────────────────────────────── */
interface Item { id: number; name: string; qty: number; price: number; }

const STORAGE_KEY = "nota_config";
const defaultConfig = { 
  businessName: "Fendi Broiler", 
  subtitle: "Supplier Ayam & Bebek Segar — Bersih, Halal, Higienis & Berkualitas" 
};

function fmtRp(n: number) {
  return "Rp " + n.toLocaleString("id-ID");
}

const prefix = process.env.NODE_ENV === "production" ? "/website-invoice-management" : "";

const parseRp = (val: string): number => {
  const clean = val.replace(/\D/g, "");
  return Math.min(999999999, Number(clean) || 0);
};

const formatRpInput = (val: number): string => {
  if (!val) return "";
  return "Rp " + val.toLocaleString("id-ID");
};

/* ─── Main Page ─────────────────────────────────────────── */
export default function Home() {
  const [mounted, setMounted] = useState(false);
  const config = defaultConfig;

  // Form State
  const [customerName, setCustomerName] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [bon, setBon] = useState(0);
  const [cash, setCash] = useState(0);
  const [items, setItems] = useState<Item[]>([{ id: Date.now(), name: "", qty: 1, price: 0 }]);
  const [nextId, setNextId] = useState(2);

  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    // Clear any previously saved local storage configurations to force update to Fendi Broiler
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch { /* ignore */ }
  }, []);

  /* ─── Derived Math ─── */
  const totalJenis = items.filter(i => i.name.trim()).length;
  const totalQty   = items.reduce((s, i) => s + (i.qty || 0), 0);
  const totalBarang = items.reduce((s, i) => s + (i.qty * i.price), 0);
  const grandTotal = totalBarang + bon - cash;
  
  // Update logic for isLunas since grandTotal now represents the remaining amount to pay
  const isLunas = grandTotal <= 0 && totalBarang > 0;
  const isHutang = grandTotal > 0 && bon > 0;

  /* ─── Items CRUD ─── */
  const addItem = () => {
    setItems(prev => [...prev, { id: nextId, name: "", qty: 1, price: 0 }]);
    setNextId(n => n + 1);
  };
  const updateItem = (id: number, field: keyof Item, val: string | number) => {
    setItems(prev => prev.map(i => {
      if (i.id !== id) return i;
      let sanitizedVal = val;
      if (field === "qty") {
        // Clamp Qty between 1 and 99.999
        sanitizedVal = Math.min(99999, Math.max(1, Number(val) || 1));
      } else if (field === "price") {
        // Clamp Price between 0 and 999.999.999, handling formatted string input safely
        const cleanPrice = String(val).replace(/\D/g, "");
        sanitizedVal = Math.min(999999999, Math.max(0, Number(cleanPrice) || 0));
      } else if (field === "name") {
        // Truncate Name to 40 characters
        sanitizedVal = String(val).substring(0, 40);
      }
      return { ...i, [field]: sanitizedVal };
    }));
  };
  const removeItem = (id: number) => {
    if (items.length === 1) return;
    setItems(prev => prev.filter(i => i.id !== id));
  };
  const reset = () => {
    setCustomerName(""); setDate(new Date().toISOString().split("T")[0]); setBon(0); setCash(0);
    setItems([{ id: Date.now(), name: "", qty: 1, price: 0 }]); setNextId(2);
  };

  /* ─── Export & Share ─── */
  const exportPDF = async () => {
    if (!printRef.current) return;
    try {
      const canvas = await html2canvas(printRef.current, { scale: 3, useCORS: true, backgroundColor: "#ffffff" });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a5"); // A5 is better for small receipts
      const w = pdf.internal.pageSize.getWidth();
      const h = (canvas.height * w) / canvas.width;
      pdf.addImage(imgData, "PNG", 0, 0, w, h);
      pdf.save(`Nota-${customerName || "Customer"}.pdf`);
    } catch { alert("Gagal export PDF."); }
  };

  const buildText = () => {
    return [
      `*${config.businessName}*`,
      `──────────────────`,
      `Pembeli: *${customerName || "-"}*`,
      `Tanggal: ${new Date(date).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })}`,
      ``,
      `*Daftar Barang:*`,
      ...items.filter(i => i.name.trim()).map((i, idx) =>
        `${idx + 1}. ${i.name} — ${i.qty} x ${fmtRp(i.price)} = *${fmtRp(i.qty * i.price)}*`
      ),
      ``,
      `Total Barang: ${fmtRp(totalBarang)}`,
      bon > 0 ? `BON: ${fmtRp(bon)}` : null,
      cash > 0 ? `Cash: ${fmtRp(cash)}` : null,
      `──────────────────`,
      `*${grandTotal < 0 ? 'KEMBALIAN' : 'TOTAL'}: ${fmtRp(Math.abs(grandTotal))}*`,
    ].filter(l => l !== null).join("\n");
  };

  const shareWA = async () => {
    if (!printRef.current) return;
    try {
      const canvas = await html2canvas(printRef.current, { scale: 3, useCORS: true, backgroundColor: "#ffffff" });
      
      canvas.toBlob(async (blob) => {
        if (!blob) {
          alert("Gagal memproses gambar.");
          return;
        }

        const fileName = `Nota-${customerName || "Customer"}.png`;
        const file = new File([blob], fileName, { type: "image/png" });

        // 1. Mobile Share (Direct image attachment in WhatsApp)
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: "Nota Belanja Fendi Broiler",
            });
            return;
          } catch (err) {
            console.log("Share cancelled or failed", err);
            return;
          }
        }

        // 2. Desktop Fallback (Copy image to Clipboard + Open WhatsApp)
        try {
          const item = new ClipboardItem({ "image/png": blob });
          await navigator.clipboard.write([item]);
          
          alert(
            "Gambar Nota telah otomatis disALIN ke Clipboard!\n\n" +
            "Anda akan dialihkan ke WhatsApp. Di ruang obrolan, silakan langsung tekan Ctrl+V (atau Klik Kanan -> Tempel/Paste) untuk langsung mengirim gambar nota."
          );
        } catch (clipboardErr) {
          console.error("Clipboard copy failed", clipboardErr);
          alert(
            "Browser Anda memblokir salin gambar otomatis.\n\n" +
            "Silakan gunakan tombol 'Cetak PDF' untuk mengunduh nota, lalu kirim filenya secara manual."
          );
          return;
        }

        window.open("https://wa.me/", "_blank");
      }, "image/png");

    } catch (e) {
      alert("Gagal memproses nota.");
    }
  };
  
  const copyText = () => {
    navigator.clipboard.writeText(buildText());
    alert("Teks berhasil disalin!");
  };

  if (!mounted) return null;

  return (
    <>
      {/* HEADER NAV */}
      <nav className="header-nav">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 flex items-center justify-center">
              <img src={`${prefix}/logo.png`} alt="Logo" className="max-h-full max-w-full object-contain" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-800 tracking-tight leading-none">{config.businessName}</h1>
              <p className="text-xs text-slate-500 font-medium mt-1">{config.subtitle}</p>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-[1.618fr_1fr] gap-8 items-start">
          
          {/* ============================================================== */}
          {/* LEFT COLUMN: DATA ENTRY (Form)                                 */}
          {/* ============================================================== */}
          <div className="space-y-6">
            
            {/* 1. Kustomer & Pembayaran */}
            <div className="card p-6 md:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-blue-50 text-brand"><User size={24} /></div>
                <h2 className="text-xl font-bold text-slate-800">Informasi Dasar</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="lbl">Nama Pembeli</label>
                  <div className="inp-group">
                    <PenLine size={20} className="inp-icon" />
                    <input className="inp" placeholder="Ketik nama pembeli..." value={customerName} onChange={e => setCustomerName(e.target.value.substring(0, 30))} maxLength={30} />
                  </div>
                </div>
                <div>
                  <label className="lbl">Tanggal Transaksi</label>
                  <div className="inp-group">
                    <Calendar size={20} className="inp-icon" />
                    <input className="inp" type="date" value={date} onChange={e => setDate(e.target.value)} />
                  </div>
                </div>
                
                <div>
                  <label className="lbl text-success">Cash (Tunai)</label>
                  <div className="inp-group">
                    <Banknote size={20} className="inp-icon text-success" />
                    <input className="inp font-bold" type="text" value={formatRpInput(cash)} onChange={e => setCash(parseRp(e.target.value))} placeholder="Rp 0" />
                  </div>
                </div>
                <div>
                  <label className="lbl text-warning">BON (Hutang)</label>
                  <div className="inp-group">
                    <CreditCard size={20} className="inp-icon text-warning" />
                    <input className="inp font-bold" type="text" value={formatRpInput(bon)} onChange={e => setBon(parseRp(e.target.value))} placeholder="Rp 0" />
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Daftar Barang */}
            <div className="card p-6 md:p-8">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-indigo-50 text-indigo-500"><Layers size={24} /></div>
                  <h2 className="text-xl font-bold text-slate-800">Daftar Barang</h2>
                </div>
                <button className="btn-secondary !py-2.5 !px-4 text-brand hover:bg-brand/5 border-dashed border-2 hover:border-brand/30 text-sm flex items-center gap-1.5" onClick={addItem}>
                  <Plus size={18} /> Tambah Baris
                </button>
              </div>

              {/* Table Header (Desktop) */}
              <div className="hidden md:grid grid-cols-[40px_4fr_1.5fr_2.5fr_2.5fr_40px] gap-4 px-4 mb-3">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400 text-center">No</div>
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Nama Barang</div>
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400 text-center">Jumlah</div>
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400 text-right">Harga (Rp)</div>
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400 text-right">Subtotal</div>
                <div></div>
              </div>

              {/* Items List */}
              <div className="space-y-3">
                {items.map((item, idx) => (
                  <div key={item.id} className="group relative flex flex-col md:grid md:grid-cols-[40px_4fr_1.5fr_2.5fr_2.5fr_40px] gap-3 md:gap-4 items-start md:items-center p-4 md:p-3 bg-white border border-slate-200/60 hover:border-brand/30 hover:shadow-md rounded-2xl transition-all duration-200">
                    
                    {/* MOBILE TOP BAR (Title & Delete Button) */}
                    <div className="w-full flex items-center justify-between md:hidden mb-1">
                      <div className="flex items-center gap-2">
                         <span className="w-6 h-6 rounded bg-slate-100 text-slate-500 font-bold text-xs flex items-center justify-center">{idx + 1}</span>
                         <label className="lbl !mb-0 text-slate-600">Item Barang</label>
                      </div>
                      <button onClick={() => removeItem(item.id)} disabled={items.length === 1} className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 text-slate-400 hover:text-danger hover:bg-danger/10 flex items-center justify-center disabled:opacity-20 transition-all">
                        <Trash2 size={16} />
                      </button>
                    </div>

                    {/* No (Desktop only) */}
                    <div className="hidden md:flex justify-center">
                      <span className="w-7 h-7 rounded-lg bg-slate-100 text-slate-500 font-bold text-xs flex items-center justify-center group-hover:bg-brand/10 group-hover:text-brand transition-colors">
                        {idx + 1}
                      </span>
                    </div>

                    {/* Nama Barang */}
                    <div className="w-full min-w-0">
                      <input className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-slate-800 text-base font-semibold focus:outline-none focus:bg-white focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all placeholder:text-slate-300" placeholder="Ketik nama barang..." value={item.name} onChange={e => updateItem(item.id, "name", e.target.value)} maxLength={40} />
                    </div>
                    
                    {/* MOBILE GRID: Jumlah & Harga */}
                    <div className="w-full grid grid-cols-[1fr_2.5fr] gap-3 md:contents">
                      {/* Jumlah */}
                      <div className="w-full min-w-0">
                        <label className="lbl text-[11px] md:hidden">Jumlah</label>
                        <input className="w-full px-2 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-slate-800 text-base font-bold text-center focus:outline-none focus:bg-white focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all" type="number"  max={99999} placeholder="0" value={item.qty || ""} onChange={e => updateItem(item.id, "qty", e.target.value)} />
                      </div>
                      
                      {/* Harga */}
                      <div className="w-full min-w-0">
                        <label className="lbl text-[11px] md:hidden">Harga (Rp)</label>
                        <input className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-slate-800 text-base font-bold text-right focus:outline-none focus:bg-white focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all" type="text" placeholder="Rp 0" value={formatRpInput(item.price)} onChange={e => updateItem(item.id, "price", e.target.value)} />
                      </div>
                    </div>
                    
                    {/* Subtotal */}
                    <div className="w-full flex items-center justify-between md:justify-end gap-3 mt-1 md:mt-0 pt-3 md:pt-0 border-t border-slate-100 md:border-none">
                      <label className="lbl !mb-0 md:hidden">Subtotal</label>
                      <div className="text-lg font-black text-brand text-right pr-2">{fmtRp(item.qty * item.price)}</div>
                    </div>

                    {/* Action (Desktop only) */}
                    <div className="hidden md:flex justify-end">
                      <button onClick={() => removeItem(item.id)} disabled={items.length === 1} className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 text-slate-400 hover:text-danger hover:bg-danger/10 hover:border-danger/20 flex items-center justify-center disabled:opacity-20 transition-all">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4"></div>
            </div>

          </div>

          {/* ============================================================== */}
          {/* RIGHT COLUMN: LIVE SUMMARY / ACTIONS                           */}
          {/* ============================================================== */}
          <div>
            <div className="sticky top-28 space-y-6">
              
              {/* Preview Card */}
              <div className="card shadow-xl shadow-slate-200/50 p-6 md:p-8 bg-white">
                <div className="flex items-center justify-between border-b-2 border-slate-100 pb-4 mb-6">
                  <div>
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Ringkasan Nota</h3>
                    <div className="text-lg font-black text-slate-800 mt-1">{customerName || "Tanpa Nama"}</div>
                  </div>
                  <div className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 ${isLunas ? 'bg-success/10 text-success' : isHutang ? 'bg-warning/10 text-warning' : 'bg-slate-100 text-slate-500'}`}>
                    {isLunas ? <CheckCircle2 size={14} /> : isHutang ? <Clock size={14} /> : <Calculator size={14} />}
                    {isLunas ? "LUNAS" : isHutang ? "NGUTANG" : "DRAFT"}
                  </div>
                </div>

                <div className="space-y-4 mb-6 min-h-[120px]">
                  {items.filter(i => i.name.trim()).length === 0 ? (
                    <div className="text-center text-slate-400 text-sm py-8 border-2 border-dashed border-slate-100 rounded-xl">Belum ada barang ditambahkan</div>
                  ) : (
                    items.filter(i => i.name.trim()).map((i, idx) => (
                      <div key={idx} className="flex justify-between items-start text-sm">
                        <div className="flex gap-2">
                          <span className="text-slate-400">{i.qty}x</span>
                          <span className="font-semibold text-slate-700">{i.name}</span>
                        </div>
                        <span className="font-bold text-slate-800">{fmtRp(i.qty * i.price)}</span>
                      </div>
                    ))
                  )}
                </div>

                <div className="pt-4 border-t-2 border-slate-100 space-y-3">
                  <div className="flex justify-between text-sm text-slate-500 font-medium">
                    <span>Total Item</span><span>{totalQty} Pcs ({totalJenis} Jenis)</span>
                  </div>
                  <div className="flex justify-between text-sm text-slate-500 font-medium">
                    <span>Total Harga Item</span><span>{fmtRp(totalBarang)}</span>
                  </div>
                  {bon > 0 && (
                    <div className="flex justify-between text-sm text-warning font-bold bg-warning/10 px-3 py-2 rounded-lg">
                      <span>BON (Hutang)</span><span>{fmtRp(bon)}</span>
                    </div>
                  )}
                  {cash > 0 && (
                    <div className="flex justify-between text-sm text-success font-bold bg-success/10 px-3 py-2 rounded-lg">
                      <span>Tunai (Cash)</span><span>{fmtRp(cash)}</span>
                    </div>
                  )}
                  
                  <div className={`flex justify-between items-center mt-2 p-4 rounded-2xl shadow-lg ${grandTotal < 0 ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white' : 'bg-gradient-to-r from-slate-800 to-slate-900 text-white'}`}>
                    <span className="font-bold">{grandTotal < 0 ? 'KEMBALIAN' : 'TOTAL BAYAR'}</span>
                    <span className={`text-2xl font-black ${grandTotal < 0 ? 'text-white' : 'text-brand-light'}`}>{fmtRp(Math.abs(grandTotal))}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-3">
                <button className="btn-secondary !text-danger hover:!bg-danger/5 hover:!border-danger/30 w-full" onClick={reset}>
                  <RotateCcw size={20} /> Kosongkan Form (Reset)
                </button>
                <div className="grid grid-cols-2 gap-3">
                  <button className="btn-success" onClick={exportPDF}>
                    <Download size={20} /> Cetak PDF
                  </button>
                  <button className="btn-wa" onClick={shareWA}>
                    <MessageCircle size={20} /> WhatsApp
                  </button>
                </div>
              </div>

            </div>
          </div>

        </div>
      </main>

      {/* ── Hidden Print Area ───────────────────────────── */}
      <div className="sr-only">
        <div ref={printRef} style={{ fontFamily: "'Inter', sans-serif", background: "#fff", padding: "40px", width: "800px", minHeight: "210mm", color: "#000" }}>
          
          {/* Header using Table for perfect alignment in html2canvas */}
          <table style={{ width: "100%", marginBottom: "24px", borderCollapse: "collapse", tableLayout: "fixed" }}>
            <tbody>
              <tr>
                {/* Left - Logo (25%) */}
                <td style={{ width: "25%", verticalAlign: "top" }}>
                  <img src={`${prefix}/logo.png`} alt="Logo" style={{ width: "130px", height: "auto", objectFit: "contain", margin: 0, padding: 0 }} />
                </td>
                
                {/* Center - INVOICE (50%) */}
                <td style={{ width: "50%", verticalAlign: "top", textAlign: "center", padding: "0 20px" }}>
                  <h1 style={{ fontSize: "36px", fontWeight: "900", margin: "0 0 10px 0", color: "#000", letterSpacing: "1px" }}>INVOICE</h1>
                  <div style={{ fontSize: "14px", lineHeight: "1.5", color: "#000", margin: "0 auto", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <span>Pasar Tegaldanas, Jl. Pasar Tegaldanas, Desa Hegarmukti,</span>
                    <span>Kec. Cikarang Pusat, Kab. Bekasi, Jawa Barat 17530</span>
                  </div>
                </td>

                {/* Right - Info (25%) */}
                <td style={{ width: "25%", verticalAlign: "top" }}>
                  <div style={{ fontSize: "13px", color: "#000", marginTop: "64px", display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                    <div>
                      <div style={{ display: "flex", marginBottom: "6px" }}>
                        <span style={{ width: "70px", flexShrink: 0 }}>Tanggal :</span>
                        <span>{new Date(date).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</span>
                      </div>
                      <div style={{ display: "flex" }}>
                        <span style={{ width: "70px", flexShrink: 0 }}>Pembeli :</span>
                        <span>{customerName || "-"}</span>
                      </div>
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          <div style={{ borderTop: "2px solid #000", marginBottom: "16px" }}></div>

          <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0", marginBottom: "16px", fontSize: "14px" }}>
            <thead>
              <tr>
                <td style={{ paddingBottom: "16px", paddingLeft: "12px", paddingRight: "12px", textAlign: "left", fontWeight: "600", width: "40px", backgroundColor: "#3b82f6", color: "#fff" }}>No</td>
                <td style={{ paddingBottom: "16px", paddingLeft: "12px", paddingRight: "12px", textAlign: "left", fontWeight: "600", backgroundColor: "#3b82f6", color: "#fff" }}>Nama Barang</td>
                <td style={{ paddingBottom: "16px", paddingLeft: "12px", paddingRight: "12px", textAlign: "center", fontWeight: "600", width: "80px", backgroundColor: "#3b82f6", color: "#fff" }}>Jumlah</td>
                <td style={{ paddingBottom: "16px", paddingLeft: "12px", paddingRight: "12px", textAlign: "right", fontWeight: "600", width: "120px", backgroundColor: "#3b82f6", color: "#fff" }}>Harga/Pcs</td>
                <td style={{ paddingBottom: "16px", paddingLeft: "12px", paddingRight: "12px", textAlign: "right", fontWeight: "600", width: "140px", backgroundColor: "#3b82f6", color: "#fff" }}>Subtotal</td>
              </tr>
            </thead>
            <tbody>
              {items.filter(i => i.name.trim()).length === 0 ? (
                <tr style={{ backgroundColor: "#f8f9fa" }}>
                  <td style={{ padding: "8px 12px", borderBottom: "1px solid #f1f5f9" }}>1</td>
                  <td style={{ padding: "8px 12px", borderBottom: "1px solid #f1f5f9" }}></td>
                  <td style={{ padding: "8px 12px", textAlign: "center", borderBottom: "1px solid #f1f5f9" }}>0</td>
                  <td style={{ padding: "8px 12px", textAlign: "right", borderBottom: "1px solid #f1f5f9" }}>Rp 0</td>
                  <td style={{ padding: "8px 12px", textAlign: "right", borderBottom: "1px solid #f1f5f9" }}>Rp 0</td>
                </tr>
              ) : (
                items.filter(i => i.name.trim()).map((item, i) => (
                  <tr key={item.id} style={{ backgroundColor: i % 2 === 0 ? "#f8f9fa" : "#ffffff" }}>
                    <td style={{ padding: "10px 12px", borderBottom: "1px solid #f1f5f9" }}>{i + 1}</td>
                    <td style={{ padding: "10px 12px", borderBottom: "1px solid #f1f5f9" }}>{item.name}</td>
                    <td style={{ padding: "10px 12px", textAlign: "center", borderBottom: "1px solid #f1f5f9" }}>{item.qty}</td>
                    <td style={{ padding: "10px 12px", textAlign: "right", borderBottom: "1px solid #f1f5f9" }}>{fmtRp(item.price)}</td>
                    <td style={{ padding: "10px 12px", textAlign: "right", borderBottom: "1px solid #f1f5f9", fontWeight: "bold" }}>{fmtRp(item.qty * item.price)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <div style={{ borderTop: "1px solid #000", marginBottom: "16px" }}></div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", fontSize: "14px" }}>
            <div style={{ fontWeight: "500" }}>
              <div style={{ fontWeight: "bold", marginBottom: "4px" }}>Transfer Via:</div>
              <div>BNI: 1920150577</div>
              <div>a.n. Irfandi</div>
            </div>

            <div style={{ width: "250px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                <span style={{ fontWeight: "bold" }}>TOTAL</span>
                <span style={{ fontWeight: "bold" }}>{fmtRp(totalBarang)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px", color: "#22c55e" }}>
                <span>BON</span>
                <span>{fmtRp(bon)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px", color: "#ef4444" }}>
                <span>Cash</span>
                <span>{fmtRp(cash)}</span>
              </div>
              <div style={{ borderTop: "2px solid #000", margin: "8px 0" }}></div>
              <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", fontSize: "16px" }}>
                <span>Sisa :</span>
                <span>{fmtRp(grandTotal)}</span>
              </div>
            </div>
          </div>

          <div style={{ marginTop: "80px", display: "flex", justifyContent: "flex-end", gap: "60px", textAlign: "center", fontSize: "14px", paddingRight: "16px" }}>
            <div style={{ width: "120px" }}>
              <div style={{ borderBottom: "1px solid #000", marginBottom: "8px", height: "0" }}></div>
              <div style={{ fontWeight: "bold" }}>Irfandi</div>
              <div>(Penjual)</div>
            </div>
            <div style={{ width: "120px" }}>
              <div style={{ borderBottom: "1px solid #000", marginBottom: "8px", height: "0" }}></div>
              <div style={{ fontWeight: "bold", minHeight: "20px" }}>{customerName || ""}</div>
              <div>(Pembeli)</div>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
