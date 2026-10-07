import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Building, Shield, LogOut, CheckCircle } from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-xl font-bold text-white flex items-center gap-2">
        <User size={20} className="text-blue-400" /> My Profile
      </h1>

      {/* Profile card */}
      <div className="glass-card rounded-2xl border border-white/10 p-6">
        <div className="flex items-center gap-5 mb-6">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-purple-600 rounded-2xl flex items-center justify-center text-white text-3xl font-bold flex-shrink-0">
            {user.name.charAt(0)}
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">{user.name}</h2>
            <p className="text-slate-400 text-sm">{user.email}</p>
            <span className={`inline-flex items-center gap-1.5 mt-2 text-xs font-bold px-2.5 py-1 rounded-full ${user.role === 'ADMIN' ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30' : 'bg-blue-500/15 text-blue-400 border border-blue-500/30'}`}>
              {user.role === 'ADMIN' ? <Shield size={11} /> : <User size={11} />}
              {user.role}
            </span>
          </div>
        </div>

        <div className="space-y-3">
          {[
            { icon: <Mail size={14} className="text-blue-400" />, label: 'Email', value: user.email },
            { icon: <Building size={14} className="text-blue-400" />, label: 'Department', value: user.department },
            { icon: <Shield size={14} className="text-blue-400" />, label: 'Role', value: user.role },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-4 p-3 bg-white/4 rounded-xl">
              <div className="w-8 flex-shrink-0">{item.icon}</div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">{item.label}</p>
                <p className="text-sm text-white font-medium mt-0.5">{item.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick access */}
      <div className="glass-card rounded-2xl border border-white/8 p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Quick Access</h3>
        <div className="grid grid-cols-2 gap-3">
          {(user.role === 'STUDENT' ? [
            { label: 'My Bookings', path: '/bookings' },
            { label: 'Notifications', path: '/notifications' },
            { label: 'Campus Map', path: '/map' },
            { label: 'Find Best Space', path: '/recommendation' },
          ] : [
            { label: 'Admin Dashboard', path: '/admin' },
            { label: 'IoT Sensors', path: '/admin/sensors' },
            { label: 'Analytics', path: '/admin/analytics' },
            { label: 'AI Insights', path: '/admin/insights' },
          ]).map(item => (
            <button key={item.path} onClick={() => navigate(item.path)}
              className="p-3 bg-white/4 hover:bg-white/8 border border-white/5 hover:border-blue-500/20 rounded-xl text-sm text-slate-300 hover:text-white transition-all text-left font-medium">
              → {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Demo credentials */}
      <div className="glass-card rounded-2xl border border-blue-500/20 bg-blue-500/5 p-5">
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle size={14} className="text-blue-400" />
          <h3 className="text-sm font-semibold text-blue-300">Demo Credentials</h3>
        </div>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-white/5 rounded-xl">
            <p className="text-slate-400 mb-1">Student Login</p>
            <p className="text-white font-mono">student@campus.ai</p>
            <p className="text-slate-500 font-mono">student123</p>
          </div>
          <div className="p-3 bg-white/5 rounded-xl">
            <p className="text-slate-400 mb-1">Admin Login</p>
            <p className="text-white font-mono">admin@campus.ai</p>
            <p className="text-slate-500 font-mono">admin123</p>
          </div>
        </div>
      </div>

      <button onClick={() => { logout(); navigate('/'); }}
        className="flex items-center gap-2 px-5 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-xl text-sm font-medium transition-all">
        <LogOut size={14} /> Log Out
      </button>
    </div>
  );
};
