import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/axios";

interface Category {
    _id: string;
    name: string;
    slug: string;
    imageUrl?: string;
}



// Kích thước card cố định - tất cả tính theo px tuyệt đối
const CARD_H = 220;
const CARD_W = 200;
const MARGIN = 18; // marginBottom trên mỗi card - slot = CARD_H + MARGIN
const SLOT = CARD_H + MARGIN;

// Tốc độ px/s - càng lớn càng nhanh
const SPEED = 14;

// Đủ item để luôn fill màn hình dù góc isometric
const REPEAT = 10;

// animation-delay âm tạo visual offset ban đầu cho từng cột (giây)
const COL_DELAYS = [0, -6, -3];

export function ThreeDMarqueeSection() {
    const [categories, setCategories] = useState<Category[]>([]);
    const navigate = useNavigate();

    useEffect(() => {
        api
            .get("/api/categories")
            .then((res) => setCategories(res.data?.data || []))
            .catch(() => { });
    }, []);

    if (categories.length === 0) {
        return (
            <div
                className="w-full h-full rounded-2xl"
                style={{ background: "linear-gradient(135deg, #f0f4ff 0%, #e8f0fe 50%, #f5f0ff 100%)" }}
            />
        );
    }

    const chunkSize = Math.max(2, Math.ceil(categories.length / 3));
    const bases = [
        categories.slice(0, chunkSize),
        categories.slice(chunkSize, chunkSize * 2),
        categories.slice(chunkSize * 2, chunkSize * 3),
    ].map(b => b.length > 0 ? b : categories);

    // scrollPx = chiều cao đúng 1 set gốc → khi animate -scrollPx thì loop hoàn hảo
    const cols = bases.map(src => ({
        items: Array.from({ length: REPEAT }, () => src).flat(),
        scrollPx: src.length * SLOT,
    }));

    // Tạo CSS keyframes riêng cho mỗi cột với pixel chính xác
    const styles = cols.map((col, i) => {
        const dur = col.scrollPx / SPEED;
        const delay = COL_DELAYS[i];
        return `
@keyframes marquee${i} {
  from { transform: translateY(0px); }
  to   { transform: translateY(-${col.scrollPx}px); }
}
.iso-track-${i} {
  animation: marquee${i} ${dur}s linear ${delay}s infinite;
  will-change: transform;
}`;
    }).join("\n");

    return (
        <div
            className="w-full h-full rounded-2xl overflow-hidden relative"
            style={{ background: "linear-gradient(135deg, #f0f4ff 0%, #e8f0fe 50%, #f5f0ff 100%)" }}
        >
            <style>{`
        ${styles}
        .iso-card {
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          border: 2px solid rgba(99,102,241,0.45);
          box-shadow: 0 4px 16px rgba(99,102,241,0.15);
          transition: transform 0.25s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.25s ease;
          cursor: pointer;
          background: rgba(255,255,255,0.35);
        }
        .iso-card:hover {
          transform: scale(1.08);
          box-shadow: 0 8px 24px rgba(99,102,241,0.28);
        }
      `}</style>

            {/* isometric grid */}
            <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
                <div
                    style={{
                        transform: "rotateX(55deg) rotateY(0deg) rotateZ(-45deg)",
                        transformStyle: "preserve-3d",
                        display: "flex",
                        gap: "16px",
                        padding: "16px",
                    }}
                >
                    {cols.map((col, colIdx) => (
                        // KHÔNG dùng overflow:hidden trên wrapper cột - sẽ phá vỡ 3D clipping
                        <div key={colIdx} style={{ display: "flex", flexDirection: "column" }}>
                            <div
                                className={`iso-track-${colIdx}`}
                                style={{ display: "flex", flexDirection: "column" }}
                            >
                                {col.items.map((cat, idx) => (
                                    <div
                                        key={`${cat._id}-${colIdx}-${idx}`}
                                        className="iso-card shrink-0 rounded-xl flex flex-col items-center justify-center gap-1 p-3"
                                        style={{
                                            background: "rgba(255,255,255,0.85)",
                                            width: `${CARD_W}px`,
                                            height: `${CARD_H}px`,
                                            marginBottom: `${MARGIN}px`,
                                        }}
                                        onClick={() => navigate(`/products?categories=${cat.slug}`)}
                                    >
                                        <div className="w-20 h-20 rounded-2xl bg-slate-50 overflow-hidden flex items-center justify-center border border-indigo-100 shrink-0 shadow-sm">
                                            {cat.imageUrl ? (
                                                <img
                                                    src={cat.imageUrl}
                                                    alt={cat.name}
                                                    className="w-full h-full object-cover"
                                                    loading="lazy"
                                                />
                                            ) : (
                                                <span className="text-3xl font-extrabold text-indigo-500">
                                                    {cat.name.charAt(0).toUpperCase()}
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-slate-700 text-[20px] font-bold text-center line-clamp-2 leading-tight mt-2">
                                            {cat.name}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <p className="absolute top-3 left-4 text-slate-400 text-[9px] font-semibold uppercase tracking-widest z-10">
                Shop by Category
            </p>
        </div>
    );
}
