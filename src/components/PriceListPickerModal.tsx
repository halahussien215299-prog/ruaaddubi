"use client";

import { useState, useMemo, useEffect } from "react";
import { Search, X, Plus, Check, Filter, Tag, Building2, DollarSign, Layers, Loader2, PackagePlus, CheckCircle2 } from "lucide-react";
import { PRICE_LIST_ITEMS, CATEGORIES, PriceListItem } from "@/data/priceList";
import { useLanguage } from "@/lib/i18n";

interface PriceListPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectItems: (items: { description: string; qty: number; unit: string; unitPrice: number; cost: number }[]) => void;
}

export default function PriceListPickerModal({ isOpen, onClose, onSelectItems }: PriceListPickerModalProps) {
  const { isRtl, language } = useLanguage();
  const [items, setItems] = useState<PriceListItem[]>(PRICE_LIST_ITEMS);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedSupplier, setSelectedSupplier] = useState<string>("ALL");
  const [selectedItems, setSelectedItems] = useState<{ [id: string]: { item: PriceListItem; qty: number } }>({});

  // Quick Add Item Mode
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickForm, setQuickForm] = useState({
    description: "",
    category: "ACCESSORIES",
    supplier: "رواد سمارت",
    cost: "",
    unitPrice: "",
    unit: "Pcs",
  });
  const [isSavingQuick, setIsSavingQuick] = useState(false);

  // Fetch items from API when opened
  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetch("/api/items")
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data) && data.length > 0) {
            setItems(data);
          }
        })
        .catch((err) => console.warn("Fallback to static items in picker:", err))
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  const suppliers = useMemo(() => {
    const list = Array.from(new Set(items.map((i) => i.supplier).filter(Boolean)));
    return ["ALL", ...list];
  }, [items]);

  const allCategories = useMemo(() => {
    const fromItems = items.map((i) => i.category).filter(Boolean);
    const set = new Set(["ALL", ...CATEGORIES.filter((c) => c !== "ALL"), ...fromItems]);
    return Array.from(set);
  }, [items]);

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

  const toggleItem = (item: PriceListItem) => {
    setSelectedItems((prev) => {
      const next = { ...prev };
      if (next[item.id]) {
        delete next[item.id];
      } else {
        next[item.id] = { item, qty: 1 };
      }
      return next;
    });
  };

  const updateQty = (id: string, delta: number) => {
    setSelectedItems((prev) => {
      if (!prev[id]) return prev;
      const currentQty = prev[id].qty;
      const newQty = Math.max(1, currentQty + delta);
      return {
        ...prev,
        [id]: { ...prev[id], qty: newQty },
      };
    });
  };

  const handleConfirm = () => {
    const itemsToAdd = Object.values(selectedItems).map(({ item, qty }) => ({
      description: item.description,
      qty,
      unit: item.unit || "Pcs",
      unitPrice: item.unitPrice,
      cost: item.cost,
    }));
    onSelectItems(itemsToAdd);
    setSelectedItems({});
    onClose();
  };

  const handleSingleAdd = (item: PriceListItem) => {
    onSelectItems([
      {
        description: item.description,
        qty: 1,
        unit: item.unit || "Pcs",
        unitPrice: item.unitPrice,
        cost: item.cost,
      },
    ]);
    onClose();
  };

  // Quick save new item and immediately insert
  const handleQuickSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickForm.description.trim()) {
      alert(language === "ar" ? "يرجى كتابة اسم أو وصف الصنف" : "Please enter item description");
      return;
    }

    setIsSavingQuick(true);
    try {
      const newItem: PriceListItem = {
        id: `prod-${Date.now()}`,
        category: quickForm.category.trim() || "ACCESSORIES",
        supplier: quickForm.supplier.trim() || "رواد سمارت",
        description: quickForm.description.trim(),
        cost: Number(quickForm.cost) || 0,
        unitPrice: Number(quickForm.unitPrice) || 0,
        unit: quickForm.unit.trim() || "Pcs",
      };

      const res = await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newItem),
      });

      if (!res.ok) {
        throw new Error("فشل حفظ الصنف");
      }

      // Add to local items
      setItems((prev) => [newItem, ...prev]);

      // Automatically select it
      setSelectedItems((prev) => ({
        ...prev,
        [newItem.id]: { item: newItem, qty: 1 },
      }));

      // Reset quick form
      setShowQuickAdd(false);
      setQuickForm({
        description: "",
        category: "ACCESSORIES",
        supplier: "رواد سمارت",
        cost: "",
        unitPrice: "",
        unit: "Pcs",
      });
    } catch (err: any) {
      console.error(err);
      alert(err.message || "حدث خطأ أثناء حفظ الصنف");
    } finally {
      setIsSavingQuick(false);
    }
  };

  if (!isOpen) return null;

  const selectedCount = Object.keys(selectedItems).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white border border-slate-200 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
        style={{ direction: isRtl ? "rtl" : "ltr" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-150 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-100 border border-purple-200 flex items-center justify-center text-purple-700 shadow-2xs">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
                {language === "ar" ? "قائمة الأصناف والأسعار المعتمدة" : "Price List & Catalog"}
              </h2>
              <p className="text-xs text-slate-500">
                {language === "ar"
                  ? `اختر من بين ${items.length} صنف متاح لإضافته فوراً لعرض السعر`
                  : `Select from ${items.length} items to insert into quotation`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowQuickAdd(!showQuickAdd)}
              className="px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{showQuickAdd ? (language === "ar" ? "إغلاق النموذج" : "Close") : (language === "ar" ? "➕ صنف جديد" : "New Item")}</span>
            </button>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick Add Form Banner (if toggled) */}
        {showQuickAdd && (
          <form onSubmit={handleQuickSave} className="p-4 bg-purple-50/60 border-b border-purple-200 animate-in fade-in duration-150 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                <PackagePlus className="w-4 h-4 text-purple-700" />
                {language === "ar" ? "إضافة صنف جديد سريعاً إلى الكتالوج" : "Quick Add New Catalog Item"}
              </span>
              <button
                type="button"
                onClick={() => setShowQuickAdd(false)}
                className="text-xs text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
              <div className="sm:col-span-4">
                <input
                  type="text"
                  required
                  placeholder={language === "ar" ? "اسم الصنف والموديل..." : "Item description & model"}
                  value={quickForm.description}
                  onChange={(e) => setQuickForm({ ...quickForm, description: e.target.value })}
                  className="w-full px-3 py-1.5 bg-white border border-purple-200 rounded-xl text-xs outline-none focus:border-purple-600 font-mono"
                />
              </div>

              <div className="sm:col-span-2">
                <select
                  value={quickForm.category}
                  onChange={(e) => setQuickForm({ ...quickForm, category: e.target.value })}
                  className="w-full px-2 py-1.5 bg-white border border-purple-200 rounded-xl text-xs outline-none focus:border-purple-600 cursor-pointer"
                >
                  {CATEGORIES.filter((c) => c !== "ALL").map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <input
                  type="number"
                  step="any"
                  placeholder={language === "ar" ? "التكلفة" : "Cost"}
                  value={quickForm.cost}
                  onChange={(e) => setQuickForm({ ...quickForm, cost: e.target.value })}
                  className="w-full px-2 py-1.5 bg-white border border-purple-200 rounded-xl text-xs outline-none focus:border-purple-600 font-mono"
                />
              </div>

              <div className="sm:col-span-2">
                <input
                  type="number"
                  step="any"
                  placeholder={language === "ar" ? "سعر البيع" : "Sell Price"}
                  value={quickForm.unitPrice}
                  onChange={(e) => setQuickForm({ ...quickForm, unitPrice: e.target.value })}
                  className="w-full px-2 py-1.5 bg-white border border-emerald-300 rounded-xl text-xs outline-none focus:border-emerald-600 font-mono font-bold text-emerald-700"
                />
              </div>

              <div className="sm:col-span-2 flex items-center gap-1.5">
                <select
                  value={quickForm.unit}
                  onChange={(e) => setQuickForm({ ...quickForm, unit: e.target.value })}
                  className="w-20 px-2 py-1.5 bg-white border border-purple-200 rounded-xl text-xs outline-none focus:border-purple-600 cursor-pointer"
                >
                  <option value="Pcs">Pcs</option>
                  <option value="Meter">Meter</option>
                  <option value="Roll">Roll</option>
                  <option value="Set">Set</option>
                  <option value="Unit">Unit</option>
                </select>

                <button
                  type="submit"
                  disabled={isSavingQuick}
                  className="flex-1 px-3 py-1.5 bg-purple-700 hover:bg-purple-800 disabled:bg-purple-300 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer shrink-0 shadow-xs"
                >
                  {isSavingQuick ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>{language === "ar" ? "حفظ" : "Save"}</span>
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Search & Filters */}
        <div className="p-4 space-y-3 border-b border-slate-150 bg-slate-50/40">
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Search className={`w-4 h-4 absolute top-3 ${isRtl ? "right-3" : "left-3"} text-slate-400 pointer-events-none`} />
              <input
                type="text"
                placeholder={
                  language === "ar"
                    ? "ابحث باسم الموديل، الوصف، أو المورد..."
                    : "Search by model, description, or supplier..."
                }
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={`w-full bg-white border border-slate-200 rounded-xl ${
                  isRtl ? "pr-9 pl-4" : "pl-9 pr-4"
                } py-2 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600/20 shadow-sm`}
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className={`absolute top-2.5 ${isRtl ? "left-3" : "right-3"} text-xs text-slate-400 hover:text-slate-600`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Supplier Filter */}
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

          {/* Category Tabs */}
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

        {/* Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 max-h-[50vh] divide-y divide-slate-100">
          {filteredItems.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-purple-600" />
                  <span>{language === "ar" ? "جاري تحميل الأصناف..." : "Loading catalog..."}</span>
                </div>
              ) : (
                language === "ar" ? "لم يتم العثور على أي صنف يطابق البحث" : "No items matching your criteria"
              )}
            </div>
          ) : (
            filteredItems.map((item) => {
              const isSelected = !!selectedItems[item.id];
              return (
                <div
                  key={item.id}
                  className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isSelected
                      ? "bg-purple-50/60 border-purple-300 shadow-sm"
                      : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                  }`}
                >
                  <div className="flex items-start gap-3 flex-1">
                    <button
                      type="button"
                      onClick={() => toggleItem(item)}
                      className={`w-5 h-5 mt-0.5 rounded-md flex items-center justify-center transition-colors border cursor-pointer ${
                        isSelected
                          ? "bg-purple-700 border-purple-700 text-white"
                          : "border-slate-300 hover:border-purple-500 bg-white"
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                    </button>

                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200/80">
                          {item.category}
                        </span>
                        {item.supplier && (
                          <span className="text-[10px] text-slate-500 flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            {item.supplier}
                          </span>
                        )}
                        <span className="text-[10px] text-purple-700 font-mono font-medium">
                          {item.unit || "Pcs"}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-900 font-mono whitespace-pre-line leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    <div className="text-right sm:text-left space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-500 uppercase">
                          {language === "ar" ? "سعر البيع" : "Sell"}:
                        </span>
                        <span className="text-xs sm:text-sm font-bold text-emerald-600 font-mono">
                          {item.unitPrice?.toLocaleString()} AED
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] text-slate-400 uppercase">
                          {language === "ar" ? "التكلفة" : "Cost"}:
                        </span>
                        <span className="text-xs text-slate-500 font-mono">
                          {item.cost?.toLocaleString()} AED
                        </span>
                      </div>
                    </div>

                    {isSelected ? (
                      <div className="flex items-center gap-2 bg-slate-100 border border-slate-200 rounded-xl p-1">
                        <button
                          type="button"
                          onClick={() => updateQty(item.id, -1)}
                          className="w-6 h-6 rounded-lg bg-white text-slate-700 hover:bg-slate-200 flex items-center justify-center text-xs shadow-xs cursor-pointer"
                        >
                          -
                        </button>
                        <span className="text-xs font-mono font-bold px-1.5 text-slate-900">
                          {selectedItems[item.id].qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQty(item.id, 1)}
                          className="w-6 h-6 rounded-lg bg-white text-slate-700 hover:bg-slate-200 flex items-center justify-center text-xs shadow-xs cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSingleAdd(item)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-700 text-purple-700 hover:text-white text-xs font-semibold border border-purple-200 hover:border-purple-700 transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        {language === "ar" ? "إضافة" : "Add"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-150 bg-slate-50/70 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            {selectedCount > 0 ? (
              <span className="text-purple-700 font-semibold">
                {language === "ar"
                  ? `تم تحديد ${selectedCount} صنف`
                  : `${selectedCount} items selected`}
              </span>
            ) : (
              <span>
                {language === "ar"
                  ? `إجمالي المعروض: ${filteredItems.length} صنف`
                  : `Showing ${filteredItems.length} items`}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors cursor-pointer"
            >
              {language === "ar" ? "إلغاء" : "Cancel"}
            </button>
            {selectedCount > 0 && (
              <button
                type="button"
                onClick={handleConfirm}
                className="px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold shadow-md shadow-purple-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                {language === "ar"
                  ? `إضافة الأصناف المحددة (${selectedCount})`
                  : `Add Selected (${selectedCount})`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
