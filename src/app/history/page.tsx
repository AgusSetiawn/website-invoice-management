"use client";
import { useState, useEffect, useMemo } from "react";
import { Search, Receipt, Wallet, Calendar, User, FileText, Layers, X, Clock, Banknote } from "lucide-react";
import { getTransactions, getContacts, Transaction, Contact } from "@/lib/store";

function fmtRp(n: number) {
  return "Rp " + n.toLocaleString("id-ID");
}

export default function HistoryPage() {
  const [mounted, setMounted] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "bon" | "payment">("all");
  
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  useEffect(() => {
    setTransactions(getTransactions().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    setContacts(getContacts());
    setMounted(true);
  }, []);

  const getContactName = (contactId: string) => {
    if (contactId === "general") return "Tanpa Folder";
    const c = contacts.find(c => c.id === contactId);
    return c ? c.name : "Pelanggan Terhapus";
  };

  const filteredTxs = useMemo(() => {
    return transactions.filter(tx => {
      const contactName = getContactName(tx.contactId).toLowerCase();
      const noteMatch = (tx.note || "").toLowerCase().includes(searchQuery.toLowerCase());
      const contactMatch = contactName.includes(searchQuery.toLowerCase());
      
      const matchesSearch = noteMatch || contactMatch;
      if (!matchesSearch) return false;
      
      if (filterType !== "all" && tx.type !== filterType) return false;
      
      return true;
    });
  }, [transactions, contacts, searchQuery, filterType]);

  if (!mounted) return null;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 animate-fade-in max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-indigo-100 rounded-2xl text-indigo-600"><Clock size={28} /></div>
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Riwayat Transaksi</h2>
          <p className="text-sm text-slate-500 font-medium">Log semua pembuatan nota dan pembayaran</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Cari nama atau catatan..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 focus:border-brand focus:ring-2 focus:ring-brand/20 rounded-2xl text-sm font-semibold transition-all outline-none"
          />
        </div>
        <div className="flex bg-slate-50 p-1.5 rounded-2xl border border-slate-200 overflow-x-auto hide-scrollbar">
          <button onClick={() => setFilterType("all")} className={`px-5 py-2 text-sm font-bold rounded-xl transition-all whitespace-nowrap ${filterType === 'all' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>Semua</button>
          <button onClick={() => setFilterType("bon")} className={`px-5 py-2 text-sm font-bold rounded-xl transition-all whitespace-nowrap flex items-center gap-2 ${filterType === 'bon' ? 'bg-rose-100 text-rose-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><Receipt size={16}/> Nota</button>
          <button onClick={() => setFilterType("payment")} className={`px-5 py-2 text-sm font-bold rounded-xl transition-all whitespace-nowrap flex items-center gap-2 ${filterType === 'payment' ? 'bg-emerald-100 text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><Wallet size={16}/> Bayar</button>
        </div>
      </div>

      {filteredTxs.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border-2 border-dashed border-slate-200">
          <FileText size={48} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500 font-medium text-lg">Belum ada riwayat transaksi.</p>
          <p className="text-sm text-slate-400 mt-1">Buat nota atau catat pembayaran untuk melihatnya di sini.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTxs.map(tx => (
            <div key={tx.id} onClick={() => setSelectedTx(tx)} className="group bg-white rounded-3xl p-5 border border-slate-200 shadow-sm hover:shadow-md hover:border-brand/30 transition-all cursor-pointer flex flex-col md:flex-row gap-4 md:items-center justify-between relative overflow-hidden">
              <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${tx.type === 'bon' ? 'bg-rose-500' : 'bg-emerald-500'}`}></div>
              
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-2xl ${tx.type === 'bon' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                  {tx.type === 'bon' ? <Receipt size={24} /> : <Wallet size={24} />}
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-lg">{getContactName(tx.contactId)}</h3>
                  <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-500 mt-1">
                    <span className="flex items-center gap-1"><Calendar size={14} className="text-slate-400"/> {new Date(tx.date).toLocaleDateString('id-ID', {day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'})}</span>
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200">{tx.type === 'bon' ? 'Nota Belanja' : 'Pembayaran'}</span>
                  </div>
                  {tx.note && <p className="text-sm text-slate-600 mt-2 line-clamp-1">{tx.note}</p>}
                </div>
              </div>
              
              <div className="text-right mt-2 md:mt-0 pl-14 md:pl-0">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                  {tx.type === 'bon' ? 'Tagihan Baru' : 'Nominal Masuk'}
                </div>
                <div className={`text-xl font-black ${tx.type === 'bon' ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {tx.type === 'bon' ? '' : '+'}{fmtRp(tx.amount)}
                </div>
                {tx.cash ? <div className="text-xs font-bold text-emerald-600 mt-1 bg-emerald-50 inline-block px-2 py-0.5 rounded-lg border border-emerald-100">DP/Lunas: {fmtRp(tx.cash)}</div> : null}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Detail */}
      {selectedTx && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl animate-pop">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-xl font-black text-slate-800 mb-1">Detail Transaksi</h3>
                <p className="text-sm text-slate-500 font-medium">{new Date(selectedTx.date).toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'})}</p>
              </div>
              <button onClick={() => setSelectedTx(null)} className="p-2 bg-slate-100 rounded-full text-slate-500 hover:text-rose-500 transition-colors"><X size={20} /></button>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-indigo-50 border border-indigo-100">
                <div className="p-2 bg-white rounded-xl shadow-sm text-indigo-500"><User size={20} /></div>
                <div>
                  <div className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Pelanggan</div>
                  <div className="font-bold text-indigo-900">{getContactName(selectedTx.contactId)}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className={`p-4 rounded-2xl border ${selectedTx.type === 'bon' ? 'bg-rose-50 border-rose-100' : 'bg-emerald-50 border-emerald-100'}`}>
                  <div className={`text-xs font-bold uppercase tracking-wider ${selectedTx.type === 'bon' ? 'text-rose-400' : 'text-emerald-400'}`}>Jenis</div>
                  <div className={`font-bold mt-1 ${selectedTx.type === 'bon' ? 'text-rose-700' : 'text-emerald-700'}`}>{selectedTx.type === 'bon' ? 'Nota Belanja' : 'Pembayaran'}</div>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nominal Utama</div>
                  <div className="font-black text-slate-800 mt-1">{fmtRp(selectedTx.amount)}</div>
                </div>
              </div>
              
              {selectedTx.type === 'bon' && selectedTx.cash !== undefined && (
                <div className="flex justify-between items-center p-4 rounded-2xl bg-emerald-50 border border-emerald-100">
                  <span className="font-bold text-emerald-700 flex items-center gap-2"><Banknote size={18}/> Dibayar (Tunai)</span>
                  <span className="font-black text-lg text-emerald-600">{fmtRp(selectedTx.cash)}</span>
                </div>
              )}
              
              {selectedTx.note && (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="block font-bold text-slate-500 mb-2 text-xs uppercase tracking-wider">Catatan</span>
                  <p className="text-sm font-medium text-slate-700 leading-relaxed">{selectedTx.note}</p>
                </div>
              )}
              
              {selectedTx.items && selectedTx.items.length > 0 && (
                <div className="mt-6 border-t border-slate-100 pt-6">
                  <h4 className="font-bold text-slate-800 mb-4 text-sm flex items-center gap-2 uppercase tracking-wider"><Layers size={18} className="text-indigo-500" /> Rincian Barang</h4>
                  <div className="space-y-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                    {selectedTx.items.map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-start text-sm p-3.5 rounded-xl border border-slate-200 bg-white shadow-sm">
                        <div className="flex flex-col gap-1">
                          <span className="font-bold text-slate-800">{item.name}</span>
                          <span className="font-semibold text-slate-400 text-xs">{item.qty} x {fmtRp(item.price)}</span>
                        </div>
                        <span className="font-black text-slate-700 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">{fmtRp(item.qty * item.price)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
