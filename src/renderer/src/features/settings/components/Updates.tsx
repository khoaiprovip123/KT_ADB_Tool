import React from 'react'
import { Sparkles, Package } from 'lucide-react'

export default function Updates() {
  return (
    <div className="space-y-8 text-slate-600 h-full flex flex-col">
      <div className="flex justify-between items-center pb-8 border-b border-slate-200/60">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tighter">Trung tâm Cập nhật</h2>
          <p className="text-sm font-medium text-slate-400 mt-1">Đảm bảo bạn luôn trải nghiệm phiên bản mạnh mẽ nhất</p>
        </div>
        <button className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl transition-all font-black text-xs uppercase tracking-widest flex items-center gap-2.5 shadow-xl shadow-blue-500/20">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Kiểm tra ngay
        </button>
      </div>

      <div className="bg-white p-5 rounded-3xl border border-slate-200/60 flex items-center justify-between shadow-sm ring-1 ring-black/5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center">
            <svg className="w-6 h-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h4 className="text-slate-800 font-black tracking-tight text-lg">Hệ thống đã sẵn sàng</h4>
            <p className="text-sm font-bold text-slate-400">Phiên bản hiện tại: 2.1.0-PRO-MAX</p>
          </div>
        </div>
        <span className="px-4 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-black uppercase tracking-widest">Mới nhất</span>
      </div>

      <div className="flex-1 overflow-y-auto pr-4 space-y-8 scrollbar-hide">
        <h3 className="text-xl font-black text-slate-800 tracking-tight sticky top-0 bg-white/60 backdrop-blur-md py-4 z-10">Lịch sử Phát triển</h3>
        
        <div className="space-y-10 relative before:absolute before:inset-0 before:ml-6 before:h-full before:w-0.5 before:bg-slate-200/60">
          
          {/* Version 2.1.0 */}
          <div className="relative pl-14 group">
            <div className="absolute left-0 top-1.5 w-12 h-12 rounded-2xl bg-indigo-600 border-4 border-white shadow-xl flex items-center justify-center z-10 transform group-hover:scale-110 transition-transform shadow-indigo-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="p-6 rounded-[2rem] bg-indigo-50/10 border border-indigo-100 shadow-lg shadow-indigo-900/5 group-hover:border-indigo-300 transition-colors relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
              <div className="flex items-center justify-between mb-4 relative z-10">
                <div className="font-black text-slate-800 text-xl tracking-tighter">v2.1.0-PRO-MAX <span className="ml-2 text-indigo-600">⚡</span></div>
                <time className="text-xs text-indigo-500 font-black uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-full">16/05/2026</time>
              </div>
              <ul className="text-slate-500 text-sm font-bold space-y-3 relative z-10">
                <li className="flex items-start gap-2.5 bg-white/60 p-2.5 rounded-xl border border-indigo-50">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0 shadow-[0_0_8px_rgba(79,70,229,0.5)]"></div>
                  <span>**File Manager Pro**: Ra mắt trình quản lý tệp tin Immersive mới, hỗ trợ đầy đủ bộ nhớ trong và thẻ nhớ ngoài.</span>
                </li>
                <li className="flex items-start gap-2.5 bg-white/60 p-2.5 rounded-xl border border-indigo-50">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0 shadow-[0_0_8px_rgba(79,70,229,0.5)]"></div>
                  <span>**Image Preview Pro**: Xem ảnh 4K với chế độ Zoom & Pan mượt mà bằng bánh xe chuột và kéo thả.</span>
                </li>
                <li className="flex items-start gap-2.5 bg-white/60 p-2.5 rounded-xl border border-indigo-50">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0 shadow-[0_0_8px_rgba(79,70,229,0.5)]"></div>
                  <span>**Tối ưu ADB**: Cải thiện cơ chế khởi tạo giúp ứng dụng mở nhanh hơn và kết nối thiết bị ổn định hơn.</span>
                </li>
                <li className="flex items-start gap-2.5 bg-white/60 p-2.5 rounded-xl border border-indigo-50">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0 shadow-[0_0_8px_rgba(79,70,229,0.5)]"></div>
                  <span>**Giao diện Tinh tế**: Tăng độ tương phản chữ, gỡ bỏ các chỉ dẫn rườm rà cho trải nghiệm tối giản.</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Version 2.0.0 */}
          <div className="relative pl-14 group">
            <div className="absolute left-0 top-1.5 w-12 h-12 rounded-2xl bg-blue-600 border-4 border-white shadow-xl flex items-center justify-center z-10 transform group-hover:scale-110 transition-transform">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="p-6 rounded-[2rem] bg-white border border-slate-200/60 shadow-lg shadow-blue-900/5 group-hover:border-blue-200 transition-colors">
              <div className="flex items-center justify-between mb-4">
                <div className="font-black text-slate-800 text-xl tracking-tighter">v2.0.0-PRO-MAX <span className="ml-2 text-blue-600">★</span></div>
                <time className="text-xs text-blue-500 font-black uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full">15/05/2026</time>
              </div>
              <ul className="text-slate-500 text-sm font-medium space-y-2.5">
                <li className="flex items-start gap-2.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0"></div>
                  <span>Đột phá giao diện với phong cách **Light Glassmorphism** cao cấp.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0"></div>
                  <span>Tích hợp **Database Bloatware** thông minh (Xiaomi/Samsung/Google).</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0"></div>
                  <span>Nâng cấp **Thanh Thao tác (Selection Bar)** hỗ trợ xử lý hàng loạt siêu tốc.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0"></div>
                  <span>Cải tiến bộ lọc tìm kiếm với cơ chế **Debounce 300ms** mượt mà.</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Version 1.0.0 */}
          <div className="relative pl-14 group opacity-70 hover:opacity-100 transition-opacity">
            <div className="absolute left-0 top-1.5 w-12 h-12 rounded-2xl bg-slate-200 border-4 border-white shadow-md flex items-center justify-center z-10">
              <Package className="w-5 h-5 text-slate-500" />
            </div>
            <div className="p-6 rounded-[2rem] bg-slate-50/50 border border-slate-200/60">
              <div className="flex items-center justify-between mb-4">
                <div className="font-black text-slate-800 text-xl tracking-tighter">v1.0.0-BETA</div>
                <time className="text-xs text-slate-400 font-black uppercase tracking-widest">01/05/2026</time>
              </div>
              <ul className="text-slate-500 text-sm font-medium space-y-2 list-inside list-disc">
                <li>Bản phát hành đầu tiên hỗ trợ kết nối USB/WiFi.</li>
                <li>Quản lý ứng dụng cơ bản.</li>
              </ul>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
