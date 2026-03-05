import { useState, useEffect, useRef } from 'react';

export interface BankUser {
  id: number;
  nome: string;
  sobrenome: string;
  NIF: number;
  pk: string | null;
  eth_address?: string | null;
  balance: number;
  kyc: boolean;
}

interface UserPickerProps {
  selectedUser: BankUser | null;
  onSelect: (user: BankUser | null) => void;
  label?: string;
}

export default function UserPicker({ selectedUser, onSelect, label = 'Bank User' }: UserPickerProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<BankUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load all users on mount
  useEffect(() => {
    fetchUsers('');
  }, []);

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
      const url = `http://localhost:8001/api.php?action=search&q=${encodeURIComponent(q)}`;
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

  const containerStyle: React.CSSProperties = {
    position: 'relative',
    width: '100%',
  };

  const inputRowStyle: React.CSSProperties = {
    display: 'flex',
    gap: '0.5rem',
    alignItems: 'center',
  };

  const inputStyle: React.CSSProperties = {
    flex: 1,
    padding: '0.6rem 0.75rem',
    background: '#222',
    border: '1px solid #444',
    borderRadius: '6px',
    color: '#fff',
    fontSize: '0.9rem',
    outline: 'none',
  };

  const dropdownStyle: React.CSSProperties = {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    background: '#1a1a1a',
    border: '1px solid #444',
    borderRadius: '6px',
    maxHeight: '220px',
    overflowY: 'auto',
    zIndex: 200,
    marginTop: '2px',
  };

  const rowStyle = (hovered: boolean): React.CSSProperties => ({
    padding: '0.55rem 0.75rem',
    cursor: 'pointer',
    background: hovered ? '#2a2a2a' : 'transparent',
    borderBottom: '1px solid #2a2a2a',
    fontSize: '0.875rem',
  });

  const selectedBoxStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.6rem 0.75rem',
    background: '#1a2a1a',
    border: '1px solid #4CAF50',
    borderRadius: '6px',
    fontSize: '0.875rem',
    color: '#cfffcf',
  };

  return (
    <div style={containerStyle} ref={containerRef}>
      <label style={{ display: 'block', color: '#aaa', fontSize: '0.8rem', marginBottom: '0.35rem' }}>
        {label}
      </label>

      {selectedUser ? (
        <div style={selectedBoxStyle}>
          <span>
            <strong>{selectedUser.nome} {selectedUser.sobrenome}</strong>
            &nbsp;·&nbsp;NIF {selectedUser.NIF}
            {selectedUser.kyc && <span style={{ marginLeft: '0.5rem', color: 'rgb(202, 165, 97)', fontSize: '0.75rem' }}>✓ KYC</span>}
            {selectedUser.pk && <span style={{ marginLeft: '0.5rem', color: '#888', fontSize: '0.75rem' }}>DID linked</span>}
          </span>
          <button
            onClick={handleClear}
            style={{ background: 'transparent', border: 'none', color: '#888', cursor: 'pointer', fontSize: '1rem', padding: '0 0.25rem' }}
          >
            ✕
          </button>
        </div>
      ) : (
        <div style={inputRowStyle}>
          <input
            style={inputStyle}
            placeholder="Search by name or NIF…"
            value={query}
            onChange={e => handleQueryChange(e.target.value)}
            onFocus={() => setOpen(true)}
          />
          {loading && <span style={{ color: '#888', fontSize: '0.8rem' }}>…</span>}
        </div>
      )}

      {open && !selectedUser && (
        <div style={dropdownStyle}>
          {results.length === 0 && (
            <div style={{ padding: '0.6rem 0.75rem', color: '#888', fontSize: '0.85rem' }}>
              No users found
            </div>
          )}
          {results.map(u => (
            <UserRow key={u.id} user={u} onSelect={handleSelect} rowStyle={rowStyle} />
          ))}
        </div>
      )}
    </div>
  );
}

function UserRow({ user, onSelect, rowStyle }: { user: BankUser; onSelect: (u: BankUser) => void; rowStyle: (h: boolean) => React.CSSProperties }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      style={rowStyle(hovered)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onSelect(user)}
    >
      <span style={{ color: '#fff' }}>
        {user.nome} {user.sobrenome}
      </span>
      <span style={{ color: '#888', marginLeft: '0.5rem', fontSize: '0.8rem' }}>
        NIF {user.NIF}
      </span>
      {user.pk && (
        <span style={{ marginLeft: '0.5rem', color: '#888', fontSize: '0.75rem' }}>DID linked</span>
      )}
      {user.kyc && (
        <span style={{ marginLeft: '0.5rem', color: 'rgb(202, 165, 97)', fontSize: '0.75rem' }}>✓ KYC</span>
      )}
    </div>
  );
}
