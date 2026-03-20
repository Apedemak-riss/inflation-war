import { X, Users, Sword, Shield, Crown, Zap, Castle } from 'lucide-react';
import { useMemo } from 'react';

type Item = any;

interface TeamArmyPanelProps {
  isOpen: boolean;
  onClose: () => void;
  teamPurchases: any[];
  teamPlayers: any[];
  currentPlayerId: string;
  dbItems: Item[];
  getImageUrl: (name: string, type: string, hero?: string) => string;
}

export function TeamArmyPanel({ isOpen, onClose, teamPurchases, teamPlayers, currentPlayerId, dbItems, getImageUrl }: TeamArmyPanelProps) {
  
  // Group purchases by player and item type
  const teammateArmies = useMemo(() => {
     if (!teamPurchases || !teamPlayers || !dbItems) return [];
     
     const teammates = teamPlayers.filter(p => p.id !== currentPlayerId);
     
     return teammates.map(player => {
         const playerPurchases = teamPurchases.filter(p => p.player_id === player.id);
         
         // Helper to group by item ID
         const groupByCount = (items: any[]) => {
             const counts: Record<string, number> = {};
             items.forEach(p => {
                 counts[p.item_id] = (counts[p.item_id] || 0) + 1;
             });
             return Object.entries(counts).map(([itemId, count]) => {
                 const dbItem = dbItems.find(i => i.id === itemId);
                 return { count, item: dbItem };
             }).filter(x => x.item); // Ensure item exists
         };

         return {
             ...player,
             troops: groupByCount(playerPurchases.filter(p => !p.is_cc && (dbItems.find(i => i.id === p.item_id)?.type === 'troop' || dbItems.find(i => i.id === p.item_id)?.type === 'super_troop'))),
             spells: groupByCount(playerPurchases.filter(p => !p.is_cc && dbItems.find(i => i.id === p.item_id)?.type === 'spell')),
             sieges: groupByCount(playerPurchases.filter(p => !p.is_cc && dbItems.find(i => i.id === p.item_id)?.type === 'siege')),
             equipment: playerPurchases.filter(p => !p.is_cc && dbItems.find(i => i.id === p.item_id)?.type === 'equipment').map(p => dbItems.find(i => i.id === p.item_id)).filter(Boolean),
             pets: playerPurchases.filter(p => !p.is_cc && dbItems.find(i => i.id === p.item_id)?.type === 'pet').map(p => ({ db: dbItems.find(i => i.id === p.item_id), hero: p.equipped_hero })).filter(x => x.db),
             cc: groupByCount(playerPurchases.filter(p => p.is_cc)),
             totalSpent: playerPurchases.reduce((acc, p) => acc + (p.price_paid || 0), 0)
         };
     });
  }, [teamPurchases, teamPlayers, currentPlayerId, dbItems]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop for mobile */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[90] lg:hidden animate-fade-in"
        onClick={onClose}
      />
      
      {/* Sliding Panel */}
      <div className="fixed top-0 right-0 bottom-0 w-[90%] sm:w-[400px] bg-[#0a101f]/95 backdrop-blur-xl border-l border-white/10 z-[100] shadow-2xl flex flex-col animate-slide-left">
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-black/20">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
                    <Users className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                    <h3 className="font-black text-white tracking-widest uppercase">Teammate Intel</h3>
                    <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Real-time Deployment Data</p>
                </div>
            </div>
            <button 
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-xl transition-colors text-slate-400 hover:text-white"
            >
                <X size={20} />
            </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-6">
            {teammateArmies.length === 0 ? (
                <div className="text-center p-8 bg-black/20 rounded-2xl border border-white/5 border-dashed">
                    <Users className="w-12 h-12 text-slate-600 mx-auto mb-3 opacity-50" />
                    <p className="text-slate-500 font-bold text-sm tracking-widest uppercase">No teammates found</p>
                </div>
            ) : (
                teammateArmies.map(player => (
                    <div key={player.id} className="glass rounded-2xl p-4 border border-white/5 bg-black/40 relative overflow-hidden group">
                        {player.is_locked && (
                            <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-green-500/0 via-green-500 to-green-500/0 opacity-50" />
                        )}
                        
                        <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-3">
                            <div className="flex items-center gap-2">
                                <span className="font-black text-white text-lg tracking-wider">{player.name}</span>
                                {player.is_locked && (
                                    <span className="text-[8px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded uppercase font-black tracking-widest border border-green-500/30">LOCKED IN</span>
                                )}
                            </div>
                            <span className="text-xs font-bold font-mono text-yellow-500 flex items-center gap-1 bg-yellow-500/10 px-2 py-1 rounded-lg border border-yellow-500/20">
                                {player.totalSpent}G <span className="text-[8px] uppercase tracking-widest text-yellow-500/70">Spent</span>
                            </span>
                        </div>

                        <div className="space-y-4">
                            {/* Troops */}
                            {player.troops.length > 0 && (
                                <div>
                                    <div className="flex items-center gap-1.5 text-[9px] font-black text-blue-400 tracking-widest uppercase mb-2 opacity-80">
                                        <Sword size={12} /> Army
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {player.troops.map((t: any, idx: number) => (
                                            <div key={idx} className="flex items-center gap-1.5 bg-black/40 border border-white/5 px-2 py-1 rounded-md" title={t.item.name}>
                                                <img src={getImageUrl(t.item.name, t.item.type, t.item.hero)} className="w-5 h-5 object-cover rounded shadow-sm" alt={t.item.name} />
                                                <span className="text-xs font-bold text-slate-300">{t.count}x</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Spells */}
                            {player.spells.length > 0 && (
                                <div>
                                    <div className="flex items-center gap-1.5 text-[9px] font-black text-purple-400 tracking-widest uppercase mb-2 opacity-80">
                                        <Zap size={12} /> Spells
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {player.spells.map((s: any, idx: number) => (
                                            <div key={idx} className="flex items-center gap-1.5 bg-black/40 border border-white/5 px-2 py-1 rounded-md" title={s.item.name}>
                                                <img src={getImageUrl(s.item.name, s.item.type, s.item.hero)} className="w-5 h-5 object-cover rounded shadow-sm" alt={s.item.name} />
                                                <span className="text-xs font-bold text-slate-300">{s.count}x</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            
                            {/* Sieges */}
                            {player.sieges.length > 0 && (
                                <div>
                                    <div className="flex items-center gap-1.5 text-[9px] font-black text-orange-400 tracking-widest uppercase mb-2 opacity-80">
                                        <Shield size={12} /> Sieges
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {player.sieges.map((s: any, idx: number) => (
                                            <div key={idx} className="flex items-center gap-1.5 bg-black/40 border border-white/5 px-2 py-1 rounded-md" title={s.item.name}>
                                                <img src={getImageUrl(s.item.name, s.item.type, s.item.hero)} className="w-5 h-5 object-cover rounded shadow-sm" alt={s.item.name} />
                                                <span className="text-xs font-bold text-slate-300">{s.count}x</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Equipment & Pets */}
                            {(player.equipment.length > 0 || player.pets.length > 0) && (
                                <div className="pt-2 border-t border-white/5">
                                    <div className="flex items-center gap-1.5 text-[9px] font-black text-yellow-500 tracking-widest uppercase mb-2 opacity-80">
                                        <Crown size={12} /> Heroes & Pets
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {player.equipment.map((e: any, idx: number) => (
                                            <div key={`eq-${idx}`} className="flex items-center gap-1.5 bg-black/40 border border-white/5 pr-2 rounded-md overflow-hidden" title={e.name}>
                                                <img src={getImageUrl(e.name, e.type, e.hero)} className="w-6 h-6 object-cover bg-slate-800" alt={e.name} />
                                                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">{e.hero}</span>
                                            </div>
                                        ))}
                                        {player.pets.map((p: any, idx: number) => (
                                            <div key={`pet-${idx}`} className="flex items-center gap-1.5 bg-black/40 border border-white/5 p-1 rounded-md" title={`${p.db.name} (${p.hero})`}>
                                                <img src={getImageUrl(p.db.name, p.db.type)} className="w-5 h-5 object-cover rounded" alt={p.db.name} />
                                                {p.hero && <span className="text-[9px] font-black text-slate-500 px-1">{p.hero}</span>}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Clan Castle */}
                            {player.cc.length > 0 && (
                                <div className="pt-2 border-t border-white/5">
                                    <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 tracking-widest uppercase mb-2 opacity-80">
                                        <Castle size={12} /> Clan Castle
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {player.cc.map((c: any, idx: number) => (
                                            <div key={idx} className="flex items-center gap-1.5 bg-black/40 border border-red-500/20 px-2 py-1 rounded-md" title={c.item.name}>
                                                <img src={getImageUrl(c.item.name, c.item.type, c.item.hero)} className="w-5 h-5 object-cover rounded shadow-sm" alt={c.item.name} />
                                                <span className="text-xs font-bold text-slate-300">{c.count}x</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            
                            {player.troops.length === 0 && player.spells.length === 0 && player.sieges.length === 0 && player.equipment.length === 0 && player.cc.length === 0 && (
                                <p className="text-[10px] text-slate-500 uppercase tracking-widest text-center py-2 font-bold">Army is empty</p>
                            )}
                        </div>
                    </div>
                ))
            )}
        </div>
      </div>
    </>
  );
}
