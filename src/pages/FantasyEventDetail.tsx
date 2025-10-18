import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Trophy, 
  Users, 
  Calendar, 
  ArrowLeft, 
  Plus, 
  Search, 
  X, 
  CheckCircle, 
  AlertCircle,
  Crown,
  Award,
  Sword,
  Target,
  TrendingUp,
  User,
  Shield,
  Hash,
  Eye,
  ArrowRight,
  Lock,
  Trash2,
  Settings,
  Star,
  Edit3
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { LoadingSpinner } from '../components/UI/LoadingSpinner';
import { ErrorMessage } from '../components/UI/ErrorMessage';
import { TeamRosterModal } from '../components/Fantasy/TeamRosterModal';
import { FantasyEvent, FantasyTeam, AvailablePlayer } from '../types/fantasy';

type TeamCreationStep = 'details' | 'selection' | 'confirmation';

interface TeamWithStats extends FantasyTeam {
  totalMerits: number;
  playerCount: number;
}

interface MyTeamData {
  teamName: string;
  ownerName: string;
  lordId: string;
  eventId: string;
}

export function FantasyEventDetail() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  
  // Main state
  const [event, setEvent] = useState<FantasyEvent | null>(null);
  const [teams, setTeams] = useState<FantasyTeam[]>([]);
  const [teamsWithStats, setTeamsWithStats] = useState<TeamWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // My Team state
  const [myTeam, setMyTeam] = useState<MyTeamData | null>(null);
  const [showMyTeamForm, setShowMyTeamForm] = useState(false);
  const [myTeamName, setMyTeamName] = useState('');
  const [myOwnerName, setMyOwnerName] = useState('');
  const [myLordId, setMyLordId] = useState('');
  
  // Team search
  const [teamSearchQuery, setTeamSearchQuery] = useState('');
  const [filteredTeams, setFilteredTeams] = useState<TeamWithStats[]>([]);
  
  // Team creation flow state
  const [currentStep, setCurrentStep] = useState<TeamCreationStep>('details');
  const [teamName, setTeamName] = useState('');
  const [lordId, setLordId] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [selectedPlayers, setSelectedPlayers] = useState<AvailablePlayer[]>([]);
  const [availablePlayers, setAvailablePlayers] = useState<AvailablePlayer[]>([]);
  const [playerSearchQuery, setPlayerSearchQuery] = useState('');
  const [isCreatingTeam, setIsCreatingTeam] = useState(false);
  const [submittingTeam, setSubmittingTeam] = useState(false);

  // Team roster modal state
  const [selectedTeam, setSelectedTeam] = useState<FantasyTeam | null>(null);
  const [selectedTeamPlayers, setSelectedTeamPlayers] = useState<FantasyTeamPlayer[]>([]);
  const [loadingTeamPlayers, setLoadingTeamPlayers] = useState(false);
  const [showRosterModal, setShowRosterModal] = useState(false);

  // Load my team from localStorage
  const loadMyTeam = () => {
    try {
      const savedTeam = localStorage.getItem(`fantasy_my_team_${eventId}`);
      if (savedTeam) {
        const parsed = JSON.parse(savedTeam);
        setMyTeam(parsed);
        setMyTeamName(parsed.teamName);
        setMyOwnerName(parsed.ownerName);
        setMyLordId(parsed.lordId);
      }
    } catch (err) {
      console.error('Failed to load my team from localStorage:', err);
    }
  };

  // Save my team to localStorage
  const saveMyTeam = (teamData: MyTeamData) => {
    try {
      localStorage.setItem(`fantasy_my_team_${eventId}`, JSON.stringify(teamData));
      setMyTeam(teamData);
    } catch (err) {
      console.error('Failed to save my team to localStorage:', err);
    }
  };

  // Clear my team from localStorage
  const clearMyTeam = () => {
    try {
      localStorage.removeItem(`fantasy_my_team_${eventId}`);
      setMyTeam(null);
      setMyTeamName('');
      setMyOwnerName('');
      setMyLordId('');
      setShowMyTeamForm(false);
    } catch (err) {
      console.error('Failed to clear my team from localStorage:', err);
    }
  };

  // Handle my team form submission
  const handleMyTeamSubmit = () => {
    if (!myTeamName.trim() || !myOwnerName.trim() || !myLordId.trim()) {
      alert('Please fill in all fields');
      return;
    }

    const teamData: MyTeamData = {
      teamName: myTeamName.trim(),
      ownerName: myOwnerName.trim(),
      lordId: myLordId.trim(),
      eventId: eventId!,
    };

    saveMyTeam(teamData);
    setShowMyTeamForm(false);
  };

  // Load event data
  const loadEvent = async () => {
    if (!eventId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('fantasy_events')
        .select('*')
        .eq('id', eventId)
        .single();
      
      if (error) throw error;
      
      setEvent(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load event');
    } finally {
      setLoading(false);
    }
  };

  // Load teams for the event
  const loadTeams = async () => {
    if (!eventId) return;
    
    try {
      const { data, error } = await supabase
        .from('fantasy_teams')
        .select(`
          *,
          fantasy_team_players(
            id,
            player_id,
            server_id,
            position,
            players!inner(lord_id, current_name, faction)
          )
        `)
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setTeams(data || []);
      
      // Calculate team stats (only merits)
      const teamsWithStatsData = await Promise.all(
        (data || []).map(async (team) => {
          const players = team.fantasy_team_players || [];
          
          if (players.length === 0) {
            return {
              ...team,
              totalMerits: 0,
              playerCount: 0,
            };
          }
          
          // Get latest stats for each player
          let totalMerits = 0;
          
          for (const teamPlayer of players) {
            try {
              const { data: playerStats } = await supabase
                .from('player_stats')
                .select('merits, scans!inner(scan_date)')
                .eq('player_id', teamPlayer.player_id)
                .order('scans(scan_date)', { ascending: false })
                .limit(1)
                .maybeSingle();
              
              if (playerStats) {
                totalMerits += playerStats.merits || 0;
              }
            } catch (err) {
              console.error(`Error loading stats for player ${teamPlayer.player_id}:`, err);
            }
          }
          
          return {
            ...team,
            totalMerits,
            playerCount: players.length,
          };
        })
      );
      
      setTeamsWithStats(teamsWithStatsData);
    } catch (err) {
      console.error('Error loading teams:', err);
    }
  };

  // Load available players
  const loadAvailablePlayers = async () => {
    if (!event) return;
    
    try {
      // Get alliances participating in this event
      const { data: eventAlliances, error: allianceError } = await supabase
        .from('fantasy_event_alliances')
        .select(`
          alliance_id,
          server_id,
          alliances!inner(tag, name)
        `)
        .eq('event_id', event.id);
      
      if (allianceError) throw allianceError;
      
      const players: AvailablePlayer[] = [];
      
      // For each alliance, get their latest players
      for (const eventAlliance of eventAlliances || []) {
        try {
          // Get latest scan for this alliance
          const { data: latestScan } = await supabase
            .from('scans')
            .select('id')
            .eq('alliance_id', eventAlliance.alliance_id)
            .order('scan_date', { ascending: false })
            .limit(1)
            .maybeSingle();
          
          if (!latestScan) continue;
          
          // Get players from latest scan (50M+ only)
          const { data: allianceStats } = await supabase
            .from('player_stats')
            .select(`
              player_id,
              name,
              alliance_tag,
              power,
              highest_power,
              merits,
              units_killed,
              killcount_t5,
              players!inner(lord_id, faction)
            `)
            .eq('scan_id', latestScan.id)
            .gte('power', 50000000);
          
          // Add server info to all players
          const transformedPlayers = (allianceStats || []).map(stat => ({
            player_id: stat.player_id,
            lord_id: (stat.players as any).lord_id,
            current_name: stat.name,
            faction: (stat.players as any).faction,
            alliance_tag: stat.alliance_tag,
            server_id: eventAlliance.server_id,
            power: stat.power,
            highest_power: stat.highest_power,
            merits: stat.merits,
            units_killed: stat.units_killed,
            killcount_t5: stat.killcount_t5,
          }));
          
          players.push(...transformedPlayers);
        } catch (err) {
          console.error(`Error loading players for alliance ${eventAlliance.alliance_id}:`, err);
        }
      }
      
      // Remove players already in teams for this event
      const { data: existingTeamPlayers } = await supabase
        .from('fantasy_team_players')
        .select('player_id, fantasy_teams!inner(event_id)')
        .eq('fantasy_teams.event_id', event.id);
      
      const usedPlayerIds = new Set((existingTeamPlayers || []).map(tp => tp.player_id));
      const availablePlayersFiltered = players.filter(p => !usedPlayerIds.has(p.player_id));
      
      setAvailablePlayers(availablePlayersFiltered || []);
    } catch (err) {
      console.error('Error loading available players:', err);
    }
  };

  const handleViewTeam = async (team: FantasyTeam) => {
    setSelectedTeam(team);
    setLoadingTeamPlayers(true);
    setShowRosterModal(true);
    
    try {
      const { data: teamPlayersData, error } = await supabase
        .from('fantasy_team_players')
        .select(`
          *,
          players!inner(lord_id, current_name, faction)
        `)
        .eq('team_id', team.id)
        .order('position');
      
      if (error) throw error;
      
      // Get stats for each player
      const playersWithStats = await Promise.all(
        (teamPlayersData || []).map(async (teamPlayer) => {
          // Find the player's stats from the latest scan of their alliance
          const { data: latestStats } = await supabase
            .from('player_stats')
            .select(`
              power, highest_power, merits, units_killed, killcount_t5, alliance_tag,
              scans!inner(scan_date, alliance_id)
            `)
            .eq('player_id', teamPlayer.player_id)
            .order('scans(scan_date)', { ascending: false })
            .limit(1)
            .maybeSingle();
          
          return {
            ...teamPlayer,
            stats: latestStats || null
          };
        })
      );
      
      setSelectedTeamPlayers(playersWithStats);
    } catch (err) {
      console.error('Error loading team players:', err);
      setSelectedTeamPlayers([]);
    } finally {
      setLoadingTeamPlayers(false);
    }
  };

  // Filter teams based on search and my team
  useEffect(() => {
    let filtered = [...teamsWithStats];

    // Apply search filter
    if (teamSearchQuery.trim()) {
      const query = teamSearchQuery.toLowerCase();
      filtered = filtered.filter(team =>
        team.team_name.toLowerCase().includes(query) ||
        team.owner_name.toLowerCase().includes(query)
      );
    }

    // Sort by merits (highest first)
    filtered.sort((a, b) => b.totalMerits - a.totalMerits);

    setFilteredTeams(filtered);
  }, [teamsWithStats, teamSearchQuery]);

  useEffect(() => {
    loadEvent();
    loadMyTeam();
  }, [eventId]);

  useEffect(() => {
    if (event) {
      loadTeams();
      loadAvailablePlayers();
    }
  }, [event]);

  // Team creation functions
  const startTeamCreation = () => {
    setIsCreatingTeam(true);
    setCurrentStep('details');
    setTeamName('');
    setLordId('');
    setOwnerName('');
    setSelectedPlayers([]);
    setPlayerSearchQuery('');
  };

  const cancelTeamCreation = () => {
    setIsCreatingTeam(false);
    setCurrentStep('details');
    setTeamName('');
    setLordId('');
    setOwnerName('');
    setSelectedPlayers([]);
    setPlayerSearchQuery('');
  };

  const proceedToPlayerSelection = () => {
    if (!teamName.trim() || !lordId.trim() || !ownerName.trim()) {
      alert('Please fill in all required fields');
      return;
    }
    setCurrentStep('selection');
  };

  const proceedToConfirmation = () => {
    if (selectedPlayers.length !== (event?.team_size || 6)) {
      alert(`Please select exactly ${event?.team_size || 6} players`);
      return;
    }
    setCurrentStep('confirmation');
  };

  const addPlayerToTeam = (player: AvailablePlayer) => {
    if (selectedPlayers.length >= (event?.team_size || 6)) {
      alert(`Team is full! Maximum ${event?.team_size || 6} players per team.`);
      return;
    }

    // Check server limit
    const playersFromSameServer = selectedPlayers.filter(p => p.server_id === player.server_id).length;
    if (playersFromSameServer >= (event?.max_per_server || 2)) {
      alert(`Maximum ${event?.max_per_server || 2} players per server allowed.`);
      return;
    }

    // Check if player is the owner (prevent self-selection)
    if (player.lord_id === lordId.trim()) {
      alert('You cannot select yourself for your team!');
      return;
    }

    setSelectedPlayers(prev => [...prev, player]);
  };

  const removePlayerFromTeam = (playerId: string) => {
    setSelectedPlayers(prev => prev.filter(p => p.player_id !== playerId));
  };

  const submitTeam = async () => {
    if (!event) {
      alert('No event selected');
      return;
    }

    if (selectedPlayers.length !== event.team_size) {
      alert('Invalid team configuration');
      return;
    }

    try {
      setSubmittingTeam(true);

      // Create team
      const { data: createdTeam, error: teamError } = await supabase
        .from('fantasy_teams')
        .insert({
          event_id: event.id,
          team_name: teamName.trim(),
          owner_lord_id: lordId.trim(),
          owner_name: ownerName.trim(),
          is_complete: true,
        })
        .select('id')
        .single();

      if (teamError) {
        console.error('Supabase error creating team:', teamError);
        alert(`Failed to create team: ${teamError.message || JSON.stringify(teamError)}`);
        return;
      }

      if (!createdTeam || !createdTeam.id) {
        console.error('Unexpected response creating team:', createdTeam);
        alert('Failed to create team - no ID returned from server.');
        return;
      }

      // Insert team players
      const teamPlayers = selectedPlayers.map((player, index) => ({
        team_id: createdTeam.id,
        player_id: player.player_id,
        server_id: player.server_id,
        position: index + 1,
      }));

      const { error: playersError } = await supabase
        .from('fantasy_team_players')
        .insert(teamPlayers);

      if (playersError) {
        console.error('Supabase error inserting team players:', playersError);
        // Cleanup
        try {
          await supabase.from('fantasy_teams').delete().eq('id', createdTeam.id);
        } catch (cleanupErr) {
          console.error('Cleanup failed:', cleanupErr);
        }

        alert(`Failed to add players to team: ${playersError.message || JSON.stringify(playersError)}`);
        return;
      }

      // Save as my team
      const myTeamData: MyTeamData = {
        teamName: teamName.trim(),
        ownerName: ownerName.trim(),
        lordId: lordId.trim(),
        eventId: event.id,
      };
      saveMyTeam(myTeamData);

      // Refresh data
      await loadTeams();
      await loadAvailablePlayers();

      // Reset state
      setTeamName('');
      setLordId('');
      setOwnerName('');
      setSelectedPlayers([]);
      setPlayerSearchQuery('');
      setIsCreatingTeam(false);
      setCurrentStep('details');

      alert('Team created successfully!');
    } catch (err) {
      console.error('Unexpected error in submitTeam:', err);
      alert('Failed to create team. Please check console and try again.');
    } finally {
      setSubmittingTeam(false);
    }
  };

  // Helper functions
  const formatNumber = (num: number) => {
    if (num >= 1e9) return `${(num / 1e9).toFixed(1)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
    return num.toString();
  };

  const getFilteredPlayers = () => {
    if (!playerSearchQuery.trim()) return availablePlayers;
    
    const query = playerSearchQuery.toLowerCase();
    return availablePlayers.filter(player =>
      player.current_name.toLowerCase().includes(query) ||
      player.lord_id.toLowerCase().includes(query) ||
      player.alliance_tag.toLowerCase().includes(query)
    );
  };

  const getServerDistribution = () => {
    const distribution: Record<string, number> = {};
    selectedPlayers.forEach(player => {
      distribution[player.server_id] = (distribution[player.server_id] || 0) + 1;
    });
    return distribution;
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-5 h-5 text-yellow-400" />;
      case 2:
        return <Award className="w-5 h-5 text-gray-300" />;
      case 3:
        return <Award className="w-5 h-5 text-orange-400" />;
      default:
        return <span className="w-5 h-5 flex items-center justify-center text-xs font-bold text-gray-400">#{rank}</span>;
    }
  };

  const findMyTeamInLeaderboard = () => {
    if (!myTeam) return null;
    return filteredTeams.find(team => 
      team.team_name.toLowerCase() === myTeam.teamName.toLowerCase() &&
      team.owner_name.toLowerCase() === myTeam.ownerName.toLowerCase()
    );
  };

  const getMyTeamRank = () => {
    const myTeamInBoard = findMyTeamInLeaderboard();
    if (!myTeamInBoard) return null;
    return filteredTeams.findIndex(team => team.id === myTeamInBoard.id) + 1;
  };

  if (loading) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center justify-center min-h-96"
      >
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 mx-auto mb-4 glass-panel-light rounded-full flex items-center justify-center neon-glow"
          >
            <Trophy className="w-8 h-8 text-purple-400" />
          </motion.div>
          <p className="text-purple-400 font-orbitron font-bold">LOADING EVENT...</p>
        </div>
      </motion.div>
    );
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={loadEvent} />;
  }

  if (!event) {
    return <ErrorMessage message="Event not found" />;
  }

  const myTeamInBoard = findMyTeamInLeaderboard();
  const myTeamRank = getMyTeamRank();

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 relative overflow-hidden"
    >
      {/* Background Characters */}
      <div className="absolute right-0 top-20 opacity-40 pointer-events-none">
        <img
          src="/girlbg.png"
          alt="Background Character"
          className="w-48 sm:w-64 md:w-72 h-auto transform rotate-15"
        />
      </div>
      
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="glass-panel rounded-2xl p-4 sm:p-6 md:p-8 relative overflow-hidden z-10"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-blue-500/10"></div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0 relative z-10">
          <div className="flex items-center space-x-3 sm:space-x-4">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/fantasy-league')}
              className="p-2 sm:p-3 glass-panel-light rounded-xl neon-border hover:neon-glow transition-all duration-300"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-cyan-400" />
            </motion.button>
            <motion.div 
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="p-2 sm:p-3 md:p-4 glass-panel-light rounded-2xl neon-border neon-glow"
            >
              <Trophy className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 text-purple-400" />
            </motion.div>
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white font-orbitron">
                {event.name}
              </h1>
              <p className="text-gray-400 mt-1 sm:mt-2 text-sm sm:text-base">
                Create your ultimate fantasy team and compete for glory
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {event.is_active ? (
              <span className="px-3 py-1 bg-green-500/20 text-green-400 text-sm font-bold rounded-full border border-green-400/30">
                🟢 ACTIVE
              </span>
            ) : (
              <span className="px-3 py-1 bg-gray-500/20 text-gray-400 text-sm font-bold rounded-full border border-gray-400/30">
                ⚫ INACTIVE
              </span>
            )}
          </div>
        </div>
      </motion.div>

      {/* Event Information */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-panel rounded-2xl p-4 sm:p-6 relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10"></div>
        <div className="flex items-center mb-4 sm:mb-6 relative z-10">
          <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400 mr-2 sm:mr-3" />
          <h3 className="text-lg sm:text-xl font-black text-blue-400 font-orbitron">
            EVENT DETAILS
          </h3>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 relative z-10">
          <div className="text-center p-4 glass-panel-light rounded-xl neon-border">
            <Calendar className="w-5 h-5 text-purple-400 mx-auto mb-2" />
            <div className="text-sm text-purple-400 font-bold font-orbitron mb-1">DURATION</div>
            <div className="text-xs text-gray-300">
              {new Date(event.start_date).toLocaleDateString()} - {new Date(event.end_date).toLocaleDateString()}
            </div>
            <div className="text-lg font-black text-white font-orbitron">
              {Math.ceil((new Date(event.end_date).getTime() - new Date(event.start_date).getTime()) / (1000 * 60 * 60 * 24))} Days
            </div>
          </div>

          <div className="text-center p-4 glass-panel-light rounded-xl neon-border">
            <Users className="w-5 h-5 text-green-400 mx-auto mb-2" />
            <div className="text-sm text-green-400 font-bold font-orbitron mb-1">TEAM SIZE</div>
            <div className="text-lg font-black text-white font-orbitron">{event.team_size}</div>
            <div className="text-xs text-gray-400">Players per team</div>
          </div>

          <div className="text-center p-4 glass-panel-light rounded-xl neon-border">
            <Trophy className="w-5 h-5 text-yellow-400 mx-auto mb-2" />
            <div className="text-sm text-yellow-400 font-bold font-orbitron mb-1">MAX TEAMS</div>
            <div className="text-lg font-black text-white font-orbitron">{event.max_teams}</div>
            <div className="text-xs text-gray-400">Total allowed</div>
          </div>

          <div className="text-center p-4 glass-panel-light rounded-xl neon-border">
            <Shield className="w-5 h-5 text-cyan-400 mx-auto mb-2" />
            <div className="text-sm text-cyan-400 font-bold font-orbitron mb-1">SERVER LIMIT</div>
            <div className="text-lg font-black text-white font-orbitron">{event.max_per_server}</div>
            <div className="text-xs text-gray-400">Per server max</div>
          </div>
        </div>
      </motion.div>

      {/* My Team Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass-panel rounded-2xl p-4 sm:p-6 relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 to-purple-500/10"></div>
        <div className="flex items-center justify-between mb-4 sm:mb-6 relative z-10">
          <div className="flex items-center space-x-3">
            <Star className="w-5 h-5 sm:w-6 sm:h-6 text-pink-400" />
            <h3 className="text-lg sm:text-xl font-black text-pink-400 font-orbitron">
              MY TEAM
            </h3>
          </div>
          {myTeam && (
            <div className="flex items-center space-x-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowMyTeamForm(true)}
                className="p-2 glass-panel-light rounded-lg neon-border hover:neon-glow transition-all duration-300"
              >
                <Edit3 className="w-4 h-4 text-cyan-400" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={clearMyTeam}
                className="p-2 glass-panel-light rounded-lg neon-border hover:neon-glow transition-all duration-300"
              >
                <Trash2 className="w-4 h-4 text-red-400" />
              </motion.button>
            </div>
          )}
        </div>

        {myTeam ? (
          <div className="space-y-4 relative z-10">
            {/* My Team Info */}
            <div className="glass-panel-light rounded-xl p-4 neon-border border-pink-400 bg-pink-500/10">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div className="text-sm text-gray-400">Team Name</div>
                  <div className="font-bold text-pink-400 font-orbitron">{myTeam.teamName}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-400">Owner</div>
                  <div className="font-bold text-white">{myTeam.ownerName}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-400">Lord ID</div>
                  <div className="font-bold text-purple-400 font-mono">{myTeam.lordId}</div>
                </div>
              </div>
            </div>

            {/* My Team Ranking */}
            {myTeamInBoard && (
              <div className="glass-panel-light rounded-xl p-4 neon-border border-yellow-400 bg-yellow-500/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getRankIcon(myTeamRank || 0)}
                    <div>
                      <div className="font-bold text-yellow-400 font-orbitron">
                        RANK #{myTeamRank}
                      </div>
                      <div className="text-sm text-gray-400">
                        {formatNumber(myTeamInBoard.totalMerits)} Total Merits
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-400">Players</div>
                    <div className="font-bold text-green-400 font-orbitron">
                      {myTeamInBoard.playerCount}/{event.team_size}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {!myTeamInBoard && (
              <div className="glass-panel-light rounded-xl p-4 neon-border border-orange-400 bg-orange-500/10">
                <div className="flex items-center">
                  <AlertCircle className="w-5 h-5 text-orange-400 mr-3" />
                  <div>
                    <div className="font-bold text-orange-400">TEAM NOT FOUND</div>
                    <div className="text-sm text-gray-400">
                      Your team "{myTeam.teamName}" was not found in the current leaderboard
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-6 relative z-10">
            {showMyTeamForm ? (
              <div className="space-y-4 max-w-md mx-auto">
                <div>
                  <label className="block text-sm font-bold text-pink-400 font-orbitron mb-2">
                    TEAM NAME
                  </label>
                  <input
                    type="text"
                    value={myTeamName}
                    onChange={(e) => setMyTeamName(e.target.value)}
                    placeholder="Enter your team name"
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all duration-300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-pink-400 font-orbitron mb-2">
                    YOUR NAME
                  </label>
                  <input
                    type="text"
                    value={myOwnerName}
                    onChange={(e) => setMyOwnerName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all duration-300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-pink-400 font-orbitron mb-2">
                    YOUR LORD ID
                  </label>
                  <input
                    type="text"
                    value={myLordId}
                    onChange={(e) => setMyLordId(e.target.value)}
                    placeholder="Enter your Lord ID"
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all duration-300"
                  />
                </div>
                <div className="flex space-x-3">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleMyTeamSubmit}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white rounded-xl font-bold transition-all duration-300"
                  >
                    SAVE TEAM
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowMyTeamForm(false)}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-xl font-bold transition-colors"
                  >
                    CANCEL
                  </motion.button>
                </div>
              </div>
            ) : (
              <div>
                <Star className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h4 className="text-lg font-bold text-gray-300 font-orbitron mb-2">
                  NO TEAM SET
                </h4>
                <p className="text-gray-400 mb-4">
                  Set your team name to track your ranking
                </p>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowMyTeamForm(true)}
                  className="px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white rounded-xl font-bold transition-all duration-300 flex items-center space-x-2 mx-auto"
                >
                  <Settings className="w-5 h-5" />
                  <span className="font-orbitron">SET MY TEAM</span>
                </motion.button>
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* Team Creation Flow */}
      {isCreatingTeam ? (
        <AnimatePresence mode="wait">
          {/* Step 1: Team Details */}
          {currentStep === 'details' && (
            <motion.div
              key="details"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="glass-panel rounded-2xl p-6 relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-cyan-500/10"></div>
              <div className="flex items-center justify-between mb-6 relative z-10">
                <div className="flex items-center space-x-3">
                  <User className="w-6 h-6 text-green-400" />
                  <h3 className="text-xl font-black text-green-400 font-orbitron">
                    STEP 1: TEAM DETAILS
                  </h3>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={cancelTeamCreation}
                  className="p-2 glass-panel-light rounded-lg neon-border hover:neon-glow transition-all duration-300"
                >
                  <X className="w-5 h-5 text-red-400" />
                </motion.button>
              </div>

              <div className="space-y-6 relative z-10">
                <div>
                  <label className="block text-sm font-bold text-green-400 font-orbitron mb-2">
                    YOUR LORD ID *
                  </label>
                  <input
                    type="text"
                    value={lordId}
                    onChange={(e) => setLordId(e.target.value)}
                    placeholder="Enter your Lord ID (e.g., 9613202)"
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-300"
                  />
                  <p className="text-xs text-gray-400 mt-1">Used to prevent self-selection</p>
                </div>

                <div>
                  <label className="block text-sm font-bold text-green-400 font-orbitron mb-2">
                    YOUR NAME *
                  </label>
                  <input
                    type="text"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="Enter your display name"
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-300"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-green-400 font-orbitron mb-2">
                    TEAM NAME *
                  </label>
                  <input
                    type="text"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    placeholder="Enter your team name"
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-300"
                  />
                </div>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={proceedToPlayerSelection}
                  disabled={!teamName.trim() || !lordId.trim() || !ownerName.trim()}
                  className="w-full px-6 py-3 bg-gradient-to-r from-green-500 to-cyan-500 hover:from-green-600 hover:to-cyan-600 disabled:from-gray-600 disabled:to-gray-700 disabled:opacity-50 text-white rounded-xl font-bold transition-all duration-300 flex items-center justify-center space-x-2"
                >
                  <span>NEXT: SELECT PLAYERS</span>
                  <ArrowRight className="w-5 h-5" />
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* Step 2: Player Selection */}
          {currentStep === 'selection' && (
            <motion.div
              key="selection"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {/* Progress Header */}
              <div className="glass-panel-light rounded-xl p-4 neon-border text-center">
                <div className="flex items-center justify-center space-x-4 mb-3">
                  <div className="text-xl font-black text-purple-400 font-orbitron">
                    STEP 2: SELECT PLAYERS
                  </div>
                </div>
                <div className="text-sm text-cyan-400 font-bold font-orbitron">
                  SELECTED: {selectedPlayers.length}/{event.team_size}
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(selectedPlayers.length / event.team_size) * 100}%` }}
                    transition={{ duration: 0.3 }}
                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                  />
                </div>
              </div>

              {/* Selected Players */}
              {selectedPlayers.length > 0 && (
                <div className="glass-panel rounded-2xl p-6 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-cyan-500/10"></div>
                  <div className="flex items-center mb-4 relative z-10">
                    <CheckCircle className="w-6 h-6 text-green-400 mr-3" />
                    <h3 className="text-xl font-black text-green-400 font-orbitron">
                      SELECTED ROSTER ({selectedPlayers.length})
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
                    {selectedPlayers.map((player, index) => (
                      <div
                        key={player.player_id}
                        className="flex items-center justify-between p-4 glass-panel-light rounded-xl neon-border border-green-400 bg-green-500/10"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
                            {index + 1}
                          </div>
                          <div>
                            <div className="font-bold text-white">{player.current_name}</div>
                            <div className="text-xs text-gray-400">[{player.alliance_tag}] • {player.server_id}</div>
                            <div className="text-xs text-purple-400 font-bold">
                              {formatNumber(player.merits || 0)} Merits
                            </div>
                          </div>
                        </div>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => removePlayerFromTeam(player.player_id)}
                          className="p-2 glass-panel rounded neon-border hover:neon-glow transition-all duration-300"
                        >
                          <X className="w-4 h-4 text-red-400" />
                        </motion.button>
                      </div>
                    ))}
                  </div>

                  {/* Server Distribution */}
                  <div className="mt-6 p-4 glass-panel-light rounded-xl neon-border relative z-10">
                    <h4 className="text-sm font-bold text-cyan-400 font-orbitron mb-3">SERVER DISTRIBUTION</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {Object.entries(getServerDistribution()).map(([server, count]) => (
                        <div key={server} className="text-center p-2 bg-gray-800/50 rounded-lg">
                          <div className="text-sm font-bold text-white">{server}</div>
                          <div className="text-xs text-cyan-400">{count}/{event.max_per_server}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Player Search */}
              <div className="glass-panel rounded-2xl p-6 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/10"></div>
                <div className="flex items-center mb-6 relative z-10">
                  <Search className="w-6 h-6 text-purple-400 mr-3" />
                  <h3 className="text-xl font-black text-purple-400 font-orbitron">
                    AVAILABLE PLAYERS (50M+ Power)
                  </h3>
                </div>

                {/* Search Bar */}
                <div className="mb-6 relative z-10">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      placeholder="Search by name, Lord ID, or alliance..."
                      value={playerSearchQuery}
                      onChange={(e) => setPlayerSearchQuery(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 bg-gray-800 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300"
                    />
                  </div>
                </div>

                {/* Available Players Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto relative z-10">
                  {getFilteredPlayers().map((player) => {
                    const isSelected = selectedPlayers.some(p => p.player_id === player.player_id);
                    const isOwner = player.lord_id === lordId.trim();
                    const serverCount = selectedPlayers.filter(p => p.server_id === player.server_id).length;
                    const serverFull = serverCount >= event.max_per_server;
                    const teamFull = selectedPlayers.length >= event.team_size;

                    return (
                      <motion.button
                        key={player.player_id}
                        whileHover={{ scale: isSelected || isOwner || (serverFull && !isSelected) || teamFull ? 1 : 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => !isSelected && !isOwner && !serverFull && !teamFull && addPlayerToTeam(player)}
                        disabled={isSelected || isOwner || (serverFull && !isSelected) || teamFull}
                        className={`p-4 rounded-xl text-left transition-all duration-300 ${
                          isSelected 
                            ? 'border-green-400 bg-green-500/20 cursor-default'
                            : isOwner
                            ? 'border-red-400 bg-red-500/20 cursor-not-allowed opacity-50'
                            : serverFull || teamFull
                            ? 'border-gray-600 bg-gray-500/20 cursor-not-allowed opacity-50'
                            : 'glass-panel-light neon-border hover:neon-glow cursor-pointer'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-bold text-white text-sm">{player.current_name}</div>
                          {isSelected && <CheckCircle className="w-5 h-5 text-green-400" />}
                          {isOwner && <Lock className="w-5 h-5 text-red-400" />}
                        </div>
                        <div className="space-y-1 text-xs">
                          <div className="text-gray-400">[{player.alliance_tag}] • {player.server_id}</div>
                          <div className="text-purple-400 font-bold">
                            {formatNumber(player.merits || 0)} Merits
                          </div>
                          <div className="text-blue-400">
                            {formatNumber(player.power || 0)} Power
                          </div>
                        </div>
                        {isOwner && (
                          <div className="mt-2 text-xs text-red-400 font-bold">
                            CANNOT SELECT YOURSELF
                          </div>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Navigation */}
              <div className="flex justify-between">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setCurrentStep('details')}
                  className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-xl font-bold transition-colors flex items-center space-x-2"
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span>BACK</span>
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={proceedToConfirmation}
                  disabled={selectedPlayers.length !== event.team_size}
                  className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-gray-600 disabled:to-gray-700 disabled:opacity-50 text-white rounded-xl font-bold transition-all duration-300 flex items-center space-x-2"
                >
                  <span>CONFIRM TEAM</span>
                  <ArrowRight className="w-5 h-5" />
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Confirm Team */}
          {currentStep === 'confirmation' && (
            <motion.div
              key="confirmation"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="glass-panel rounded-2xl p-6 relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-orange-500/10"></div>
              <div className="flex items-center mb-6 relative z-10">
                <CheckCircle className="w-6 h-6 text-yellow-400 mr-3" />
                <h3 className="text-xl font-black text-yellow-400 font-orbitron">
                  STEP 3: CONFIRM TEAM
                </h3>
              </div>

              <div className="space-y-6 relative z-10">
                {/* Warning */}
                <div className="bg-red-900/30 border border-red-500 rounded-xl p-4 flex items-center">
                  <AlertCircle className="w-6 h-6 text-red-500 mr-3 flex-shrink-0" />
                  <div>
                    <div className="font-bold text-red-400 mb-1">⚠️ FINAL WARNING</div>
                    <div className="text-sm text-red-300">
                      Once submitted, you CANNOT edit your team. Please review carefully.
                    </div>
                  </div>
                </div>

                {/* Team Summary */}
                <div className="glass-panel-light rounded-xl p-6 neon-border">
                  <h4 className="text-lg font-bold text-cyan-400 font-orbitron mb-4">TEAM SUMMARY</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">Team Name:</span>
                      <span className="ml-2 text-white font-bold">{teamName}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Owner:</span>
                      <span className="ml-2 text-purple-400 font-bold">{ownerName}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Players:</span>
                      <span className="ml-2 text-green-400 font-bold">{selectedPlayers.length}/{event.team_size}</span>
                    </div>
                  </div>
                </div>

                {/* Team Stats - Only Merits */}
                <div className="glass-panel-light rounded-xl p-6 neon-border">
                  <h4 className="text-lg font-bold text-purple-400 font-orbitron mb-4">TEAM MERITS</h4>
                  <div className="text-center p-6 bg-purple-500/20 rounded-xl">
                    <Award className="w-8 h-8 text-purple-400 mx-auto mb-3" />
                    <div className="text-3xl font-black text-purple-400 font-orbitron">
                      {formatNumber(selectedPlayers.reduce((sum, p) => sum + (p.merits || 0), 0))}
                    </div>
                    <div className="text-sm text-gray-400">Total Team Merits</div>
                  </div>
                </div>

                {/* Final Roster */}
                <div className="glass-panel-light rounded-xl p-6 neon-border">
                  <h4 className="text-lg font-bold text-pink-400 font-orbitron mb-4">FINAL ROSTER</h4>
                  <div className="space-y-3">
                    {selectedPlayers.map((player, index) => (
                      <div key={player.player_id} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-6 h-6 bg-pink-500 text-white rounded-full flex items-center justify-center font-bold text-xs">
                            {index + 1}
                          </div>
                          <div>
                            <div className="font-bold text-white text-sm">{player.current_name}</div>
                            <div className="text-xs text-gray-400">[{player.alliance_tag}] • {player.server_id}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-purple-400 font-orbitron">
                            {formatNumber(player.merits || 0)}
                          </div>
                          <div className="text-xs text-gray-400">Merits</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Final Warning */}
                <div className="bg-orange-900/30 border border-orange-500 rounded-xl p-4">
                  <div className="flex items-center mb-2">
                    <Lock className="w-5 h-5 text-orange-500 mr-2" />
                    <div className="font-bold text-orange-400">TEAM WILL BE LOCKED</div>
                  </div>
                  <div className="text-sm text-orange-300">
                    After submission, your team becomes permanent and cannot be modified.
                  </div>
                </div>
              </div>

              {/* Navigation */}
              <div className="flex justify-between">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setCurrentStep('selection')}
                  className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-xl font-bold transition-colors flex items-center space-x-2"
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span>BACK TO SELECTION</span>
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={submitTeam}
                  disabled={submittingTeam || selectedPlayers.length !== event.team_size}
                  className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 disabled:from-gray-600 disabled:to-gray-700 disabled:opacity-50 text-white rounded-xl font-bold transition-all duration-300 flex items-center space-x-2 relative overflow-hidden"
                >
                  {submittingTeam ? (
                    <>
                      <LoadingSpinner size="sm" />
                      <span>CREATING...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-5 h-5" />
                      <span>SUBMIT TEAM</span>
                    </>
                  )}
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      ) : (
        /* Team Creation Button */
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-center"
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={startTeamCreation}
            className="px-6 py-3 bg-gradient-to-r from-green-500 to-cyan-500 hover:from-green-600 hover:to-cyan-600 text-white rounded-xl font-bold transition-all duration-300 flex items-center space-x-3 mx-auto"
          >
            <Plus className="w-5 h-5" />
            <span className="font-orbitron">CREATE TEAM</span>
          </motion.button>
        </motion.div>
      )}

      {/* Team Leaderboard */}
      {!isCreatingTeam && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass-panel rounded-2xl p-4 sm:p-6 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/10"></div>
          <div className="flex items-center justify-between mb-4 sm:mb-6 relative z-10">
            <div className="flex items-center space-x-3">
              <Award className="w-5 h-5 sm:w-6 sm:h-6 text-purple-400" />
              <h3 className="text-lg sm:text-xl font-black text-purple-400 font-orbitron">
                MERITS LEADERBOARD
              </h3>
            </div>
            <div className="text-sm text-gray-400">
              {filteredTeams.length} teams
            </div>
          </div>

          {/* Team Search */}
          <div className="mb-6 relative z-10">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search teams by name or owner..."
                value={teamSearchQuery}
                onChange={(e) => setTeamSearchQuery(e.target.value)}
                className="w-full pl-12 pr-12 py-3 bg-gray-800 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300"
              />
              {teamSearchQuery && (
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setTeamSearchQuery('')}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-purple-400 transition-colors duration-300"
                >
                  <X className="w-5 h-5" />
                </motion.button>
              )}
            </div>
            {teamSearchQuery && (
              <div className="mt-2 text-sm text-cyan-400 font-bold font-orbitron">
                {filteredTeams.length} TEAMS FOUND
              </div>
            )}
          </div>

          {/* Team Rankings */}
          <div className="space-y-3 relative z-10">
            {filteredTeams.length > 0 ? (
              filteredTeams.map((team, index) => {
                const rank = index + 1;
                const isMyTeam = myTeam && 
                  team.team_name.toLowerCase() === myTeam.teamName.toLowerCase() &&
                  team.owner_name.toLowerCase() === myTeam.ownerName.toLowerCase();
                
                return (
                  <motion.div
                    key={team.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`flex items-center justify-between p-4 glass-panel-light rounded-xl neon-border hover:neon-glow transition-all duration-300 ${
                      isMyTeam ? 'border-pink-400 bg-pink-500/20' :
                      rank === 1 ? 'border-yellow-400 bg-yellow-500/10' :
                      rank === 2 ? 'border-gray-300 bg-gray-500/10' :
                      rank === 3 ? 'border-orange-400 bg-orange-500/10' :
                      ''
                    }`}
                  >
                    <div className="flex items-center space-x-4">
                      {/* Rank */}
                      <div className="flex items-center space-x-2">
                        {getRankIcon(rank)}
                        <span className={`font-bold font-orbitron ${
                          rank === 1 ? 'text-yellow-400' :
                          rank === 2 ? 'text-gray-300' :
                          rank === 3 ? 'text-orange-400' :
                          'text-cyan-400'
                        }`}>
                          #{rank}
                        </span>
                        {isMyTeam && (
                          <Star className="w-4 h-4 text-pink-400 animate-pulse" />
                        )}
                      </div>

                      {/* Team Info */}
                      <div>
                        <div className="flex items-center space-x-2">
                          <div className="font-bold text-white font-orbitron">{team.team_name}</div>
                          {isMyTeam && (
                            <span className="px-2 py-1 bg-pink-500/20 text-pink-400 text-xs font-bold rounded-full border border-pink-400/30">
                              MY TEAM
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-400">
                          by {team.owner_name} • {team.playerCount}/{event.team_size} players
                        </div>
                        <div className="flex items-center space-x-2 mt-1">
                          {team.is_complete ? (
                            <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs font-bold rounded-full border border-green-400/30">
                              COMPLETE
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-orange-500/20 text-orange-400 text-xs font-bold rounded-full border border-orange-400/30">
                              BUILDING
                            </span>
                          )}
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleViewTeam(team)}
                            className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg font-bold transition-all duration-300 flex items-center space-x-2"
                          >
                            <Users className="w-4 h-4" />
                            <span>VIEW ROSTER</span>
                          </motion.button>
                        </div>
                      </div>
                    </div>

                    {/* Merits Value */}
                    <div className="text-right">
                      <div className={`text-xl font-black font-orbitron ${
                        isMyTeam ? 'text-pink-400' :
                        rank === 1 ? 'text-yellow-400' :
                        rank === 2 ? 'text-gray-300' :
                        rank === 3 ? 'text-orange-400' :
                        'text-purple-400'
                      }`}>
                        {formatNumber(team.totalMerits)}
                      </div>
                      <div className="text-xs text-gray-400">Total Merits</div>
                    </div>
                  </motion.div>
                );
              })
            ) : (
              <div className="text-center py-8">
                {teamSearchQuery ? (
                  <div>
                    <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h4 className="text-lg font-bold text-gray-300 font-orbitron mb-2">
                      NO TEAMS FOUND
                    </h4>
                    <p className="text-gray-400">
                      No teams match "{teamSearchQuery}"
                    </p>
                  </div>
                ) : (
                  <div>
                    <Trophy className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h4 className="text-lg font-bold text-gray-300 font-orbitron mb-2">
                      NO TEAMS YET
                    </h4>
                    <p className="text-gray-400">
                      Be the first to create a team for this event!
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Team Roster Modal */}
      <TeamRosterModal
        isOpen={showRosterModal}
        onClose={() => {
          setShowRosterModal(false);
          setSelectedTeam(null);
          setSelectedTeamPlayers([]);
        }}
        team={selectedTeam}
        teamPlayers={selectedTeamPlayers}
        loading={loadingTeamPlayers}
      />
    </motion.div>
  );
}