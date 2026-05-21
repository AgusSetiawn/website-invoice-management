export type Contact = {
  id: string;
  name: string;
  address: string;
  phone: string;
};

export type Transaction = {
  id: string;
  contactId: string;
  date: string;
  type: 'bon' | 'payment'; 
  amount: number;
  note?: string;
  items?: any[];
  cash?: number;
};

export const getContacts = (): Contact[] => {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem('app_contacts');
  return data ? JSON.parse(data) : [];
};

export const saveContacts = (contacts: Contact[]) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('app_contacts', JSON.stringify(contacts));
  }
};

export const getTransactions = (): Transaction[] => {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem('app_transactions');
  return data ? JSON.parse(data) : [];
};

export const saveTransactions = (transactions: Transaction[]) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('app_transactions', JSON.stringify(transactions));
  }
};
