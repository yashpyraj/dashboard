import React from 'react';
import { Calendar, Clock, CheckCircle, AlertCircle, TrendingUp, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { AllianceDetail } from '../../types';

interface SeasonProgressProps {
  alliance: AllianceDetail;
}

export function SeasonProgress({ alliance }: SeasonProgressProps) {
  // Calculate season progress
  const calculateSeasonProgress = () => {
    if (!alliance.season_start_date || !alliance.season_end_date) {
      return { progress: 0, status: 'no-season', daysElapsed: 0, totalDays: 0, daysRemaining: 0 };
    }

    const startDate = new Date(alliance.season_start_date);
    const endDate = new Date(alliance.season_end_date);
    const currentDate = new Date();

    const totalDuration = endDate.getTime() - startDate.getTime();
    const totalDays = Math.ceil(totalDuration / (1000 * 60 * 60 * 24));

    if (currentDate < startDate) {
      // Season hasn't started yet
      const daysUntilStart = Math.ceil((startDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
      return { 
        progress: 0, 
        status: 'upcoming', 
        daysElapsed: 0, 
        totalDays, 
        daysRemaining: daysUntilStart,
        daysUntilStart 
      };
    } else if (currentDate > endDate) {
      // Season has ended
      return { 
        progress: 100, 
        status: 'completed', 
        daysElapsed: totalDays, 
        totalDays, 
        daysRemaining: 0 
      };
    } else {
      // Season is active
      const elapsed = currentDate.getTime() - startDate.getTime();
      const progress = Math.round((elapsed / totalDuration) * 100);
      const daysElapsed = Math.ceil(elapsed / (1000 * 60 * 60 * 24));
      const daysRemaining = totalDays - daysElapsed;
      
      return { 
        progress, 
        status: 'active', 
        daysElapsed, 
        totalDays, 
        daysRemaining 
      };
    }
  };

  const seasonInfo = calculateSeasonProgress();

  // Helper function to check if there's an upcoming season
  const hasUpcomingSeason = () => {
    // This would need to be passed as a prop or fetched
    // For now, assume no upcoming season if current is completed
    return false;
  };

  const getStatusConfig = () => {
    // Check if we're between seasons (HK status)
    if (seasonInfo.status === 'no-season' || 
        (seasonInfo.status === 'completed' && !hasUpcomingSeason())) {
      return {
        color: 'orange',
        bgColor: 'bg-orange-500/20',
        borderColor: 'border-orange-400',
        textColor: 'text-orange-400',
        icon: AlertCircle,
        label: 'HOME KINGDOM',
        description: 'Between seasons - preparing for next war'
      };
    }

    switch (seasonInfo.status) {
      case 'active':
        return {
          color: 'green',
          bgColor: 'bg-green-500/20',
          borderColor: 'border-green-400',
          textColor: 'text-green-400',
          icon: Clock,
          label: 'ACTIVE SEASON',
          description: 'Season in progress'
        };
      case 'completed':
        return {
          color: 'blue',
          bgColor: 'bg-blue-500/20',
          borderColor: 'border-blue-400',
          textColor: 'text-blue-400',
          icon: CheckCircle,
          label: 'COMPLETED SEASON',
          description: 'Season finished'
        };
      case 'upcoming':
        return {
          color: 'gray',
          bgColor: 'bg-gray-500/20',
          borderColor: 'border-gray-400',
          textColor: 'text-gray-400',
          icon: AlertCircle,
          label: 'UPCOMING SEASON',
          description: 'Season not started'
        };
      default:
        return {
          color: 'gray',
          bgColor: 'bg-gray-500/20',
          borderColor: 'border-gray-400',
          textColor: 'text-gray-400',
          icon: Calendar,
          label: 'NO SEASON DATA',
          description: 'Season dates not configured'
        };
    }
  };

  const statusConfig = getStatusConfig();
  const StatusIcon = statusConfig.icon;

  // Always show the component, but with different status
  if (seasonInfo.status === 'no-season' && !hasUpcomingSeason()) {
    // Show HK status when no season data and no upcoming season
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel rounded-xl neon-border p-6 mb-6 relative overflow-hidden bg-orange-500/20 border-orange-400"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-yellow-500/10"></div>
        
        <div className="flex items-center justify-between mb-6 relative z-10">
          <div className="flex items-center space-x-3">
            <motion.div 
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="p-3 glass-panel-light rounded-xl neon-border border-orange-400"
            >
              <AlertCircle className="w-6 h-6 text-orange-400" />
            </motion.div>
            <div>
              <h3 className="text-lg font-bold font-orbitron text-orange-400">
                HOME KINGDOM STATUS
              </h3>
              <p className="text-sm text-gray-400">Alliance is between seasons - preparing for next war</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
          <div className="text-center p-4 glass-panel-light rounded-xl neon-border">
            <AlertCircle className="w-5 h-5 text-orange-400 mx-auto mb-2" />
            <div className="text-sm text-orange-400 font-bold font-orbitron mb-1">STATUS</div>
            <div className="text-xs text-gray-300">Awaiting next season</div>
          </div>

          <div className="text-center p-4 glass-panel-light rounded-xl neon-border">
            <Calendar className="w-5 h-5 text-purple-400 mx-auto mb-2" />
            <div className="text-sm text-purple-400 font-bold font-orbitron mb-1">LAST ACTIVITY</div>
            <div className="text-xs text-gray-300">
              {alliance.lastScanDate ? new Date(alliance.lastScanDate).toLocaleDateString() : 'Unknown'}
            </div>
          </div>

          <div className="text-center p-4 glass-panel-light rounded-xl neon-border">
            <Users className="w-5 h-5 text-cyan-400 mx-auto mb-2" />
            <div className="text-sm text-cyan-400 font-bold font-orbitron mb-1">MEMBERS</div>
            <div className="text-xs text-gray-300">{alliance.memberCount} operatives</div>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`glass-panel rounded-xl neon-border p-6 mb-6 relative overflow-hidden ${statusConfig.bgColor} ${statusConfig.borderColor}`}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5"></div>
      
      {/* Header */}
      <div className="flex items-center justify-between mb-6 relative z-10">
        <div className="flex items-center space-x-3">
          <motion.div 
            animate={{ rotate: seasonInfo.status === 'active' ? [0, 5, -5, 0] : 0 }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className={`p-3 glass-panel-light rounded-xl neon-border ${statusConfig.borderColor}`}
          >
            <StatusIcon className={`w-6 h-6 ${statusConfig.textColor}`} />
          </motion.div>
          <div>
            <h3 className={`text-lg font-bold font-orbitron ${statusConfig.textColor}`}>
              {statusConfig.label}
            </h3>
            <p className="text-sm text-gray-400">{statusConfig.description}</p>
          </div>
        </div>
        
        {alliance.season_name && (
          <div className="text-right">
            <div className={`text-lg font-bold font-orbitron ${statusConfig.textColor}`}>
              {alliance.season_name}
            </div>
            {alliance.generation && (
              <div className="text-sm text-gray-400">
                Generation {alliance.generation}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="mb-6 relative z-10">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-bold text-gray-300 font-orbitron">SEASON PROGRESS</span>
          <span className={`text-sm font-bold font-orbitron ${statusConfig.textColor}`}>
            {seasonInfo.progress}%
          </span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${seasonInfo.progress}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className={`h-full rounded-full ${
              seasonInfo.status === 'active' ? 'bg-gradient-to-r from-green-500 to-green-400' :
              seasonInfo.status === 'completed' ? 'bg-gradient-to-r from-blue-500 to-blue-400' :
              'bg-gradient-to-r from-gray-500 to-gray-400'
            }`}
            style={{
              boxShadow: `0 0 10px ${
                seasonInfo.status === 'active' ? 'rgba(34, 197, 94, 0.5)' :
                seasonInfo.status === 'completed' ? 'rgba(59, 130, 246, 0.5)' :
                'rgba(107, 114, 128, 0.5)'
              }`
            }}
          />
        </div>
      </div>

      {/* Season Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
        <div className="text-center p-4 glass-panel-light rounded-xl neon-border">
          <Calendar className="w-5 h-5 text-purple-400 mx-auto mb-2" />
          <div className="text-sm text-purple-400 font-bold font-orbitron mb-1">SEASON DATES</div>
          <div className="text-xs text-gray-300">
            {alliance.season_start_date && alliance.season_end_date ? (
              <>
                {new Date(alliance.season_start_date).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric' 
                })} - {new Date(alliance.season_end_date).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric' 
                })}
              </>
            ) : (
              'Not configured'
            )}
          </div>
        </div>

        <div className="text-center p-4 glass-panel-light rounded-xl neon-border">
          <TrendingUp className="w-5 h-5 text-cyan-400 mx-auto mb-2" />
          <div className="text-sm text-cyan-400 font-bold font-orbitron mb-1">DAYS ELAPSED</div>
          <div className="text-lg font-black text-white font-orbitron">
            {seasonInfo.daysElapsed}
          </div>
          <div className="text-xs text-gray-400">of {seasonInfo.totalDays} total</div>
        </div>

        <div className="text-center p-4 glass-panel-light rounded-xl neon-border">
          <Clock className="w-5 h-5 text-yellow-400 mx-auto mb-2" />
          <div className="text-sm text-yellow-400 font-bold font-orbitron mb-1">
            {seasonInfo.status === 'upcoming' ? 'DAYS UNTIL START' : 'DAYS REMAINING'}
          </div>
          <div className="text-lg font-black text-white font-orbitron">
            {seasonInfo.status === 'upcoming' ? seasonInfo.daysUntilStart : seasonInfo.daysRemaining}
          </div>
          <div className="text-xs text-gray-400">
            {seasonInfo.status === 'completed' ? 'Season ended' : 
             seasonInfo.status === 'upcoming' ? 'Until season starts' : 'Until season ends'}
          </div>
        </div>
      </div>
    </motion.div>
  );
}