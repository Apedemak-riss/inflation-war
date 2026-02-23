import toast from 'react-hot-toast';

export const confirmToast = (message: string): Promise<boolean> => {
    return new Promise((resolve) => {
        toast((t) => (
            <div style={{ maxWidth: '320px' }}>
                <p style={{ fontWeight: 700, fontSize: '13px', marginBottom: '12px', lineHeight: 1.4, letterSpacing: '0.02em' }}>{message}</p>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        onClick={() => { toast.dismiss(t.id); resolve(true); }}
                        style={{
                            background: 'rgba(239,68,68,0.15)',
                            color: '#f87171',
                            border: '1px solid rgba(239,68,68,0.3)',
                            padding: '6px 16px',
                            borderRadius: '8px',
                            fontSize: '11px',
                            fontWeight: 900,
                            letterSpacing: '0.1em',
                            textTransform: 'uppercase' as const,
                            cursor: 'pointer',
                            transition: 'all 0.15s',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.3)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.15)'; }}
                    >
                        Confirm
                    </button>
                    <button
                        onClick={() => { toast.dismiss(t.id); resolve(false); }}
                        style={{
                            background: 'rgba(255,255,255,0.05)',
                            color: '#94a3b8',
                            border: '1px solid rgba(255,255,255,0.1)',
                            padding: '6px 16px',
                            borderRadius: '8px',
                            fontSize: '11px',
                            fontWeight: 900,
                            letterSpacing: '0.1em',
                            textTransform: 'uppercase' as const,
                            cursor: 'pointer',
                            transition: 'all 0.15s',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                    >
                        Cancel
                    </button>
                </div>
            </div>
        ), { duration: Infinity, style: { background: '#0a101f', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' } });
    });
};
