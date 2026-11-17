"use client";

import { useState, useMemo } from "react";
import { Search, X, Plus, Check, Filter, Tag, Building2, DollarSign, Layers } from "lucide-react";
import { PRICE_LIST_ITEMS, CATEGORIES, PriceListItem } from "@/data/priceList";
import { useLanguage } from "@/lib/i18n";

interface PriceListPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectItems: (items: { description: string; qty: number; unit: string; unitPrice: number; cost: number }[]) => void;
}

export default function PriceListPickerModal({ isOpen, onClose, onSelectItems }: PriceListPickerModalProps) {
  const { isRtl, language } = useLanguage();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedSupplier, setSelectedSupplier] = useState<string>("ALL");
  const [selectedItems, setSelectedItems] = useState<{ [id: string]: { item: PriceListItem; qty: number } }>({});

  const suppliers = useMemo(() => {
    const list = Array.from(new Set(PRICE_LIST_ITEMS.map((i) => i.supplier).filter(Boolean)));
    return ["ALL", ...list];
  }, []);

  const filteredItems = useMemo(() => {
    return PRICE_LIST_ITEMS.filter((item) => {
      const matchCat = selectedCategory === "ALL" || item.category === selectedCategory;
      const matchSup = selectedSupplier === "ALL" || item.supplier === selectedSupplier;
      const q = search.toLowerCase().trim();
      const matchSearch =
        !q ||
        item.description.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.supplier.toLowerCase().includes(q);
      return matchCat && matchSup && matchSearch;
    });
  }, [search, selectedCategory, selectedSupplier]);

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

  if (!isOpen) return null;

  const selectedCount = Object.keys(selectedItems).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-white border border-slate-200 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
        style={{ direction: isRtl ? "rtl" : "ltr" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-150 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-700">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                {language === "ar" ? "قائمة الأصناف والأسعار" : "Price List & Catalog"}
              </h2>
              <p className="text-xs text-slate-500">
                {language === "ar"
                  ? `اختر من بين ${PRICE_LIST_ITEMS.length} صنف متاح لإضافته فوراً لعرض السعر`
                  : `Select from ${PRICE_LIST_ITEMS.length} items to insert into quotation`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

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
            {CATEGORIES.map((cat) => {
              const active = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-lg font-medium whitespace-nowrap transition-all ${
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
              {language === "ar" ? "لم يتم العثور على أي صنف يطابق البحث" : "No items matching your criteria"}
            </div>
          ) : (
            filteredItems.map((item) => {
              const isSelected = !!selectedItems[item.id];
              return (
                <div
                  key={item.id}
                  className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isSelected
                      ? "bg-purple-50/60 border-purple-300 shadow-sm"
                      : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                  }`}
                >
                  <div className="flex items-start gap-3 flex-1">
                    <button
                      type="button"
                      onClick={() => toggleItem(item)}
                      className={`w-5 h-5 mt-0.5 rounded flex items-center justify-center transition-colors border ${
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
                          {item.unit}
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
                          {item.unitPrice} AED
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] text-slate-400 uppercase">
                          {language === "ar" ? "التكلفة" : "Cost"}:
                        </span>
                        <span className="text-xs text-slate-500 font-mono">
                          {item.cost} AED
                        </span>
                      </div>
                    </div>

                    {isSelected ? (
                      <div className="flex items-center gap-2 bg-slate-100 border border-slate-200 rounded-lg p-1">
                        <button
                          type="button"
                          onClick={() => updateQty(item.id, -1)}
                          className="w-6 h-6 rounded bg-white text-slate-700 hover:bg-slate-200 flex items-center justify-center text-xs shadow-xs"
                        >
                          -
                        </button>
                        <span className="text-xs font-mono font-bold px-1.5 text-slate-900">
                          {selectedItems[item.id].qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQty(item.id, 1)}
                          className="w-6 h-6 rounded bg-white text-slate-700 hover:bg-slate-200 flex items-center justify-center text-xs shadow-xs"
                        >
                          +
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSingleAdd(item)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-700 text-purple-700 hover:text-white text-xs font-semibold border border-purple-200 hover:border-purple-700 transition-colors"
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
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors"
            >
              {language === "ar" ? "إلغاء" : "Cancel"}
            </button>
            {selectedCount > 0 && (
              <button
                type="button"
                onClick={handleConfirm}
                className="px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold shadow-md shadow-purple-600/20 transition-all flex items-center gap-1.5"
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
