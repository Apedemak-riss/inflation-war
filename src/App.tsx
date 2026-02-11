import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Shield, Sword, ShoppingCart, Coins, ExternalLink, Hammer, Crown, Minus, Check, Users, RefreshCw, Trash2, Trophy, ArrowRightLeft, LogOut, Gavel, ClipboardCheck, AlertTriangle, Loader2 } from 'lucide-react';

// --- CONFIGURATION ---
const ADMIN_PREFIX = "op:"; 
const HERO_LINK_IDS: Record<string, number> = { BK: 0, AQ: 1, GW: 2, RC: 4, MP: 6 };
const LIMITS = { troop: 340, siege: 3, spell: 11 };

// --- SUPABASE CLIENT ---
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// --- TYPES ---
type View = 'login' | 'select-team' | 'game' | 'moderator' | 'referee';
type ItemType = 'troop' | 'siege' | 'spell' | 'super_troop' | 'equipment';
type HeroType = 'BK' | 'AQ' | 'GW' | 'RC' | 'MP' | null;

type Item = { 
  id: string; name: string; base_price: number; coc_id: number; 
  type: ItemType; hero?: HeroType; housing_space: number; 
};

// --- RAW DATA ---
const RAW_DATA = [
  { name: "Barbarian Puppet", dataId: 0, type: 'equipment', hero: 'BK', weight: 0 },
  { name: "Rage Vial", dataId: 1, type: 'equipment', hero: 'BK', weight: 0 },
  { name: "Earthquake Boots", dataId: 8, type: 'equipment', hero: 'BK', weight: 0 },
  { name: "Giant Gauntlet", dataId: 10, type: 'equipment', hero: 'BK', weight: 0 },
  { name: "Vampstache", dataId: 11, type: 'equipment', hero: 'BK', weight: 0 },
  { name: "Spiky Ball", dataId: 14, type: 'equipment', hero: 'BK', weight: 0 },
  { name: "Snake Bracelet", dataId: 32, type: 'equipment', hero: 'BK', weight: 0 },
  { name: "Stick Horse", dataId: 51, type: 'equipment', hero: 'BK', weight: 0 },
  { name: "Archer Puppet", dataId: 2, type: 'equipment', hero: 'AQ', weight: 0 },
  { name: "Invisibility Vial", dataId: 3, type: 'equipment', hero: 'AQ', weight: 0 },
  { name: "Frozen Arrow", dataId: 15, type: 'equipment', hero: 'AQ', weight: 0 },
  { name: "Giant Arrow", dataId: 17, type: 'equipment', hero: 'AQ', weight: 0 },
  { name: "Healer Puppet", dataId: 20, type: 'equipment', hero: 'AQ', weight: 0 },
  { name: "Magic Mirror", dataId: 39, type: 'equipment', hero: 'AQ', weight: 0 },
  { name: "Action Figure", dataId: 48, type: 'equipment', hero: 'AQ', weight: 0 },
  { name: "Eternal Tome", dataId: 4, type: 'equipment', hero: 'GW', weight: 0 },
  { name: "Life Gem", dataId: 5, type: 'equipment', hero: 'GW', weight: 0 },
  { name: "Heroic Torch", dataId: 19, type: 'equipment', hero: 'GW', weight: 0 },
  { name: "Fireball", dataId: 22, type: 'equipment', hero: 'GW', weight: 0 },
  { name: "Rage Gem", dataId: 24, type: 'equipment', hero: 'GW', weight: 0 },
  { name: "Healing Tome", dataId: 34, type: 'equipment', hero: 'GW', weight: 0 },
  { name: "Lavaloon Puppet", dataId: 41, type: 'equipment', hero: 'GW', weight: 0 },
  { name: "Seeking Shield", dataId: 6, type: 'equipment', hero: 'RC', weight: 0 },
  { name: "Royal Gem", dataId: 7, type: 'equipment', hero: 'RC', weight: 0 },
  { name: "Hog Rider Doll", dataId: 9, type: 'equipment', hero: 'RC', weight: 0 },
  { name: "Haste Vial", dataId: 12, type: 'equipment', hero: 'RC', weight: 0 },
  { name: "Rocket Spear", dataId: 13, type: 'equipment', hero: 'RC', weight: 0 },
  { name: "Electro Boots", dataId: 40, type: 'equipment', hero: 'RC', weight: 0 },
  { name: "Snow Flake", dataId: 50, type: 'equipment', hero: 'RC', weight: 0 },
  { name: "Dark Crown", dataId: 100, type: 'equipment', hero: 'MP', weight: 0 },
  { name: "Dark Orb", dataId: 101, type: 'equipment', hero: 'MP', weight: 0 },
  { name: "Henchman", dataId: 102, type: 'equipment', hero: 'MP', weight: 0 },
  { name: "Metal Pants", dataId: 103, type: 'equipment', hero: 'MP', weight: 0 },
  { name: "Meteor Staff", dataId: 104, type: 'equipment', hero: 'MP', weight: 0 },
  { name: "Noble Iron", dataId: 105, type: 'equipment', hero: 'MP', weight: 0 },
  { name: "Wall Wrecker", dataId: 4000051, type: 'siege', weight: 1 },
  { name: "Battle Blimp", dataId: 4000052, type: 'siege', weight: 1 },
  { name: "Stone Slammer", dataId: 4000062, type: 'siege', weight: 1 },
  { name: "Siege Barracks", dataId: 4000075, type: 'siege', weight: 1 },
  { name: "Log Launcher", dataId: 4000087, type: 'siege', weight: 1 },
  { name: "Flame Flinger", dataId: 4000091, type: 'siege', weight: 1 },
  { name: "Battle Drill", dataId: 4000092, type: 'siege', weight: 1 },
  { name: "Troop Launcher", dataId: 4000135, type: 'siege', weight: 1 },
  { name: "Barbarian", dataId: 4000000, type: 'troop', weight: 1 },
  { name: "Archer", dataId: 4000001, type: 'troop', weight: 1 },
  { name: "Goblin", dataId: 4000002, type: 'troop', weight: 1 },
  { name: "Giant", dataId: 4000003, type: 'troop', weight: 5 },
  { name: "Wall Breaker", dataId: 4000004, type: 'troop', weight: 2 },
  { name: "Balloon", dataId: 4000005, type: 'troop', weight: 5 },
  { name: "Wizard", dataId: 4000006, type: 'troop', weight: 4 },
  { name: "Healer", dataId: 4000007, type: 'troop', weight: 14 },
  { name: "Dragon", dataId: 4000008, type: 'troop', weight: 20 },
  { name: "P.E.K.K.A", dataId: 4000009, type: 'troop', weight: 25 },
  { name: "Minion", dataId: 4000010, type: 'troop', weight: 2 },
  { name: "Hog Rider", dataId: 4000011, type: 'troop', weight: 5 },
  { name: "Valkyrie", dataId: 4000012, type: 'troop', weight: 8 },
  { name: "Golem", dataId: 4000013, type: 'troop', weight: 30 },
  { name: "Witch", dataId: 4000015, type: 'troop', weight: 12 },
  { name: "Lava Hound", dataId: 4000017, type: 'troop', weight: 30 },
  { name: "Bowler", dataId: 4000022, type: 'troop', weight: 6 },
  { name: "Baby Dragon", dataId: 4000023, type: 'troop', weight: 10 },
  { name: "Miner", dataId: 4000024, type: 'troop', weight: 6 },
  { name: "Yeti", dataId: 4000053, type: 'troop', weight: 18 },
  { name: "Ice Golem", dataId: 4000058, type: 'troop', weight: 15 },
  { name: "Electro Dragon", dataId: 4000059, type: 'troop', weight: 30 },
  { name: "Dragon Rider", dataId: 4000065, type: 'troop', weight: 25 },
  { name: "Headhunter", dataId: 4000082, type: 'troop', weight: 6 },
  { name: "Electro Titan", dataId: 4000095, type: 'troop', weight: 32 },
  { name: "Apprentice Warden", dataId: 4000097, type: 'troop', weight: 20 },
  { name: "Root Rider", dataId: 4000110, type: 'troop', weight: 20 },
  { name: "Druid", dataId: 4000123, type: 'troop', weight: 16 },
  { name: "Thrower", dataId: 4000132, type: 'troop', weight: 16 },
  { name: "Meteor Golem", dataId: 4000177, type: 'troop', weight: 40 },
  { name: "Super Barbarian", dataId: 4000026, type: 'super_troop', weight: 5 },
  { name: "Super Archer", dataId: 4000027, type: 'super_troop', weight: 12 },
  { name: "Sneaky Goblin", dataId: 4000055, type: 'super_troop', weight: 3 },
  { name: "Super Giant", dataId: 4000029, type: 'super_troop', weight: 10 },
  { name: "Super Wall Breaker", dataId: 4000028, type: 'super_troop', weight: 8 },
  { name: "Rocket Balloon", dataId: 4000057, type: 'super_troop', weight: 8 },
  { name: "Super Wizard", dataId: 4000083, type: 'super_troop', weight: 10 },
  { name: "Super Dragon", dataId: 4000081, type: 'super_troop', weight: 40 },
  { name: "Super Minion", dataId: 4000084, type: 'super_troop', weight: 12 },
  { name: "Super Hog Rider", dataId: 4000098, type: 'super_troop', weight: 12 },
  { name: "Super Valkyrie", dataId: 4000064, type: 'super_troop', weight: 20 },
  { name: "Super Witch", dataId: 4000067, type: 'super_troop', weight: 40 },
  { name: "Ice Hound", dataId: 4000076, type: 'super_troop', weight: 40 },
  { name: "Super Bowler", dataId: 4000080, type: 'super_troop', weight: 30 },
  { name: "Inferno Dragon", dataId: 4000063, type: 'super_troop', weight: 15 },
  { name: "Super Miner", dataId: 4000056, type: 'super_troop', weight: 24 },
  { name: "Super Yeti", dataId: 4000147, type: 'super_troop', weight: 35 },
  { name: "Lightning Spell", dataId: 26000000, type: 'spell', weight: 1 },
  { name: "Healing Spell", dataId: 26000001, type: 'spell', weight: 2 },
  { name: "Rage Spell", dataId: 26000002, type: 'spell', weight: 2 },
  { name: "Jump Spell", dataId: 26000003, type: 'spell', weight: 2 },
  { name: "Freeze Spell", dataId: 26000005, type: 'spell', weight: 1 },
  { name: "Poison Spell", dataId: 26000009, type: 'spell', weight: 1 },
  { name: "Earthquake Spell", dataId: 26000010, type: 'spell', weight: 1 },
  { name: "Haste Spell", dataId: 26000011, type: 'spell', weight: 1 },
  { name: "Clone Spell", dataId: 26000016, type: 'spell', weight: 3 },
  { name: "Skeleton Spell", dataId: 26000017, type: 'spell', weight: 1 },
  { name: "Bat Spell", dataId: 26000028, type: 'spell', weight: 1 },
  { name: "Invisibility Spell", dataId: 26000035, type: 'spell', weight: 1 },
  { name: "Recall Spell", dataId: 26000053, type: 'spell', weight: 2 },
  { name: "Overgrowth Spell", dataId: 26000070, type: 'spell', weight: 2 },
  { name: "Revive Spell", dataId: 26000098, type: 'spell', weight: 2 },
  { name: "Ice Block Spell", dataId: 26000109, type: 'spell', weight: 1 },
  { name: "Totem Spell", dataId: 26000120, type: 'spell', weight: 1 },
];

// --- HELPERS ---
const getImageUrl = (name: string, type: ItemType, hero?: HeroType) => {
  if (name === "Meteor Golem") return "/meteor-golem.png";
  if (name === "Stick Horse") return "/stick-horse.png";
  if (name === "Heroic Torch") return "/heroic-torch.png";
  const REPO_ROOT = "https://cdn.jsdelivr.net/gh/ClashKingInc/ClashKingAssets@main/assets/home-base";
  if (type === 'equipment' && hero) {
    let eqName = name.replace(/ /g, "_");
    if (name === "Hog Rider Doll") eqName = "Hog_Rider_Doll";
    if (name === "Action Figure") eqName = "WWEActionFigure"; 
    return `${REPO_ROOT}/equipment-pics/Hero_Equipment_${hero}_${eqName}.png`;
  }
  if (type === 'super_troop') return `${REPO_ROOT}/super-troop-pics/Icon_HV_${name.replace(/ /g, "_")}.png`;
  if (type === 'spell') {
    let s = name.replace(/ Spell$/, "").replace("Healing", "Heal").replace("Revive", "Hero_Revive_Potion").replace("Ice Block", "Ice_block"); 
    const prefix = ["Earthquake", "Haste", "Poison", "Skeleton", "Bat", "Overgrowth", "Ice_block"].includes(s) ? "Icon_HV_Dark_Spell_" : "Icon_HV_Spell_";
    return `${REPO_ROOT}/spell-pics/${prefix}${s}.png`;
  }
  let cn = name.toLowerCase().replace(/\./g, "").replace(/ /g, "-");     
  return `${REPO_ROOT}/troops/${cn}/${cn}-icon.png`;
};

// --- REFEREE LOGIC ---
const parseLink = (url: string) => {
  try {
    const params = new URLSearchParams(url.split('?')[1]);
    const army = params.get('army');
    if (!army) return { troops: {}, equipment: {} };
    
    const parts = army.split('-');
    const troops: Record<number, number> = {};
    const equipment: Record<number, number> = {};
    
    parts.forEach(p => {
      if (p.startsWith('u') || p.startsWith('s')) {
         const clean = p.substring(1);
         const [qty, id] = clean.split('x').map(Number);
         if (!isNaN(qty) && !isNaN(id)) {
            troops[id] = (troops[id] || 0) + qty;
         }
      } 
      else if (p.includes('e')) {
          let equipPart = p;
          if (p.startsWith('h')) equipPart = p.substring(p.indexOf('e'));
          const idsStr = equipPart.replace('e', '');
          const ids = idsStr.split('_').map(Number);
          ids.forEach(id => { 
             if (!isNaN(id)) equipment[id] = (equipment[id] || 0) + 1; 
          });
      }
    });
    return { troops, equipment };
  } catch (e) { return { troops: {}, equipment: {} }; }
};

const calculateTotalCost = (links: string[]) => {
  const totalTroops: Record<number, number> = {};
  const totalEquipment: Record<number, number> = {};

  links.forEach(link => {
    const { troops, equipment } = parseLink(link);
    Object.entries(troops).forEach(([id, qty]) => {
      totalTroops[Number(id)] = (totalTroops[Number(id)] || 0) + qty;
    });
    Object.entries(equipment).forEach(([id, qty]) => {
      totalEquipment[Number(id)] = (totalEquipment[Number(id)] || 0) + qty;
    });
  });

  let totalCost = 0;
  
  Object.entries(totalTroops).forEach(([shortIdStr, qty]) => {
    const shortId = Number(shortIdStr);
    const item = RAW_DATA.find(r => (r.dataId % 1000000) === shortId && r.type !== 'equipment');
    if (item) {
      const base = (item as any).base_price || 1;
      const baseTotal = qty * base; 
      const inflationTotal = qty * (qty - 1);
      totalCost += baseTotal + inflationTotal;
    }
  });

  Object.entries(totalEquipment).forEach(([idStr, qty]) => {
    const id = Number(idStr);
    const item = RAW_DATA.find(r => r.dataId === id && r.type === 'equipment');
    if (item) {
      const base = (item as any).base_price || 1; 
      const baseTotal = qty * base;
      const inflationTotal = qty * (qty - 1);
      totalCost += baseTotal + inflationTotal;
    }
  });

  return totalCost;
};

// --- COMPONENT ---
export function App() {
  const [view, setView] = useState<View>('login');
  const [lobbyCode, setLobbyCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  
  // Data
  const [foundLobby, setFoundLobby] = useState<any>(null);
  const [lobbyTeams, setLobbyTeams] = useState<any[]>([]);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [teamName, setTeamName] = useState('');
  
  // Game
  const [teamBudget, setTeamBudget] = useState(100);
  const [dbItems, setDbItems] = useState<Item[]>([]);
  const [teamPurchases, setTeamPurchases] = useState<any[]>([]);
  const [myPurchases, setMyPurchases] = useState<any[]>([]);
  const [isSeeding, setIsSeeding] = useState(false);
  
  // Referee State
  const [refLinks, setRefLinks] = useState(['', '', '']);
  const [refResult, setRefResult] = useState<number | null>(null);

  // --- INIT ---
  useEffect(() => { checkDatabase(); }, []);

  const checkDatabase = async () => {
    const { count, error } = await supabase.from('items').select('*', { count: 'exact', head: true });
    if (error) console.error("DB Error:", error);
    if (count === 0) seedDatabase(); else loadItems();
  };

  const seedDatabase = async () => {
    setIsSeeding(true);
    const rows = RAW_DATA.map(i => ({
      id: i.name, name: i.name, type: i.type, hero: (i as any).hero || null, coc_id: i.dataId, base_price: 1, housing_space: i.weight
    }));
    await supabase.from('items').insert(rows);
    loadItems();
    setIsSeeding(false);
  };

  const loadItems = async () => {
    const { data } = await supabase.from('items').select('*');
    if (data) setDbItems(data as Item[]);
  };

  // --- NAVIGATION ---
  const handleFindLobby = async (e: React.FormEvent) => {
    e.preventDefault();
    let code = lobbyCode.trim();
    let mode: View = 'select-team';

    if (code.toLowerCase().startsWith(ADMIN_PREFIX.toLowerCase())) {
      const suffix = code.substring(ADMIN_PREFIX.length).toLowerCase();
      if (suffix === 'referee') { setView('referee'); return; }
      mode = 'moderator';
      code = code.substring(ADMIN_PREFIX.length).toUpperCase();
    } else {
      code = code.toUpperCase();
    }
    setLobbyCode(code);
    let { data: lobby } = await supabase.from('lobbies').select('*').eq('code', code).single();
    if (mode === 'moderator' && !lobby) {
       const { data: newLobby } = await supabase.from('lobbies').insert({ code }).select().single();
       lobby = newLobby;
       await supabase.from('teams').insert([{ lobby_id: newLobby.id, name: 'Team 1', budget: 100 }, { lobby_id: newLobby.id, name: 'Team 2', budget: 100 }]);
    } else if (!lobby) {
      return alert("Lobby not found!");
    }
    setFoundLobby(lobby);
    fetchTeams(lobby.id);
    setView(mode);
  };

  const fetchTeams = async (lId: string) => {
    const { data: teams } = await supabase.from('teams').select('*, players(id, name)').eq('lobby_id', lId).order('name');
    if (teams) setLobbyTeams(teams);
  };

  // --- REFEREE CALC ---
  const handleRefereeCheck = () => {
    const cost = calculateTotalCost(refLinks);
    setRefResult(cost);
  };

  // --- TEAM JOIN ---
  const handleJoinTeam = async (tName: string) => {
    if (!playerName) return alert("Enter name!");
    const team = lobbyTeams.find(t => t.name === tName);
    if (team?.players && team.players.length >= 3) return alert("Full!");
    const { data: tIdData } = await supabase.from('teams').select('id').eq('lobby_id', foundLobby.id).eq('name', tName).single();
    const { data: p, error } = await supabase.from('players').insert({ team_id: tIdData!.id, name: playerName }).select().single();
    if (error) return alert("Error joining.");
    setPlayerId(p.id); setTeamId(tIdData!.id); setTeamName(tName); setView('game');
  };

  // --- REALTIME ---
  useEffect(() => {
    if (view === 'game' && teamId) {
      fetchGameState();
      const ch = supabase.channel('game')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'teams', filter: `id=eq.${teamId}` }, p => { if(p.new?.budget !== undefined) setTeamBudget(p.new.budget); })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'purchases', filter: `team_id=eq.${teamId}` }, () => fetchGameState())
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'players', filter: `id=eq.${playerId}` }, () => { alert("Kicked."); setView('login'); setPlayerId(null); setTeamId(null); })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'players', filter: `id=eq.${playerId}` }, async (payload) => {
            alert("Moved to new team. Army reset.");
            const newTid = payload.new.team_id;
            const { data: t } = await supabase.from('teams').select('name').eq('id', newTid).single();
            setTeamId(newTid); setTeamName(t?.name || ''); setMyPurchases([]); setTeamPurchases([]);
        })
        .subscribe();
      return () => { supabase.removeChannel(ch); };
    }
    if ((view === 'moderator' || view === 'select-team') && foundLobby) {
      fetchAdminState(); // Initial fetch
      const ch = supabase.channel('admin')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'players' }, () => fetchTeams(foundLobby.id))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, () => fetchTeams(foundLobby.id)) // Added teams listener for budget updates
        .subscribe();
      return () => { supabase.removeChannel(ch); };
    }
  }, [view, teamId, foundLobby, playerId]);

  const fetchGameState = async () => {
    const { data: t } = await supabase.from('teams').select('budget').eq('id', teamId!).single();
    if (t) setTeamBudget(t.budget);
    const { data: pur } = await supabase.from('purchases').select('*').eq('team_id', teamId!);
    if (pur) { setTeamPurchases(pur); setMyPurchases(pur.filter(x => x.player_id === playerId)); }
  };

  const fetchAdminState = async () => {
    fetchTeams(foundLobby.id);
  }

  // --- ACTIONS ---
  const handleKick = async (pId: string) => { if(confirm("Kick?")) { await supabase.rpc('leave_team', { p_player_id: pId }); fetchTeams(foundLobby.id); }};
  const handleSwitch = async (pId: string, cName: string) => {
    const other = lobbyTeams.find(t => t.name !== cName);
    if (!other || other.players?.length >= 3) return alert("Target full/invalid.");
    if (confirm("Switch team?")) { await supabase.rpc('moderator_switch_team', { p_player_id: pId, p_new_team_id: other.id }); fetchTeams(foundLobby.id); }
  };
  const handleReset = async (tId: string) => { if(confirm("Reset Team?")) await supabase.rpc('moderator_reset_team', { p_team_id: tId }); };
  const handleNuke = async () => { 
      if(confirm("DELETE LOBBY? This cannot be undone.")) { 
          await supabase.rpc('delete_lobby', { p_lobby_id: foundLobby.id }); 
          alert("Lobby Deleted.");
          setView('login');
      } 
  };
  const handleLeave = async () => { if(confirm("Leave match?")) await supabase.rpc('leave_team', { p_player_id: playerId }); };

  // --- GAME ACTIONS ---
  const calcPrice = (base: number, id: string) => base + (teamPurchases.filter(p => p.item_id === id).length * 2);
  const getMyCount = (id: string) => myPurchases.filter(p => p.item_id === id).length;
  const getCurrentWeight = (cat: 'troop' | 'spell' | 'siege') => myPurchases.reduce((s, p) => {
    const i = dbItems.find(x => x.id === p.item_id);
    if (!i) return s;
    if (cat === 'troop' && (i.type === 'troop' || i.type === 'super_troop')) return s + i.housing_space;
    if (cat === 'spell' && i.type === 'spell') return s + i.housing_space;
    if (cat === 'siege' && i.type === 'siege') return s + i.housing_space;
    return s;
  }, 0);

  // Helper to count currently active heroes for the player
  const getActiveHeroCount = () => {
    const heroItems = myPurchases.map(p => dbItems.find(i => i.id === p.item_id)).filter(i => i?.type === 'equipment');
    return new Set(heroItems.map(i => i?.hero)).size;
  };

  const handleBuy = async (item: Item) => {
    let cat: any = 'troop';
    if (item.type === 'spell') cat = 'spell'; else if (item.type === 'siege') cat = 'siege'; else if (item.type === 'equipment') cat = 'equipment';
    if (cat !== 'equipment') {
      const current = getCurrentWeight(cat);
      if (current + item.housing_space > LIMITS[cat as keyof typeof LIMITS]) return alert("Full Capacity!");
    } else {
        // Equipment Checks
        const heroEqCount = myPurchases.filter(p => {
            const i = dbItems.find(x => x.id === p.item_id);
            return i?.hero === item.hero;
        }).length;
        
        if (heroEqCount >= 2) return alert(`You already have 2 items for ${item.hero}!`);
        
        // If this is the FIRST item for this hero, we need to check if we already have 4 heroes active
        if (heroEqCount === 0) {
            const activeHeroes = getActiveHeroCount();
            if (activeHeroes >= 4) return alert("You can only equip 4 Heroes maximum!");
        }
    }
    const price = calcPrice(item.base_price, item.id);
    if (teamBudget < price) return alert("No Budget!");
    const mockId = Math.random().toString();
    setMyPurchases(prev => [...prev, { item_id: item.id, player_id: playerId, id: mockId }]);
    const { data, error } = await supabase.rpc('buy_item', { p_player_id: playerId, p_item_id: item.id });
    if (error || (data && !data.success)) setMyPurchases(prev => prev.filter(x => x.id !== mockId));
    fetchGameState();
  };

  const handleSell = async (item: Item) => {
    setMyPurchases(prev => { const idx = prev.findIndex(x => x.item_id === item.id); if(idx===-1) return prev; const n=[...prev]; n.splice(idx,1); return n; });
    await supabase.rpc('sell_item', { p_player_id: playerId, p_item_id: item.id });
    fetchGameState();
  };

  const exportArmy = () => {
    const active = myPurchases.map(p => dbItems.find(i => i.id === p.item_id)).filter(Boolean) as Item[];
    const counts: any = {}; active.forEach(i => counts[i.id] = (counts[i.id] || 0) + 1);
    const unique = Array.from(new Map(active.map(i => [i.id, i])).values());
    
    // FIX: Generate Short IDs for Link
    const uStr = unique.filter(i => ['troop','siege','super_troop'].includes(i.type))
      .map(i => `${counts[i.id]}x${i.coc_id % 1000000}`).join('-');
      
    const sStr = unique.filter(i => i.type === 'spell')
      .map(i => `${counts[i.id]}x${i.coc_id % 1000000}`).join('-');
      
    const hG: any = {}; active.filter(i => i.type === 'equipment').forEach(e => { if(e.hero){ hG[e.hero] = hG[e.hero] || []; hG[e.hero].push(e.coc_id); }});
    const hStr = Object.keys(hG).sort((a,b) => HERO_LINK_IDS[a]-HERO_LINK_IDS[b]).map((k,i) => (i===0?'h':'')+`${HERO_LINK_IDS[k]}e${hG[k].join('_')}`).join('-');
    window.open(`https://link.clashofclans.com/en?action=CopyArmy&army=u${uStr}-s${sStr}-${hStr}`, '_blank');
  };

  // --- RENDERERS ---
  const renderArmySidebar = () => {
    const active = myPurchases.map(p => dbItems.find(i => i.id === p.item_id)).filter(Boolean) as Item[];
    const heroKeys = ['BK', 'AQ', 'GW', 'RC', 'MP'].filter(h => active.some(i => i.hero === h));
    const counts: any = {}; active.forEach(i => counts[i.id] = (counts[i.id] || 0) + 1);
    const unique = Array.from(new Map(active.map(i => [i.id, i])).values());

    return (
      <div className="bg-slate-900 border-l border-slate-800 w-full lg:w-80 h-full lg:h-screen sticky top-0 overflow-y-auto p-4 z-40">
        <div className="font-black text-xl flex items-center gap-2 mb-6"><Sword className="text-yellow-500" /> ARMY PREVIEW</div>
        {heroKeys.map(h => (
          <div key={h} className="bg-slate-800 rounded-lg p-3 border border-slate-700 mb-3">
            <img src={`/${h.toLowerCase()}.png`} className="w-16 h-16 rounded-full border-2 border-yellow-600 mb-2 mx-auto object-cover" />
            <div className="flex gap-2 justify-center">{active.filter(i => i.hero === h).map((eq,idx) => <img key={idx} src={getImageUrl(eq.name, eq.type, eq.hero)} className="w-8 h-8 bg-slate-900 rounded border border-slate-600 p-1"/>)}</div>
          </div>
        ))}
        {['troop','siege','spell'].map(type => {
            const list = unique.filter(i => type === 'troop' ? (i.type === 'troop' || i.type === 'super_troop') : i.type === type);
            if (list.length === 0) return null;
            return <div key={type} className="mb-4">
                <h3 className="text-xs font-bold text-slate-500 uppercase mb-2">{type}s</h3>
                <div className="grid grid-cols-4 gap-2">{list.map(i => <div key={i.id} className="relative bg-slate-800 rounded border border-slate-700 aspect-square">
                    <img src={getImageUrl(i.name, i.type)} className="w-full h-full object-contain p-1" />
                    <div className="absolute top-0 right-0 bg-yellow-500 text-black text-[9px] font-bold px-1 rounded-bl">x{counts[i.id]}</div>
                </div>)}</div>
            </div>
        })}
        {active.length === 0 && <div className="text-center text-slate-600 mt-10 italic">Empty Army</div>}
      </div>
    );
  };

  const renderGrid = (list: Item[]) => (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
      {list.map(i => {
        const p = calcPrice(i.base_price, i.id);
        const qty = myPurchases.filter(x => x.item_id === i.id).length;
        const isOwned = i.type === 'equipment' && qty > 0;
        
        // --- NEW STYLE LOGIC ---
        const borderClass = (qty > 0 || isOwned) 
           ? 'border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.2)] scale-[1.02]' 
           : 'border-slate-700 hover:border-yellow-500 hover:scale-[1.05] hover:shadow-lg';
        
        return (
           <div key={i.id} className={`bg-slate-800 rounded-xl border p-3 relative transition-all duration-200 ease-out ${borderClass}`}>
                {i.hero && (
                   <div className="absolute top-2 left-2 z-10 w-10 h-10 rounded-full border border-black overflow-hidden bg-slate-900 shadow-md">
                      <img src={`/${i.hero.toLowerCase()}.png`} className="w-full h-full object-cover" alt={i.hero}/>
                   </div>
                )}
                <div className="aspect-square bg-slate-900 rounded mb-2 relative overflow-hidden">
                   <img src={getImageUrl(i.name, i.type, i.hero)} className="w-full h-full object-contain p-1" />
                   {qty > 0 && i.type !== 'equipment' && <div className="absolute top-0 right-0 bg-yellow-500 text-black px-1 rounded-bl font-bold shadow-md">x{qty}</div>}
                   {isOwned && <div className="absolute top-0 right-0 bg-green-500 text-black w-7 h-7 rounded-bl-lg flex items-center justify-center font-bold shadow-lg"><Check size={16}/></div>}
                </div>
                {/* NAME LABEL */}
                <div className="text-center font-bold text-sm h-10 leading-tight mb-2 flex items-center justify-center">
                    {i.name}
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-green-400 font-bold flex items-center gap-1">{p}<Coins size={12}/></span>
                    <div className="flex gap-1">
                        {qty > 0 && <button onClick={()=>handleSell(i)} className="bg-red-900/50 hover:bg-red-600 p-1.5 rounded transition-colors"><Minus size={14}/></button>}
                        <button onClick={()=>handleBuy(i)} disabled={teamBudget<p} className="bg-blue-600 hover:bg-blue-500 disabled:opacity-30 p-1.5 rounded transition-colors"><ShoppingCart size={14}/></button>
                    </div>
                </div>
            </div>
        )
      })}
    </div>
  );

  // --- VIEWS ---
  if (view === 'login') return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-900 p-8 rounded-2xl border border-slate-800 text-center">
        <Shield className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
        <h1 className="text-3xl font-black mb-6">INFLATION WAR</h1>
        <form onSubmit={handleFindLobby} className="space-y-4">
          <input value={lobbyCode} onChange={e => setLobbyCode(e.target.value)} className="w-full bg-black border border-slate-700 rounded-lg p-4 text-center text-2xl font-mono uppercase tracking-widest outline-none focus:border-yellow-500" placeholder="CODE" />
          <button className="w-full bg-blue-600 text-white font-bold py-4 rounded-lg hover:bg-blue-500">ENTER</button>
        </form>
      </div>
    </div>
  );

  if (view === 'referee') return (
    <div className="min-h-screen bg-slate-950 text-white p-8 flex items-center justify-center">
      <div className="max-w-2xl w-full bg-slate-900 p-8 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-3 mb-6"><Gavel className="text-yellow-500 w-8 h-8"/><h1 className="text-2xl font-black">LEGALITY CHECK</h1></div>
        <div className="space-y-4 mb-6">
           {refLinks.map((L, i) => <input key={i} value={L} onChange={e => { const n=[...refLinks]; n[i]=e.target.value; setRefLinks(n); }} className="w-full bg-black border border-slate-700 rounded p-3 text-sm font-mono" placeholder={`Paste Player ${i+1} Army Link`} />)}
        </div>
        <button onClick={handleRefereeCheck} className="w-full bg-green-600 py-4 rounded font-bold hover:bg-green-500 mb-6 flex items-center justify-center gap-2"><ClipboardCheck/> CALCULATE TEAM SPEND</button>
        {refResult !== null && (
          <div className={`text-center p-6 rounded-xl border-2 ${refResult > 100 ? 'bg-red-900/20 border-red-500' : 'bg-green-900/20 border-green-500'}`}>
             <div className="text-sm text-slate-400 uppercase font-bold mb-2">Total Team Value</div>
             <div className={`text-5xl font-black mb-2 ${refResult > 100 ? 'text-red-500' : 'text-green-500'}`}>{refResult} GOLD</div>
             <div className="text-xl font-bold">{refResult > 100 ? <span className="flex items-center justify-center gap-2"><AlertTriangle/> ILLEGAL (OVER 100)</span> : <span className="flex items-center justify-center gap-2"><Check/> LEGAL</span>}</div>
          </div>
        )}
        <button onClick={()=>setView('login')} className="block w-full text-center text-slate-500 mt-6 hover:text-white">Exit Referee</button>
      </div>
    </div>
  );

  if (view === 'moderator') return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-5xl mx-auto">
        <header className="flex justify-between items-center mb-8 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3"><Trophy className="text-yellow-500 w-8 h-8"/><div><h1 className="text-2xl font-black">MODERATOR PANEL</h1><p className="text-slate-400 font-mono">LOBBY: {lobbyCode}</p></div></div>
          <button onClick={handleNuke} className="bg-red-600 hover:bg-red-500 px-6 py-2 rounded-lg font-bold flex items-center gap-2"><Trash2 size={18}/> DELETE LOBBY</button>
        </header>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {lobbyTeams.map(team => (
            <div key={team.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <div className="flex justify-between items-center mb-6"><h2 className="text-2xl font-bold">{team.name}</h2><div className="bg-black px-4 py-2 rounded-lg border border-slate-700 font-mono text-yellow-500 text-xl font-bold">{team.budget} <Coins className="inline w-4 h-4"/></div></div>
              <div className="space-y-3 mb-8">
                {team.players?.map((p:any, i:number) => <div key={i} className="flex items-center justify-between bg-slate-800 p-3 rounded-lg border border-slate-700"><div className="flex items-center gap-3"><div className="w-3 h-3 bg-green-500 rounded-full"/> <span className="font-bold">{p.name}</span></div><div className="flex gap-2"><button onClick={() => handleSwitch(p.id, team.name)} className="p-2 hover:bg-slate-600 rounded text-blue-400"><ArrowRightLeft size={18}/></button><button onClick={() => handleKick(p.id)} className="p-2 hover:bg-slate-600 rounded text-red-500"><Trash2 size={18}/></button></div></div>)}
              </div>
              <button onClick={() => handleReset(team.id)} className="w-full bg-slate-800 hover:bg-red-900/30 text-red-400 border border-slate-700 py-4 rounded-xl font-bold flex justify-center gap-2 transition-all"><RefreshCw/> RESET {team.name.toUpperCase()}</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  if (view === 'select-team') return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
      <div className="max-w-2xl w-full space-y-6">
        <div className="text-center">
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Lobby: {lobbyCode}</h2>
          <input value={playerName} onChange={e => setPlayerName(e.target.value)} className="mt-4 bg-transparent border-b-2 border-slate-800 text-3xl font-black text-center focus:border-yellow-500 outline-none px-4 py-2 w-full" placeholder="ENTER YOUR NAME" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {lobbyTeams.map(team => (
            <div key={team.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col items-center hover:border-slate-600 transition-colors">
              <Users className="w-12 h-12 text-slate-600 mb-2" />
              <h3 className="text-xl font-bold mb-4">{team.name}</h3>
              <div className="flex-1 w-full space-y-2 mb-6">
                {[0, 1, 2].map(idx => (
                  <div key={idx} className="bg-black/40 rounded p-2 text-sm text-slate-400 flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${team.players?.[idx] ? 'bg-green-500' : 'bg-slate-700'}`} />
                    {team.players?.[idx] ? team.players[idx].name : 'Empty Slot'}
                  </div>
                ))}
              </div>
              <button onClick={() => handleJoinTeam(team.name)} disabled={team.players?.length >= 3} className={`w-full py-3 rounded-xl font-black uppercase transition-all ${team.players?.length >= 3 ? 'bg-slate-800 text-slate-600 cursor-not-allowed' : 'bg-yellow-500 text-black hover:bg-yellow-400'}`}>{team.players?.length >= 3 ? 'FULL' : 'JOIN TEAM'}</button>
            </div>
          ))}
        </div>
        <button onClick={() => setView('login')} className="block mx-auto text-slate-500 hover:text-white text-sm underline">Back to Search</button>
      </div>
    </div>
  );

  // --- GAME VIEW ---
  if (dbItems.length === 0) return (
     <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center gap-4">
        {isSeeding ? <><Loader2 className="w-12 h-12 animate-spin text-blue-500"/><p>Seeding Database...</p></> 
        : <><AlertTriangle className="w-12 h-12 text-yellow-500"/><p>Loading Game Data...</p><button onClick={()=>window.location.reload()} className="bg-blue-600 px-4 py-2 rounded">Retry</button></>}
     </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col lg:flex-row font-sans overflow-hidden">
      <div className="flex-1 h-screen overflow-y-auto pb-24">
        <header className="bg-slate-900/80 p-4 sticky top-0 z-50 border-b border-slate-800 backdrop-blur-md flex justify-between items-center">
            <div className="flex items-center gap-3"><div className="bg-yellow-500 p-2 rounded-lg text-black"><Shield size={20}/></div><div><span className="font-bold">INFLATION WAR</span><div className="text-[10px] text-slate-400">{lobbyCode} | {teamName}</div></div></div>
            <div className="flex items-center gap-4">
                <div className="hidden sm:flex gap-4">
                   <div className="text-[10px] text-center"><div className="text-blue-400 font-bold">TROOPS</div>{getCurrentWeight('troop')}/340</div>
                   <div className="text-[10px] text-center"><div className="text-orange-400 font-bold">SIEGES</div>{getCurrentWeight('siege')}/3</div>
                   <div className="text-[10px] text-center"><div className="text-purple-400 font-bold">SPELLS</div>{getCurrentWeight('spell')}/11</div>
                </div>
                <div className="bg-black px-4 py-2 rounded-full border border-slate-700 flex items-center gap-2 text-xl font-mono text-yellow-500 font-bold">{teamBudget}<Coins/></div>
                <button onClick={handleLeave} className="bg-red-900/50 hover:bg-red-600 p-2 rounded text-red-200" title="Exit Match"><LogOut size={20}/></button>
            </div>
        </header>
        <main className="p-6 max-w-6xl mx-auto space-y-12">
            <div>
              <h2 className="text-2xl font-bold mb-6 flex gap-2 items-center"><Crown className="text-yellow-500"/> HERO EQUIPMENT</h2>
              {/* SUBSECTIONS FOR HEROES */}
              {['BK','AQ','GW','RC','MP'].map(h => {
                const hItems = dbItems.filter(i => i.hero === h);
                if (hItems.length === 0) return null;
                return (
                  <div key={h} className="mb-8 pl-4 border-l-2 border-slate-800">
                      <h4 className="text-slate-400 font-bold mb-3 flex items-center gap-2">
                          <img src={`/${h.toLowerCase()}.png`} className="w-8 h-8 rounded-full grayscale opacity-70 object-cover"/> 
                          {h} EQUIPMENT
                      </h4>
                      {renderGrid(hItems)}
                  </div>
                )
              })}
            </div>

            <div><h2 className="text-2xl font-bold mb-6 flex gap-2 items-center border-t border-slate-800 pt-10"><Sword className="text-blue-500"/> TROOPS</h2>{renderGrid(dbItems.filter(i => i.type === 'troop' || i.type === 'super_troop'))}</div>
            <div><h2 className="text-2xl font-bold mb-6 flex gap-2 items-center border-t border-slate-800 pt-10"><Hammer className="text-orange-500"/> SIEGES</h2>{renderGrid(dbItems.filter(i => i.type === 'siege'))}</div>
            <div><h2 className="text-2xl font-bold mb-6 flex gap-2 items-center border-t border-slate-800 pt-10"><Shield className="text-purple-500"/> SPELLS</h2>{renderGrid(dbItems.filter(i => i.type === 'spell'))}</div>
        </main>
        <div className="fixed bottom-0 left-0 w-full lg:w-[calc(100%-20rem)] bg-slate-900 border-t border-slate-800 p-4 z-50 flex justify-center shadow-2xl">
            <button onClick={exportArmy} className="bg-green-600 px-12 py-4 rounded-full font-black flex gap-2 items-center hover:bg-green-500 transition-all shadow-[0_0_20px_rgba(22,163,74,0.4)] transform active:scale-95"><ExternalLink size={20}/> EXPORT ARMY</button>
        </div>
      </div>
      {renderArmySidebar()}
    </div>
  );
}