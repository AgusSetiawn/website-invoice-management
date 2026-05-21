"use client";
import { useState, useEffect, useMemo } from "react";
import { Plus, FolderOpen, Phone, MapPin, Receipt, ArrowUpRight, ArrowDownLeft, X, MessageCircle, Wallet, UserPlus, ChevronDown, ChevronUp, Trash2, Layers, Search, CheckCircle2, Clock } from "lucide-react";
import { getContacts, getTransactions, saveContacts, saveTransactions, Contact, Transaction } from "@/lib/store";
import Link from "next/link";

function fmtRp(n: number) {
  return "Rp " + n.toLocaleString("id-ID");
}

export default function Dashboard() {
  const [mounted, setMounted] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [expandedFolderId, setExpandedFolderId] = useState<string | null>(null);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [confirmModal, setConfirmModal] = useState<{show: boolean, msg: string, onConfirm: () => void}>({show: false, msg: '', onConfirm: () => {}});
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "debt" | "paid">("all");

  const confirmAction = (msg: string, onConfirm: () => void) => {
    setConfirmModal({show: true, msg, onConfirm});
  };
  
  // Forms
  const [newContact, setNewContact] = useState({ name: "", address: "", phone: "" });
  const [newTransaction, setNewTransaction] = useState({ type: "bon" as "bon" | "payment", amount: "", note: "" });

  useEffect(() => {
    setContacts(getContacts());
    setTransactions(getTransactions());
    setMounted(true);
  }, []);

  const getContactHutang = (contactId: string) => {
    return transactions
      .filter(tx => tx.contactId === contactId)
      .reduce((sum, tx) => sum + (tx.type === 'bon' ? tx.amount - (tx.cash || 0) : -tx.amount), 0);
  };

  const filteredContacts = useMemo(() => {
    return contacts.filter(c => {
      const hutang = getContactHutang(c.id);
      const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;
      if (filterStatus === "debt" && hutang <= 0) return false;
      if (filterStatus === "paid" && hutang > 0) return false;
      return true;
    });
  }, [contacts, transactions, searchQuery, filterStatus]);

  if (!mounted) return null;

  // Metrics
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  let totalHutang = 0;
  let terbayarBulanIni = 0;

  transactions.forEach((tx) => {
    const txDate = new Date(tx.date);
    const isCurrentMonth = txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear;

    if (tx.type === "bon") {
      totalHutang += tx.amount;
      if (tx.cash) {
        totalHutang -= tx.cash;
        if (isCurrentMonth) terbayarBulanIni += tx.cash;
      }
    } else if (tx.type === "payment") {
      totalHutang -= tx.amount;
      if (isCurrentMonth) terbayarBulanIni += tx.amount;
    }
  });

  const handleAddContact = () => {
    if (!newContact.name.trim()) return;
    const contact: Contact = {
      id: Date.now().toString(),
      name: newContact.name,
      address: newContact.address,
      phone: newContact.phone,
    };
    const updated = [...contacts, contact];
    setContacts(updated);
    saveContacts(updated);
    setIsContactModalOpen(false);
    setNewContact({ name: "", address: "", phone: "" });
  };

  const handleDeleteContact = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    confirmAction("Yakin ingin menghapus folder ini beserta semua riwayat transaksinya?", () => {
      const updatedContacts = contacts.filter(c => c.id !== id);
      const updatedTxs = transactions.filter(tx => tx.contactId !== id);
      setContacts(updatedContacts);
      setTransactions(updatedTxs);
      saveContacts(updatedContacts);
      saveTransactions(updatedTxs);
      if (expandedFolderId === id) setExpandedFolderId(null);
    });
  };

  const handleAddTransaction = (contactId: string) => {
    if (!newTransaction.amount) return;
    const amount = Number(newTransaction.amount.replace(/\D/g, ""));
    if (amount <= 0) return;

    const tx: Transaction = {
      id: Date.now().toString(),
      contactId: contactId,
      date: new Date().toISOString(),
      type: newTransaction.type,
      amount,
      note: newTransaction.note
    };
    
    const updated = [...transactions, tx];
    setTransactions(updated);
    saveTransactions(updated);
    setNewTransaction({ type: "bon", amount: "", note: "" });
  };

  const handleDeleteTransaction = (id: string) => {
    confirmAction("Yakin ingin menghapus riwayat transaksi ini?", () => {
      const updated = transactions.filter(tx => tx.id !== id);
      setTransactions(updated);
      saveTransactions(updated);
    });
  };

  const toggleFolder = (id: string) => {
    if (expandedFolderId === id) {
      setExpandedFolderId(null);
    } else {
      setExpandedFolderId(id);
      setNewTransaction({ type: "bon", amount: "", note: "" });
    }
  };

  const generateWARekap = (contact: Contact, hutang: number) => {
    const contactTxs = transactions
      .filter(tx => tx.contactId === contact.id)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
    let text = `Halo *${contact.name}*,\nBerikut adalah rekap tagihan berjalan Anda per tanggal ${new Date().toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'})}.\n\n`;
    text += `*RINCIAN TRANSAKSI:*\n`;
    
    let runningBalance = 0;
    contactTxs.forEach(tx => {
      const dateStr = new Date(tx.date).toLocaleDateString('id-ID', {day:'2-digit', month:'2-digit', year:'2-digit'});
      if (tx.type === 'bon') {
        const netAmount = tx.amount - (tx.cash || 0);
        runningBalance += netAmount;
        if (netAmount > 0) {
           text += `• ${dateStr} - Nota Belanja: +${fmtRp(netAmount)}\n`;
        }
      } else {
        runningBalance -= tx.amount;
        text += `• ${dateStr} - Pembayaran: -${fmtRp(tx.amount)}\n`;
      }
    });

    text += `\n*TOTAL SISA HUTANG: ${fmtRp(Math.max(0, runningBalance))}*\n\n`;
    text += `Mohon dicek kembali, terima kasih! 🙏`;
    return text;
  };

  const totalPotensiPiutang = totalHutang + terbayarBulanIni;
  const persenTerbayar = totalPotensiPiutang === 0 ? 0 : Math.min(100, Math.round((terbayarBulanIni / totalPotensiPiutang) * 100));

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 animate-fade-in">
      {/* ── Dashboard Cards ── */}
      <section>
        <h2 className="text-xl font-bold text-slate-800 mb-4 px-1">Ringkasan Keuangan</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-rose-500 to-rose-600 rounded-3xl p-6 text-white shadow-lg shadow-rose-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-white/20 rounded-xl"><ArrowUpRight size={24} className="text-white" /></div>
              <h3 className="font-semibold text-rose-50 tracking-wide text-sm">HUTANG BELUM TERBAYAR</h3>
            </div>
            <div className="text-3xl font-black">{fmtRp(Math.max(0, totalHutang))}</div>
            <p className="text-sm text-rose-100 mt-2">Total bon aktif di semua pelanggan</p>
          </div>

          <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-3xl p-6 text-white shadow-lg shadow-emerald-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-white/20 rounded-xl"><ArrowDownLeft size={24} className="text-white" /></div>
              <h3 className="font-semibold text-emerald-50 tracking-wide text-sm">TERBAYARKAN BULAN INI</h3>
            </div>
            <div className="text-3xl font-black">{fmtRp(terbayarBulanIni)}</div>
            
            {/* Mini Progress Bar Keuangan */}
            <div className="mt-4">
              <div className="flex justify-between text-xs text-emerald-100 font-semibold mb-1.5">
                <span>Progres Penagihan</span>
                <span>{persenTerbayar}%</span>
              </div>
              <div className="w-full h-2 bg-black/10 rounded-full overflow-hidden">
                <div className="h-full bg-white transition-all duration-1000 ease-out" style={{ width: `${persenTerbayar}%` }}></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Folder/Kontak Section ── */}
      <section>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 px-1">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 whitespace-nowrap">
            <FolderOpen size={24} className="text-brand" /> Folder Pelanggan
          </h2>
          <button 
            onClick={() => setIsContactModalOpen(true)}
            className="flex items-center gap-2 bg-indigo-50 text-brand px-4 py-2.5 rounded-xl font-bold text-sm touch-bounce w-full sm:w-auto justify-center"
          >
            <UserPlus size={18} /> <span>Tambah Kontak</span>
          </button>
        </div>

        {/* Search & Filter Pintar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-6 flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Cari nama pelanggan..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-brand focus:ring-2 focus:ring-brand/20 rounded-xl text-sm font-semibold transition-all outline-none"
            />
          </div>
          <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-200 overflow-x-auto hide-scrollbar">
            <button onClick={() => setFilterStatus("all")} className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${filterStatus === 'all' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>Semua</button>
            <button onClick={() => setFilterStatus("debt")} className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${filterStatus === 'debt' ? 'bg-amber-100 text-amber-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Hanya Berhutang</button>
            <button onClick={() => setFilterStatus("paid")} className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${filterStatus === 'paid' ? 'bg-emerald-100 text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Lunas</button>
          </div>
        </div>

        {filteredContacts.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-3xl border-2 border-dashed border-slate-200">
            <FolderOpen size={48} className="mx-auto text-slate-300 mb-4" />
            <p className="text-slate-500 font-medium">{contacts.length === 0 ? "Belum ada folder pelanggan." : "Tidak ada folder yang cocok."}</p>
            <p className="text-sm text-slate-400 mt-1">{contacts.length === 0 ? "Buat folder baru untuk mencatat transaksi." : "Coba ubah kata kunci atau filter."}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 items-start">
            {filteredContacts.map(contact => {
              const hutang = getContactHutang(contact.id);
              const isExpanded = expandedFolderId === contact.id;
              const isHutang = hutang > 0;

              return (
                <div key={contact.id} className={`card card-hover bg-white rounded-3xl border-2 shadow-sm transition-all overflow-hidden ${isHutang ? 'border-amber-100 hover:border-amber-300' : 'border-emerald-100 hover:border-emerald-300'}`}>
                  {/* Card Header (Clickable) */}
                  <div 
                    onClick={() => toggleFolder(contact.id)} 
                    className="p-5 cursor-pointer hover:bg-slate-50/50 transition-colors flex justify-between items-start group"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-lg text-slate-800">{contact.name}</h3>
                        <button 
                          onClick={(e) => handleDeleteContact(contact.id, e)}
                          className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100"
                          title="Hapus Folder"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      
                      {/* Status Badge Pintar */}
                      <div className={`px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider flex items-center gap-1.5 w-max mt-2 mb-1 border ${isHutang ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>
                        {isHutang ? <><Clock size={12} className={hutang > 1000000 ? "animate-pulse" : ""} /> ADA BON</> : <><CheckCircle2 size={12} /> LUNAS</>}
                      </div>

                      <div className="flex flex-col gap-1 mt-3">
                        {contact.phone && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-500">
                            <Phone size={12} className="text-slate-400" /> {contact.phone}
                          </div>
                        )}
                        {contact.address && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 line-clamp-1">
                            <MapPin size={12} className="text-slate-400" /> {contact.address}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-3 ml-3">
                      <div className={`p-1.5 rounded-lg ${isExpanded ? 'bg-slate-200 text-slate-600' : 'bg-slate-100 text-slate-400'}`}>
                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Sisa Hutang</span>
                        <span className={`font-black text-sm ${hutang > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{fmtRp(Math.max(0, hutang))}</span>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="p-5 pt-2 border-t border-slate-100 bg-slate-50/50 animate-slide-up origin-top">
                      
                      {/* Aksi Cepat */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
                        <Link href={`/invoice?contactId=${contact.id}`} className="flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-2xl bg-indigo-50 border border-indigo-100 text-brand hover:bg-indigo-100 touch-bounce">
                          <Receipt size={20} />
                          <span className="text-[11px] font-bold">Buat Nota</span>
                        </Link>
                        
                        <button 
                          onClick={() => {
                            setNewTransaction({...newTransaction, type: "payment"});
                            const inputEl = document.getElementById(`manual-input-${contact.id}`);
                            if (inputEl) inputEl.focus();
                          }} 
                          className="flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-2xl bg-amber-50 border border-amber-100 text-amber-600 hover:bg-amber-100 touch-bounce"
                        >
                          <Wallet size={20} />
                          <span className="text-[11px] font-bold">Terima Cicilan</span>
                        </button>

                        {contact.phone ? (
                          <a href={`https://wa.me/${contact.phone.replace(/^0/, '62')}`} target="_blank" rel="noreferrer" className="flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 hover:bg-emerald-100 touch-bounce col-span-2 sm:col-span-1">
                            <MessageCircle size={20} />
                            <span className="text-[11px] font-bold">Chat WA</span>
                          </a>
                        ) : (
                          <div className="flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-2xl bg-slate-100 border border-slate-200 text-slate-400 opacity-70 col-span-2 sm:col-span-1">
                            <MessageCircle size={20} />
                            <span className="text-[11px] font-bold">Tanpa WA</span>
                          </div>
                        )}
                      </div>

                      {/* Riwayat Transaksi */}
                      <div className="mb-5">
                        <h4 className="font-bold text-slate-700 mb-3 text-xs uppercase tracking-wider">Riwayat Transaksi</h4>
                        {transactions.filter(tx => tx.contactId === contact.id).length === 0 ? (
                          <div className="text-center p-4 bg-slate-100/50 rounded-xl border border-slate-200 border-dashed text-slate-400 text-sm">
                            Belum ada riwayat transaksi
                          </div>
                        ) : (
                          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                            {transactions.filter(tx => tx.contactId === contact.id)
                              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                              .map(tx => (
                              <div key={tx.id} className="group flex justify-between items-center bg-white p-3 rounded-xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all cursor-pointer" onClick={() => setSelectedTx(tx)}>
                                <div>
                                  <div className="font-bold text-slate-700 text-sm">
                                    {tx.type === 'bon' 
                                      ? (tx.cash !== undefined && tx.cash >= tx.amount ? 'Nota Belanja (Lunas)' : 'Nota Belanja') 
                                      : 'Pembayaran Hutang'}
                                  </div>
                                  <div className="text-xs text-slate-500 mt-0.5">
                                    {new Date(tx.date).toLocaleDateString('id-ID', {day: 'numeric', month: 'short', year: 'numeric'})}
                                    {tx.note && <span className="text-slate-400"> • {tx.note}</span>}
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  {tx.type === 'bon' ? (
                                    <div className="text-right">
                                      <div className={`font-black text-sm ${tx.amount - (tx.cash || 0) <= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                        {tx.amount - (tx.cash || 0) <= 0 ? '' : '+'}{fmtRp(Math.max(0, tx.amount - (tx.cash || 0)))}
                                      </div>
                                      {tx.cash ? <div className="text-[10px] text-slate-400 mt-0.5">Tagihan: {fmtRp(tx.amount)}</div> : null}
                                    </div>
                                  ) : (
                                    <div className="font-black text-sm text-emerald-600">
                                      -{fmtRp(tx.amount)}
                                    </div>
                                  )}
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); handleDeleteTransaction(tx.id); }}
                                    className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100"
                                    title="Hapus Transaksi"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Form Transaksi */}
                      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
                        <h4 className="font-bold text-slate-700 mb-3 text-xs uppercase tracking-wider">Catat Manual</h4>
                        <div className="flex rounded-xl overflow-hidden mb-3 border border-slate-200">
                          <button 
                            onClick={() => setNewTransaction({...newTransaction, type: "bon"})} 
                            className={`flex-1 py-2 text-xs font-bold transition-colors ${newTransaction.type === "bon" ? "bg-rose-500 text-white" : "bg-slate-50 text-slate-500 hover:bg-slate-100"}`}
                          >
                            Tambah Bon
                          </button>
                          <button 
                            onClick={() => setNewTransaction({...newTransaction, type: "payment"})} 
                            className={`flex-1 py-2 text-xs font-bold transition-colors ${newTransaction.type === "payment" ? "bg-emerald-500 text-white" : "bg-slate-50 text-slate-500 hover:bg-slate-100"}`}
                          >
                            Bayar Hutang
                          </button>
                        </div>

                        <div className="space-y-3">
                          <div className="relative">
                            <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-sm">Rp</span>
                            <input 
                              id={`manual-input-${contact.id}`}
                              type="text" 
                              placeholder="0" 
                              className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-brand focus:ring-2 focus:ring-brand/20 font-bold text-sm transition-all outline-none"
                              value={newTransaction.amount ? "Rp " + Number(newTransaction.amount.replace(/\D/g, "")).toLocaleString("id-ID") : ""}
                              onChange={e => setNewTransaction({...newTransaction, amount: e.target.value.replace(/\D/g, "")})}
                            />
                          </div>
                          <input 
                            type="text" 
                            placeholder="Keterangan (Opsional)" 
                            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-brand focus:ring-2 focus:ring-brand/20 text-sm transition-all outline-none"
                            value={newTransaction.note}
                            onChange={e => setNewTransaction({...newTransaction, note: e.target.value})}
                          />
                          <button 
                            onClick={() => handleAddTransaction(contact.id)}
                            className={`w-full py-2.5 rounded-xl font-bold text-sm text-white touch-bounce ${newTransaction.type === "bon" ? "bg-rose-600 hover:bg-rose-700 shadow-rose-200" : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200"}`}
                          >
                            Simpan Data
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Modal Tambah Kontak ── */}
      {isContactModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl animate-pop">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-800">Folder Baru</h3>
              <button onClick={() => setIsContactModalOpen(false)} className="p-2 bg-slate-100 rounded-full text-slate-500 hover:text-rose-500 transition-colors"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-500 mb-2">Nama Pelanggan</label>
                <input className="inp !py-3 !text-base" placeholder="Ketik nama..." value={newContact.name} onChange={e => setNewContact({...newContact, name: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-500 mb-2">No. WhatsApp</label>
                <input className="inp !py-3 !text-base" placeholder="Contoh: 081234..." type="tel" value={newContact.phone} onChange={e => setNewContact({...newContact, phone: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-500 mb-2">Alamat (Opsional)</label>
                <textarea className="w-full px-4 py-3 bg-white border border-slate-300 rounded-2xl focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all font-semibold resize-none h-24 shadow-sm" placeholder="Ketik alamat..." value={newContact.address} onChange={e => setNewContact({...newContact, address: e.target.value})}></textarea>
              </div>
              <button onClick={handleAddContact} className="btn-primary w-full mt-2">
                Simpan Folder
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal Detail Transaksi */}
      {selectedTx && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl animate-pop">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-xl font-bold text-slate-800 mb-1">Detail Transaksi</h3>
                <p className="text-sm text-slate-500">{new Date(selectedTx.date).toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'})}</p>
              </div>
              <button onClick={() => setSelectedTx(null)} className="p-2 bg-slate-100 rounded-full text-slate-500 hover:text-rose-500 transition-colors"><X size={20} /></button>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 rounded-xl bg-slate-50 border border-slate-100">
                <span className="font-semibold text-slate-600">Jenis</span>
                <span className={`font-bold px-3 py-1 rounded-lg text-xs ${selectedTx.type === 'bon' ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
                  {selectedTx.type === 'bon' ? 'Nota Belanja' : 'Pembayaran'}
                </span>
              </div>
              <div className="flex justify-between items-center p-4 rounded-xl bg-slate-50 border border-slate-100">
                <span className="font-semibold text-slate-600">Tagihan Barang</span>
                <span className="font-black text-lg text-slate-800">{fmtRp(selectedTx.amount)}</span>
              </div>
              {selectedTx.type === 'bon' && selectedTx.cash !== undefined && (
                <div className="flex justify-between items-center p-4 rounded-xl bg-slate-50 border border-emerald-100">
                  <span className="font-semibold text-emerald-600">Dibayar (Tunai)</span>
                  <span className="font-black text-lg text-emerald-600">{fmtRp(selectedTx.cash)}</span>
                </div>
              )}
              {selectedTx.note && (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="block font-semibold text-slate-600 mb-1 text-sm">Catatan</span>
                  <p className="text-sm text-slate-800">{selectedTx.note}</p>
                </div>
              )}
              
              {selectedTx.items && selectedTx.items.length > 0 && (
                <div className="mt-6 border-t border-slate-100 pt-4">
                  <h4 className="font-bold text-slate-700 mb-3 text-sm flex items-center gap-2"><Layers size={16} className="text-indigo-500" /> Rincian Barang</h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                    {selectedTx.items.map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center text-sm p-3 rounded-lg border border-slate-200 bg-white">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-700">{item.qty}x</span>
                          <span className="text-slate-600">{item.name}</span>
                        </div>
                        <span className="font-bold text-slate-800">{fmtRp(item.qty * item.price)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi */}
      {confirmModal.show && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-pop text-center border border-slate-200">
            <div className="w-16 h-16 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Konfirmasi Hapus</h3>
            <p className="text-sm text-slate-500 mb-8 px-2">{confirmModal.msg}</p>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setConfirmModal({show: false, msg: '', onConfirm: () => {}})} className="py-3 rounded-xl font-bold text-sm bg-slate-100 text-slate-600 hover:bg-slate-200 touch-bounce">
                Batal
              </button>
              <button onClick={() => { confirmModal.onConfirm(); setConfirmModal({show: false, msg: '', onConfirm: () => {}}); }} className="py-3 rounded-xl font-bold text-sm bg-rose-600 text-white hover:bg-rose-700 shadow-lg shadow-rose-200 touch-bounce">
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
