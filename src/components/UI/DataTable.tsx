import React, { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

export interface Column<T> {
  key: keyof T;
  label: string;
  sortable?: boolean;
  render?: (value: any, row: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  onRowClick?: (row: T) => void;
  loading?: boolean;
  pageSize?: number;
  pageSizeOptions?: number[];
  className?: string;
}

type SortDirection = 'asc' | 'desc' | null;

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  onRowClick,
  loading = false,
  pageSize: initialPageSize = 25,
  pageSizeOptions = [25, 50, 100],
  className = '',
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<keyof T | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const sortedData = useMemo(() => {
    if (!sortKey || !sortDirection) return data;

    return [...data].sort((a, b) => {
      const aValue = a[sortKey];
      const bValue = b[sortKey];

      // Handle null/undefined values
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return sortDirection === 'asc' ? -1 : 1;
      if (bValue == null) return sortDirection === 'asc' ? 1 : -1;

      // Numeric comparison
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }

      // String comparison
      const aStr = String(aValue).toLowerCase();
      const bStr = String(bValue).toLowerCase();
      
      if (sortDirection === 'asc') {
        return aStr < bStr ? -1 : aStr > bStr ? 1 : 0;
      } else {
        return aStr > bStr ? -1 : aStr < bStr ? 1 : 0;
      }
    });
  }, [data, sortKey, sortDirection]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return sortedData.slice(startIndex, startIndex + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const totalPages = Math.ceil(sortedData.length / pageSize);

  const handleSort = (key: keyof T) => {
    const column = columns.find(col => col.key === key);
    if (!column?.sortable) return;

    if (sortKey === key) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortKey(null);
        setSortDirection(null);
      } else {
        setSortDirection('asc');
      }
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const SortIcon = ({ columnKey }: { columnKey: keyof T }) => {
    if (sortKey !== columnKey) return null;
    return sortDirection === 'asc' ? 
      <ChevronUp className="w-4 h-4" /> : 
      <ChevronDown className="w-4 h-4" />;
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Table */}
      <div className="overflow-x-auto glass-panel rounded-2xl neon-border">
        <table className="min-w-full divide-y divide-gray-700/50">
          <thead className="glass-panel-light relative">
            <div className="absolute inset-0 bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-blue-500/10"></div>
            <tr>
              {columns.map((column) => (
                <th
                  key={String(column.key)}
                  className={`px-3 sm:px-4 md:px-6 py-3 sm:py-4 text-left text-xs font-bold text-blue-400 uppercase tracking-wider font-orbitron relative z-10 ${
                    column.sortable ? 'cursor-pointer hover:text-pink-400 select-none transition-all duration-300' : ''
                  } ${column.className || ''}`}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className="flex items-center space-x-1">
                    <span>{column.label}</span>
                    {column.sortable && (
                      <motion.div
                        whileHover={{ scale: 1.2 }}
                        className="ml-1"
                      >
                        <SortIcon columnKey={column.key} />
                      </motion.div>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700/30">
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="px-3 sm:px-6 py-12 sm:py-16 text-center">
                  <div className="flex items-center justify-center">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-8 h-8 glass-panel-light rounded-full flex items-center justify-center neon-glow mr-3"
                    >
                      <div className="w-3 h-3 bg-gradient-to-r from-pink-500 to-blue-500 rounded-full"></div>
                    </motion.div>
                    <span className="text-blue-400 font-orbitron font-bold">PROCESSING...</span>
                  </div>
                </td>
              </tr>
            ) : paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-3 sm:px-6 py-12 sm:py-16 text-center">
                  <span className="text-purple-400 font-orbitron font-bold">NO DATA AVAILABLE</span>
                </td>
              </tr>
            ) : (
              paginatedData.map((row, index) => (
                <motion.tr
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05, duration: 0.3 }}
                  whileHover={{ 
                    backgroundColor: 'rgba(255, 0, 110, 0.1)',
                    transition: { duration: 0.2 }
                  }}
                  className={`transition-all duration-300 border-l-2 border-transparent hover:border-pink-500 hover:neon-glow ${
                    onRowClick ? 'cursor-pointer focus:outline-none focus:border-pink-500 focus:bg-pink-500/10' : ''
                  }`}
                  onClick={() => onRowClick?.(row)}
                  tabIndex={onRowClick ? 0 : -1}
                  onKeyDown={(e) => {
                    if (onRowClick && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault();
                      onRowClick(row);
                    }
                  }}
                >
                  {columns.map((column) => (
                    <td
                      key={String(column.key)}
                      className={`px-3 sm:px-4 md:px-6 py-3 sm:py-4 md:py-5 whitespace-nowrap text-xs sm:text-sm ${column.className || ''}`}
                    >
                      {column.render 
                        ? column.render(row[column.key], row)
                        : String(row[column.key] ?? '')
                      }
                    </td>
                  ))}
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!loading && sortedData.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row items-center justify-between glass-panel px-3 sm:px-4 md:px-6 py-3 sm:py-4 neon-border rounded-xl space-y-3 sm:space-y-0"
        >
          <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-4">
            <div className="flex items-center space-x-2">
              <label className="text-xs sm:text-sm text-blue-400 font-bold font-orbitron">SHOW:</label>
              <select
                value={pageSize}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                className="glass-panel-light border border-gray-600/50 rounded-lg px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm text-purple-400 font-bold focus:outline-none focus:ring-2 focus:ring-pink-500 transition-all duration-300"
              >
                {pageSizeOptions.map(size => (
                  <option key={size} value={size} className="bg-gray-800">{size}</option>
                ))}
              </select>
            </div>
            <div className="text-xs sm:text-sm text-blue-400 font-medium text-center sm:text-left">
              SHOWING {(((currentPage - 1) * pageSize) + 1).toLocaleString()} TO {Math.min(currentPage * pageSize, sortedData.length).toLocaleString()} OF {sortedData.length.toLocaleString()} OPERATIVES
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-1.5 sm:p-2 glass-panel-light rounded-lg neon-border disabled:opacity-50 disabled:cursor-not-allowed hover:neon-glow focus:outline-none focus:ring-2 focus:ring-pink-500 transition-all duration-300"
            >
              <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4 text-gray-300" />
            </motion.button>
            
            <div className="flex items-center space-x-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <motion.button
                    key={pageNum}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handlePageChange(pageNum)}
                    className={`px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-bold font-orbitron focus:outline-none focus:ring-2 focus:ring-pink-500 transition-all duration-300 ${
                      currentPage === pageNum
                        ? 'neon-button text-white neon-glow'
                        : 'glass-panel-light neon-border text-gray-300 hover:neon-glow'
                    }`}
                  >
                    {pageNum}
                  </motion.button>
                );
              })}
            </div>

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-1.5 sm:p-2 glass-panel-light rounded-lg neon-border disabled:opacity-50 disabled:cursor-not-allowed hover:neon-glow focus:outline-none focus:ring-2 focus:ring-pink-500 transition-all duration-300"
            >
              <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 text-gray-300" />
            </motion.button>
          </div>
        </motion.div>
      )}
    </div>
  );
}