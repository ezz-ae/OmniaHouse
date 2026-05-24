'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface Room {
  name: string;
  slug: string;
}

interface ProductResult {
  sku: string;
  title: string;
  price_aed: number;
}

interface FileResult {
  id: string;
  name: string;
  visibility: string;
}

interface RecentItem {
  type: 'room' | 'product';
  slug: string;
  name: string;
  price?: number;
}

export function CommandBar({ rooms }: { rooms: Room[] }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [products, setProducts] = useState<ProductResult[]>([]);
  const [files, setFiles] = useState<FileResult[]>([]);
  const [recent, setRecent] = useState<RecentItem[]>([]);
  const router = useRouter();
  const supabase = createClientComponentClient();

  useEffect(() => {
    const saved = localStorage.getItem('omnia-recent');
    if (saved) setRecent(JSON.parse(saved));
  }, []);

  const addToRecent = (item: RecentItem) => {
    const updated = [item, ...recent.filter((r) => r.slug !== item.slug)].slice(0, 5);
    setRecent(updated);
    localStorage.setItem('omnia-recent', JSON.stringify(updated));
  };

  useEffect(() => {
    if (search.length < 2) {
      setProducts([]);
      setFiles([]);
      return;
    }
    const fetchResults = async () => {
      const [prodRes, fileRes] = await Promise.all([
        supabase.from('products').select('sku, title, price_aed').ilike('title', `%${search}%`).limit(5),
        supabase.from('drive_files').select('id, name, visibility').ilike('name', `%${search}%`).limit(3)
      ]);
      
      if (prodRes.data) setProducts(prodRes.data);
      if (fileRes.data) setFiles(fileRes.data);
    };
    fetchResults();
  }, [search, supabase]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const filteredRooms = rooms.filter((room) =>
    room.name.toLowerCase().includes(search.toLowerCase())
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-slate-900/50 backdrop-blur-sm" onClick={() => setOpen(false)}>
      <div 
        className="w-full max-w-xl bg-white rounded-xl shadow-2xl border overflow-hidden animate-in fade-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b">
          <input
            autoFocus
            placeholder="Search rooms or actions... (Esc to close)"
            className="w-full text-lg outline-none"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="max-h-96 overflow-y-auto p-2">
          {filteredRooms.length > 0 && <div className="text-[10px] font-bold text-slate-400 uppercase px-3 py-2">Rooms</div>}
          {filteredRooms.map((room) => (
            <button
              key={room.slug}
              className="w-full text-left px-3 py-3 rounded-lg hover:bg-slate-100 flex items-center justify-between group"
              onClick={() => {
                addToRecent({ type: 'room', slug: room.slug, name: room.name });
                router.push(`/${room.slug}`);
                setOpen(false);
              }}
            >
              <span className="font-medium text-slate-700">{room.name}</span>
              <span className="text-xs text-slate-400 group-hover:text-slate-600">Enter Room ↵</span>
            </button>
          ))}

          {products.length > 0 && (
            <>
              <div className="text-[10px] font-bold text-slate-400 uppercase px-3 py-2 mt-2">Products</div>
              {products.map((product) => (
                <button
                  key={product.sku}
                  className="w-full text-left px-3 py-3 rounded-lg hover:bg-slate-100 flex items-center justify-between group"
                  onClick={() => {
                    addToRecent({ type: 'product', slug: product.sku, name: product.title, price: product.price_aed });
                    router.push(`/inventory?sku=${product.sku}`);
                    setOpen(false);
                  }}
                >
                  <div className="flex flex-col">
                    <span className="font-medium text-slate-700 text-sm">{product.title}</span>
                    <span className="text-[10px] text-slate-400 font-mono uppercase">{product.sku}</span>
                  </div>
                  <span className="text-xs font-bold text-slate-900">{product.price_aed} AED</span>
                </button>
              ))}
            </>
          )}

          {files.length > 0 && (
            <>
              <div className="text-[10px] font-bold text-slate-400 uppercase px-3 py-2 mt-2">Files (The Safe)</div>
              {files.map((file) => (
                <button
                  key={file.id}
                  className="w-full text-left px-3 py-3 rounded-lg hover:bg-slate-100 flex items-center justify-between group"
                  onClick={() => {
                    router.push(`/drive-room?fileId=${file.id}`);
                    setOpen(false);
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs">📄</span>
                    <div className="flex flex-col">
                      <span className="font-medium text-slate-700 text-sm">{file.name}</span>
                      <span className="text-[10px] text-slate-400 uppercase font-mono">{file.visibility} Access</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-blue-600 font-bold uppercase">Open Safe</span>
                </button>
              ))}
            </>
          )}

          {!search && recent.length > 0 && (
            <>
              <div className="text-[10px] font-bold text-slate-400 uppercase px-3 py-2">Recently Viewed</div>
              {recent.map((item) => (
                <button
                  key={item.slug}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100 flex items-center justify-between group"
                  onClick={() => {
                    const path = item.type === 'room' ? `/${item.slug}` : `/inventory?sku=${item.slug}`;
                    router.push(path);
                    setOpen(false);
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs">{item.type === 'room' ? '🚪' : '💎'}</span>
                    <div className="flex flex-col">
                      <span className="font-medium text-slate-700 text-sm">{item.name}</span>
                      {item.type === 'product' && <span className="text-[10px] text-slate-400 font-mono uppercase">{item.slug}</span>}
                    </div>
                  </div>
                  {item.price && <span className="text-xs text-slate-500">{item.price} AED</span>}
                </button>
              ))}
            </>
          )}

          {search && filteredRooms.length === 0 && products.length === 0 && (
            <div className="p-8 text-center text-slate-400 text-sm">
              No results found for "{search}"
            </div>
          )}
        </div>
        <div className="p-3 bg-slate-50 border-t flex justify-between items-center text-[10px] text-slate-400 font-medium">
          <div className="flex gap-4">
            <span><kbd className="border px-1 rounded bg-white">↑↓</kbd> Navigate</span>
            <span><kbd className="border px-1 rounded bg-white">Enter</kbd> Select</span>
          </div>
          <span>OmniaHouse QuickSearch</span>
        </div>
      </div>
    </div>
  );
}