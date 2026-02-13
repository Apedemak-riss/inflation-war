import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Shield, Sword, ShoppingCart, Coins, ExternalLink, Hammer, Crown, Minus, Check, Users, RefreshCw, Trash2, Trophy, ArrowRightLeft, LogOut, Gavel, ClipboardCheck, AlertTriangle, Loader2, Edit2, Save, X, Tv, PawPrint, Castle } from 'lucide-react';

// --- CONFIGURATION ---
const ADMIN_PREFIX = "op:"; 
const STREAMER_PREFIX = "streamer:";
const HERO_LINK_IDS: Record<string, number> = { BK: 0, AQ: 1, GW: 2, RC: 4, MP: 6 };
const LIMITS = { troop: 340, siege: 3, spell: 11 };
const CC_LIMITS = { troop: 55, siege: 2, spell: 4 };

// --- SUPABASE CLIENT ---
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// --- TYPES ---
type View = 'login' | 'select-team' | 'game' | 'moderator' | 'streamer' | 'referee';
type ItemType = 'troop' | 'siege' | 'spell' | 'super_troop' | 'equipment' | 'pet';
type HeroType = 'BK' | 'AQ' | 'GW' | 'RC' | 'MP' | null;

type Item = { 
  id: string; name: string; base_price: number; coc_id: number; 
  type: ItemType; hero?: HeroType; housing_space: number; 
};

// --- RAW DATA ---
const RAW_PETS = [
    { name: "L.A.S.S.I", dataId: 0, type: 'pet', weight: 0 },
    { name: "Mighty Yak", dataId: 1, type: 'pet', weight: 0 },
    { name: "Electro Owl", dataId: 2, type: 'pet', weight: 0 },
    { name: "Unicorn", dataId: 3, type: 'pet', weight: 0 },
    { name: "Phoenix", dataId: 4, type: 'pet', weight: 0 },
    { name: "Poison Lizard", dataId: 7, type: 'pet', weight: 0 },
    { name: "Diggy", dataId: 8, type: 'pet', weight: 0 },
    { name: "Frosty", dataId: 9, type: 'pet', weight: 0 },
    { name: "Spirit Fox", dataId: 10, type: 'pet', weight: 0 },
    { name: "Angry Jelly", dataId: 11, type: 'pet', weight: 0 },
    { name: "Sneezy", dataId: 16, type: 'pet', weight: 0 },
];

const RAW_DATA = [
  ...RAW_PETS,
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
  
  if (type === 'pet') {
    return `${REPO_ROOT}/pet-pics/Icon_HV_Hero_Pets_${name.replace(/ /g, "_")}.png`;
  }
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
const parseLink = (url: string) => { return { troops: {}, equipment: {} }; };
const calculateTotalCost = (links: string[]) => { return 0; };

// --- COMPONENT ---
export function App() {
  const [view, setView] = useState<View>('login');
  const [lobbyCode, setLobbyCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  
  const [foundLobby, setFoundLobby] = useState<any>(null);
  const [lobbyTeams, setLobbyTeams] = useState<any[]>([]);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [teamName, setTeamName] = useState('');
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [tempTeamName, setTempTeamName] = useState('');
  
  const [focusedPlayer, setFocusedPlayer] = useState<any>(null);
  const [petModalItem, setPetModalItem] = useState<Item | null>(null);

  const [teamBudget, setTeamBudget] = useState(100);
  const [dbItems, setDbItems] = useState<Item[]>([]);
  const [teamPurchases, setTeamPurchases] = useState<any[]>([]);
  const [myPurchases, setMyPurchases] = useState<any[]>([]);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(true);
  
  const [refLinks, setRefLinks] = useState(['', '', '']);
  const [refResult, setRefResult] = useState<number | null>(null);

  // --- REFEREE LOGIC ---
  const handleRefereeCheck = () => {
    let grandTotal = 0;
    const teamCounts: Record<string, number> = {}; 

    // Helper to parse "5x123-2x456" segments from a link
    const parseSegment = (segment: string) => {
        if (!segment) return;
        const parts = segment.split('-');
        parts.forEach(p => {
            const [countStr, cocIdStr] = p.split('x');
            if (!countStr || !cocIdStr) return;
            const count = parseInt(countStr);
            const cocId = parseInt(cocIdStr);
            
            // Match CoC ID (e.g., 4000013) to our DB item using modulo
            const item = dbItems.find(i => (i.coc_id % 1000000) === (cocId % 1000000));
            if (item) {
                teamCounts[item.id] = (teamCounts[item.id] || 0) + count;
            }
        });
    };

    // Process each of the 3 link inputs
    refLinks.forEach(link => {
        if (!link || !link.includes('army=')) return;
        
        // Extract sections: u (Army), s (Spells), h (Heroes/Equipment)
        // We ignore i/d because Clan Castle is 0 gold
        const uMatch = link.match(/u([^sihd]+)/);
        const sMatch = link.match(/s([^uhid]+)/);
        const hMatch = link.match(/h([^usid]+)/);

        if (uMatch) parseSegment(uMatch[1]);
        if (sMatch) parseSegment(sMatch[1]);
        
        // Special logic for Hero Equipment (format: h0p1e10_12)
        if (hMatch) {
            const heroes = hMatch[1].split('-');
            heroes.forEach(hStr => {
                const eMatch = hStr.match(/e([0-9_]+)/);
                if (eMatch) {
                    const equipIds = eMatch[1].split('_').map(Number);
                    equipIds.forEach(eqId => {
                        const item = dbItems.find(i => i.type === 'equipment' && i.coc_id === eqId);
                        if (item) teamCounts[item.id] = (teamCounts[item.id] || 0) + 1;
                    });
                }
            });
        }
    });

    // Apply Inflation Math to the aggregated counts
    // Formula: (N * BasePrice) + (N * (N-1))
    Object.keys(teamCounts).forEach(itemId => {
        const item = dbItems.find(i => i.id === itemId);
        if (item) {
            const n = teamCounts[itemId];
            const baseCost = item.base_price * n;
            const inflation = n * (n - 1); 
            grandTotal += (baseCost + inflation);
        }
    });

    setRefResult(grandTotal);
  };

  useEffect(() => { checkDatabase(); attemptRestoreSession(); }, []);

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
    await supabase.from('items').upsert(rows);
    loadItems();
    setIsSeeding(false);
  };

  const loadItems = async () => {
    const { data } = await supabase.from('items').select('*');
    if (data) setDbItems(data as Item[]);
  };

  const attemptRestoreSession = async () => {
      const storedPid = localStorage.getItem('iw_pid');
      const storedTid = localStorage.getItem('iw_tid');
      const storedLobby = localStorage.getItem('iw_lobby');

      if (storedPid && storedTid && storedLobby) {
          const { data: player } = await supabase.from('players').select('id, name, team_id').eq('id', storedPid).single();
          if (player && player.team_id === storedTid) {
              setPlayerId(player.id);
              setTeamId(player.team_id);
              setPlayerName(player.name);
              setLobbyCode(storedLobby);
              const { data: lobby } = await supabase.from('lobbies').select('*').eq('code', storedLobby).single();
              if (lobby) {
                  setFoundLobby(lobby);
                  const { data: team } = await supabase.from('teams').select('name').eq('id', storedTid).single();
                  setTeamName(team?.name || '');
                  setView('game');
              }
          } else {
              localStorage.clear();
          }
      }
      setIsRestoring(false);
  };

  const handleFindLobby = async (e: React.FormEvent) => {
    e.preventDefault();
    let code = lobbyCode.trim();
    let mode: View = 'select-team';

    if (code.toLowerCase().startsWith(ADMIN_PREFIX.toLowerCase())) {
      const suffix = code.substring(ADMIN_PREFIX.length).toLowerCase();
      if (suffix === 'referee') { setView('referee'); return; }
      mode = 'moderator';
      code = code.substring(ADMIN_PREFIX.length).toUpperCase();
    } else if (code.toLowerCase().startsWith(STREAMER_PREFIX.toLowerCase())) {
      mode = 'streamer';
      code = code.substring(STREAMER_PREFIX.length).toUpperCase();
    } else {
      code = code.toUpperCase();
    }
    
    setLobbyCode(code);
    let { data: lobby } = await supabase.from('lobbies').select('*').eq('code', code).single();
    
    if (mode === 'moderator' && !lobby) {
       const { data: newLobby, error: lErr } = await supabase.from('lobbies').insert({ code }).select().single();
       if (lErr) return alert(lErr.message);
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
    const { data: teams } = await supabase
        .from('teams')
        .select('*, players(id, name, purchases(item_id, equipped_hero, is_cc))')
        .eq('lobby_id', lId)
        .order('name');
    if (teams) setLobbyTeams(teams);
  };

  const handleJoinTeam = async (tName: string) => {
    if (!playerName) return alert("Enter name!");
    const team = lobbyTeams.find(t => t.name === tName);
    if (team?.players && team.players.length >= 3) return alert("Full!");
    const { data: tIdData } = await supabase.from('teams').select('id').eq('lobby_id', foundLobby.id).eq('name', tName).single();
    const { data: p, error } = await supabase.from('players').insert({ team_id: tIdData!.id, name: playerName }).select().single();
    if (error) return alert("Error joining.");
    
    localStorage.setItem('iw_pid', p.id);
    localStorage.setItem('iw_tid', tIdData!.id);
    localStorage.setItem('iw_lobby', lobbyCode);

    setPlayerId(p.id); setTeamId(tIdData!.id); setTeamName(tName); setView('game');
  };

  useEffect(() => {
    if (view === 'game' && teamId) {
      fetchGameState();
      const ch = supabase.channel('game')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'teams', filter: `id=eq.${teamId}` }, p => { 
            if(p.new) {
                if (p.new.budget !== undefined) setTeamBudget(p.new.budget);
                if (p.new.name) setTeamName(p.new.name);
            }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'purchases', filter: `team_id=eq.${teamId}` }, () => fetchGameState())
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'players', filter: `id=eq.${playerId}` }, () => { 
            alert("Kicked."); localStorage.clear(); setView('login'); setPlayerId(null); setTeamId(null); 
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'players', filter: `id=eq.${playerId}` }, async (payload) => {
            alert("Moved to new team. Army reset.");
            const newTid = payload.new.team_id;
            localStorage.setItem('iw_tid', newTid);
            const { data: t } = await supabase.from('teams').select('name').eq('id', newTid).single();
            setTeamId(newTid); setTeamName(t?.name || ''); setMyPurchases([]); setTeamPurchases([]);
        })
        .subscribe();
      return () => { supabase.removeChannel(ch); };
    }
    if ((view === 'moderator' || view === 'select-team' || view === 'streamer') && foundLobby) {
      fetchAdminState(); 
      const ch = supabase.channel('admin')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'players' }, () => fetchTeams(foundLobby.id))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, () => fetchTeams(foundLobby.id))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'purchases' }, () => fetchTeams(foundLobby.id))
        .subscribe();
      return () => { supabase.removeChannel(ch); };
    }
  }, [view, teamId, foundLobby, playerId]);

  useEffect(() => {
    if (foundLobby) {
      const lobbyCh = supabase.channel('lobby-watch')
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'lobbies', filter: `id=eq.${foundLobby.id}` }, () => {
          alert("Lobby closed by Moderator.");
          localStorage.clear();
          setView('login');
          setFoundLobby(null);
          setLobbyTeams([]);
          setPlayerId(null);
          setTeamId(null);
          setTeamPurchases([]);
          setMyPurchases([]);
        })
        .subscribe();
      return () => { supabase.removeChannel(lobbyCh); };
    }
  }, [foundLobby]);

  const fetchGameState = async () => {
    const { data: t } = await supabase.from('teams').select('budget').eq('id', teamId!).single();
    if (t) setTeamBudget(t.budget);
    const { data: pur } = await supabase.from('purchases').select('*').eq('team_id', teamId!);
    if (pur) { setTeamPurchases(pur); setMyPurchases(pur.filter(x => x.player_id === playerId)); }
  };

  const fetchAdminState = async () => { fetchTeams(foundLobby.id); }

  const handleKick = async (pId: string) => { if(confirm("Kick?")) { await supabase.rpc('leave_team', { p_player_id: pId }); fetchTeams(foundLobby.id); }};
  const handleSwitch = async (pId: string, cName: string) => {
    const other = lobbyTeams.find(t => t.name !== cName);
    if (!other || other.players?.length >= 3) return alert("Target full/invalid.");
    if (confirm("Switch team?")) { await supabase.rpc('moderator_switch_team', { p_player_id: pId, p_new_team_id: other.id }); fetchTeams(foundLobby.id); }
  };
  const handleReset = async (tId: string) => { if(confirm("Reset Team?")) await supabase.rpc('moderator_reset_team', { p_team_id: tId }); };
  const handleNuke = async () => { if(confirm("DELETE LOBBY?")) await supabase.rpc('delete_lobby', { p_lobby_id: foundLobby.id }); };
  const handleLeave = async () => { if(confirm("Leave match?")) { localStorage.clear(); setPlayerId(null); setTeamId(null); setView('login'); if(playerId) await supabase.rpc('leave_team', { p_player_id: playerId }); }};
  const handleRenameTeam = async (tId: string) => {
      if(!tempTeamName.trim()) return;
      const { error } = await supabase.rpc('moderator_rename_team', { p_team_id: tId, p_new_name: tempTeamName });
      if (error) { console.error(error); alert("Rename failed: " + error.message); return; }
      setEditingTeamId(null);
      fetchTeams(foundLobby.id);
  }

  const calcPrice = (base: number, id: string, isCC: boolean = false) => {
      if (isCC) return 0;
      const item = dbItems.find(i => i.id === id);
      if (item?.type === 'pet') return 0;
      return base + (teamPurchases.filter(p => p.item_id === id && !p.is_cc).length * 2);
  };

  const getCurrentWeight = (cat: 'troop' | 'spell' | 'siege', isCC: boolean = false) => myPurchases.reduce((s, p) => {
    if (!!p.is_cc !== isCC) return s;
    const i = dbItems.find(x => x.id === p.item_id);
    if (!i) return s;
    if (cat === 'troop' && (i.type === 'troop' || i.type === 'super_troop')) return s + i.housing_space;
    if (cat === 'spell' && i.type === 'spell') return s + i.housing_space;
    if (cat === 'siege' && i.type === 'siege') return s + i.housing_space;
    return s;
  }, 0);

  const getMyCount = (id: string, isCC: boolean) => myPurchases.filter(p => p.item_id === id && !!p.is_cc === isCC).length;

  const handleBuy = async (item: Item, targetHero: string | null = null, isCC: boolean = false) => {
    if (isProcessing) return;

    // 1. Hero Check
    const involvedHero = targetHero || item.hero;
    if (!isCC && involvedHero) {
        const activeHeroes = new Set<string>();
        myPurchases.forEach(p => {
            if (p.is_cc) return;
            if (p.equipped_hero) activeHeroes.add(p.equipped_hero);
            const dbItem = dbItems.find(i => i.id === p.item_id);
            if (dbItem?.hero) activeHeroes.add(dbItem.hero);
        });
        if (!activeHeroes.has(involvedHero) && activeHeroes.size >= 4) {
            return alert("You can only use 4 Heroes! Remove items from another hero first.");
        }
    }

    if (item.type === 'pet' && !targetHero && !isCC) { setPetModalItem(item); return; }

    let cat: any = 'troop';
    if (item.type === 'spell') cat = 'spell'; else if (item.type === 'siege') cat = 'siege'; else if (item.type === 'equipment') cat = 'equipment';
    
    if (isCC) {
        if (item.type === 'pet' || item.type === 'equipment') return alert("Pets/Equipment cannot go in Clan Castle");
        if (item.type === 'siege') {
             const ccSiegeCount = myPurchases.filter(p => p.is_cc && dbItems.find(i => i.id === p.item_id)?.type === 'siege').length;
             if (ccSiegeCount >= 2) return alert("CC Full: Max 2 Sieges");
        } else {
             const current = getCurrentWeight(cat, true);
             if (current + item.housing_space > CC_LIMITS[cat as keyof typeof CC_LIMITS]) return alert("Clan Castle Full!");
        }
    } else {
        if (cat !== 'equipment' && item.type !== 'pet') {
             const current = getCurrentWeight(cat, false);
             if (current + item.housing_space > LIMITS[cat as keyof typeof LIMITS]) return alert("Army Full Capacity!");
        }
    }

    const price = calcPrice(item.base_price, item.id, isCC);
    if (teamBudget < price) return alert("No Budget!");

    setIsProcessing(true);
    if(petModalItem) setPetModalItem(null); 

    const mockId = Math.random().toString();
    setMyPurchases(prev => [...prev, { item_id: item.id, player_id: playerId, id: mockId, equipped_hero: targetHero, is_cc: isCC }]);

    const { data, error } = await supabase.rpc('buy_item', { 
        p_player_id: playerId, 
        p_item_id: item.id,
        p_target_hero: targetHero,
        p_is_cc: isCC
    });

    if (error || (data && !data.success)) {
        setMyPurchases(prev => prev.filter(x => x.id !== mockId));
        if (data?.message) alert(data.message);
    }
    fetchGameState();
    setIsProcessing(false);
  };

  const handleSell = async (item: Item) => {
    setMyPurchases(prev => { const idx = prev.findIndex(x => x.item_id === item.id); if(idx===-1) return prev; const n=[...prev]; n.splice(idx,1); return n; });
    await supabase.rpc('sell_item', { p_player_id: playerId, p_item_id: item.id });
    fetchGameState();
  };

  const exportArmy = () => {
    const getItem = (id: string) => dbItems.find(i => i.id === id);
    const generatePart = (purchaseList: any[], typeFilter: string[]) => {
        const relevant = purchaseList.map(p => getItem(p.item_id)).filter(i => i && typeFilter.includes(i.type)) as Item[];
        if (relevant.length === 0) return '';
        const counts: Record<string, number> = {}; relevant.forEach(i => counts[i.id] = (counts[i.id] || 0) + 1);
        const unique = Array.from(new Set(relevant.map(i => i.id))).map(id => relevant.find(i => i.id === id)!);
        return unique.map(i => `${counts[i.id]}x${i.coc_id % 1000000}`).join('-');
    };

    const mainItems = myPurchases.filter(p => !p.is_cc);
    const ccItems = myPurchases.filter(p => p.is_cc);

    const activeMain = mainItems.map(p => ({ ...getItem(p.item_id), equipped_hero: p.equipped_hero })).filter(i => i.id) as any[];
    const heroOrder = ['BK', 'AQ', 'GW', 'RC', 'MP'];
    const hStrParts: string[] = [];
    heroOrder.forEach(h => {
        const hId = HERO_LINK_IDS[h];
        const pet = activeMain.find(i => i.type === 'pet' && i.equipped_hero === h);
        const equips = activeMain.filter(i => i.type === 'equipment' && i.hero === h).map(i => i.coc_id);
        if (pet || equips.length > 0) {
            let part = `${hId}`;
            if (pet) part += `p${pet.coc_id}`;
            if (equips.length > 0) part += `e${equips.join('_')}`;
            hStrParts.push(part);
        }
    });
    const hFinal = hStrParts.length > 0 ? `h${hStrParts.join('-')}` : '';

    const ccSieges = generatePart(ccItems, ['siege']);
    const ccTroops = generatePart(ccItems, ['troop', 'super_troop']);
    const ccMixParts = [ccSieges, ccTroops].filter(Boolean).join('-');
    const iFinal = ccMixParts ? `i${ccMixParts}` : '';

    const ccSpells = generatePart(ccItems, ['spell']);
    const dFinal = ccSpells ? `d${ccSpells}` : '';

    const uTroops = generatePart(mainItems, ['troop', 'super_troop', 'siege']);
    const uFinal = uTroops ? `u${uTroops}` : '';

    const sSpells = generatePart(mainItems, ['spell']);
    const sFinal = sSpells ? `s${sSpells}` : '';

    const finalString = hFinal + iFinal + dFinal + uFinal + sFinal;
    window.open(`https://link.clashofclans.com/en?action=CopyArmy&army=${finalString}`, '_blank');
  };

  const getTickerItems = () => {
    const allItems: any[] = [];
    lobbyTeams.forEach((team, index) => {
        const teamPurchases: any[] = [];
        if (team.players) {
            team.players.forEach((p: any) => { if (p.purchases) teamPurchases.push(...p.purchases); });
        }
        const counts: any = {};
        teamPurchases.forEach((p:any) => counts[p.item_id] = (counts[p.item_id] || 0) + 1);
        Object.keys(counts).forEach(itemId => {
            const item = dbItems.find(i => i.id === itemId);
            if(item) {
                const count = counts[itemId];
                const price = item.base_price + (count * 2);
                const colorClass = index === 0 ? "text-cyan-400" : "text-red-500";
                allItems.push({ name: item.name, price: price, teamName: team.name, color: colorClass, id: itemId + team.id });
            }
        });
    });
    return allItems.sort((a, b) => b.price - a.price).slice(0, 25);
  };

  const renderPlayerArmy = (p: any, isLarge = false) => {
      const myItems = p.purchases || []; 
      if (myItems.length === 0) return <div className={`${isLarge ? 'text-xl' : 'text-xs'} text-slate-600 italic mt-2`}>No items yet</div>;
      
      const counts: any = {};
      const ccCounts: any = {};

      myItems.forEach((x:any) => {
          if (x.is_cc) {
              ccCounts[x.item_id] = (ccCounts[x.item_id] || 0) + 1;
          } else {
              counts[x.item_id] = (counts[x.item_id] || 0) + 1;
          }
      });

      const active = myItems.map((x:any) => {
          const item = dbItems.find(i => i.id === x.item_id);
          return { ...item, equipped_hero: x.equipped_hero, is_cc: x.is_cc };
      }).filter(Boolean);

      const heroKeys = ['BK', 'AQ', 'GW', 'RC', 'MP'].filter(h => active.some((i:any) => !i.is_cc && (i.hero === h || i.equipped_hero === h)));
      
      const mainTroops = Array.from(new Map(active.filter((i:any)=> !i.is_cc && !i.hero && i.type !== 'pet' && (i.type === 'troop' || i.type === 'super_troop')).map((i:any) => [i.id, i])).values());
      const mainSieges = Array.from(new Map(active.filter((i:any)=> !i.is_cc && i.type === 'siege').map((i:any) => [i.id, i])).values());
      const mainSpells = Array.from(new Map(active.filter((i:any)=> !i.is_cc && i.type === 'spell').map((i:any) => [i.id, i])).values());

      const ccTroops = Array.from(new Map(active.filter((i:any)=> i.is_cc && (i.type === 'troop' || i.type === 'super_troop')).map((i:any) => [i.id, i])).values());
      const ccSieges = Array.from(new Map(active.filter((i:any)=> i.is_cc && i.type === 'siege').map((i:any) => [i.id, i])).values());
      const ccSpells = Array.from(new Map(active.filter((i:any)=> i.is_cc && i.type === 'spell').map((i:any) => [i.id, i])).values());

      const heroImgClass = isLarge ? "w-20 h-20 border-4" : "w-5 h-5 border";
      const equipImgClass = isLarge ? "w-14 h-14 bg-slate-900 border-2 p-1" : "w-4 h-4";
      const itemBoxClass = isLarge ? "w-20 h-20 border-2 rounded-xl" : "w-6 h-6 border rounded";
      const badgeClass = isLarge ? "w-7 h-7 text-xs -top-2 -right-2" : "w-2.5 h-2.5 text-[6px] -top-1 -right-1";
      const sectionHeaderClass = isLarge ? "text-lg font-black text-slate-400 mb-2 mt-4 border-b border-slate-700 pb-1" : "text-[10px] font-bold text-slate-400 mb-1 mt-2 border-b border-slate-700 pb-0.5";
      const labelClass = isLarge ? "text-xs font-bold text-slate-500 uppercase self-center mr-2" : "text-[8px] font-bold text-slate-500 uppercase self-center mr-1";
      const separatorClass = isLarge ? "w-px h-12 bg-slate-700 mx-4 self-center" : "w-px h-4 bg-slate-700 mx-1 self-center";

      const renderSection = (items: any[], countMap: any, label: string, bgClass: string = "bg-slate-800") => {
          if (items.length === 0) return null;
          return (
              <div className="flex flex-wrap items-center gap-2">
                  <span className={labelClass}>{label}</span>
                  {items.map((i:any) => (
                      <div key={i.id} className={`relative ${itemBoxClass} ${bgClass} border-slate-700 shrink-0`}>
                           <img src={getImageUrl(i.name, i.type)} className="w-full h-full object-contain p-1" />
                           <div className={`absolute ${bgClass.includes('bg-slate-800') ? 'bg-yellow-500' : 'bg-orange-500'} text-black font-bold flex items-center justify-center rounded-full border border-black ${badgeClass}`}>{countMap[i.id]}</div>
                      </div>
                  ))}
              </div>
          );
      };

      return (
          <div className={`mt-2 ${isLarge ? 'space-y-4' : 'space-y-1'}`}>
              {heroKeys.length > 0 && (
                  <div>
                      <div className={sectionHeaderClass}>HEROES</div>
                      <div className={`flex flex-wrap ${isLarge ? 'gap-4' : 'gap-2'} justify-center lg:justify-start`}>
                          {heroKeys.map(h => (
                              <div key={h} className={`bg-slate-900 rounded ${isLarge ? 'p-2' : 'p-1'} border border-slate-700 flex items-center ${isLarge ? 'gap-2' : 'gap-1'}`}>
                                  <img src={`/${h.toLowerCase()}.png`} className={`${heroImgClass} rounded-full border-yellow-600 object-cover`}/>
                                  {active.filter((i:any) => !i.is_cc && i.type === 'pet' && i.equipped_hero === h).map((pet:any, idx:number) => (
                                      <img key={'p'+idx} src={getImageUrl(pet.name, pet.type)} className={`${equipImgClass} border-green-500`} title={pet.name}/>
                                  ))}
                                  {active.filter((i:any) => !i.is_cc && i.hero === h).map((eq:any, idx:number) => (
                                      <img key={'e'+idx} src={getImageUrl(eq.name, eq.type, eq.hero)} className={equipImgClass} title={eq.name}/>
                                  ))}
                              </div>
                          ))}
                      </div>
                  </div>
              )}

              {(mainTroops.length > 0 || mainSieges.length > 0 || mainSpells.length > 0) && (
                  <div>
                      <div className={sectionHeaderClass}>ARMY</div>
                      <div className={`flex flex-wrap items-center ${isLarge ? 'gap-y-4' : 'gap-y-1'}`}>
                          {renderSection(mainTroops, counts, "Troops")}
                          {mainTroops.length > 0 && mainSieges.length > 0 && <div className={separatorClass}/>}
                          {renderSection(mainSieges, counts, "Sieges")}
                          {(mainTroops.length > 0 || mainSieges.length > 0) && mainSpells.length > 0 && <div className={separatorClass}/>}
                          {renderSection(mainSpells, counts, "Spells")}
                      </div>
                  </div>
              )}

              {(ccTroops.length > 0 || ccSieges.length > 0 || ccSpells.length > 0) && (
                  <div>
                      <div className={`${sectionHeaderClass} text-orange-400 border-orange-900/50`}>CLAN CASTLE</div>
                      <div className={`flex flex-wrap items-center ${isLarge ? 'gap-y-4' : 'gap-y-1'}`}>
                          {renderSection(ccSieges, ccCounts, "Sieges", "bg-slate-900 border-orange-900/60")}
                          {ccSieges.length > 0 && ccTroops.length > 0 && <div className={separatorClass}/>}
                          {renderSection(ccTroops, ccCounts, "Troops", "bg-slate-900 border-orange-900/60")}
                          {(ccSieges.length > 0 || ccTroops.length > 0) && ccSpells.length > 0 && <div className={separatorClass}/>}
                          {renderSection(ccSpells, ccCounts, "Spells", "bg-slate-900 border-orange-900/60")}
                      </div>
                  </div>
              )}
          </div>
      )
  };

  const renderCCSection = () => {
    const ccItems = myPurchases.filter(p => p.is_cc);
    const active = ccItems.map(p => dbItems.find(i => i.id === p.item_id)).filter(Boolean) as Item[];
    const counts: any = {}; active.forEach(i => counts[i.id] = (counts[i.id] || 0) + 1);
    const unique = Array.from(new Map(active.map(i => [i.id, i])).values());

    return (
      <div className="bg-slate-800 border-l border-slate-700 rounded-lg p-3 mb-4">
        <div className="font-bold text-slate-300 flex items-center gap-2 mb-2"><Castle size={16} className="text-orange-400"/> CLAN CASTLE</div>
        <div className="text-[10px] text-slate-500 mb-2 flex justify-between">
            <span>Troops: {getCurrentWeight('troop', true)}/55</span>
            <span>Spells: {getCurrentWeight('spell', true)}/4</span>
            <span>Siege: {myPurchases.filter(p=>p.is_cc && dbItems.find(i=>i.id===p.item_id)?.type==='siege').length}/2</span>
        </div>
        <div className="flex flex-wrap gap-1">
             {unique.map(i => (
                  <div key={i.id} className="relative w-8 h-8 bg-black/40 rounded border border-slate-600">
                       <img src={getImageUrl(i.name, i.type)} className="w-full h-full object-contain p-1" />
                       <div className="absolute -top-1 -right-1 bg-orange-500 text-black text-[9px] font-bold w-3 h-3 flex items-center justify-center rounded-full border border-black">{counts[i.id]}</div>
                  </div>
             ))}
             {active.length === 0 && <span className="text-xs text-slate-600 italic">Empty</span>}
        </div>
      </div>
    );
  };

  const renderCCShop = () => {
      const renderMiniGrid = (list: Item[]) => (
          <div className="grid grid-cols-5 gap-3">
              {list.map(i => {
                  const count = getMyCount(i.id, true);
                  return (
                      <div key={i.id} className="relative group">
                          <div onClick={() => handleBuy(i, null, true)} className="cursor-pointer hover:scale-105 transition-transform bg-slate-800 rounded-lg border border-slate-700 aspect-square p-1 relative overflow-hidden" title={i.name}>
                              <img src={getImageUrl(i.name, i.type)} className="w-full h-full object-contain" />
                              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                          {count > 0 && (<div className="absolute -bottom-2 -left-2 z-10 bg-blue-600 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-slate-900 shadow-sm pointer-events-none">{count}</div>)}
                          {count > 0 && (<button onClick={(e) => { e.stopPropagation(); handleSell(i); }} className="absolute -top-2 -right-2 z-20 bg-red-500 hover:bg-red-600 text-white w-5 h-5 flex items-center justify-center rounded-full border-2 border-slate-900 shadow-sm transition-transform hover:scale-110"><Minus size={10} strokeWidth={4} /></button>)}
                      </div>
                  )
              })}
          </div>
      );
      return (
          <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 mb-8">
               <h2 className="text-xl font-bold mb-4 flex gap-2 items-center text-orange-400"><Castle/> CLAN CASTLE DRAFT</h2>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   <div><h5 className="text-xs font-bold text-slate-500 uppercase mb-2">Troops (Max 55)</h5>{renderMiniGrid(dbItems.filter(i => i.type === 'troop' || i.type === 'super_troop'))}</div>
                   <div><h5 className="text-xs font-bold text-slate-500 uppercase mb-2">Sieges (Max 2)</h5>{renderMiniGrid(dbItems.filter(i => i.type === 'siege'))}</div>
                   <div><h5 className="text-xs font-bold text-slate-500 uppercase mb-2">Spells (Max 4)</h5>{renderMiniGrid(dbItems.filter(i => i.type === 'spell'))}</div>
               </div>
          </div>
      )
  };

  const renderArmySidebar = () => {
    const active = myPurchases.filter(p => !p.is_cc).map(p => {
        const i = dbItems.find(item => item.id === p.item_id);
        return i ? { ...i, equipped_hero: p.equipped_hero } : null;
    }).filter(Boolean) as any[];

    const heroKeys = ['BK', 'AQ', 'GW', 'RC', 'MP'].filter(h => active.some(i => i.hero === h || i.equipped_hero === h));
    const counts: any = {}; active.forEach(i => counts[i.id] = (counts[i.id] || 0) + 1);
    const unique = Array.from(new Map(active.map(i => [i.id, i])).values());

    return (
      <div className="bg-slate-900 border-l border-slate-800 w-full lg:w-80 h-full lg:h-screen sticky top-0 overflow-y-auto p-4 z-40">
        <div className="font-black text-xl flex items-center gap-2 mb-6"><Sword className="text-yellow-500" /> ARMY PREVIEW</div>
        {heroKeys.map(h => (
          <div key={h} className="bg-slate-800 rounded-lg p-3 border border-slate-700 mb-3">
            <img src={`/${h.toLowerCase()}.png`} className="w-16 h-16 rounded-full border-2 border-yellow-600 mb-2 mx-auto object-cover" />
            <div className="flex gap-2 justify-center flex-wrap">
                 {active.filter(i => i.type === 'pet' && i.equipped_hero === h).map((pet, idx) => (
                    <img key={'p'+idx} src={getImageUrl(pet.name, pet.type)} className="w-8 h-8 bg-slate-900 rounded border border-green-500 p-1"/>
                 ))}
                 {active.filter(i => i.hero === h).map((eq,idx) => (
                    <img key={'e'+idx} src={getImageUrl(eq.name, eq.type, eq.hero)} className="w-8 h-8 bg-slate-900 rounded border border-slate-600 p-1"/>
                 ))}
            </div>
          </div>
        ))}
        {renderCCSection()}
        {['troop','siege','spell'].map(type => {
            const list = unique.filter(i => type === 'troop' ? (i.type === 'troop' || i.type === 'super_troop') : i.type === type);
            if (list.length === 0) return null;
            return <div key={type} className="mb-4">
                <h3 className="text-xs font-bold text-slate-500 uppercase mb-2">{type}s</h3>
                <div className="grid grid-cols-4 gap-2">{list.map(i => <div key={i.id} className="relative bg-slate-800 rounded border border-slate-700 aspect-square"><img src={getImageUrl(i.name, i.type)} className="w-full h-full object-contain p-1" /><div className="absolute top-0 right-0 bg-yellow-500 text-black text-[9px] font-bold px-1 rounded-bl">x{counts[i.id]}</div></div>)}</div>
            </div>
        })}
      </div>
    );
  };

  const renderGrid = (list: Item[]) => (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
      {list.map(i => {
        const p = calcPrice(i.base_price, i.id);
        const qty = myPurchases.filter(x => x.item_id === i.id && !x.is_cc).length;
        const isOwned = i.type === 'equipment' && qty > 0;
        const isOwnedPet = i.type === 'pet' && qty > 0;
        const borderClass = (qty > 0 || isOwned || isOwnedPet) ? 'border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.2)] scale-[1.02]' : 'border-slate-700 hover:border-yellow-500 hover:scale-[1.05] hover:shadow-lg';
        return (
           <div key={i.id} className={`bg-slate-800 rounded-xl border p-3 flex flex-col justify-between transition-all duration-200 ease-out ${borderClass}`}>
                <div className="relative mb-2">
                    {i.hero && (<div className="absolute top-0 left-0 z-10 w-8 h-8 rounded-full border border-black overflow-hidden bg-slate-900 shadow-md"><img src={`/${i.hero.toLowerCase()}.png`} className="w-full h-full object-cover" alt={i.hero}/></div>)}
                    <div className="aspect-square bg-slate-900 rounded-lg relative overflow-hidden flex items-center justify-center">
                        <img src={getImageUrl(i.name, i.type, i.hero)} className="w-full h-full object-contain p-2" />
                        {(isOwned || isOwnedPet) && <div className="absolute top-0 right-0 bg-green-500 text-black w-6 h-6 rounded-bl-lg flex items-center justify-center font-bold shadow-md"><Check size={14}/></div>}
                        {qty > 0 && i.type !== 'equipment' && i.type !== 'pet' && <div className="absolute top-0 right-0 bg-yellow-500 text-black px-1.5 rounded-bl-lg font-bold text-xs shadow-md">x{qty}</div>}
                    </div>
                </div>
                <div className="text-center mb-3">
                    <div className="font-bold text-sm leading-tight h-8 flex items-center justify-center">{i.name}</div>
                    <div className="text-green-400 font-bold text-xs flex items-center justify-center gap-1 mt-1 bg-black/30 py-1 rounded">{p} <Coins size={10}/></div>
                </div>
                <div className="flex gap-1 h-10 mt-auto">
                    {qty > 0 ? (
                        <>
                            <button onClick={() => handleSell(i)} className="bg-red-900/80 hover:bg-red-600 text-white w-1/3 rounded-lg flex items-center justify-center transition-colors border border-red-900"><Minus size={18} strokeWidth={3} /></button>
                            <button onClick={() => handleBuy(i)} disabled={teamBudget < p || isProcessing} className="bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed text-white w-2/3 rounded-lg flex items-center justify-center transition-colors font-black uppercase text-xs tracking-wider">BUY</button>
                        </>
                    ) : (
                        <button onClick={() => handleBuy(i)} disabled={teamBudget < p || isProcessing} className="bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed text-white w-full rounded-lg flex items-center justify-center transition-colors font-black uppercase text-sm tracking-widest">BUY</button>
                    )}
                </div>
            </div>
        )
      })}
    </div>
  );

  // --- VIEWS ---
  if (view === 'login') {
      if (isRestoring) return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-blue-500"/></div>;
      
      return (
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
  }
  if (view === 'referee') return (<div className="min-h-screen bg-slate-950 text-white p-8 flex items-center justify-center"><div className="max-w-2xl w-full bg-slate-900 p-8 rounded-2xl border border-slate-800"><div className="flex items-center gap-3 mb-6"><Gavel className="text-yellow-500 w-8 h-8"/><h1 className="text-2xl font-black">LEGALITY CHECK</h1></div><div className="space-y-4 mb-6">{refLinks.map((L, i) => <input key={i} value={L} onChange={e => { const n=[...refLinks]; n[i]=e.target.value; setRefLinks(n); }} className="w-full bg-black border border-slate-700 rounded p-3 text-sm font-mono" placeholder={`Paste Player ${i+1} Army Link`} />)}</div><button onClick={handleRefereeCheck} className="w-full bg-green-600 py-4 rounded font-bold hover:bg-green-500 mb-6 flex items-center justify-center gap-2"><ClipboardCheck/> CALCULATE TEAM SPEND</button>{refResult !== null && (<div className={`text-center p-6 rounded-xl border-2 ${refResult > 100 ? 'bg-red-900/20 border-red-500' : 'bg-green-900/20 border-green-500'}`}><div className="text-sm text-slate-400 uppercase font-bold mb-2">Total Team Value</div><div className={`text-5xl font-black mb-2 ${refResult > 100 ? 'text-red-500' : 'text-green-500'}`}>{refResult} GOLD</div><div className="text-xl font-bold">{refResult > 100 ? <span className="flex items-center justify-center gap-2"><AlertTriangle/> ILLEGAL (OVER 100)</span> : <span className="flex items-center justify-center gap-2"><Check/> LEGAL</span>}</div></div>)}<button onClick={()=>setView('login')} className="block w-full text-center text-slate-500 mt-6 hover:text-white">Exit Referee</button></div></div>);
  if (view === 'streamer') { 
      const tickerItems = getTickerItems(); 
      return (<div className="min-h-screen bg-slate-950 text-white p-6 pb-20 overflow-hidden relative"><style>{`@keyframes marquee { 0% { transform: translateX(100%); } 100% { transform: translateX(-100%); } } .ticker-wrap { position: fixed; bottom: 0; left: 0; width: 100%; height: 50px; background: #000; overflow: hidden; white-space: nowrap; z-index: 100; border-top: 2px solid #334155; display: flex; align-items: center; } .ticker-content { display: inline-block; padding-left: 100%; animation: marquee 60s linear infinite; } .ticker-item { display: inline-block; padding: 0 2rem; font-family: monospace; font-size: 1.2rem; font-weight: bold; color: #fbbf24; } .custom-scrollbar::-webkit-scrollbar { display: none; } .custom-scrollbar { -ms-overflow-style: none;  scrollbar-width: none; }`}</style>
      {focusedPlayer && (<div className="fixed inset-0 bg-black/90 z-[200] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setFocusedPlayer(null)}><div className="bg-slate-900 border-4 border-yellow-500 p-8 rounded-3xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto custom-scrollbar" onClick={e => e.stopPropagation()}><div className="flex justify-between items-center border-b-2 border-slate-700 pb-4 mb-6 sticky top-0 bg-slate-900 z-10"><h2 className="text-6xl font-black text-white">{focusedPlayer.name}</h2><button onClick={() => setFocusedPlayer(null)} className="bg-red-600 hover:bg-red-500 text-white p-4 rounded-xl"><X size={32}/></button></div>{renderPlayerArmy(focusedPlayer, true)}</div></div>)}<header className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4"><div className="flex items-center gap-3"><Tv className="text-purple-500 w-8 h-8"/><div><h1 className="text-2xl font-black">STREAM VIEW</h1><p className="text-slate-400 font-mono">LOBBY: {lobbyCode}</p></div></div><button onClick={() => setView('login')} className="bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded font-bold">EXIT</button></header><div className="grid grid-cols-1 xl:grid-cols-2 gap-8 h-full">{lobbyTeams.map(team => (<div key={team.id} className="bg-slate-900 border-2 border-slate-800 rounded-2xl p-6 shadow-2xl h-fit"><div className="flex justify-between items-center mb-8 border-b border-slate-800 pb-6"><h2 className="text-5xl font-black text-white">{team.name}</h2><div className="bg-black px-6 py-3 rounded-lg border border-slate-700 font-mono text-yellow-500 text-4xl font-black">{team.budget} <Coins className="inline w-8 h-8"/></div></div><div className="flex flex-col gap-6">{[0, 1, 2].map(idx => { const p = team.players?.[idx]; if (!p) return <div key={idx} className="bg-black/20 rounded-xl p-4 border border-dashed border-slate-800 text-slate-700 text-center font-bold">EMPTY SLOT</div>; return (<div key={idx} onClick={() => setFocusedPlayer(p)} className="bg-black/40 rounded-xl p-6 border border-slate-700 hover:border-yellow-500 hover:bg-slate-800 transition-all cursor-zoom-in group"><div className="flex justify-between items-center border-b border-slate-600 pb-2 mb-2"><div className="font-black text-3xl text-slate-200 group-hover:text-yellow-400">{p.name}</div><div className="text-xs text-slate-500 uppercase font-bold bg-black px-2 py-1 rounded">Click to Zoom</div></div>{renderPlayerArmy(p, true)}</div>)})}</div></div>))}</div><div className="ticker-wrap"><div className="ticker-content">{tickerItems.map((item:any, i:number) => (<div key={i} className={`ticker-item ${item.color}`}><span className="text-white text-sm mr-1 opacity-50">[{item.teamName}]</span>{item.name.toUpperCase()}: {item.price}g<span className="text-slate-500 ml-2 text-sm">▲</span></div>))}</div></div></div>); }
  if (view === 'moderator') return (<div className="min-h-screen bg-slate-950 text-white p-8"><div className="max-w-7xl mx-auto"><header className="flex justify-between items-center mb-8 border-b border-slate-800 pb-4"><div className="flex items-center gap-3"><Trophy className="text-yellow-500 w-8 h-8"/><div><h1 className="text-2xl font-black">MODERATOR PANEL</h1><p className="text-slate-400 font-mono">LOBBY: {lobbyCode}</p></div></div><button onClick={handleNuke} className="bg-red-600 hover:bg-red-500 px-6 py-2 rounded-lg font-bold flex items-center gap-2"><Trash2 size={18}/> DELETE LOBBY</button></header><div className="grid grid-cols-1 xl:grid-cols-2 gap-8">{lobbyTeams.map(team => (<div key={team.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6"><div className="flex justify-between items-center mb-6">{editingTeamId === team.id ? (<div className="flex items-center gap-2"><input autoFocus value={tempTeamName} onChange={e => setTempTeamName(e.target.value)} className="bg-black border border-slate-600 rounded px-2 py-1 text-xl font-bold w-48 text-white"/><button onClick={() => handleRenameTeam(team.id)} className="bg-green-600 p-1.5 rounded hover:bg-green-500"><Save size={16}/></button><button onClick={() => setEditingTeamId(null)} className="bg-red-600 p-1.5 rounded hover:bg-red-500"><X size={16}/></button></div>) : (<h2 className="text-2xl font-bold flex items-center gap-2 group cursor-pointer" onClick={() => { setTempTeamName(team.name); setEditingTeamId(team.id); }}>{team.name} <Edit2 size={14} className="text-slate-600 group-hover:text-white transition-colors"/></h2>)}<div className="bg-black px-4 py-2 rounded-lg border border-slate-700 font-mono text-yellow-500 text-xl font-bold">{team.budget} <Coins className="inline w-4 h-4"/></div></div><div className="space-y-4 mb-8">{team.players?.map((p:any, i:number) => (<div key={i} className="bg-slate-800 p-4 rounded-lg border border-slate-700"><div className="flex items-center justify-between mb-3 border-b border-slate-700 pb-2"><div className="flex items-center gap-3"><div className="w-3 h-3 bg-green-500 rounded-full"/> <span className="font-bold text-lg">{p.name}</span></div><div className="flex gap-2"><button onClick={() => handleSwitch(p.id, team.name)} className="p-1.5 hover:bg-slate-600 rounded text-blue-400" title="Switch Team"><ArrowRightLeft size={16}/></button><button onClick={() => handleKick(p.id)} className="p-1.5 hover:bg-slate-600 rounded text-red-500" title="Kick Player"><Trash2 size={16}/></button></div></div>{renderPlayerArmy(p)}</div>))}</div><button onClick={() => handleReset(team.id)} className="w-full mt-6 bg-slate-800 hover:bg-red-900/30 text-red-400 border border-slate-700 py-4 rounded-xl font-bold flex justify-center gap-2 transition-all"><RefreshCw/> RESET {team.name.toUpperCase()}</button></div>))}</div></div></div>);
  if (view === 'select-team') return (<div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4"><div className="max-w-2xl w-full space-y-6"><div className="text-center"><h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Lobby: {lobbyCode}</h2><input value={playerName} onChange={e => setPlayerName(e.target.value)} className="mt-4 bg-transparent border-b-2 border-slate-800 text-3xl font-black text-center focus:border-yellow-500 outline-none px-4 py-2 w-full" placeholder="ENTER YOUR NAME" /></div><div className="grid grid-cols-1 md:grid-cols-2 gap-6">{lobbyTeams.map(team => (<div key={team.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col items-center hover:border-slate-600 transition-colors"><Users className="w-12 h-12 text-slate-600 mb-2" /><h3 className="text-xl font-bold mb-4">{team.name}</h3><div className="flex-1 w-full space-y-2 mb-6">{[0, 1, 2].map(idx => (<div key={idx} className="bg-black/40 rounded p-2 text-sm text-slate-400 flex items-center gap-2"><div className={`w-2 h-2 rounded-full ${team.players?.[idx] ? 'bg-green-500' : 'bg-slate-700'}`} />{team.players?.[idx] ? team.players[idx].name : 'Empty Slot'}</div>))}</div><button onClick={() => handleJoinTeam(team.name)} disabled={team.players?.length >= 3} className={`w-full py-3 rounded-xl font-black uppercase transition-all ${team.players?.length >= 3 ? 'bg-slate-800 text-slate-600 cursor-not-allowed' : 'bg-yellow-500 text-black hover:bg-yellow-400'}`}>{team.players?.length >= 3 ? 'FULL' : 'JOIN TEAM'}</button></div>))}</div><button onClick={() => setView('login')} className="block mx-auto text-slate-500 hover:text-white text-sm underline">Back to Search</button></div></div>);

  // --- GAME VIEW ---
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col lg:flex-row font-sans overflow-hidden">
      {petModalItem && (<div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setPetModalItem(null)}><div className="bg-slate-900 border-2 border-slate-700 rounded-2xl p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}><h3 className="text-2xl font-black mb-4 text-center">Assign {petModalItem.name} to:</h3><div className="grid grid-cols-2 sm:grid-cols-4 gap-4">{['BK', 'AQ', 'GW', 'RC', 'MP'].map(hero => (<button key={hero} onClick={() => handleBuy(petModalItem, hero)} className="bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-xl p-4 flex flex-col items-center gap-2 transition-all"><img src={`/${hero.toLowerCase()}.png`} className="w-16 h-16 rounded-full border-2 border-yellow-500 object-cover"/><span className="font-bold">{hero}</span></button>))}</div><button onClick={() => setPetModalItem(null)} className="w-full mt-6 py-3 bg-red-900/50 text-red-200 rounded-lg hover:bg-red-800">Cancel</button></div></div>)}
      <div className="flex-1 h-screen overflow-y-auto pb-24">
        <header className="bg-slate-900/80 p-4 sticky top-0 z-50 border-b border-slate-800 backdrop-blur-md flex justify-between items-center"><div className="flex items-center gap-3"><div className="bg-yellow-500 p-2 rounded-lg text-black"><Shield size={20}/></div><div><span className="font-bold">INFLATION WAR</span><div className="text-[10px] text-slate-400">{lobbyCode} | {teamName}</div></div></div><div className="flex items-center gap-4"><div className="hidden sm:flex gap-4"><div className="text-[10px] text-center"><div className="text-blue-400 font-bold">TROOPS</div>{getCurrentWeight('troop')}/340</div><div className="text-[10px] text-center"><div className="text-orange-400 font-bold">SIEGES</div>{getCurrentWeight('siege')}/3</div><div className="text-[10px] text-center"><div className="text-purple-400 font-bold">SPELLS</div>{getCurrentWeight('spell')}/11</div></div><div className="bg-black px-4 py-2 rounded-full border border-slate-700 flex items-center gap-2 text-xl font-mono text-yellow-500 font-bold">{teamBudget}<Coins/></div><button onClick={handleLeave} className="bg-red-900/50 hover:bg-red-600 p-2 rounded text-red-200" title="Exit Match"><LogOut size={20}/></button></div></header>
        <main className="p-6 max-w-6xl mx-auto space-y-12">
            <div><h2 className="text-2xl font-bold mb-6 flex gap-2 items-center"><Crown className="text-yellow-500"/> HERO EQUIPMENT</h2>{['BK','AQ','GW','RC','MP'].map(h => { const hItems = dbItems.filter(i => i.hero === h); if (hItems.length === 0) return null; return (<div key={h} className="mb-8 pl-4 border-l-2 border-slate-800"><h4 className="text-slate-400 font-bold mb-3 flex items-center gap-2"><img src={`/${h.toLowerCase()}.png`} className="w-8 h-8 rounded-full grayscale opacity-70 object-cover"/> {h} EQUIPMENT</h4>{renderGrid(hItems)}</div>) })}</div>
            <div><h2 className="text-2xl font-bold mb-6 flex gap-2 items-center border-t border-slate-800 pt-10"><PawPrint className="text-green-500"/> PETS</h2>{renderGrid(dbItems.filter(i => i.type === 'pet'))}</div>
            {renderCCShop()}
            <div><h2 className="text-2xl font-bold mb-6 flex gap-2 items-center border-t border-slate-800 pt-10"><Sword className="text-blue-500"/> ARMY TROOPS</h2>{renderGrid(dbItems.filter(i => i.type === 'troop' || i.type === 'super_troop'))}</div>
            <div><h2 className="text-2xl font-bold mb-6 flex gap-2 items-center border-t border-slate-800 pt-10"><Hammer className="text-orange-500"/> ARMY SIEGES</h2>{renderGrid(dbItems.filter(i => i.type === 'siege'))}</div>
            <div><h2 className="text-2xl font-bold mb-6 flex gap-2 items-center border-t border-slate-800 pt-10"><Shield className="text-purple-500"/> ARMY SPELLS</h2>{renderGrid(dbItems.filter(i => i.type === 'spell'))}</div>
        </main>
        <div className="fixed bottom-0 left-0 w-full lg:w-[calc(100%-20rem)] bg-slate-900 border-t border-slate-800 p-4 z-50 flex justify-center shadow-2xl"><button onClick={exportArmy} className="bg-green-600 px-12 py-4 rounded-full font-black flex gap-2 items-center hover:bg-green-500 transition-all shadow-[0_0_20px_rgba(22,163,74,0.4)] transform active:scale-95"><ExternalLink size={20}/> EXPORT ARMY</button></div>
      </div>
      {renderArmySidebar()}
    </div>
  );
}