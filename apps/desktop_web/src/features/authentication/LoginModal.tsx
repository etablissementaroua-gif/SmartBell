import React, { useState } from 'react';
import { Icon } from '../../components/common/Icon';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (userName: string) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
  const [email, setEmail] = useState<string>('admin@smartbell.local');
  const [password, setPassword] = useState<string>('••••••••••••');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      onLoginSuccess('المشرف الإذاعي');
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-deep/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-[420px] bg-slate-card rounded-3xl p-8 shadow-2xl border border-white/10 text-white flex flex-col items-center">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 left-4 text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
        >
          <Icon name="close" size={20} />
        </button>

        {/* Logo and Brand */}
        <div className="w-24 h-24 rounded-2xl bg-primary-container p-2 flex items-center justify-center shadow-lg border border-teal-dark/40 mb-3">
          <img
            src="/assets/smartbell_icon.png"
            alt="SmartBell Icon"
            className="w-full h-full object-contain"
          />
        </div>

        <h2 className="text-2xl font-extrabold tracking-tight">SmartBell</h2>
        <span className="text-xs text-teal-accent font-semibold mt-0.5">
          منصة التحكم الصوتي الموحدة
        </span>
        <p className="text-[11px] text-slate-400 text-center mt-1">
          دقة في التوقيت، وإيقاع ينبض بالحياة المدرسية
        </p>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4 mt-6">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-300">البريد الإلكتروني / اسم المستخدم:</label>
            <div className="relative flex items-center">
              <span className="absolute right-3 text-teal-accent flex items-center pointer-events-none">
                <Icon name="person" size={18} />
              </span>
              <input
                type="text"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-deep border border-slate-700 rounded-xl pr-10 pl-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-accent"
                placeholder="admin@smartbell.local"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-300">كلمة المرور:</label>
            <div className="relative flex items-center">
              <span className="absolute right-3 text-teal-accent flex items-center pointer-events-none">
                <Icon name="lock" size={18} />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-deep border border-slate-700 rounded-xl pr-10 pl-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-accent"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 text-slate-400 hover:text-white flex items-center"
              >
                <Icon name={showPassword ? 'visibility_off' : 'visibility'} size={18} />
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-3 rounded-xl bg-teal-dark hover:bg-secondary text-white font-bold text-sm shadow-lg shadow-teal-dark/30 transition-all flex items-center justify-center gap-2 active:scale-95"
          >
            {isLoading ? (
              <>
                <Icon name="refresh" size={18} className="animate-spin" />
                <span>جاري تسجيل الدخول...</span>
              </>
            ) : (
              <span>تسجيل الدخول للنظام</span>
            )}
          </button>
        </form>

        <span className="text-[10px] text-slate-500 mt-6 font-mono">
          SmartBell Unified Core v2.4.0 • Raspberry Pi 5 Ready
        </span>
      </div>
    </div>
  );
};
