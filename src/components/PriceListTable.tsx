"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { 
  Search, 
  Building2, 
  Layers, 
  Plus, 
  Filter, 
  Tag, 
  DollarSign, 
  ArrowUpRight,
  Edit3,
  Trash2,
  X,
  Loader2,
  CheckCircle2,
  PackagePlus,
  RefreshCw
} from "lucide-react";
import { PRICE_LIST_ITEMS, CATEGORIES, PriceListItem } from "@/data/priceList";
import { useLanguage } from "@/lib/i18n";

export default function PriceListTable() {
  const { language, isRtl } = useLanguage();
  const [items, setItems] = useState<PriceListItem[]>(PRICE_LIST_ITEMS);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedSupplier, setSelectedSupplier] = useState<string>("ALL");

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<PriceListItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    id: "",
    category: "ACCESSORIES",
    customCategory: "",
    supplier: "رواد سمارت",
    description: "",
    cost: "",
    unitPrice: "",
    unit: "Pcs",
  });

  // Load items from API / DB
  const fetchItems = async () => {
    try {
      setRefreshing(true);
      const res = await fetch("/api/items");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setItems(data);
        }
      }
    } catch (err) {
      console.warn("Error fetching items, using fallback catalog:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  // Compute unique suppliers
  const suppliers = useMemo(() => {
    const list = Array.from(new Set(items.map((i) => i.supplier).filter(Boolean)));
    return ["ALL", ...list];
  }, [items]);

  // Compute unique categories combining predefined + custom in items
  const allCategories = useMemo(() => {
    const fromItems = items.map((i) => i.category).filter(Boolean);
    const set = new Set(["ALL", ...CATEGORIES.filter(c => c !== "ALL"), ...fromItems]);
    return Array.from(set);
  }, [items]);

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchCat = selectedCategory === "ALL" || item.category === selectedCategory;
      const matchSup = selectedSupplier === "ALL" || item.supplier === selectedSupplier;
      const q = search.toLowerCase().trim();
      const matchSearch =
        !q ||
        (item.description && item.description.toLowerCase().includes(q)) ||
        (item.category && item.category.toLowerCase().includes(q)) ||
        (item.supplier && item.supplier.toLowerCase().includes(q));
      return matchCat && matchSup && matchSearch;
    });
  }, [items, search, selectedCategory, selectedSupplier]);

  // Open modal for new item
  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormData({
      id: `prod-${Date.now()}`,
      category: "BULLET CAMERA",
      customCategory: "",
      supplier: "رواد سمارت",
      description: "",
      cost: "",
      unitPrice: "",
      unit: "Pcs",
    });
    setShowModal(true);
  };

  // Open modal for editing existing item
  const handleOpenEdit = (item: PriceListItem) => {
    setEditingItem(item);
    const isStandardCat = CATEGORIES.includes(item.category as any);
    setFormData({
      id: item.id,
      category: isStandardCat ? item.category : "OTHER",
      customCategory: isStandardCat ? "" : item.category,
      supplier: item.supplier || "",
      description: item.description,
      cost: item.cost.toString(),
      unitPrice: item.unitPrice.toString(),
      unit: item.unit || "Pcs",
    });
    setShowModal(true);
  };

  // Save (Create or Update) Item
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.description.trim()) {
      alert(language === "ar" ? "يرجى كتابة اسم أو وصف الصنف" : "Please enter item description");
      return;
    }

    const finalCategory = 
      formData.category === "OTHER" 
        ? (formData.customCategory.trim() || "GENERAL") 
        : formData.category;

    const itemToSave: PriceListItem = {
      id: formData.id || `prod-${Date.now()}`,
      category: finalCategory,
      supplier: formData.supplier.trim() || "رواد سمارت",
      description: formData.description.trim(),
      cost: Number(formData.cost) || 0,
      unitPrice: Number(formData.unitPrice) || 0,
      unit: formData.unit.trim() || "Pcs",
    };

    setIsSaving(true);
    try {
      const res = await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(itemToSave),
      });

      if (!res.ok) {
        throw new Error("فشل حفظ الصنف في قاعدة البيانات");
      }

      // Update state
      setItems((prev) => {
        const existingIdx = prev.findIndex((i) => i.id === itemToSave.id);
        if (existingIdx >= 0) {
          const next = [...prev];
          next[existingIdx] = itemToSave;
          return next;
        } else {
          return [itemToSave, ...prev];
        }
      });

      setShowModal(false);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "حدث خطأ أثناء حفظ الصنف");
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Item
  const handleDeleteItem = async (id: string, description: string) => {
    const confirmMsg = language === "ar"
      ? `هل أنت متأكد من حذف الصنف:\n"${description.substring(0, 40)}..."؟`
      : `Are you sure you want to delete this item?`;

    if (!confirm(confirmMsg)) return;

    setIsDeletingId(id);
    try {
      const res = await fetch(`/api/items/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("فشل حذف الصنف");
      }

      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (err: any) {
      console.error(err);
      alert(err.message || "فشل حذف الصنف");
    } finally {
      setIsDeletingId(null);
    }
  };

  return (
    <div className="space-y-4" style={{ direction: isRtl ? "rtl" : "ltr" }}>
      {/* Top Header Actions Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 border border-slate-200 rounded-2xl shadow-xs">
        <div>
          <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
            <PackagePlus className="w-5 h-5 text-purple-700" />
            <span>{language === "ar" ? "دليل وأسعار أصناف رواد سمارت" : "Ruaad Smart Catalog & Price List"}</span>
            <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 text-xs font-mono font-bold">
              {items.length} {language === "ar" ? "صنف" : "items"}
            </span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {language === "ar"
              ? "إدارة الأصناف، الكاميرات، الكابلات، والملحقات مع أسعار التكلفة والبيع المعتمدة"
              : "Manage items, cameras, cables, accessories with approved cost and sell prices"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchItems}
            disabled={refreshing}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition cursor-pointer"
            title={language === "ar" ? "تحديث القائمة" : "Refresh"}
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-purple-700" : ""}`} />
          </button>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-4 py-2.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{language === "ar" ? "➕ إضافة صنف جديد" : "Add New Item"}</span>
          </button>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="p-4 bg-slate-50/80 border border-slate-200 rounded-xl space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className={`w-4 h-4 absolute top-3 ${isRtl ? "right-3" : "left-3"} text-slate-400 pointer-events-none`} />
            <input
              type="text"
              placeholder={
                language === "ar"
                  ? "ابحث عن صنف، موديل، وصف، أو مورد..."
                  : "Search item by model, description, or supplier..."
              }
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`w-full bg-white border border-slate-200 rounded-xl ${
                isRtl ? "pr-9 pl-4" : "pl-9 pr-4"
              } py-2 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600/20 shadow-sm`}
            />
          </div>

          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-slate-500 shrink-0" />
            <select
              value={selectedSupplier}
              onChange={(e) => setSelectedSupplier(e.target.value)}
              className="bg-white border border-slate-200 text-xs text-slate-700 rounded-xl px-3 py-2 outline-none focus:border-purple-600 shadow-sm"
            >
              <option value="ALL">{language === "ar" ? "كل الموردين" : "All Suppliers"}</option>
              {suppliers.filter((s) => s !== "ALL").map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Categories Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-thin">
          {allCategories.map((cat) => {
            const active = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-lg font-medium whitespace-nowrap transition-all cursor-pointer ${
                  active
                    ? "bg-purple-700 text-white shadow-sm"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                {cat === "ALL" ? (language === "ar" ? "الكل" : "ALL") : cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-sm">
        <table className="w-full text-left text-xs sm:text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[11px] uppercase tracking-wider font-semibold">
            <tr>
              <th className="py-3 px-4 w-12 text-center">#</th>
              <th className="py-3 px-4">{language === "ar" ? "التصنيف" : "Category"}</th>
              <th className="py-3 px-4">{language === "ar" ? "الوصف والموديل" : "Description & Model"}</th>
              <th className="py-3 px-4">{language === "ar" ? "المورد" : "Supplier"}</th>
              <th className="py-3 px-4 text-right">{language === "ar" ? "التكلفة (AED)" : "Cost (AED)"}</th>
              <th className="py-3 px-4 text-right">{language === "ar" ? "سعر البيع (AED)" : "Sell Price (AED)"}</th>
              <th className="py-3 px-4 text-center">{language === "ar" ? "الوحدة" : "Unit"}</th>
              <th className="py-3 px-4 text-center">{language === "ar" ? "إجراءات" : "Actions"}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-400">
                  {loading ? (
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin text-purple-600" />
                      <span>{language === "ar" ? "جاري تحميل الأصناف..." : "Loading catalog..."}</span>
                    </div>
                  ) : (
                    language === "ar" ? "لا توجد نتائج مطابقة" : "No matching items found"
                  )}
                </td>
              </tr>
            ) : (
              filteredItems.map((item, index) => (
                <tr key={item.id} className="hover:bg-purple-50/30 transition-colors group">
                  <td className="py-3 px-4 text-center text-slate-400 font-mono text-xs">
                    {index + 1}
                  </td>
                  <td className="py-3 px-4">
                    <span className="inline-block text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200/80">
                      {item.category}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-900 font-mono text-xs max-w-md whitespace-pre-line leading-relaxed">
                    {item.description}
                  </td>
                  <td className="py-3 px-4 text-slate-600 text-xs">
                    {item.supplier || "-"}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-medium text-slate-600">
                    {item.cost?.toLocaleString() || 0}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600">
                    {item.unitPrice?.toLocaleString() || 0}
                  </td>
                  <td className="py-3 px-4 text-center text-slate-600 font-mono text-xs">
                    {item.unit || "Pcs"}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(item)}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-purple-100 text-slate-600 hover:text-purple-700 transition"
                        title={language === "ar" ? "تعديل الصنف" : "Edit item"}
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteItem(item.id, item.description)}
                        disabled={isDeletingId === item.id}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-100 text-slate-600 hover:text-rose-700 transition disabled:opacity-40"
                        title={language === "ar" ? "حذف الصنف" : "Delete item"}
                      >
                        {isDeletingId === item.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </button>

                      <Link
                        href="/quotation/new"
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-purple-50 border border-purple-200 text-purple-700 hover:bg-purple-700 hover:text-white text-xs font-semibold transition-all shadow-xs"
                        title={language === "ar" ? "إنشاء عرض سعر جديد" : "Create New Quotation"}
                      >
                        <Plus className="w-3 h-3" />
                        <span className="text-[11px]">{language === "ar" ? "عرض سعر" : "Quote"}</span>
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-xs text-slate-500 px-2">
        <span>
          {language === "ar"
            ? `إجمالي الأصناف المعروضة: ${filteredItems.length} من أصل ${items.length}`
            : `Showing ${filteredItems.length} of ${items.length} items`}
        </span>
        <span className="text-slate-400">
          {language === "ar" ? "قائمة أسعار رواد سمارت المعتمدة" : "Ruaad Smart Approved Price List"}
        </span>
      </div>

      {/* Add / Edit Item Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <PackagePlus className="w-5 h-5 text-purple-700" />
                <span>
                  {editingItem 
                    ? (language === "ar" ? "تعديل بيانات الصنف" : "Edit Item") 
                    : (language === "ar" ? "إضافة صنف جديد لقائمة الأسعار" : "Add New Item to Catalog")}
                </span>
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {language === "ar" ? "التصنيف" : "Category"}
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-purple-600 bg-white cursor-pointer"
                  >
                    {CATEGORIES.filter(c => c !== "ALL").map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                    <option value="OTHER">{language === "ar" ? "➕ تصنيف آخر جديد" : "Other Category"}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {language === "ar" ? "المورد / الشركة" : "Supplier"}
                  </label>
                  <input
                    type="text"
                    value={formData.supplier}
                    onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                    placeholder="رواد سمارت / Hikvision / Dahua..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-purple-600"
                  />
                </div>
              </div>

              {formData.category === "OTHER" && (
                <div>
                  <label className="block text-xs font-semibold text-purple-700 mb-1">
                    {language === "ar" ? "اسم التصنيف الجديد" : "New Category Name"}
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.customCategory}
                    onChange={(e) => setFormData({ ...formData, customCategory: e.target.value })}
                    placeholder="مثال: SMART HOME, SENSORS, FIRE ALARM..."
                    className="w-full px-3 py-2 border border-purple-300 rounded-xl text-xs outline-none focus:border-purple-600 bg-purple-50/30"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {language === "ar" ? "اسم الصنف والموديل والوصف" : "Item Description & Model"}
                </label>
                <textarea
                  rows={3}
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder={
                    language === "ar"
                      ? "مثال:\nDS-2CD1043G0-I (2.8MM)\nكاميرا مراقبة خارجية 4 ميجابكسل تدعم الرؤية الليلية والتوصيل الشبكي PoE"
                      : "e.g. Hikvision DS-2CD1043G0-I 4MP Outdoor IP Camera"
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-purple-600 leading-relaxed font-mono"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {language === "ar" ? "سعر التكلفة (AED)" : "Cost (AED)"}
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formData.cost}
                    onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-purple-600 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {language === "ar" ? "سعر البيع (AED)" : "Sell Price (AED)"}
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formData.unitPrice}
                    onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-emerald-300 rounded-xl text-xs outline-none focus:border-emerald-600 font-mono font-bold text-emerald-700 bg-emerald-50/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {language === "ar" ? "الوحدة" : "Unit"}
                  </label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-purple-600 bg-white cursor-pointer"
                  >
                    <option value="Pcs">{language === "ar" ? "حبة (Pcs)" : "Pcs"}</option>
                    <option value="Meter">{language === "ar" ? "متر (Meter)" : "Meter"}</option>
                    <option value="Roll">{language === "ar" ? "لفة (Roll)" : "Roll"}</option>
                    <option value="Set">{language === "ar" ? "طقم (Set)" : "Set"}</option>
                    <option value="Unit">{language === "ar" ? "وحدة (Unit)" : "Unit"}</option>
                    <option value="Box">{language === "ar" ? "كرتون (Box)" : "Box"}</option>
                    <option value="Hour">{language === "ar" ? "ساعة عمل (Hour)" : "Hour"}</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  {language === "ar" ? "إلغاء" : "Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-purple-700 hover:bg-purple-800 disabled:bg-purple-400 text-white rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shadow-xs"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{language === "ar" ? "جاري الحفظ..." : "Saving..."}</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{editingItem ? (language === "ar" ? "حفظ التعديلات" : "Save Changes") : (language === "ar" ? "حفظ الصنف" : "Save Item")}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
