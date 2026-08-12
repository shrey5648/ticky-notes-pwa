'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Download, ChevronDown, Image as ImageIcon, Printer, FileText, FileCode } from 'lucide-react';

interface ExportMenuProps {
  onExportJSON?: () => void;
  onExportMarkdown?: () => void;
  onExportPNG?: () => void;
  onExportPDF?: () => void;
}

export const ExportMenu: React.FC<ExportMenuProps> = ({
  onExportJSON,
  onExportMarkdown,
  onExportPNG,
  onExportPDF,
}) => {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }} ref={exportMenuRef}>
      <button
        className="btn-secondary"
        onClick={() => setShowExportMenu(!showExportMenu)}
        title="Export Board Notes"
        style={{ padding: '4px 10px', fontSize: '0.78rem', height: '32px' }}
      >
        <Download size={13} /> Export{' '}
        <ChevronDown
          size={12}
          style={{
            transform: showExportMenu ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.2s',
          }}
        />
      </button>

      {showExportMenu && (
        <div
          className="dynamic-island-dropdown"
          style={{
            top: 'calc(100% + 8px)',
            right: 0,
            width: '190px',
            padding: '6px',
            zIndex: 150,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="dynamic-island-note-item"
            onClick={() => {
              setShowExportMenu(false);
              if (onExportPNG) onExportPNG();
            }}
          >
            <ImageIcon size={14} /> PNG Image Snapshot
          </button>
          <button
            className="dynamic-island-note-item"
            onClick={() => {
              setShowExportMenu(false);
              if (onExportPDF) onExportPDF();
            }}
          >
            <Printer size={14} /> Print / Save as PDF
          </button>
          <button
            className="dynamic-island-note-item"
            onClick={() => {
              setShowExportMenu(false);
              if (onExportMarkdown) onExportMarkdown();
            }}
          >
            <FileText size={14} /> Markdown Document (.md)
          </button>
          <button
            className="dynamic-island-note-item"
            onClick={() => {
              setShowExportMenu(false);
              if (onExportJSON) onExportJSON();
            }}
          >
            <FileCode size={14} /> JSON Backup (.json)
          </button>
        </div>
      )}
    </div>
  );
};
