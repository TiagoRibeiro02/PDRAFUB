import { useState, useEffect, useRef } from 'react';
import '../BankNFTManager.css';

export interface BankUser {
  id: number;
  nome: string;
  sobrenome: string;
  NIF: number;
  eth_address?: string | null;
  balance: number;
  kyc: boolean;
}

interface UserPickerProps {
  selectedUser: BankUser | null;
  onSelect: (user: BankUser | null) => void;
  label?: string;
  /** Override the bank API URL (defaults to Bank1 at localhost:8002) */
  apiUrl?: string;
}

const DEFAULT_API_URL = 'http://localhost:8002/bank1_api.php';

export default function UserPicker({ selectedUser, onSelect, label = 'Bank User', apiUrl = DEFAULT_API_URL }: UserPickerProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<BankUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load all users when the component mounts or the API URL changes
  useEffect(() => {
    fetchUsers('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiUrl]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchUsers = async (q: string) => {
    setLoading(true);
    try {
      const url = `${apiUrl}?action=search&q=${encodeURIComponent(q)}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) setResults(data.users);
    } catch {
      // backend not reachable
    } finally {
      setLoading(false);
    }
  };

  const handleQueryChange = (val: string) => {
    setQuery(val);
    setOpen(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchUsers(val), 250);
  };

  const handleSelect = (user: BankUser) => {
    onSelect(user);
    setQuery('');
    setOpen(false);
  };

  const handleClear = () => {
    onSelect(null);
    setQuery('');
  };

  return (
    <div className="containerStyle" ref={containerRef}>
      <label className="label">
        {label}
      </label>

      {selectedUser ? (
        <div className="selectedBoxStyle">
          <span>
            <strong>{selectedUser.nome} {selectedUser.sobrenome}</strong>
            &nbsp;·&nbsp;NIF {selectedUser.NIF}
            {selectedUser.kyc && <span className="checkmarkKyc" >✓ KYC</span>}
          </span>
          <button onClick={handleClear} className='closeButtonKyc'>
            ✕
          </button>
        </div>
      ) : (
        <div className="inputRowStyle">
          <input
            className="inputStyle"
            placeholder="Search by name or NIF…"
            value={query}
            onChange={e => handleQueryChange(e.target.value)}
            onFocus={() => setOpen(true)}
          />
          {loading && <span className='smaller'>…</span>}
        </div>
      )}

      {open && !selectedUser && (
        <div className="dropdownStyle">
          {results.length === 0 && (
            <div className='nouserfound'>
              No users found
            </div>
          )}
          {results.map(u => (
            <UserRow key={u.id} user={u} onSelect={handleSelect} />
          ))}
        </div>
      )}
    </div>
  );
}

function UserRow({ user, onSelect }: { user: BankUser; onSelect: (u: BankUser) => void }) {
  return (
    <div
      className="rowStyle"
      onClick={() => onSelect(user)}
    >
      <span style={{ color: '#fff' }}>
        {user.nome} {user.sobrenome}
      </span>
      <span style={{ color: '#888', marginLeft: '0.5rem', fontSize: '0.8rem' }}>
        NIF {user.NIF}
      </span>
      {user.kyc && (
        <span style={{ marginLeft: '0.5rem', color: 'rgb(202, 165, 97)', fontSize: '0.75rem' }}>✓ KYC</span>
      )}
    </div>
  );
}
