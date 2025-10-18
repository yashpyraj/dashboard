import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { PinForm } from './PinForm';
import { LoadingSpinner } from '../UI/LoadingSpinner';
import { AlertCircle } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { loading, isAdmin, user } = useAuth();

  console.log('ProtectedRoute state:', { loading, isAdmin, requireAdmin });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mx-auto mb-4" />
          <p className="text-gray-300">Authenticating...</p>
        </div>
      </div>
    );
  }

  if (requireAdmin && !isAdmin) {
    return <PinForm />;
  }

  return <>{children}</>;
}