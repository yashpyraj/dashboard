import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Trophy, 
  Users, 
  Calendar, 
  ArrowLeft, 
  Shield,
  Target,
  TrendingUp,
  ArrowRight,
  Crown,
  Award
} from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { LoadingSpinner } from '../components/UI/LoadingSpinner';
import { ErrorMessage } from '../components/UI/ErrorMessage';
import { FantasyEvent } from '../types/fantasy';

interface EventWithStats extends FantasyEvent {
  teamCount: number;
  totalPlayers: number;
  participatingAlliances: number;
}

export function FantasyLeague() {
  const navigate = useNavigate();
  
  const [events, setEvents] = useState<EventWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get all events
      const { data: eventsData, error: eventsError } = await supabase
        .from('fantasy_events')
        .select('*')
        .order('start_date', { ascending: false });
      
      if (eventsError) throw eventsError;
      
      // Get stats for each event
      const eventsWithStats = await Promise.all(
        (eventsData || []).map(async (event) => {
          try {
            // Get team count
            const { data: teams, error: teamsError } = await supabase
              .from('fantasy_teams')
              .select('id')
              .eq('event_id', event.id);
            
            const teamCount = teamsError ? 0 : (teams?.length || 0);
            
            // Get total players
            const { data: teamPlayers, error: playersError } = await supabase
              .from('fantasy_team_players')
              .select('id, fantasy_teams!inner(event_id)')
              .eq('fantasy_teams.event_id', event.id);
            
            const totalPlayers = playersError ? 0 : (teamPlayers?.length || 0);
            
            // Get participating alliances
            const { data: alliances, error: alliancesError } = await supabase
              .from('fantasy_event_alliances')
              .select('id')
              .eq('event_id', event.id);
            
            const participatingAlliances = alliancesError ? 0 : (alliances?.length || 0);
            
            return {
              ...event,
              teamCount,
              totalPlayers,
              participatingAlliances,
            };
          } catch (err) {
            console.error(`Error loading stats for event ${event.id}:`, err);
            return {
              ...event,
              teamCount: 0,
              totalPlayers: 0,
              participatingAlliances: 0,
            };
          }
        })
      );
      
      setEvents(eventsWithStats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const formatNumber = (num: number) => {
    if (num >= 1e9) return `${(num / 1e9).toFixed(1)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
    return num.toString();
  };

  const getEventStatus = (event: FantasyEvent) => {
    const now = new Date();
    const start = new Date(event.start_date);
    const end = new Date(event.end_date);
    
    if (now < start) return { status: 'upcoming', label: 'UPCOMING', color: 'text-blue-400' };
    if (now > end) return { status: 'ended', label: 'ENDED', color: 'text-gray-400' };
    return { status: 'active', label: 'ACTIVE', color: 'text-green-400' };
  };

  const getDaysRemaining = (event: FantasyEvent) => {
    const now = new Date();
    const start = new Date(event.start_date);
    const end = new Date(event.end_date);
    
    if (now < start) {
      return Math.ceil((start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    }
    if (now <= end) {
      return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    }
    return 0;
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
          <p className="text-purple-400 font-orbitron font-bold">LOADING FANTASY EVENTS...</p>
        </div>
      </motion.div>
    );
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={loadEvents} />;
  }

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
              onClick={() => navigate('/')}
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
                <span className="text-purple-400">FANTASY</span> <span className="text-pink-400">LEAGUE</span>
              </h1>
              <p className="text-gray-400 mt-1 sm:mt-2 text-sm sm:text-base">
                Create your ultimate alliance team and compete for glory
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Events Grid */}
      {events.length > 0 ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6"
        >
          {events.map((event, index) => {
            const eventStatus = getEventStatus(event);
            const daysRemaining = getDaysRemaining(event);
            
            return (
              <motion.button
                key={event.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.02, y: -5 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate(`/fantasy-event/${event.id}`)}
                className="glass-panel rounded-2xl p-4 sm:p-6 text-left hover:neon-glow transition-all duration-300 relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                
                {/* Event Header */}
                <div className="flex items-center justify-between mb-4 relative z-10">
                  <div className="flex items-center space-x-3">
                    <Trophy className="w-6 h-6 text-purple-400" />
                    <h3 className="font-bold text-white font-orbitron text-lg">{event.name}</h3>
                  </div>
                  <span className={`px-2 py-1 bg-opacity-20 text-xs font-bold rounded-full border border-opacity-30 ${
                    eventStatus.status === 'active' ? 'bg-green-500 text-green-400 border-green-400' :
                    eventStatus.status === 'upcoming' ? 'bg-blue-500 text-blue-400 border-blue-400' :
                    'bg-gray-500 text-gray-400 border-gray-400'
                  }`}>
                    {eventStatus.label}
                  </span>
                </div>

                {/* Event Description */}
                {event.description && (
                  <p className="text-sm text-gray-400 mb-4 relative z-10">
                    {event.description}
                  </p>
                )}

                {/* Event Stats */}
                <div className="grid grid-cols-2 gap-4 mb-4 relative z-10">
                  <div className="text-center p-3 glass-panel-light rounded-lg">
                    <Users className="w-4 h-4 text-green-400 mx-auto mb-1" />
                    <div className="text-lg font-bold text-green-400 font-orbitron">{event.teamCount}</div>
                    <div className="text-xs text-gray-400">Teams</div>
                  </div>
                  <div className="text-center p-3 glass-panel-light rounded-lg">
                    <Target className="w-4 h-4 text-blue-400 mx-auto mb-1" />
                    <div className="text-lg font-bold text-blue-400 font-orbitron">{event.totalPlayers}</div>
                    <div className="text-xs text-gray-400">Players</div>
                  </div>
                </div>

                {/* Event Configuration */}
                <div className="space-y-2 mb-4 relative z-10">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Team Size:</span>
                    <span className="text-purple-400 font-bold">{event.team_size} players</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Max Teams:</span>
                    <span className="text-yellow-400 font-bold">{event.max_teams}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Server Limit:</span>
                    <span className="text-cyan-400 font-bold">{event.max_per_server} per server</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Alliances:</span>
                    <span className="text-pink-400 font-bold">{event.participatingAlliances}</span>
                  </div>
                </div>

                {/* Event Dates */}
                <div className="border-t border-gray-700 pt-4 relative z-10">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-blue-400" />
                      <span className="text-gray-400">
                        {new Date(event.start_date).toLocaleDateString()} - {new Date(event.end_date).toLocaleDateString()}
                      </span>
                    </div>
                    {daysRemaining > 0 && (
                      <span className={`text-xs font-bold ${eventStatus.color}`}>
                        {daysRemaining} days {eventStatus.status === 'upcoming' ? 'until start' : 'remaining'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Enter Event Arrow */}
                <div className="flex items-center justify-center mt-4 pt-4 border-t border-gray-700 relative z-10">
                  <motion.div
                    whileHover={{ x: 5 }}
                    className="flex items-center space-x-2 text-purple-400 font-bold font-orbitron"
                  >
                    <span>ENTER EVENT</span>
                    <ArrowRight className="w-5 h-5" />
                  </motion.div>
                </div>
              </motion.button>
            );
          })}
        </motion.div>
      ) : (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-12"
        >
          <Trophy className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-300 font-orbitron mb-2">
            NO EVENTS AVAILABLE
          </h3>
          <p className="text-gray-400">
            No fantasy events have been created yet
          </p>
        </motion.div>
      )}

      {/* Global Stats */}
      {events.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-panel rounded-2xl p-4 sm:p-6 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-blue-500/5"></div>
          <div className="flex items-center mb-4 sm:mb-6 relative z-10">
            <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-400 mr-2 sm:mr-3" />
            <h3 className="text-lg sm:text-xl font-black text-cyan-400 font-orbitron">
              FANTASY LEAGUE STATISTICS
            </h3>
          </div>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 relative z-10">
            <div className="text-center p-4 glass-panel-light rounded-xl neon-border">
              <Trophy className="w-5 h-5 text-yellow-400 mx-auto mb-2" />
              <div className="text-sm text-yellow-400 font-bold font-orbitron mb-1">TOTAL EVENTS</div>
              <div className="text-xl sm:text-2xl font-black text-white font-orbitron">{events.length}</div>
            </div>
            
            <div className="text-center p-4 glass-panel-light rounded-xl neon-border">
              <Users className="w-5 h-5 text-green-400 mx-auto mb-2" />
              <div className="text-sm text-green-400 font-bold font-orbitron mb-1">TOTAL TEAMS</div>
              <div className="text-xl sm:text-2xl font-black text-white font-orbitron">
                {events.reduce((sum, e) => sum + e.teamCount, 0)}
              </div>
            </div>
            
            <div className="text-center p-4 glass-panel-light rounded-xl neon-border">
              <Target className="w-5 h-5 text-blue-400 mx-auto mb-2" />
              <div className="text-sm text-blue-400 font-bold font-orbitron mb-1">TOTAL PLAYERS</div>
              <div className="text-xl sm:text-2xl font-black text-white font-orbitron">
                {events.reduce((sum, e) => sum + e.totalPlayers, 0)}
              </div>
            </div>
            
            <div className="text-center p-4 glass-panel-light rounded-xl neon-border">
              <Shield className="w-5 h-5 text-purple-400 mx-auto mb-2" />
              <div className="text-sm text-purple-400 font-bold font-orbitron mb-1">ACTIVE EVENTS</div>
              <div className="text-xl sm:text-2xl font-black text-white font-orbitron">
                {events.filter(e => e.is_active).length}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}