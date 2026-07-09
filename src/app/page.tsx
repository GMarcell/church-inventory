"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePermission } from "@/lib/use-permission";

type Category = { id: string; name: string; description: string | null; _count?: { assets: number } };
type Location = { id: string; name: string; description: string | null; _count?: { assets: number } };
type Asset = {
  id: string;
  name: string;
  description: string | null;
  quantity: number;
  barcode: string;
  categoryId: string | null;
  locationId: string | null;
  category: Category | null;
  location: Location | null;
  createdAt: string;
  updatedAt: string;
};

export default function Home() {
  const { data: session, status } = useSession();
  const perm = usePermission();
  const router = useRouter();

  const [assets, setAssets] = useState<Asset[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [showCategories, setShowCategories] = useState(false);
  const [showLocations, setShowLocations] = useState(false);
  const [barcodePreview, setBarcodePreview] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formQuantity, setFormQuantity] = useState(1);
  const [formCategoryId, setFormCategoryId] = useState("");
  const [formLocationId, setFormLocationId] = useState("");
  const [formBarcode, setFormBarcode] = useState("");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  // Category/Location form
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newLocationName, setNewLocationName] = useState("");
  const [categoryError, setCategoryError] = useState("");
  const [locationError, setLocationError] = useState("");

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doFetchAssets = useCallback(async (searchTerm: string) => {
    try {
      const params = searchTerm ? `?search=${encodeURIComponent(searchTerm)}` : "";
      const res = await fetch(`/api/assets${params}`);
      if (res.ok) setAssets(await res.json());
    } catch {
      console.error("Failed to fetch assets");
    }
  }, []);

  const fetchAssets = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      doFetchAssets(search);
    }, 300);
  }, [search, doFetchAssets]);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/categories");
      if (res.ok) setCategories(await res.json());
    } catch {
      console.error("Failed to fetch categories");
    }
  }, []);

  const fetchLocations = useCallback(async () => {
    try {
      const res = await fetch("/api/locations");
      if (res.ok) setLocations(await res.json());
    } catch {
      console.error("Failed to fetch locations");
    }
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (status !== "authenticated") return;

    // Initial load
    const initialLoad = async () => {
      await Promise.all([
        doFetchAssets(""),
        fetchCategories(),
        fetchLocations(),
      ]);
      setLoading(false);
    };
    initialLoad();
  }, [fetchCategories, fetchLocations, doFetchAssets, status, router]);

  const refreshAll = useCallback(() => {
    doFetchAssets(search);
    fetchCategories();
    fetchLocations();
  }, [doFetchAssets, search, fetchCategories, fetchLocations]);

  const generateBarcode = useCallback(async () => {
    const code = `CH-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    setFormBarcode(code);

    // Preview the barcode
    try {
      const res = await fetch("/api/barcode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: code }),
      });
      if (res.ok) {
        const blob = await res.blob();
        setBarcodePreview(URL.createObjectURL(blob));
      }
    } catch {
      // Ignore preview errors
    }
  }, []);

  const loadBarcodePreview = useCallback(async (code: string) => {
    if (!code) {
      setBarcodePreview(null);
      return;
    }
    try {
      const res = await fetch("/api/barcode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: code }),
      });
      if (res.ok) {
        const blob = await res.blob();
        setBarcodePreview(URL.createObjectURL(blob));
      }
    } catch {
      setBarcodePreview(null);
    }
  }, []);

  const openAddForm = useCallback(() => {
    setEditingAsset(null);
    setFormName("");
    setFormDescription("");
    setFormQuantity(1);
    setFormCategoryId("");
    setFormLocationId("");
    setFormBarcode("");
    setBarcodePreview(null);
    setFormError("");
    setShowForm(true);
  }, []);

  const openEditForm = useCallback((asset: Asset) => {
    setEditingAsset(asset);
    setFormName(asset.name);
    setFormDescription(asset.description || "");
    setFormQuantity(asset.quantity);
    setFormCategoryId(asset.categoryId || "");
    setFormLocationId(asset.locationId || "");
    setFormBarcode(asset.barcode);
    setFormError("");
    setShowForm(true);
    loadBarcodePreview(asset.barcode);
  }, [loadBarcodePreview]);

  const handleSave = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setSaving(true);
      setFormError("");

      try {
        const body = {
          name: formName,
          description: formDescription || null,
          quantity: formQuantity,
          categoryId: formCategoryId || null,
          locationId: formLocationId || null,
          barcode: formBarcode || undefined,
        };

        const url = editingAsset
          ? `/api/assets/${editingAsset.id}`
          : "/api/assets";
        const method = editingAsset ? "PUT" : "POST";

        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const err = await res.json();
          setFormError(err.error || "Failed to save asset");
          return;
        }

        setShowForm(false);
        setEditingAsset(null);
        refreshAll();
      } catch {
        setFormError("Failed to save asset");
      } finally {
        setSaving(false);
      }
    },
    [
      formName,
      formDescription,
      formQuantity,
      formCategoryId,
      formLocationId,
      formBarcode,
      editingAsset,
      refreshAll,
    ]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm("Are you sure you want to delete this asset?")) return;
      try {
        const res = await fetch(`/api/assets/${id}`, { method: "DELETE" });
        if (res.ok) refreshAll();
      } catch {
        console.error("Failed to delete asset");
      }
    },
    [refreshAll]
  );

  const handleAddCategory = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setCategoryError("");
      try {
        const res = await fetch("/api/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: newCategoryName }),
        });
        if (!res.ok) {
          const err = await res.json();
          setCategoryError(err.error || "Failed to create category");
          return;
        }
        setNewCategoryName("");
        fetchCategories();
      } catch {
        setCategoryError("Failed to create category");
      }
    },
    [newCategoryName, fetchCategories]
  );

  const handleAddLocation = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setLocationError("");
      try {
        const res = await fetch("/api/locations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: newLocationName }),
        });
        if (!res.ok) {
          const err = await res.json();
          setLocationError(err.error || "Failed to create location");
          return;
        }
        setNewLocationName("");
        fetchLocations();
      } catch {
        setLocationError("Failed to create location");
      }
    },
    [newLocationName, fetchLocations]
  );

  const printBarcode = useCallback((barcode: string) => {
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html><head><title>Print Barcode - ${barcode}</title>
      <style>body{display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;flex-direction:column;font-family:sans-serif;}
      img{max-width:100%;height:auto;margin-bottom:24px;}
      .barcode-text{font-size:14px;color:#666;margin-bottom:32px;}
      @media print{body{margin:0;padding:0;}}</style></head>
      <body>
        <img src="/api/barcode" id="barcode-img" />
        <div class="barcode-text">${barcode}</div>
        <script>
          fetch('/api/barcode', {
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body:JSON.stringify({text:'${barcode}'})
          }).then(r=>r.blob()).then(blob=>{
            const url=URL.createObjectURL(blob);
            document.getElementById('barcode-img').src=url;
            setTimeout(()=>{window.print();},500);
          });
        </scr' + 'ipt>
      </body></html>
    `);
    win.document.close();
  }, []);

  return (
    <div className="min-h-full">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-900 to-blue-700 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-3">
                <svg className="w-8 h-8 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                Church Inventory Manager
              </h1>
              <p className="text-blue-200 text-sm mt-1">
                Track assets, manage locations, and generate barcodes
              </p>
            </div>
            <div className="flex items-center gap-2">
              {perm.can("categories", "read") && (
                <button
                  onClick={() => { setShowCategories(true); setShowLocations(false); }}
                  className="px-3 py-2 text-sm bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
                >
                  Categories
                </button>
              )}
              {perm.can("locations", "read") && (
                <button
                  onClick={() => { setShowLocations(true); setShowCategories(false); }}
                  className="px-3 py-2 text-sm bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
                >
                  Locations
                </button>
              )}
              {perm.can("assets", "create") && (
                <button
                  onClick={openAddForm}
                  className="px-4 py-2 text-sm font-medium bg-amber-500 hover:bg-amber-400 text-blue-900 rounded-lg transition-colors shadow-md"
                >
                  + Add Asset
                </button>
              )}
              {perm.isAdmin && (
                <Link
                  href="/users"
                  className="px-3 py-2 text-sm bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
                >
                  Users
                </Link>
              )}
              {session?.user && (
                <div className="flex items-center gap-2 ml-2 pl-2 border-l border-blue-500/30">
                  <span className="text-xs text-blue-200 hidden sm:inline">
                    {session.user.name || session.user.email}
                  </span>
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded uppercase tracking-wider ${
                    perm.role === "admin" ? "bg-amber-400 text-blue-900" :
                    perm.role === "editor" ? "bg-green-500 text-white" :
                    "bg-slate-500 text-white"
                  }`}>
                    {perm.role}
                  </span>
                  <button
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    className="px-3 py-2 text-sm bg-blue-700 hover:bg-blue-600 rounded-lg transition-colors"
                    title="Sign out"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search assets by name, description, or barcode..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow text-sm"
            />
          </div>
        </div>

        {/* Stats */}
        {!loading && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
              <div className="text-xs text-slate-500 font-medium uppercase tracking-wider">Total Assets</div>
              <div className="text-2xl font-bold text-slate-800 mt-1">{assets.length}</div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
              <div className="text-xs text-slate-500 font-medium uppercase tracking-wider">Categories</div>
              <div className="text-2xl font-bold text-slate-800 mt-1">{categories.length}</div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
              <div className="text-xs text-slate-500 font-medium uppercase tracking-wider">Locations</div>
              <div className="text-2xl font-bold text-slate-800 mt-1">{locations.length}</div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
              <div className="text-xs text-slate-500 font-medium uppercase tracking-wider">Total Items</div>
              <div className="text-2xl font-bold text-slate-800 mt-1">
                {assets.reduce((sum, a) => sum + a.quantity, 0)}
              </div>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-700" />
          </div>
        )}

        {/* Assets Grid */}
        {!loading && (
          <>
            {assets.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-xl shadow-sm border border-slate-100">
                <svg className="mx-auto w-16 h-16 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <h3 className="mt-4 text-lg font-medium text-slate-600">No assets yet</h3>
                <p className="mt-1 text-sm text-slate-400">
                  {search ? "No assets match your search." : "Start by adding your first asset."}
                </p>
                {!search && perm.can("assets", "create") && (
                  <button
                    onClick={openAddForm}
                    className="mt-4 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors"
                  >
                    Add Your First Asset
                  </button>
                )}
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {assets.map((asset) => (
                  <div
                    key={asset.id}
                    className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 hover:shadow-md transition-shadow animate-fade-in"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-slate-800 truncate">
                          {asset.name}
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5 font-mono">
                          {asset.barcode}
                        </p>
                      </div>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 ml-2">
                        Qty: {asset.quantity}
                      </span>
                    </div>

                    {asset.description && (
                      <p className="text-sm text-slate-500 mb-3 line-clamp-2">
                        {asset.description}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-2 mb-3">
                      {asset.category && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs bg-indigo-50 text-indigo-700">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                          </svg>
                          {asset.category.name}
                        </span>
                      )}
                      {asset.location && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs bg-emerald-50 text-emerald-700">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          {asset.location.name}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-slate-50">
                      <button
                        onClick={() => printBarcode(asset.barcode)}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        Barcode
                      </button>
                      {perm.can("assets", "update") && (
                        <button
                          onClick={() => openEditForm(asset)}
                          className="flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      )}
                      {perm.can("assets", "delete") && (
                        <button
                          onClick={() => handleDelete(asset.id)}
                          className="flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* Add/Edit Asset Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-slide-in" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {editingAsset ? "Edit Asset" : "Add New Asset"}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSave} className="px-6 py-4 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                  placeholder="Asset name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm resize-none"
                  placeholder="Optional description"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Quantity</label>
                  <input
                    type="number"
                    min={1}
                    value={formQuantity}
                    onChange={(e) => setFormQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                  <select
                    value={formCategoryId}
                    onChange={(e) => setFormCategoryId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm bg-white"
                  >
                    <option value="">No category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
                <select
                  value={formLocationId}
                  onChange={(e) => setFormLocationId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm bg-white"
                >
                  <option value="">No location</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Barcode</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formBarcode}
                    onChange={(e) => { setFormBarcode(e.target.value); loadBarcodePreview(e.target.value); }}
                    className="flex-1 px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm font-mono"
                    placeholder="Auto-generated barcode"
                  />
                  <button
                    type="button"
                    onClick={generateBarcode}
                    className="px-3 py-2 text-sm bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors font-medium"
                  >
                    Generate
                  </button>
                </div>
                {barcodePreview && (
                  <div className="mt-2 p-2 bg-white border border-slate-100 rounded-lg inline-block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={barcodePreview} alt={`Barcode for ${formBarcode}`} className="h-16" />
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !formName.trim()}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 disabled:bg-blue-300 rounded-lg transition-colors"
                >
                  {saving ? "Saving..." : editingAsset ? "Update Asset" : "Add Asset"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Categories Modal */}
      {showCategories && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowCategories(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-slide-in" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Manage Categories</h2>
              <button onClick={() => setShowCategories(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-6 py-4">
              {perm.can("categories", "create") && (
                <form onSubmit={handleAddCategory} className="flex gap-2 mb-4">
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="New category name"
                    className="flex-1 px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                  />
                  <button
                    type="submit"
                    disabled={!newCategoryName.trim()}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 disabled:bg-blue-300 rounded-lg transition-colors"
                  >
                    Add
                  </button>
                </form>
              )}
              {categoryError && (
                <p className="text-sm text-red-600 mb-3">{categoryError}</p>
              )}
              <div className="space-y-2">
                {categories.map((cat) => (
                  <div key={cat.id} className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-lg">
                    <div>
                      <span className="text-sm font-medium text-slate-700">{cat.name}</span>
                      {cat._count && (
                        <span className="ml-2 text-xs text-slate-400">({cat._count.assets} assets)</span>
                      )}
                    </div>
                  </div>
                ))}
                {categories.length === 0 && (
                  <p className="text-sm text-slate-400 text-center py-4">No categories yet</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Locations Modal */}
      {showLocations && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowLocations(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-slide-in" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Manage Locations</h2>
              <button onClick={() => setShowLocations(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-6 py-4">
              {perm.can("locations", "create") && (
                <form onSubmit={handleAddLocation} className="flex gap-2 mb-4">
                  <input
                    type="text"
                    value={newLocationName}
                    onChange={(e) => setNewLocationName(e.target.value)}
                    placeholder="New location name"
                    className="flex-1 px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                  />
                  <button
                    type="submit"
                    disabled={!newLocationName.trim()}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 disabled:bg-blue-300 rounded-lg transition-colors"
                  >
                    Add
                  </button>
                </form>
              )}
              {locationError && (
                <p className="text-sm text-red-600 mb-3">{locationError}</p>
              )}
              <div className="space-y-2">
                {locations.map((loc) => (
                  <div key={loc.id} className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-lg">
                    <div>
                      <span className="text-sm font-medium text-slate-700">{loc.name}</span>
                      {loc._count && (
                        <span className="ml-2 text-xs text-slate-400">({loc._count.assets} assets)</span>
                      )}
                    </div>
                  </div>
                ))}
                {locations.length === 0 && (
                  <p className="text-sm text-slate-400 text-center py-4">No locations yet</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
