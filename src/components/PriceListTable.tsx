"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, Building2, Layers, Plus, Filter, Tag, DollarSign, ArrowUpRight } from "lucide-react";
import { PRICE_LIST_ITEMS, CATEGORIES, PriceListItem } from "@/data/priceList";
import { useLanguage } from "@/lib/i18n";

export default function PriceListTable() {
  const { language, isRtl } = useLanguage();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedSupplier, setSelectedSupplier] = useState<string>("ALL");

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

  return (
    <div className="space-y-4" style={{ direction: isRtl ? "rtl" : "ltr" }}>
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
              <th className="py-3 px-4 text-center">{language === "ar" ? "إجراء" : "Action"}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-400">
                  {language === "ar" ? "لا توجد نتائج مطابقة" : "No matching items found"}
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
                    {item.cost.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600">
                    {item.unitPrice.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-center text-slate-600 font-mono text-xs">
                    {item.unit}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <Link
                      href="/quotation/new"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-50 border border-purple-200 text-purple-700 hover:bg-purple-700 hover:text-white text-xs font-semibold transition-all shadow-xs"
                      title={language === "ar" ? "إنشاء عرض سعر جديد" : "Create New Quotation"}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      {language === "ar" ? "عرض سعر" : "Quote"}
                    </Link>
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
            ? `إجمالي الأصناف المعروضة: ${filteredItems.length} من أصل ${PRICE_LIST_ITEMS.length}`
            : `Showing ${filteredItems.length} of ${PRICE_LIST_ITEMS.length} items`}
        </span>
        <span className="text-slate-400">
          {language === "ar" ? "قائمة أسعار رواد سمارت المعتمدة" : "Ruaad Smart Approved Price List"}
        </span>
      </div>
    </div>
  );
}
