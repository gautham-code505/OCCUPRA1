import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authAPI } from '../services/api';
import { Activity, Eye, EyeOff, ArrowRight, Shield, User } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [isRegistering, setIsRegistering] = useState(false);
  const [role, setRole] = useState<'STUDENT' | 'ADMIN'>('STUDENT');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phoneNo, setPhoneNo] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [department, setDepartment] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);
    try {
      if (isRegistering) {
        await authAPI.register({ email, password, name, role, phoneNo, rollNo, department });
        setSuccess('Registration successful! Please sign in.');
        setIsRegistering(false);
        setPassword('');
      } else {
        await login(email, password);
        const stored = localStorage.getItem('campuspulse_user');
        if (stored) {
          const u = JSON.parse(stored);
          navigate(u.role === 'ADMIN' ? '/admin' : '/dashboard', { replace: true });
        }
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const fillDemo = (demoRole: 'student' | 'admin') => {
    setIsRegistering(false);
    setEmail(demoRole === 'student' ? 'student@campus.ai' : 'admin@campus.ai');
    setPassword(demoRole === 'student' ? 'student123' : 'admin123');
    setError('');
    setSuccess('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#060a14] py-10">
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-0 w-64 h-64 bg-cyan-600/8 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-md px-4">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-glow-cyan">
            <Activity size={28} className="text-white" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">OCCUPRA</h1>
          <p className="text-slate-400 text-sm mt-2">Smart Campus Resource Finder & Crowd Predictor</p>
        </div>

        <div className="glass-card rounded-2xl border border-white/10 p-7 shadow-glass">
          <h2 className="text-lg font-bold text-white mb-1">
            {isRegistering ? 'Create an Account' : 'Welcome back'}
          </h2>
          <p className="text-slate-500 text-sm mb-6">
            {isRegistering ? 'Register to access the smart campus' : 'Sign in to access the smart campus dashboard'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegistering && (
              <div className="flex bg-white/5 rounded-xl p-1 mb-4">
                <button type="button" onClick={() => setRole('STUDENT')} className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${role === 'STUDENT' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>Student</button>
                <button type="button" onClick={() => setRole('ADMIN')} className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${role === 'ADMIN' ? 'bg-purple-600 text-white' : 'text-slate-400'}`}>Admin</button>
              </div>
            )}

            {isRegistering && (
              <div>
                <label className="text-xs text-slate-400 block mb-1.5 uppercase tracking-wider">Full Name</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/60 transition-all" />
              </div>
            )}

            {isRegistering && role === 'STUDENT' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1.5 uppercase tracking-wider">Roll No</label>
                  <input type="text" value={rollNo} onChange={e => setRollNo(e.target.value)} required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/60 transition-all" />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1.5 uppercase tracking-wider">Department</label>
                  <input type="text" value={department} onChange={e => setDepartment(e.target.value)} required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/60 transition-all" />
                </div>
              </div>
            )}

            {isRegistering && (
              <div>
                <label className="text-xs text-slate-400 block mb-1.5 uppercase tracking-wider">Phone Number</label>
                <input type="tel" value={phoneNo} onChange={e => setPhoneNo(e.target.value)} required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/60 transition-all" />
              </div>
            )}

            <div>
              <label className="text-xs text-slate-400 block mb-1.5 uppercase tracking-wider">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/60 transition-all"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1.5 uppercase tracking-wider">Password</label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 pr-12 text-sm text-white focus:outline-none focus:border-blue-500/60 transition-all"
                />
                <button type="button" onClick={() => setShowPwd(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors">
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">{error}</div>}
            {success && <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 text-sm text-emerald-400">{success}</div>}

            <button type="submit" disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50 mt-2">
              {isLoading ? (
                <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Please wait…</>
              ) : (
                <>{isRegistering ? 'Register Account' : 'Sign In'} <ArrowRight size={16} /></>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-slate-400 mt-5">
            {isRegistering ? 'Already have an account? ' : "Don't have an account? "}
            <button onClick={() => setIsRegistering(!isRegistering)} className="text-blue-400 font-bold hover:underline">
              {isRegistering ? 'Sign In' : 'Register'}
            </button>
          </p>

          {!isRegistering && (
            <div className="mt-5 pt-5 border-t border-white/8">
              <p className="text-xs text-slate-500 text-center mb-3">Quick demo access</p>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => fillDemo('student')}
                  className="flex items-center justify-center gap-2 py-2.5 bg-blue-600/15 hover:bg-blue-600/25 border border-blue-500/30 rounded-xl text-blue-300 text-xs font-semibold transition-all">
                  <User size={13} /> Student Demo
                </button>
                <button onClick={() => fillDemo('admin')}
                  className="flex items-center justify-center gap-2 py-2.5 bg-purple-600/15 hover:bg-purple-600/25 border border-purple-500/30 rounded-xl text-purple-300 text-xs font-semibold transition-all">
                  <Shield size={13} /> Admin Demo
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
