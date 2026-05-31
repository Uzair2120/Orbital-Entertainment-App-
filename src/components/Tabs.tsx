'use client';

import React, { useState } from 'react';

interface Tab {
  id: string;
  label: string;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onTabChange }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const currentTabLabel = tabs.find(t => t.id === activeTab)?.label || 'SELECT CATEGORY';

  const handleTabClick = (tabId: string) => {
    onTabChange(tabId);
    setIsDropdownOpen(false);
  };

  return (
    <div className="px-6 md:px-12 mb-8 md:mb-11">
      {/* MOBILE DROPDOWN - Shown on screens smaller than 1280px (xl) */}
      <div className="xl:hidden relative">
        <button 
          className="w-full bg-surface2 border border-white/10 text-accent font-bebas tracking-widest py-3.5 px-6 rounded-lg flex items-center justify-between text-lg"
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        >
          <span>{currentTabLabel}</span>
          <span className={`transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`}>▼</span>
        </button>

        {isDropdownOpen && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-surface2 border border-white/10 rounded-lg shadow-2xl z-[500] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`w-full text-left px-6 py-4 font-bebas tracking-widest text-base transition-colors border-b border-white/5 last:border-0 ${
                  activeTab === tab.id 
                    ? 'bg-accent text-bg' 
                    : 'text-muted hover:bg-white/5 hover:text-text-custom'
                }`}
                onClick={() => handleTabClick(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* DESKTOP TABS - Hidden on small screens, shown on 1280px (xl) and up */}
      <div className="hidden xl:flex border-b border-white/10 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`px-5.5 py-3.5 bg-transparent border-none border-b-2 font-dm text-[0.82rem] font-medium tracking-[0.08em] uppercase cursor-pointer transition-all duration-200 whitespace-nowrap ${
              activeTab === tab.id 
                ? 'text-accent border-accent' 
                : 'text-muted border-transparent hover:text-text-custom'
            }`}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default Tabs;
