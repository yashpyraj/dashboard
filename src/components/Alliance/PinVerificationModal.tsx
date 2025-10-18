import React, { useState } from 'react';
import { Lock, Eye, EyeOff, X, Shield, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { LoadingSpinner } from '../UI/LoadingSpinner';

interface PinVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  allianceTag: string;
  allianceName: string;
  pinHint?: string | null;
}

export function PinVerificationModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  allianceTag, 
  allianceName,
  pinHint 
}: PinVerificationModalProps) {
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);

  const maxAttempts = 3;
  const isBlocked = attempts >= maxAttempts;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isBlocked) {
      setError('Too many failed attempts. Please refresh and try again.');
      return;
    }
    
    if (!pin.trim()) {
      setError('Please enter the access PIN');
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      // Simulate PIN verification delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // For now, we'll use a simple client-side check
      // In production, this should be verified server-side
      const { supabase } = await import('../../lib/supabase');
      
      const { data: alliance, error: allianceError } = await supabase
        .from('alliances')
        .select('access_pin')
        .eq('tag', allianceTag)
        .single();

      if (allianceError || !alliance) {
        throw new Error('Alliance not found');
      }

      if (alliance.access_pin === pin.trim()) {
        // Store successful verification in session storage
        sessionStorage.setItem(`alliance_access_${allianceTag}`, 'verified');
        onSuccess();
        handleClose();
      } else {
        setAttempts(prev => prev + 1);
        setError('Invalid PIN. Access denied.');
        setPin('');
        
        if (attempts + 1 >= maxAttempts) {
          setError('Maximum attempts exceeded. Access blocked.');
        }
      }
      
    } catch (err) {
      setAttempts(prev => prev + 1);
      setError('Verification failed. Please try again.');
      setPin('');
    }
    
    setLoading(false);
  };

  const handleClose = () => {
    setPin('');
    setError(null);
    setAttempts(0);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[9999] flex items-center justify-center p-4"
        onClick={handleClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="glass-panel rounded-2xl neon-border p-8 max-w-md w-full relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 via-orange-500/10 to-yellow-500/10"></div>
          
          {/* Header */}
          <div className="flex items-center justify-between mb-6 relative z-10">
            <div className="flex items-center space-x-3">
              <div className="p-3 glass-panel-light rounded-xl neon-border border-red-400">
                <Shield className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h2 className="text-xl font-black text-red-400 font-orbitron">
                  RESTRICTED ACCESS
                </h2>
                <p className="text-sm text-orange-400">
                  Alliance [{allianceTag}] requires authorization
                </p>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleClose}
              className="p-2 glass-panel-light rounded-lg neon-border hover:neon-glow transition-all duration-300"
            >
              <X className="w-5 h-5 text-pink-400" />
            </motion.button>
          </div>

          {/* Alliance Info */}
          <div className="glass-panel-light rounded-xl p-4 neon-border mb-6 relative z-10">
            <div className="text-center">
              <h3 className="text-lg font-bold text-white font-orbitron mb-1">
                [{allianceTag}]
              </h3>
              <p className="text-sm text-gray-400">{allianceName}</p>
              <div className="mt-2 px-3 py-1 bg-red-500/20 text-red-400 text-xs font-bold rounded-full border border-red-400/30 inline-block">
                🔒 PIN PROTECTED
              </div>
            </div>
          </div>

          {/* PIN Form */}
          <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-900/30 border border-red-500 rounded-lg p-4 flex items-center"
              >
                <AlertCircle className="w-5 h-5 text-red-500 mr-2 flex-shrink-0" />
                <span className="text-sm text-red-300 font-medium">{error}</span>
              </motion.div>
            )}

            {pinHint && (
              <div className="glass-panel-light rounded-lg p-4 neon-border border-yellow-400 bg-yellow-500/10">
                <div className="flex items-center space-x-2 mb-2">
                  <AlertCircle className="w-4 h-4 text-yellow-400" />
                  <span className="text-sm font-bold text-yellow-400 font-orbitron">HINT</span>
                </div>
                <p className="text-sm text-yellow-300 italic">"{pinHint}"</p>
              </div>
            )}

            <div>
              <label htmlFor="access-pin" className="block text-sm font-bold text-red-400 mb-2 font-orbitron">
                ACCESS PIN
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-red-500 w-5 h-5" />
                <input
                  id="access-pin"
                  name="access-pin"
                  type={showPin ? "text" : "password"}
                  required
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  disabled={isBlocked || loading}
                  className="pl-12 pr-12 w-full px-4 py-3 bg-gray-800/80 border border-red-500/30 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 text-center text-lg tracking-widest text-gray-100 font-orbitron disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-sm"
                  placeholder="••••••••"
                  maxLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  disabled={isBlocked || loading}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-red-400 transition-colors disabled:opacity-50"
                >
                  {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {attempts > 0 && (
                <p className="text-xs text-yellow-400 mt-2">
                  Attempts: {attempts}/{maxAttempts}
                </p>
              )}
            </div>

            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={loading || !pin || isBlocked}
                className="flex-1 flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-lg text-sm font-bold text-white bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed font-orbitron transition-all duration-300"
              >
                {loading ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    VERIFYING...
                  </>
                ) : isBlocked ? (
                  'ACCESS BLOCKED'
                ) : (
                  'AUTHORIZE ACCESS'
                )}
              </button>
              
              <motion.button
                type="button"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleClose}
                className="px-6 py-3 bg-gray-600/80 hover:bg-gray-600 text-white rounded-xl font-bold transition-colors font-orbitron"
              >
                CANCEL
              </motion.button>
            </div>
          </form>
          
          <div className="text-center text-xs text-gray-500 mt-6 relative z-10">
            <p>🔒 This alliance is protected by the alliance leadership</p>
            <p className="mt-1">Contact alliance administrators for access</p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}