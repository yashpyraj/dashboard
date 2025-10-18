import React, { useState } from 'react';
import { Shield, Lock, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { LoadingSpinner } from '../UI/LoadingSpinner';

export function PinForm() {
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const { signInWithPin } = useAuth();

  const maxAttempts = 3;
  const isBlocked = attempts >= maxAttempts;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isBlocked) {
      setError('Too many failed attempts. Please refresh the page and try again.');
      return;
    }
    
    if (!pin.trim()) {
      setError('Please enter a PIN');
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      const { error } = await signInWithPin(pin.trim());
      
      if (error) {
        setAttempts(prev => prev + 1);
        setError(error.message);
        setPin(''); // Clear PIN on error
        
        if (attempts + 1 >= maxAttempts) {
          setError('Maximum attempts exceeded. Access blocked.');
        }
      }
      // If successful, the ProtectedRoute will automatically re-render
    } catch (err) {
      setAttempts(prev => prev + 1);
      setError('Authentication failed. Please try again.');
      setPin('');
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Security Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M30 30c0-11.046-8.954-20-20-20s-20 8.954-20 20 8.954 20 20 20 20-8.954 20-20zm0 0c0 11.046 8.954 20 20 20s20-8.954 20-20-8.954-20-20-20-20 8.954-20 20z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>
      
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center">
            <div className="p-4 bg-gradient-to-br from-red-900 to-orange-900 rounded-full border-2 border-red-500/30 shadow-lg shadow-red-500/20">
              <Shield className="w-10 h-10 text-red-400" />
            </div>
          </div>
          <h2 className="mt-6 text-3xl font-bold text-red-400 font-orbitron">
            SECURE ACCESS
          </h2>
          <p className="mt-2 text-sm text-orange-400 font-medium">
            Enter authorization PIN to access admin panel
          </p>
          {attempts > 0 && (
            <p className="mt-2 text-xs text-yellow-400">
              Attempts: {attempts}/{maxAttempts}
            </p>
          )}
        </div>

        <form className="mt-8 space-y-6 glass-panel rounded-2xl p-8 neon-border" onSubmit={handleSubmit}>
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-orange-500/5 rounded-2xl" />
          
          {error && (
            <div className="bg-red-900/30 border border-red-500 rounded-lg p-4 flex items-center relative z-10">
              <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
              <span className="text-sm text-red-300 font-medium">{error}</span>
            </div>
          )}

          <div className="relative z-10">
            <label htmlFor="pin" className="block text-sm font-bold text-red-400 mb-2 font-orbitron">
              AUTHORIZATION PIN
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-red-500 w-5 h-5" />
              <input
                id="pin"
                name="pin"
                type={showPin ? "text" : "password"}
                required
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                disabled={isBlocked}
                className="pl-12 pr-12 w-full px-4 py-3 bg-gray-800/80 border border-red-500/30 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 text-center text-lg tracking-widest text-gray-100 font-orbitron disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-sm"
                placeholder="••••••••"
                maxLength={20}
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-red-400 transition-colors"
                disabled={isBlocked}
              >
                {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !pin || isBlocked}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-lg text-sm font-bold text-white bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed font-orbitron transition-all duration-300 relative z-10"
          >
            {loading ? (
              <LoadingSpinner size="sm" className="mr-2" />
            ) : null}
            {loading ? 'VERIFYING...' : isBlocked ? 'ACCESS BLOCKED' : 'AUTHORIZE ACCESS'}
          </button>
          
          <div className="text-center text-xs text-gray-500 relative z-10">
            <p>Unauthorized access is prohibited</p>
            <p className="mt-1">All attempts are logged and monitored</p>
          </div>
        </form>
      </div>
    </div>
  );
}