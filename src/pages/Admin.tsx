// src/pages/Admin.tsx
import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  Download,
  Trash2,
  Settings,
  Users,
  Calendar,
  Database,
  Lock,
  Eye,
  EyeOff,
  Shield,
  RefreshCw,
  Save,
  Plus,
  Trophy,
  X,
  Search,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { LoadingSpinner } from '../components/UI/LoadingSpinner';
import { ErrorMessage } from '../components/UI/ErrorMessage';
import { DataTable, Column } from '../components/UI/DataTable';
import { useAuth } from '../hooks/useAuth';
import { PlayerDiagnostic } from '../components/Alliance/PlayerDiagnostic';

/* ---------- Types ---------- */
interface ScanRecord {
  id: string;
  alliance_id: string;
  alliance_tag: string;
  alliance_name: string;
  alliance_generation: string;
  scan_date: string;
  source_filename: string;
  file_sha256: string;
  row_count: number;
  created_at: string;
}

interface UploadProgress {
  uploading: boolean;
  processing: boolean;
  progress: number;
  message: string;
}

interface Generation {
  generation: string;
  season_start_date: string | null;
  season_end_date: string | null;
  season_name: string | null;
}

interface NewSeasonForm {
  generation: string;
  seasonName: string;
  startDate: string;
  endDate: string;
}

interface AllianceLimit {
  id: string;
  tag: string;
  name: string;
  player_limit: number;
  custom_limit_enabled: boolean;
  is_pin_protected: boolean;
  access_pin: string | null;
  pin_hint: string | null;
}

interface DiagnosticResult {
  playerExists: boolean;
  playerData?: any;
  hasStats: boolean;
  statsData?: any[];
  latestScan?: any;
  allScans?: any[];
  inCorrectAlliance: boolean;
  possibleIssues: string[];
}

interface FantasyEvent {
  id: string;
  name: string;
  description?: string;
  start_date: string;
  end_date: string;
  team_size: number;
  max_per_server: number;
  max_teams: number;
  is_active?: boolean;
  created_at?: string;
}

/* ---------- Component ---------- */
export function Admin() {
  const { signOut } = useAuth();

  // Core data
  const [scans, setScans] = useState<ScanRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Generations
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [editingGeneration, setEditingGeneration] = useState<string | null>(null);
  const [tempSeasonDates, setTempSeasonDates] = useState({ start: '', end: '' });
  const [tempSeasonName, setTempSeasonName] = useState('');

  // Upload
  const [selectedGeneration, setSelectedGeneration] = useState('G2');
  const [showNewSeasonForm, setShowNewSeasonForm] = useState(false);
  const [newSeasonForm, setNewSeasonForm] = useState<NewSeasonForm>({
    generation: 'G3',
    seasonName: '',
    startDate: '',
    endDate: '',
  });

  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
    uploading: false,
    processing: false,
    progress: 0,
    message: '',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Alliances & diagnostics
  const [availableAlliances, setAvailableAlliances] = useState<Array<{ id: string; tag: string; name: string }>>([]);
  const [selectedAllianceForDiagnostic, setSelectedAllianceForDiagnostic] = useState<string>('');

  // Alliance limits & pins
  const [allianceLimits, setAllianceLimits] = useState<AllianceLimit[]>([]);
  const [editingLimit, setEditingLimit] = useState<string | null>(null);
  const [tempLimit, setTempLimit] = useState<number>(210);
  const [editingPin, setEditingPin] = useState<string | null>(null);
  const [tempPin, setTempPin] = useState<string>('');
  const [tempPinHint, setTempPinHint] = useState<string>('');
  const [tempPinEnabled, setTempPinEnabled] = useState<boolean>(false);

  // Fantasy events
  const [fantasyEvents, setFantasyEvents] = useState<FantasyEvent[]>([]);
  const [showCreateEventForm, setShowCreateEventForm] = useState(false);
  const [newEventForm, setNewEventForm] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    teamSize: 6,
    maxPerServer: 2,
    maxTeams: 50,
  });

  // Event alliances
  const [selectedEventForAlliances, setSelectedEventForAlliances] = useState<string>('');
  const [eventAlliances, setEventAlliances] = useState<any[]>([]);
  const [availableAlliancesForEvent, setAvailableAlliancesForEvent] = useState<any[]>([]);

  // Missing states that were referenced in your JSX
  const [events, setEvents] = useState<FantasyEvent[]>([]); // keep in sync with fantasyEvents if needed
  const [selectedEventForTeams, setSelectedEventForTeams] = useState<string>('');
  const [eventTeams, setEventTeams] = useState<any[]>([]);
  const [loadingTeams, setLoadingTeams] = useState<boolean>(false);

  // Refs for the Add Alliance to Event form (avoid direct DOM access)
  const allianceSelectRef = useRef<HTMLSelectElement | null>(null);
  const serverInputRef = useRef<HTMLInputElement | null>(null);

  // Security: Log admin access (dev only)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('Admin panel accessed at:', new Date().toISOString());
    }
  }, []);

  /* ---------- Loaders ---------- */
  const loadAvailableAlliances = async () => {
    try {
      const { data, error } = await supabase.from('alliances').select('id, tag, name').order('tag');
      if (error) throw error;
      setAvailableAlliances(data || []);
    } catch (err) {
      console.error('Failed to load alliances for diagnostic:', err);
    }
  };

  const loadScans = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('scans')
        .select(`
          id,
          alliance_id,
          scan_date,
          source_filename,
          file_sha256,
          created_at,
          alliances!inner(tag, name, generation)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const transformedData = (data || []).map((scan: any) => ({
        ...scan,
        alliance_tag: (scan.alliances as any).tag,
        alliance_name: (scan.alliances as any).name,
        alliance_generation: (scan.alliances as any).generation,
        row_count: 0,
      }));

      setScans(transformedData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load scans');
    } finally {
      setLoading(false);
    }
  };

  const loadGenerations = async () => {
    try {
      const { data, error } = await supabase
        .from('alliances')
        .select('generation, season_start_date, season_end_date, season_name')
        .order('generation');

      if (error) throw error;

      const generationMap = new Map<string, Generation>();
      (data || []).forEach((alliance: any) => {
        if (!generationMap.has(alliance.generation)) {
          generationMap.set(alliance.generation, {
            generation: alliance.generation,
            season_start_date: alliance.season_start_date,
            season_end_date: alliance.season_end_date,
            season_name: alliance.season_name,
          });
        }
      });

      setGenerations(Array.from(generationMap.values()));
    } catch (err) {
      console.error('Failed to load generations:', err);
    }
  };

  const loadAllianceLimits = async () => {
    try {
      const { data, error } = await supabase
        .from('alliances')
        .select('id, tag, name, player_limit, custom_limit_enabled, is_pin_protected, access_pin, pin_hint')
        .order('tag');

      if (error) throw error;
      setAllianceLimits(data || []);
    } catch (err) {
      console.error('Failed to load alliance limits:', err);
    }
  };

  const loadFantasyEvents = async () => {
    try {
      const { data, error } = await supabase.from('fantasy_events').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      const eventsData = (data || []) as FantasyEvent[];
      setFantasyEvents(eventsData);
      setEvents(eventsData); // keep events in sync for other UI pieces that use `events`
    } catch (err) {
      console.error('Failed to load fantasy events:', err);
    }
  };

  const loadEventAlliances = async (eventId: string) => {
    try {
      const { data, error } = await supabase
        .from('fantasy_event_alliances')
        .select(`
          *,
          alliances(tag, name)
        `)
        .eq('event_id', eventId);

      if (error) throw error;
      setEventAlliances(data || []);
    } catch (err) {
      console.error('Failed to load event alliances:', err);
    }
  };

  const loadAvailableAlliancesForEvent = async () => {
    try {
      const { data, error } = await supabase.from('alliances').select('id, tag, name').order('tag');
      if (error) throw error;
      setAvailableAlliancesForEvent(data || []);
    } catch (err) {
      console.error('Failed to load available alliances:', err);
    }
  };

  useEffect(() => {
    loadScans();
    loadGenerations();
    loadAvailableAlliances();
    loadAllianceLimits();
    loadFantasyEvents();
    loadAvailableAlliancesForEvent();
  }, []);

  /* ---------- Alliance limits & pins ---------- */
  const updateAllianceLimit = async (allianceId: string, newLimit: number, enabled: boolean) => {
    try {
      const { error } = await supabase.from('alliances').update({ player_limit: newLimit, custom_limit_enabled: enabled }).eq('id', allianceId);
      if (error) throw error;
      await loadAllianceLimits();
      setEditingLimit(null);
      alert('Player limit updated successfully');
    } catch (err) {
      alert(`Failed to update player limit: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const startEditLimit = (allianceId: string, currentLimit: number) => {
    setEditingLimit(allianceId);
    setTempLimit(currentLimit);
  };

  const updateAlliancePin = async (allianceId: string, enabled: boolean, pin: string, hint: string) => {
    try {
      const { error } = await supabase
        .from('alliances')
        .update({
          is_pin_protected: enabled,
          access_pin: enabled ? pin : null,
          pin_hint: enabled ? hint : null,
        })
        .eq('id', allianceId);

      if (error) throw error;

      await loadAllianceLimits();
      setEditingPin(null);
      setTempPin('');
      setTempPinHint('');
      setTempPinEnabled(false);
      alert('PIN protection updated successfully');
    } catch (err) {
      alert(`Failed to update PIN protection: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const startEditPin = (allianceId: string, isProtected: boolean, currentPin: string | null, currentHint: string | null) => {
    setEditingPin(allianceId);
    setTempPinEnabled(isProtected);
    setTempPin(currentPin || '');
    setTempPinHint(currentHint || '');
  };

  /* ---------- Generation management ---------- */
  const startEditGeneration = (generation: string, startDate: string | null, endDate: string | null, seasonName: string | null) => {
    setEditingGeneration(generation);
    setTempSeasonDates({ start: startDate || '', end: endDate || '' });
    setTempSeasonName(seasonName || '');
  };

  const cancelEditGeneration = () => {
    setEditingGeneration(null);
    setTempSeasonDates({ start: '', end: '' });
    setTempSeasonName('');
  };

  const updateSeasonDates = async (generation: string, startDate: string, endDate: string, seasonName: string) => {
    try {
      const { error } = await supabase
        .from('alliances')
        .update({
          season_start_date: startDate || null,
          season_end_date: endDate || null,
          season_name: seasonName || null,
        })
        .eq('generation', generation);

      if (error) throw error;

      await loadGenerations();
      setEditingGeneration(null);
      setTempSeasonDates({ start: '', end: '' });
      setTempSeasonName('');
      alert('Season dates updated successfully');
    } catch (err) {
      alert(`Failed to update season data: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const createNewSeason = async () => {
    if (!newSeasonForm.generation || !newSeasonForm.seasonName || !newSeasonForm.startDate || !newSeasonForm.endDate) {
      alert('Please fill in all fields for the new season');
      return;
    }

    try {
      const { error } = await supabase.from('alliances').insert({
        tag: `${newSeasonForm.generation}-TEMPLATE`,
        name: `${newSeasonForm.generation} Template`,
        generation: newSeasonForm.generation,
        season_start_date: newSeasonForm.startDate,
        season_end_date: newSeasonForm.endDate,
        season_name: newSeasonForm.seasonName,
      });

      if (error) throw error;

      const { error: updateError } = await supabase
        .from('alliances')
        .update({
          season_start_date: newSeasonForm.startDate,
          season_end_date: newSeasonForm.endDate,
          season_name: newSeasonForm.seasonName,
        })
        .eq('generation', newSeasonForm.generation);

      if (updateError) throw updateError;

      await loadGenerations();
      setShowNewSeasonForm(false);
      setNewSeasonForm({
        generation: 'G3',
        seasonName: '',
        startDate: '',
        endDate: '',
      });
      alert('New season created successfully!');
    } catch (err) {
      alert(`Failed to create new season: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  /* ---------- Fantasy events ---------- */
  const createFantasyEvent = async () => {
    if (!newEventForm.name || !newEventForm.startDate || !newEventForm.endDate) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const { error } = await supabase.from('fantasy_events').insert({
        name: newEventForm.name,
        description: newEventForm.description,
        start_date: newEventForm.startDate,
        end_date: newEventForm.endDate,
        team_size: newEventForm.teamSize,
        max_per_server: newEventForm.maxPerServer,
        max_teams: newEventForm.maxTeams,
      });

      if (error) throw error;

      await loadFantasyEvents();
      setShowCreateEventForm(false);
      setNewEventForm({
        name: '',
        description: '',
        startDate: '',
        endDate: '',
        teamSize: 6,
        maxPerServer: 2,
        maxTeams: 50,
      });
      alert('Fantasy event created successfully!');
    } catch (err) {
      alert(`Failed to create event: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const addAllianceToEvent = async (allianceId: string, serverId: string) => {
    if (!selectedEventForAlliances) return;

    try {
      const { error } = await supabase.from('fantasy_event_alliances').insert({
        event_id: selectedEventForAlliances,
        alliance_id: allianceId,
        server_id: serverId,
      });

      if (error) throw error;

      await loadEventAlliances(selectedEventForAlliances);
      alert('Alliance added to event successfully!');
    } catch (err) {
      alert(`Failed to add alliance: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const removeAllianceFromEvent = async (eventAllianceId: string) => {
    try {
      const { error } = await supabase.from('fantasy_event_alliances').delete().eq('id', eventAllianceId);
      if (error) throw error;
      await loadEventAlliances(selectedEventForAlliances);
      alert('Alliance removed from event successfully!');
    } catch (err) {
      alert(`Failed to remove alliance: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  /* ---------- Upload CSV ---------- */
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (!file) {
      setSelectedFile(null);
      return;
    }

    // MIME type may be unreliable; check extension too
    const isCsvByType = file.type === 'text/csv';
    const isCsvByName = file.name.toLowerCase().endsWith('.csv');

    if (isCsvByType || isCsvByName) {
      setSelectedFile(file);
    } else {
      alert('Please select a CSV file (.csv)');
      setSelectedFile(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      setUploadProgress({
        uploading: true,
        processing: false,
        progress: 0,
        message: 'Uploading file...',
      });

      const fileContent = await selectedFile.text();

      setUploadProgress(prev => ({
        ...prev,
        progress: 50,
        message: 'Processing file...',
        processing: true,
      }));

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ingest-csv`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName: selectedFile.name,
          fileContent: fileContent,
          generation: selectedGeneration,
          seasonStartDate: selectedGeneration === 'G2' ? '2024-08-02' : null,
          seasonEndDate: selectedGeneration === 'G2' ? '2024-09-03' : null,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      setUploadProgress(prev => ({
        ...prev,
        progress: 100,
        message: result.message || 'Upload completed successfully!',
      }));

      await loadScans();
      await loadGenerations();
      setSelectedFile(null);

      setTimeout(() => {
        setUploadProgress({
          uploading: false,
          processing: false,
          progress: 0,
          message: '',
        });
      }, 2000);
    } catch (err) {
      console.error('Upload error:', err);
      setUploadProgress({
        uploading: false,
        processing: false,
        progress: 0,
        message: '',
      });
      const errorMessage = err instanceof Error ? err.message : 'Upload failed';
      setError(`Upload failed: ${errorMessage}`);
      alert(`Upload failed: ${errorMessage}`);
    }
  };

  /* ---------- Reprocess / delete ---------- */
  const handleReprocess = async (scan: ScanRecord) => {
    try {
      const { error } = await supabase.functions.invoke('ingest-csv', {
        body: { fileName: scan.source_filename, reprocess: true },
      });

      if (error) throw error;

      alert('Reprocessing started successfully');
      await loadScans();
    } catch (err) {
      alert(`Reprocessing failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleDelete = async (scan: ScanRecord) => {
    if (!confirm(`Are you sure you want to delete the scan for ${scan.alliance_tag} on ${scan.scan_date}? This action cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase.from('scans').delete().eq('id', scan.id);
      if (error) throw error;
      await loadScans();
      alert('Scan deleted successfully');
    } catch (err) {
      alert(`Delete failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleDeleteAlliance = async (allianceId: string, allianceTag: string) => {
    if (!confirm(`Are you sure you want to delete alliance [${allianceTag}] and ALL its data? This will delete all scans and player stats. This action cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase.from('alliances').delete().eq('id', allianceId);
      if (error) throw error;
      await loadScans();
      alert('Alliance and all related data deleted successfully');
    } catch (err) {
      alert(`Delete alliance failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  /* ---------- Teams for events ---------- */
  const loadTeamsForEvent = async (eventId: string) => {
    try {
      setLoadingTeams(true);
      const { data, error } = await supabase
        .from('fantasy_teams')
        .select(`
          *,
          fantasy_team_players(
            id,
            position,
            server_id,
            player:players(
              lord_id,
              current_name,
              faction
            )
          )
        `)
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEventTeams(data || []);
    } catch (err) {
      console.error('Error loading teams:', err);
      setEventTeams([]);
    } finally {
      setLoadingTeams(false);
    }
  };

  const handleDeleteTeam = async (teamId: string, teamName: string) => {
    if (!confirm(`Are you sure you want to delete team "${teamName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase.from('fantasy_teams').delete().eq('id', teamId);
      if (error) throw error;

      if (selectedEventForTeams) {
        await loadTeamsForEvent(selectedEventForTeams);
      }

      alert(`Team "${teamName}" has been deleted successfully.`);
    } catch (err) {
      console.error('Error deleting team:', err);
      alert('Failed to delete team. Please try again.');
    }
  };

  useEffect(() => {
    if (selectedEventForAlliances) {
      loadEventAlliances(selectedEventForAlliances);
    }
  }, [selectedEventForAlliances]);

  /* ---------- Utilities ---------- */
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  /* ---------- Table Columns ---------- */
  const columns: Column<ScanRecord>[] = [
    {
      key: 'alliance_tag',
      label: 'Alliance',
      sortable: true,
      render: (tag: string, row: ScanRecord) => (
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-medium text-gray-900">[{tag}]</span>
            {(row as any).alliance_generation && (
              <span className="px-2 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold rounded-full">
                {(row as any).alliance_generation}
              </span>
            )}
          </div>
          <div className="text-sm text-gray-500">{row.alliance_name}</div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteAlliance(row.alliance_id, tag);
            }}
            className="text-xs text-red-600 hover:text-red-800 hover:underline mt-1"
            title="Delete entire alliance"
          >
            Delete Alliance
          </button>
        </div>
      ),
    },
    {
      key: 'scan_date',
      label: 'Scan Date',
      sortable: true,
      render: (date: string) => (
        <div className="flex items-center">
          <Calendar className="w-4 h-4 text-gray-400 mr-2" />
          <span>{new Date(date).toLocaleDateString()}</span>
        </div>
      ),
    },
    {
      key: 'source_filename',
      label: 'Filename',
      sortable: true,
      render: (filename: string) => (
        <div className="flex items-center">
          <FileText className="w-4 h-4 text-gray-400 mr-2" />
          <span className="font-mono text-sm">{filename}</span>
        </div>
      ),
    },
    {
      key: 'row_count',
      label: 'Rows',
      sortable: true,
      render: (count: number) => (
        <div className="flex items-center">
          <Users className="w-4 h-4 text-gray-400 mr-2" />
          <span>{count.toLocaleString()}</span>
        </div>
      ),
    },
    {
      key: 'created_at',
      label: 'Uploaded',
      sortable: true,
      render: (date: string) => <span className="text-sm text-gray-600">{formatDate(date)}</span>,
    },
    {
      key: 'id',
      label: 'Actions',
      sortable: false,
      render: (id: string, row: ScanRecord) => (
        <div className="flex items-center space-x-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleReprocess(row);
            }}
            className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            title="Reprocess scan"
            disabled={loading}
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(row);
            }}
            className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
            title="Delete scan"
            disabled={loading}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  /* ---------- JSX ---------- */
  return (
    <div className="p-6 relative overflow-hidden">
      {/* Security Header */}
      <div className="bg-gradient-to-r from-red-900/20 to-orange-900/20 border border-red-500/30 rounded-xl p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Shield className="w-6 h-6 text-red-400" />
            <div>
              <h2 className="text-lg font-bold text-red-400 font-orbitron">SECURE ADMIN PANEL</h2>
              <p className="text-sm text-orange-400">Authorized access only • Session expires in 24 hours</p>
            </div>
          </div>
          <button
            onClick={signOut}
            className="flex items-center px-4 py-2 bg-red-600/80 hover:bg-red-600 text-white rounded-lg font-bold transition-colors"
          >
            <Lock className="w-4 h-4 mr-2" />
            SECURE LOGOUT
          </button>
        </div>
      </div>

      {/* Background Character for Admin */}
      <div className="absolute right-0 bottom-0 opacity-30 pointer-events-none">
        <img src="/girlbg.png" alt="Admin Character" className="w-96 h-auto transform rotate-8" />
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-100 mb-2 relative z-10 font-orbitron">ADMIN DASHBOARD</h1>
        <p className="text-gray-400">Manage CSV uploads, scan data ingestion, and system configuration.</p>
      </div>

      {/* Fantasy League Management Section */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-100 mb-4 flex items-center">
          <Trophy className="w-5 h-5 mr-2" />
          Fantasy League Management
        </h2>

        {/* Create Event Button */}
        <div className="mb-6">
          <button
            onClick={() => setShowCreateEventForm(!showCreateEventForm)}
            className="flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            {showCreateEventForm ? 'Cancel New Event' : 'Create Fantasy Event'}
          </button>
        </div>

        {/* Create Event Form */}
        {showCreateEventForm && (
          <div className="bg-gray-700 rounded-lg p-6 mb-6 border-2 border-purple-500/30">
            <h3 className="text-lg font-semibold text-purple-400 mb-4">Create New Fantasy Event</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Event Name</label>
                <input
                  type="text"
                  value={newEventForm.name}
                  onChange={(e) => setNewEventForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Season 1 Fantasy League"
                  className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Team Size</label>
                <select
                  value={newEventForm.teamSize}
                  onChange={(e) => setNewEventForm(prev => ({ ...prev, teamSize: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value={6}>6 Players</option>
                  <option value={8}>8 Players</option>
                  <option value={12}>12 Players</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Start Date</label>
                <input
                  type="date"
                  value={newEventForm.startDate}
                  onChange={(e) => setNewEventForm(prev => ({ ...prev, startDate: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">End Date</label>
                <input
                  type="date"
                  value={newEventForm.endDate}
                  onChange={(e) => setNewEventForm(prev => ({ ...prev, endDate: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Max Per Server</label>
                <input
                  type="number"
                  value={newEventForm.maxPerServer}
                  onChange={(e) => setNewEventForm(prev => ({ ...prev, maxPerServer: parseInt(e.target.value) || 2 }))}
                  min="1"
                  max="6"
                  className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font medium text-gray-300 mb-1">Max Teams</label>
                <input
                  type="number"
                  value={newEventForm.maxTeams}
                  onChange={(e) => setNewEventForm(prev => ({ ...prev, maxTeams: parseInt(e.target.value) || 50 }))}
                  min="10"
                  max="200"
                  className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-300 mb-1">Description (Optional)</label>
              <textarea
                value={newEventForm.description}
                onChange={(e) => setNewEventForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Event description..."
                rows={3}
                className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div className="mt-4 flex space-x-2">
              <button
                onClick={createFantasyEvent}
                className="flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                <Trophy className="w-4 h-4 mr-2" />
                Create Event
              </button>
              <button
                onClick={() => setShowCreateEventForm(false)}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Events List */}
        <div className="space-y-4 mb-6">
          <h3 className="text-md font-semibold text-gray-200">Active Events</h3>
          {fantasyEvents.length > 0 ? (
            <div className="space-y-3">
              {fantasyEvents.map((event) => (
                <div key={event.id} className="bg-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h4 className="font-bold text-white">{event.name}</h4>
                      <p className="text-sm text-gray-400">{event.description}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span
                        className={`px-2 py-1 text-xs font-bold rounded-full ${
                          event.is_active ? 'bg-green-500/20 text-green-400 border border-green-400/30' : 'bg-gray-500/20 text-gray-400 border border-gray-400/30'
                        }`}
                      >
                        {event.is_active ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                      <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs font-bold rounded-full border border-purple-400/30">
                        {event.team_size} PLAYERS
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">Start:</span>
                      <span className="ml-2 text-cyan-400">{new Date(event.start_date).toLocaleDateString()}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">End:</span>
                      <span className="ml-2 text-cyan-400">{new Date(event.end_date).toLocaleDateString()}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Max Teams:</span>
                      <span className="ml-2 text-green-400">{event.max_teams}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Per Server:</span>
                      <span className="ml-2 text-orange-400">{event.max_per_server}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <Trophy className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No fantasy events created yet</p>
            </div>
          )}
        </div>

        {/* Event Alliance Management */}
        <div className="space-y-4">
          <h3 className="text-md font-semibold text-gray-200">Manage Event Alliances</h3>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Select Event</label>
            <select
              value={selectedEventForAlliances}
              onChange={(e) => setSelectedEventForAlliances(e.target.value)}
              className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Select an event...</option>
              {fantasyEvents.map(event => (
                <option key={event.id} value={event.id}>
                  {event.name}
                </option>
              ))}
            </select>
          </div>

          {selectedEventForAlliances && (
            <div className="space-y-4">
              {/* Add Alliance Form */}
              <div className="bg-gray-700 rounded-lg p-4">
                <h4 className="font-bold text-green-400 mb-3">Add Alliance to Event</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <select
                    id="alliance-select"
                    ref={allianceSelectRef}
                    className="px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">Select alliance...</option>
                    {availableAlliancesForEvent
                      .filter(alliance => !eventAlliances.some(ea => ea.alliance_id === alliance.id))
                      .map(alliance => (
                        <option key={alliance.id} value={alliance.id}>
                          [{alliance.tag}] {alliance.name}
                        </option>
                      ))}
                  </select>
                  <input
                    type="text"
                    id="server-input"
                    ref={serverInputRef}
                    placeholder="Server ID (e.g., 106)"
                    className="px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <button
                    onClick={() => {
                      const allianceId = allianceSelectRef.current?.value;
                      const serverId = serverInputRef.current?.value;
                      if (allianceId && serverId) {
                        addAllianceToEvent(allianceId, serverId);
                        if (allianceSelectRef.current) allianceSelectRef.current.value = '';
                        if (serverInputRef.current) serverInputRef.current.value = '';
                      } else {
                        alert('Please select an alliance and enter a server ID');
                      }
                    }}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                  >
                    Add Alliance
                  </button>
                </div>
              </div>

              {/* Event Alliances List */}
              <div className="bg-gray-700 rounded-lg p-4">
                <h4 className="font-bold text-blue-400 mb-3">Event Alliances ({eventAlliances.length})</h4>
                {eventAlliances.length > 0 ? (
                  <div className="space-y-2">
                    {eventAlliances.map((eventAlliance) => (
                      <div key={eventAlliance.id} className="flex items-center justify-between p-3 bg-gray-600 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Shield className="w-4 h-4 text-blue-400" />
                          <div>
                            <span className="font-bold text-white">
                              [{(eventAlliance.alliances as any).tag}] {(eventAlliance.alliances as any).name}
                            </span>
                            <div className="text-sm text-gray-400">Server: {eventAlliance.server_id}</div>
                          </div>
                        </div>
                        <button
                          onClick={() => removeAllianceFromEvent(eventAlliance.id)}
                          className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-400">
                    <Shield className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No alliances added to this event yet</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Player Limit Management Section */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-100 mb-4 flex items-center">
          <Users className="w-5 h-5 mr-2" />
          Alliance Management
        </h2>
        <p className="text-sm text-gray-400 mb-6">
          Configure player limits and PIN protection for alliances. Default is 210 players (top by highest_power).
        </p>

        <div className="space-y-4 max-h-96 overflow-y-auto">
          {allianceLimits.map((alliance) => (
            <div key={alliance.id} className="bg-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <span className="font-bold text-white">[{alliance.tag}]</span>
                  <span className="text-gray-300">{alliance.name}</span>
                  {alliance.custom_limit_enabled && (
                    <span className="px-2 py-1 bg-blue-500 text-white text-xs font-bold rounded-full">CUSTOM</span>
                  )}
                  {alliance.is_pin_protected && (
                    <span className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-full">🔒 PROTECTED</span>
                  )}
                </div>
                {editingLimit !== alliance.id && editingPin !== alliance.id && (
                  <div className="flex space-x-2">
                    <button
                      onClick={() => startEditLimit(alliance.id, alliance.player_limit)}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
                    >
                      Edit Limit
                    </button>
                    <button
                      onClick={() => startEditPin(alliance.id, alliance.is_pin_protected, alliance.access_pin, alliance.pin_hint)}
                      className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition-colors"
                    >
                      🔒 PIN
                    </button>
                  </div>
                )}
              </div>

              {editingPin === alliance.id ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="flex items-center space-x-2 mb-3">
                        <input
                          type="checkbox"
                          checked={tempPinEnabled}
                          onChange={(e) => setTempPinEnabled(e.target.checked)}
                          className="rounded border-gray-500 text-purple-600 focus:ring-purple-500"
                        />
                        <span className="text-sm text-gray-300 font-bold">Enable PIN Protection</span>
                      </label>

                      {tempPinEnabled && (
                        <>
                          <label className="block text-sm font-medium text-gray-300 mb-1">Access PIN</label>
                          <input
                            type="password"
                            value={tempPin}
                            onChange={(e) => setTempPin(e.target.value)}
                            placeholder="Enter 4-8 digit PIN"
                            maxLength={8}
                            className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                        </>
                      )}
                    </div>

                    {tempPinEnabled && (
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">PIN Hint (Optional)</label>
                        <input
                          type="text"
                          value={tempPinHint}
                          onChange={(e) => setTempPinHint(e.target.value)}
                          placeholder="e.g., Alliance founding year"
                          className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex space-x-2">
                    <button
                      onClick={() => updateAlliancePin(alliance.id, tempPinEnabled, tempPin, tempPinHint)}
                      disabled={tempPinEnabled && !tempPin.trim()}
                      className="flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:opacity-50 text-white rounded-lg transition-colors"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Save PIN
                    </button>
                    <button onClick={() => setEditingPin(null)} className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : editingLimit === alliance.id ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Player Limit</label>
                    <input
                      type="number"
                      value={tempLimit}
                      onChange={(e) => setTempLimit(parseInt(e.target.value) || 210)}
                      min={50}
                      max={1000}
                      className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={tempLimit !== 210}
                        onChange={(e) => {
                          if (!e.target.checked) {
                            setTempLimit(210);
                          }
                        }}
                        className="rounded border-gray-500 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-300">Use custom limit</span>
                    </label>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => updateAllianceLimit(alliance.id, tempLimit, tempLimit !== 210)}
                      className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Save
                    </button>
                    <button onClick={() => setEditingLimit(null)} className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Current Limit:</span>
                    <span className={`font-bold ${alliance.custom_limit_enabled ? 'text-blue-400' : 'text-gray-200'}`}>{alliance.player_limit} players</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Status:</span>
                    <span className={`text-sm font-medium ${alliance.custom_limit_enabled ? 'text-blue-400' : 'text-gray-400'}`}>{alliance.custom_limit_enabled ? 'Custom limit active' : 'Using default (210)'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">PIN Protection:</span>
                    <span className={`text-sm font-medium ${alliance.is_pin_protected ? 'text-red-400' : 'text-gray-400'}`}>{alliance.is_pin_protected ? '🔒 Protected' : 'Open access'}</span>
                  </div>
                  {alliance.is_pin_protected && alliance.pin_hint && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">PIN Hint:</span>
                      <span className="text-sm text-yellow-400 italic">"{alliance.pin_hint}"</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Player Diagnostic Section */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-100 mb-4 flex items-center">
          <Search className="w-5 h-5 mr-2" />
          Missing Player Diagnostic
        </h2>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">Select Alliance for Diagnostic</label>
          <select
            value={selectedAllianceForDiagnostic}
            onChange={(e) => setSelectedAllianceForDiagnostic(e.target.value)}
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select an alliance...</option>
            {availableAlliances.map(alliance => (
              <option key={alliance.id} value={alliance.id}>
                [{alliance.tag}] {alliance.name}
              </option>
            ))}
          </select>
        </div>

        {selectedAllianceForDiagnostic && (
          <PlayerDiagnostic allianceId={selectedAllianceForDiagnostic} allianceTag={availableAlliances.find(a => a.id === selectedAllianceForDiagnostic)?.tag || ''} />
        )}
      </div>

      {/* Generation Management Section */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-100 mb-4 flex items-center">
          <Settings className="w-5 h-5 mr-2" />
          Generation & Season Management
        </h2>

        {/* Add New Season Button */}
        <div className="mb-6">
          <button
            onClick={() => setShowNewSeasonForm(!showNewSeasonForm)}
            className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
          >
            <Calendar className="w-4 h-4 mr-2" />
            {showNewSeasonForm ? 'Cancel New Season' : 'Add New Season'}
          </button>
        </div>

        {/* New Season Form */}
        {showNewSeasonForm && (
          <div className="bg-gray-700 rounded-lg p-6 mb-6 border-2 border-green-500/30">
            <h3 className="text-lg font-semibold text-green-400 mb-4">Create New Season</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Generation</label>
                <select
                  value={newSeasonForm.generation}
                  onChange={(e) => setNewSeasonForm(prev => ({ ...prev, generation: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="G1">G1</option>
                  <option value="G2">G2</option>
                  <option value="G3">G3</option>
                  <option value="G4">G4</option>
                  <option value="G5">G5</option>
                  <option value="G6">G6</option>
                  <option value="G7">G7</option>
                  <option value="G8">G8</option>
                  <option value="G9">G9</option>
                  <option value="G10">G10</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Season Name</label>
                <input
                  type="text"
                  value={newSeasonForm.seasonName}
                  onChange={(e) => setNewSeasonForm(prev => ({ ...prev, seasonName: e.target.value }))}
                  placeholder="e.g., Season 2, Spring War"
                  className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Start Date</label>
                <input
                  type="date"
                  value={newSeasonForm.startDate}
                  onChange={(e) => setNewSeasonForm(prev => ({ ...prev, startDate: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">End Date</label>
                <input
                  type="date"
                  value={newSeasonForm.endDate}
                  onChange={(e) => setNewSeasonForm(prev => ({ ...prev, endDate: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>
            <div className="mt-4 flex space-x-2">
              <button onClick={createNewSeason} className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors">
                <Save className="w-4 h-4 mr-2" />
                Create Season
              </button>
              <button onClick={() => setShowNewSeasonForm(false)} className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors">
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {generations.map((gen) => (
            <div key={gen.generation} className="bg-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <span className="px-3 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-bold rounded-full">{gen.generation}</span>
                  <span className="text-gray-300 font-medium">Season Dates</span>
                </div>
                {editingGeneration !== gen.generation && (
                  <button
                    onClick={() => startEditGeneration(gen.generation, gen.season_start_date, gen.season_end_date, gen.season_name || '')}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
                  >
                    Edit
                  </button>
                )}
              </div>

              {editingGeneration === gen.generation ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Season Name</label>
                    <input
                      type="text"
                      value={tempSeasonName}
                      onChange={(e) => setTempSeasonName(e.target.value)}
                      placeholder="e.g., Season 1, Winter Season"
                      className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={tempSeasonDates.start}
                      onChange={(e) => setTempSeasonDates(prev => ({ ...prev, start: e.target.value }))}
                      className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">End Date</label>
                    <input
                      type="date"
                      value={tempSeasonDates.end}
                      onChange={(e) => setTempSeasonDates(prev => ({ ...prev, end: e.target.value }))}
                      className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="md:col-span-3 flex space-x-2">
                    <button onClick={() => updateSeasonDates(gen.generation, tempSeasonDates.start, tempSeasonDates.end, tempSeasonName)} className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors">
                      <Save className="w-4 h-4 mr-2" />
                      Save
                    </button>
                    <button onClick={cancelEditGeneration} className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="text-gray-400">Season Name:</span>
                    <span className="ml-2 text-gray-200 font-medium">{gen.season_name || 'Season 1'}</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <span className="text-gray-400">Start:</span>
                      <span className="ml-2 text-gray-200">{gen.season_start_date ? new Date(gen.season_start_date).toLocaleDateString() : 'Not set'}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">End:</span>
                      <span className="ml-2 text-gray-200">{gen.season_end_date ? new Date(gen.season_end_date).toLocaleDateString() : 'Not set'}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Upload Section */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-100 mb-4">Upload CSV File</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Generation</label>
            <select
              value={selectedGeneration}
              onChange={(e) => setSelectedGeneration(e.target.value)}
              className="block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="G1">G1</option>
              <option value="G2">G2</option>
              <option value="G3">G3</option>
              <option value="G4">G4</option>
              <option value="G5">G5</option>
              <option value="G6">G6</option>
              <option value="G7">G7</option>
              <option value="G8">G8</option>
              <option value="G9">G9</option>
              <option value="G10">G10</option>
            </select>
            <p className="mt-1 text-sm text-gray-400">Select the generation for new alliances in this upload</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Select CSV File</label>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="block w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-900 file:text-blue-300 hover:file:bg-blue-800"
            />
            <p className="mt-1 text-sm text-gray-400">Expected format: ALLIANCE_TAG-YYYY-MM-DD.csv</p>
          </div>

          {selectedFile && (
            <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
              <div className="flex items-center">
                <FileText className="w-5 h-5 text-blue-600 mr-2" />
                <span className="text-sm font-medium text-blue-300">
                  {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                </span>
              </div>
            </div>
          )}

          {uploadProgress.uploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-300">{uploadProgress.message}</span>
                <span className="text-gray-300">{uploadProgress.progress}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{ width: `${uploadProgress.progress}%` }} />
              </div>
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={!selectedFile || uploadProgress.uploading}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {uploadProgress.uploading ? <LoadingSpinner size="sm" className="mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
            {uploadProgress.uploading ? 'Processing...' : 'Upload & Process'}
          </button>
        </div>
      </div>

      {/* Scans Table */}
      <div className="bg-gray-800 rounded-lg border border-gray-700">
        <div className="p-6 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-gray-100">Scan History</h2>
          <p className="text-sm text-gray-400 mt-1">Manage uploaded scans and reprocess data as needed.</p>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" className="mr-2" />
              <span className="text-gray-300">Loading scans...</span>
            </div>
          ) : error ? (
            <ErrorMessage message={error} onRetry={loadScans} />
          ) : (
            <DataTable data={scans} columns={columns} loading={loading} pageSize={25} pageSizeOptions={[25, 50, 100]} />
          )}
        </div>
      </div>

      {/* Delete Teams Section */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="glass-panel rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-pink-500/10"></div>
        <div className="flex items-center mb-6 relative z-10">
          <Trash2 className="w-6 h-6 text-red-400 mr-3" />
          <h3 className="text-xl font-black text-red-400 font-orbitron">DELETE TEAMS</h3>
        </div>

        <div className="space-y-6 relative z-10">
          {/* Event Selection for Team Deletion */}
          <div>
            <label className="block text-sm font-bold text-red-400 font-orbitron mb-2">SELECT EVENT TO MANAGE TEAMS</label>
            <select
              value={selectedEventForTeams}
              onChange={async (e) => {
                setSelectedEventForTeams(e.target.value);
                if (e.target.value) {
                  await loadTeamsForEvent(e.target.value);
                } else {
                  setEventTeams([]);
                }
              }}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-xl text-white focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-300"
            >
              <option value="">Select an event...</option>
              {events.map((event) => (
                <option key={event.id} value={event.id} className="bg-gray-800">
                  {event.name} ({event.team_size} players)
                </option>
              ))}
            </select>
          </div>

          {/* Teams List */}
          {selectedEventForTeams && (
            <div>
              <h4 className="text-lg font-bold text-red-400 font-orbitron mb-4">TEAMS IN EVENT ({eventTeams.length})</h4>

              {loadingTeams ? (
                <div className="flex items-center justify-center py-8">
                  <LoadingSpinner size="md" className="mr-3" />
                  <span className="text-red-400 font-orbitron">Loading teams...</span>
                </div>
              ) : eventTeams.length > 0 ? (
                <div className="space-y-3">
                  {eventTeams.map((team) => (
                    <motion.div key={team.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center justify-between p-4 glass-panel-light rounded-xl neon-border hover:neon-glow transition-all duration-300">
                      <div className="flex items-center space-x-4">
                        <div className="p-2 glass-panel rounded-lg neon-border">
                          <Users className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                          <div className="font-bold text-white font-orbitron">{team.team_name}</div>
                          <div className="text-sm text-gray-400">Owner: {team.owner_name} ({team.owner_lord_id})</div>
                          <div className="flex items-center space-x-3 mt-1">
                            <span className={`px-2 py-1 text-xs font-bold rounded-full ${team.is_complete ? 'bg-green-500/20 text-green-400 border border-green-400/30' : 'bg-yellow-500/20 text-yellow-400 border border-yellow-400/30'}`}>
                              {team.is_complete ? 'COMPLETE' : 'BUILDING'}
                            </span>
                            <span className="text-xs text-gray-500">{(team.players || []).length} players</span>
                            <span className="text-xs text-gray-500">Created: {new Date(team.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>

                      <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => handleDeleteTeam(team.id, team.team_name)} className="p-3 bg-red-600/80 hover:bg-red-600 text-white rounded-xl font-bold transition-colors flex items-center space-x-2 focus:outline-none focus:ring-2 focus:ring-red-500">
                        <Trash2 className="w-4 h-4" />
                        <span>DELETE</span>
                      </motion.button>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h4 className="text-lg font-bold text-gray-300 font-orbitron mb-2">NO TEAMS FOUND</h4>
                  <p className="text-gray-400">No teams have been created for this event yet</p>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export default Admin;
