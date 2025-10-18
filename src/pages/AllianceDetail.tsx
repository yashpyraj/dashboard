import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Shield, Users, Calendar, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAllianceStore } from '../store/allianceStore';
import { fetchAllianceDetail } from '../utils/queries';
import { LoadingSpinner } from '../components/UI/LoadingSpinner';
import { ErrorMessage } from '../components/UI/ErrorMessage';
import { Overview } from '../components/Alliance/Overview';
import { Leaderboard } from '../components/Alliance/Leaderboard';
import { Progress } from '../components/Alliance/Progress';
import { Analytics } from '../components/Alliance/Analytics';

const tabs = [
  { id: 'overview', name: 'Overview', icon: TrendingUp },
  { id: 'leaderboard', name: 'Leaderboard', icon: Users },
  { id: 'analytics', name: 'Analytics', icon: TrendingUp },
  { id: 'progress', name: 'Progress', icon: TrendingUp },
];

export function AllianceDetail() {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState('overview');
  
  const {
    allianceDetails,
    isLoadingDetail,
    error,
    setAllianceDetail,
    setLoadingDetail,
    setError,
    getSelectedAlliance,
  } = useAllianceStore();

  const alliance = id ? allianceDetails[id] : null;

  const loadAllianceDetail = async () => {
    if (!id) return;
    
    try {
      setLoadingDetail(true);
      setError(null);
      const detail = await fetchAllianceDetail(id);
      setAllianceDetail(id, detail);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load alliance details');
    } finally {
      setLoadingDetail(false);
    }
  };

  useEffect(() => {
    if (id && !alliance) {
      loadAllianceDetail();
    }
  }, [id]);

  if (isLoadingDetail) {
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
            <Shield className="w-8 h-8 glow-blue" />
          </motion.div>
          <p className="glow-cyan font-orbitron">ACCESSING ALLIANCE DATA...</p>
        </div>
      </motion.div>
    );
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={loadAllianceDetail} />;
  }

  if (!alliance) {
    return <ErrorMessage message="Alliance not found" />;
  }

  const formatNumber = (num: number) => {
    if (num >= 1e9) return `${(num / 1e9).toFixed(1)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="p-3 sm:p-4 md:p-6 relative overflow-hidden"
    >
      {/* Background Character */}
      <div className="absolute right-0 bottom-0 opacity-35 pointer-events-none">
        <img
          src="/girlbg.png"
          alt="Background Character"
          className="w-64 sm:w-80 md:w-96 h-auto transform rotate-12"
        />
      </div>
      
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, duration: 0.6 }}
        className="card-panel rounded-2xl p-4 sm:p-6 md:p-8 mb-4 sm:mb-6 relative z-10"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
          <div className="flex items-center space-x-3 sm:space-x-4">
            <motion.div 
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="p-2 sm:p-3 md:p-4 card-panel rounded-2xl orange-border orange-glow"
            >
              <Shield className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 text-orange-500" />
            </motion.div>
            <div>
              <motion.h1 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4, duration: 0.6 }}
                className="text-xl sm:text-2xl md:text-3xl font-black text-white font-orbitron"
              >
                <span className="text-orange-500">[{alliance.tag}]</span>
                {alliance.generation && (
                  <span className="ml-2 sm:ml-3 px-2 sm:px-3 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm sm:text-base md:text-lg font-bold rounded-full">
                    {alliance.generation}
                  </span>
                )}
              </motion.h1>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.6 }}
                className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-4 md:space-x-6 mt-2 sm:mt-3 text-xs sm:text-sm"
              >
                <div className="flex items-center secondary-text">
                  <Users className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  <span className="font-medium">{alliance.memberCount} OPERATIVES</span>
                </div>
                <div className="flex items-center secondary-text">
                  <Calendar className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  <span className="font-medium">LAST INTEL: {alliance.lastScanDate || 'UNKNOWN'}</span>
                </div>
                {alliance.season_start_date && alliance.season_end_date && (
                  <div className="flex items-center text-purple-500">
                    <Calendar className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    <span className="font-medium">
                      SEASON: {new Date(alliance.season_start_date).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric' 
                      })} - {new Date(alliance.season_end_date).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric' 
                      })} ({alliance.seasonDuration} days)
                    </span>
                  </div>
                )}
                <div className="flex items-center text-orange-500">
                  <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  <span className="font-medium">POWER: {formatNumber(alliance.totalPower)}</span>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.6 }}
        className="card-panel rounded-2xl"
      >
        <div className="border-b border-gray-700">
          <nav className="flex space-x-2 sm:space-x-4 md:space-x-8 px-3 sm:px-4 md:px-6 overflow-x-auto">
            {tabs.map((tab) => (
              <motion.button
                key={tab.id}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-1 sm:space-x-2 py-3 sm:py-4 px-2 sm:px-3 border-b-2 font-bold text-xs sm:text-sm transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-orange-500 font-orbitron whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-orange-500 text-orange-500'
                    : 'border-transparent text-gray-300 hover:text-orange-500 hover:border-orange-500/50'
                }`}
              >
                <tab.icon className={`w-3 h-3 sm:w-4 sm:h-4 ${activeTab === tab.id ? 'text-orange-500' : 'text-gray-300'}`} />
                <span>{tab.name.toUpperCase()}</span>
              </motion.button>
            ))}
          </nav>
        </div>

        <div className="p-3 sm:p-4 md:p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {activeTab === 'overview' && <Overview alliance={alliance} />}
              {activeTab === 'leaderboard' && <Leaderboard alliance={alliance} />}
              {activeTab === 'analytics' && <Analytics alliance={alliance} />}
              {activeTab === 'progress' && <Progress alliance={alliance} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}