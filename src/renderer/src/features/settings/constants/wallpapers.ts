export interface WallpaperPreset {
  id: string;
  name: string;
  category: string;
  description: string;
  gradient: string;
  previewColors: string;
  badge: string;
}

export const WALLPAPER_PRESETS: WallpaperPreset[] = [
  {
    id: "aurora",
    name: "Cực Quang (Aurora)",
    category: "Thiên Nhiên Kỳ Vĩ",
    description: "Làn sóng lụa ngọc lục bảo và xanh thiên thanh bồng bềnh",
    gradient:
      "radial-gradient(ellipse at 20% 0%, rgba(16, 185, 129, 0.75), transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(6, 182, 212, 0.7), transparent 50%), radial-gradient(ellipse at 50% 80%, rgba(99, 102, 241, 0.85), transparent 55%), radial-gradient(ellipse at 0% 100%, rgba(15, 23, 42, 0.95), transparent 60%), linear-gradient(135deg, #064e3b 0%, #0f172a 100%)",
    previewColors: "from-emerald-400 via-teal-500 to-indigo-600",
    badge: "Phổ Biến",
  },
  {
    id: "cyberpunk",
    name: "Neon Cyberpunk",
    category: "Công Nghệ Tương Lai",
    description: "Ánh sáng neon tím huyền ảo, fuchsia và xanh sapphire sắc nét",
    gradient:
      "radial-gradient(circle at 10% 20%, rgba(236, 72, 153, 0.8), transparent 45%), radial-gradient(circle at 90% 80%, rgba(139, 92, 246, 0.8), transparent 50%), radial-gradient(circle at 50% 50%, rgba(59, 130, 246, 0.65), transparent 50%), linear-gradient(140deg, #18052e 0%, #030712 100%)",
    previewColors: "from-pink-500 via-purple-600 to-blue-600",
    badge: "Hot",
  },
  {
    id: "sunset",
    name: "Hoàng Hôn (Sunset Glow)",
    category: "Ấm Áp & Nghệ Thuật",
    description: "Gam màu cam đào, hồng san hô và tím hoàng hôn lắng đọng",
    gradient:
      "radial-gradient(circle at 80% 10%, rgba(245, 158, 11, 0.85), transparent 45%), radial-gradient(circle at 20% 40%, rgba(244, 63, 94, 0.8), transparent 50%), radial-gradient(circle at 60% 90%, rgba(124, 58, 237, 0.8), transparent 55%), linear-gradient(135deg, #450a0a 0%, #1e1b4b 100%)",
    previewColors: "from-amber-400 via-rose-500 to-purple-700",
    badge: "Ấm Áp",
  },
  {
    id: "oceanic",
    name: "Hải Vương (Deep Oceanic)",
    category: "Thanh Mát & Tập Trung",
    description: "Đại dương sâu thẳm với sắc xanh lam bảo và ngọc bích êm dịu",
    gradient:
      "radial-gradient(circle at 30% 20%, rgba(20, 184, 166, 0.75), transparent 45%), radial-gradient(circle at 75% 60%, rgba(2, 132, 199, 0.85), transparent 50%), radial-gradient(circle at 10% 80%, rgba(29, 78, 216, 0.8), transparent 50%), linear-gradient(145deg, #042f2e 0%, #020617 100%)",
    previewColors: "from-teal-400 via-cyan-600 to-blue-700",
    badge: "Thư Giãn",
  },
  {
    id: "cosmic",
    name: "Vũ Trụ (Cosmic Galaxy)",
    category: "Huyền Bí & Chiều Sâu",
    description: "Tinh vân ngân hà thăm thẳm với dải ánh sáng sao đêm tĩnh lặng",
    gradient:
      "radial-gradient(circle at 70% 15%, rgba(147, 51, 234, 0.7), transparent 45%), radial-gradient(circle at 25% 70%, rgba(79, 70, 229, 0.7), transparent 50%), radial-gradient(circle at 85% 85%, rgba(219, 39, 119, 0.55), transparent 45%), linear-gradient(160deg, #090314 0%, #020617 100%)",
    previewColors: "from-purple-600 via-indigo-900 to-slate-950",
    badge: "Tối Ưu Tối",
  },
  {
    id: "minimal",
    name: "Pastel Mesh (Minimalist)",
    category: "Tối Giản Hiện Đại",
    description: "Lớp lưới gradient pastel thanh tao, nhẹ nhàng cho mắt",
    gradient:
      "radial-gradient(circle at 20% 20%, rgba(148, 163, 184, 0.55), transparent 50%), radial-gradient(circle at 80% 30%, rgba(56, 189, 248, 0.5), transparent 45%), radial-gradient(circle at 50% 80%, rgba(168, 85, 247, 0.45), transparent 50%), linear-gradient(135deg, #334155 0%, #0f172a 100%)",
    previewColors: "from-slate-400 via-sky-400 to-indigo-400",
    badge: "Thanh Lịch",
  },
];
