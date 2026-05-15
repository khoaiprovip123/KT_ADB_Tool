import React, { useState } from 'react'
import { Sparkles, User, Monitor } from 'lucide-react'

export default function Customization() {
  const [theme, setTheme] = useState('dark')
  const [language, setLanguage] = useState('vi')

  return (
    <div className="space-y-8 text-slate-600">
      <div>
        <h2 className="text-3xl font-black text-slate-800 tracking-tighter mb-1">Tùy chỉnh Giao diện</h2>
        <p className="text-slate-400 text-sm font-medium">Cá nhân hóa không gian làm việc chuyên nghiệp của bạn</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Theme Settings */}
        <div className="space-y-4">
          <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Chế độ nền (Appearance)</label>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setTheme('light')}
              className={`p-4 rounded-[2rem] border-2 flex flex-col items-center gap-3 transition-all ${
                theme === 'light' 
                ? 'bg-blue-50 border-blue-500 text-blue-600 shadow-lg shadow-blue-500/10' 
                : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
              }`}
            >
              <div className="w-full h-16 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-center">
                <div className="w-10 h-2 bg-white rounded-full shadow-sm" />
              </div>
              <span className="text-sm font-black">Sáng (Light)</span>
            </button>

            <button
              onClick={() => setTheme('dark')}
              className={`p-4 rounded-[2rem] border-2 flex flex-col items-center gap-3 transition-all ${
                theme === 'dark' 
                ? 'bg-slate-900 border-slate-800 text-white shadow-xl' 
                : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200 opacity-50'
              }`}
            >
              <div className="w-full h-16 bg-slate-800 rounded-2xl border border-slate-700 flex items-center justify-center">
                <div className="w-10 h-2 bg-slate-900 rounded-full" />
              </div>
              <span className="text-sm font-black">Tối (Dark)</span>
            </button>
          </div>
        </div>

        {/* Language Settings */}
        <div className="space-y-4">
          <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Ngôn ngữ (Language)</label>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setLanguage('vi')}
              className={`p-4 rounded-[2rem] border-2 flex flex-col items-center justify-center gap-2 transition-all ${
                language === 'vi' 
                ? 'bg-blue-50 border-blue-500 text-blue-600 shadow-lg shadow-blue-500/10' 
                : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
              }`}
            >
              <span className="text-2xl">🇻🇳</span>
              <span className="text-sm font-black uppercase tracking-tight">Tiếng Việt</span>
            </button>

            <button
              onClick={() => setLanguage('en')}
              className={`p-4 rounded-[2rem] border-2 flex flex-col items-center justify-center gap-2 transition-all ${
                language === 'en' 
                ? 'bg-blue-50 border-blue-500 text-blue-600 shadow-lg shadow-blue-500/10' 
                : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200 opacity-50'
              }`}
            >
              <span className="text-2xl grayscale">🇺🇸</span>
              <span className="text-sm font-black uppercase tracking-tight">English</span>
            </button>
          </div>
        </div>

        {/* Advanced Personalization */}
        <div className="col-span-full pt-8 mt-2 border-t border-slate-200/60">
          <h3 className="text-xl font-black text-slate-800 tracking-tight mb-6 flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-blue-600" />
            Cá nhân hóa chuyên sâu
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <CustomBox 
              icon={<User className="w-6 h-6" />}
              title="Ảnh đại diện"
              desc="Sử dụng Avatar cá nhân"
              color="text-blue-600 bg-blue-50"
            />
            <CustomBox 
              icon={<Monitor className="w-6 h-6" />}
              title="Hình nền hệ thống"
              desc="Upload ảnh nền Liquid Glass"
              color="text-emerald-600 bg-emerald-50"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function CustomBox({ icon, title, desc, color }: { icon: React.ReactNode, title: string, desc: string, color: string }) {
  return (
    <div className="group relative bg-white p-5 rounded-[2rem] border border-slate-200/60 shadow-sm hover:border-blue-200 hover:shadow-xl transition-all cursor-not-allowed opacity-60">
      <div className="flex items-center gap-5">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${color}`}>
          {icon}
        </div>
        <div>
          <h4 className="text-slate-800 font-black tracking-tight">{title}</h4>
          <p className="text-xs font-bold text-slate-400 mt-0.5 uppercase tracking-widest">{desc}</p>
        </div>
      </div>
      <div className="absolute top-4 right-6 text-[10px] font-black uppercase tracking-widest text-slate-300">Soon</div>
    </div>
  )
}
