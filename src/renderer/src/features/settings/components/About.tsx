import React from 'react'

export default function About() {
  return (
    <div className="space-y-8 text-slate-600">
      <div className="flex items-center gap-8 pb-8 border-b border-slate-200/60">
        <div className="relative group">
          <div className="absolute inset-0 bg-blue-500 blur-xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
          <div className="relative w-28 h-28 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-blue-500/20 transform hover:scale-105 transition-transform duration-300">
            <svg className="w-14 h-14 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
          </div>
        </div>
        <div>
          <h1 className="text-4xl font-black text-slate-800 tracking-tighter">KT ADB Tool <span className="text-blue-600">Pro</span></h1>
          <p className="text-lg font-bold text-slate-400 mt-1 tracking-tight">Phiên bản 2.1.0-PRO-MAX</p>
          <div className="flex gap-2 mt-3">
            <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-black uppercase tracking-widest border border-blue-100">Premium</span>
            <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-xs font-black uppercase tracking-widest border border-emerald-100">Stable</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <h3 className="text-xl font-black text-slate-800 tracking-tight">Giới thiệu dự án</h3>
          <p className="leading-relaxed font-medium text-slate-500">
            KT ADB Tool Pro là giải pháp tối ưu cho việc quản lý và can thiệp hệ thống Android qua giao diện đồ họa. Chúng tôi tập trung vào việc đơn giản hóa các thao tác kỹ thuật phức tạp thành những trải nghiệm trực quan, an toàn và cực kỳ mạnh mẽ.
          </p>
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/60">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Phát triển bởi</p>
            <p className="text-sm font-black text-slate-700">khoaiprovip123 & Team Antigravity AI</p>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-xl font-black text-slate-800 tracking-tight">Tính năng cốt lõi</h3>
          <ul className="space-y-2.5">
            {[
              'App Manager Glassmorphism (v2.1)',
              'Thanh tác vụ hàng loạt dạng nổi (Floating Bar)',
              'Hệ thống lọc & Tìm kiếm thông minh mới',
              'Tối ưu hóa không gian hiển thị (No-Scroll)',
              'Cài đặt APK thông minh (Shell mode)',
              'Nhật ký lệnh thời gian thực'
            ].map((feature, i) => (
              <li key={i} className="flex items-center gap-3 text-sm font-bold text-slate-600 bg-white p-3 rounded-xl border border-slate-200/60 shadow-sm">
                <div className="w-5 h-5 rounded-full bg-blue-50 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                </div>
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="pt-8 border-t border-slate-200/60 text-xs font-bold text-slate-400 flex justify-between items-center uppercase tracking-widest">
        <span>© 2026 KT Studio. Bản quyền thuộc về khoaiprovip123</span>
        <div className="flex gap-6">
          <a href="#" className="hover:text-blue-600 transition-colors">GitHub</a>
          <a href="#" className="hover:text-blue-600 transition-colors">Documentation</a>
          <a href="#" className="hover:text-blue-600 transition-colors">Contact</a>
        </div>
      </div>
    </div>
  )
}
