// pages/Coupons.tsx — Coupon master (Admin only).
// A coupon discounts ONLY eligible making charges (after the existing discount on making), on all items of the
// storefront cart or on selected items. No delete — deactivate instead. Once redeemed, the code, shop and
// financial terms are locked (orders keep their own snapshot); validity, limits and status stay editable.
import { useMemo, useState, type ReactNode } from "react";
import { Edit, Loader2, Plus, Power, TicketPercent } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CommonTable, type Column } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/PageHeader";
import { ShopSelect } from "@/components/ui/ShopSelect";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  lookupCouponItems,
  useCoupon,
  useCoupons,
  useCreateCoupon,
  useSetCouponStatus,
  useUpdateCoupon,
  type Coupon,
  type CouponDiscountType,
  type CouponEligibility,
  type CouponFilters,
  type CouponItemSummary,
  type CouponState,
  type SaveCouponData,
} from "@/hooks/useCoupon";
import { useAllShops } from "@/hooks/useShop";
import { apiErrors } from "@/utils/emailTemplate";
import { getModulePermissions } from "@/utils/permission";

const inr = (n: number) => `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const shortDate = (s: string) =>
  new Date(s).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
/** API IST wall-clock → datetime-local value. */
const toInput = (s?: string | null) => (s ? s.slice(0, 16) : "");

const STATE_STYLE: Record<CouponState, string> = {
  Active: "bg-green-100 text-green-800",
  Scheduled: "bg-blue-100 text-blue-800",
  Expired: "bg-amber-100 text-amber-800",
  Inactive: "bg-gray-100 text-gray-600",
};

const describeDiscount = (c: Pick<Coupon, "discountType" | "discountValue" | "maxDiscountAmount">) =>
  c.discountType === "Percentage"
    ? `${c.discountValue}% of making${c.maxDiscountAmount ? ` (max ${inr(c.maxDiscountAmount)})` : ""}`
    : `${inr(c.discountValue)} off making`;

export const Coupons = () => {
  const { permissions, user } = useAuth();
  const { isAdmin } = getModulePermissions(permissions, user, "Coupons");
  const [filters, setFilters] = useState<CouponFilters>({ page: 1, pageSize: 20, keyword: "", status: "", shopId: null });
  const { data, isLoading, isError } = useCoupons(filters);
  const { data: shops = [] } = useAllShops();
  const setStatus = useSetCouponStatus();
  const [editing, setEditing] = useState<number | "new" | null>(null);

  const shopName = useMemo(() => new Map(shops.map((s) => [s.id, s.name])), [shops]);

  if (!isAdmin) {
    return <div className="p-6 text-gray-600">Coupons can only be managed by an administrator.</div>;
  }

  const toggle = (c: Coupon) =>
    setStatus.mutate(
      { id: c.id, isActive: !c.isActive },
      {
        onSuccess: () => toast.success(`Coupon ${c.code} ${c.isActive ? "deactivated" : "activated"}.`),
        onError: (error) => toast.error(apiErrors(error).join(" ")),
      },
    );

  const columns: Column<Coupon>[] = [
    {
      key: "code",
      label: "Code",
      render: (r) => (
        <div>
          <div className="font-mono font-semibold">{r.code}</div>
          {r.description && <div className="text-xs text-gray-500">{r.description}</div>}
        </div>
      ),
    },
    { key: "shopId", label: "Shop", render: (r) => shopName.get(r.shopId) ?? `Shop ${r.shopId}` },
    { key: "discountValue", label: "Discount", render: (r) => <span className="text-sm">{describeDiscount(r)}</span> },
    {
      key: "eligibility",
      label: "Applies to",
      render: (r) =>
        r.eligibility === "SelectedItems" ? `${r.itemIds.length} selected item${r.itemIds.length === 1 ? "" : "s"}` : "All making charges",
    },
    {
      key: "validFrom",
      label: "Valid",
      render: (r) => (
        <span className="text-xs text-gray-600">
          {shortDate(r.validFrom)} – {shortDate(r.validTo)}
        </span>
      ),
    },
    {
      key: "redemptionCount",
      label: "Used",
      render: (r) => (
        <span className="text-sm">
          {r.redemptionCount}
          {r.maxRedemptions ? ` / ${r.maxRedemptions}` : ""}
          {r.maxRedemptionsPerCustomer ? <span className="text-xs text-gray-500"> · {r.maxRedemptionsPerCustomer}/customer</span> : null}
        </span>
      ),
    },
    {
      key: "state",
      label: "Status",
      render: (r) => <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATE_STYLE[r.state]}`}>{r.state}</span>,
    },
  ];

  const setFilter = (patch: Partial<CouponFilters>) => setFilters((f) => ({ ...f, ...patch, page: patch.page ?? 1 }));

  return (
    <div className="min-h-full bg-gray-50">
      <PageHeader
        fullWidth
        title="Coupons"
        subtitle="Storefront coupon codes. A coupon only ever discounts eligible making charges — never metal, diamond or stone value."
        icon={<TicketPercent className="w-7 h-7 text-[#b08d28]" />}
        rightActions={
          <Button onClick={() => setEditing("new")}>
            <Plus className="mr-1 h-4 w-4" /> New Coupon
          </Button>
        }
      />
      <div className="w-full space-y-4 p-4 sm:p-6">
        <div className="flex flex-wrap items-center gap-3">
          <Input
            className="w-56"
            placeholder="Search code or description"
            value={filters.keyword}
            onChange={(e) => setFilter({ keyword: e.target.value })}
          />
          <select
            className="h-9 rounded-md border border-gray-300 bg-white px-2 text-sm"
            value={filters.status}
            onChange={(e) => setFilter({ status: e.target.value as CouponFilters["status"] })}
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="scheduled">Scheduled</option>
            <option value="expired">Expired</option>
            <option value="inactive">Inactive</option>
          </select>
          <div className="w-72">
            <ShopSelect value={filters.shopId} onChange={(shopId) => setFilter({ shopId })} />
          </div>
        </div>

        {isError ? (
          <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">Coupons could not be loaded.</div>
        ) : (
          <CommonTable<Coupon>
            columns={columns}
            data={data?.data ?? []}
            loading={isLoading}
            emptyMessage="No coupons."
            pagination={{
              page: filters.page,
              pageSize: filters.pageSize,
              total: data?.totalCount ?? 0,
              totalPages: Math.max(1, data?.totalPages ?? 1),
              onPageChange: (page) => setFilters((f) => ({ ...f, page })),
              onPageSizeChange: (pageSize) => setFilters((f) => ({ ...f, pageSize, page: 1 })),
            }}
            actions={[
              {
                label: "Edit",
                tooltip: "Edit coupon",
                variant: "ghost",
                icon: <Edit className="h-4 w-4" />,
                onClick: (r) => setEditing(r.id),
              },
              {
                label: "Activate / Deactivate",
                tooltip: "Activate or deactivate",
                variant: "ghost",
                icon: <Power className="h-4 w-4" />,
                onClick: toggle,
              },
            ]}
          />
        )}
      </div>

      {editing && <CouponDialog couponId={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  );
};

const parseItemIds = (text: string) =>
  Array.from(new Set(text.split(/[\s,;]+/).map((s) => Number.parseInt(s, 10)).filter((n) => Number.isInteger(n) && n > 0)));

const optionalNumber = (s: string) => (s.trim() === "" ? null : Number(s));

// Wide (≈880px) centered dialog; header and footer stay put, the body scrolls. On narrow screens it
// fills the viewport minus a 1rem gutter and the field pairs stack into one column.
const COUPON_DIALOG_CLASS = "flex max-h-[90vh] w-[calc(100vw-2rem)] max-w-[880px] flex-col gap-0 p-0";
const TWO_COLUMNS = "grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-x-6";
const SELECT_CLASS = "h-9 w-full rounded-md border border-gray-300 bg-white px-2 text-sm disabled:bg-gray-100";

const CouponDialog = ({ couponId, onClose }: { couponId: number | null; onClose: () => void }) => {
  const { data: coupon, isLoading } = useCoupon(couponId);
  if (couponId && (isLoading || !coupon)) {
    return (
      <Dialog open onOpenChange={(open) => !open && onClose()}>
        <DialogContent size="2xl" className={COUPON_DIALOG_CLASS}>
          <DialogHeader className="border-b px-6 pb-4 pt-6 pr-12">
            <DialogTitle>Edit Coupon</DialogTitle>
            <DialogDescription>Loading…</DialogDescription>
          </DialogHeader>
          <Loader2 className="mx-auto my-10 h-6 w-6 animate-spin text-gray-400" />
        </DialogContent>
      </Dialog>
    );
  }
  return <CouponForm coupon={coupon ?? null} onClose={onClose} />;
};

const CouponForm = ({ coupon, onClose }: { coupon: Coupon | null; onClose: () => void }) => {
  const create = useCreateCoupon();
  const update = useUpdateCoupon();
  const { data: shops = [] } = useAllShops();
  const saving = create.isPending || update.isPending;
  const locked = coupon?.locked ?? false;

  const [shopId, setShopId] = useState<number | "">(coupon?.shopId ?? "");
  const [code, setCode] = useState(coupon?.code ?? "");
  const [description, setDescription] = useState(coupon?.description ?? "");
  const [discountType, setDiscountType] = useState<CouponDiscountType>(coupon?.discountType ?? "Percentage");
  const [discountValue, setDiscountValue] = useState(coupon ? String(coupon.discountValue) : "");
  const [maxDiscount, setMaxDiscount] = useState(coupon?.maxDiscountAmount != null ? String(coupon.maxDiscountAmount) : "");
  const [minEligible, setMinEligible] = useState(coupon?.minEligibleMakingCharge != null ? String(coupon.minEligibleMakingCharge) : "");
  const [eligibility, setEligibility] = useState<CouponEligibility>(coupon?.eligibility ?? "AllMakingCharges");
  const [itemText, setItemText] = useState(coupon?.itemIds.join(", ") ?? "");
  const [items, setItems] = useState<CouponItemSummary[] | null>(coupon?.items ?? null);
  const [checking, setChecking] = useState(false);
  const [validFrom, setValidFrom] = useState(toInput(coupon?.validFrom));
  const [validTo, setValidTo] = useState(toInput(coupon?.validTo));
  const [maxRedemptions, setMaxRedemptions] = useState(coupon?.maxRedemptions != null ? String(coupon.maxRedemptions) : "");
  const [perCustomer, setPerCustomer] = useState(coupon?.maxRedemptionsPerCustomer != null ? String(coupon.maxRedemptionsPerCustomer) : "");
  const [isActive, setIsActive] = useState(coupon?.isActive ?? true);
  const [errors, setErrors] = useState<string[]>([]);

  const itemIds = useMemo(() => parseItemIds(itemText), [itemText]);
  const unknownItems = items ? itemIds.filter((id) => !items.some((i) => i.itemId === id)) : [];

  const checkItems = async () => {
    setChecking(true);
    try {
      setItems(await lookupCouponItems(itemIds));
    } catch (error) {
      setErrors(apiErrors(error));
    } finally {
      setChecking(false);
    }
  };

  const submit = () => {
    const problems: string[] = [];
    if (!shopId) problems.push("Select the shop that owns the coupon.");
    if (!code.trim()) problems.push("Code is required.");
    if (!discountValue.trim() || Number(discountValue) <= 0) problems.push("Enter a discount greater than 0.");
    if (!validFrom || !validTo) problems.push("Enter the validity period.");
    if (eligibility === "SelectedItems" && itemIds.length === 0) problems.push("Enter at least one item (tag number).");
    if (problems.length > 0) {
      setErrors(problems);
      return;
    }

    const data: SaveCouponData = {
      shopId: Number(shopId),
      code: code.trim(),
      description: description.trim(),
      discountType,
      discountValue: Number(discountValue),
      maxDiscountAmount: discountType === "Percentage" ? optionalNumber(maxDiscount) : null,
      minEligibleMakingCharge: optionalNumber(minEligible),
      eligibility,
      itemIds: eligibility === "SelectedItems" ? itemIds : [],
      validFrom,
      validTo,
      maxRedemptions: optionalNumber(maxRedemptions),
      maxRedemptionsPerCustomer: optionalNumber(perCustomer),
      isActive,
    };
    const options = {
      onSuccess: () => {
        toast.success(coupon ? "Coupon updated." : "Coupon created.");
        onClose();
      },
      onError: (error: unknown) => setErrors(apiErrors(error)),
    };
    if (coupon) update.mutate({ id: coupon.id, data }, options);
    else create.mutate(data, options);
  };

  return (
    <Dialog open onOpenChange={(open) => !open && !saving && onClose()}>
      <DialogContent size="2xl" className={COUPON_DIALOG_CLASS}>
        <DialogHeader className="border-b px-6 pb-4 pt-6 pr-12">
          <DialogTitle>{coupon ? `Edit Coupon ${coupon.code}` : "New Coupon"}</DialogTitle>
          <DialogDescription>
            Discounts only the making charge left after the existing discount on making. Customers apply it in the storefront cart; it is
            counted when an order is placed.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-5">
          {locked && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              This coupon has been redeemed ({coupon?.redemptionCount} active). Its code, shop, discount, cap, minimum and eligible items are
              locked — deactivate it and create a new coupon to change them.
            </div>
          )}

          <FormSection title="Coupon">
            <div className={TWO_COLUMNS}>
              <div className="space-y-1.5">
                <Label htmlFor="coupon-shop">Shop</Label>
                <select
                  id="coupon-shop"
                  className={SELECT_CLASS}
                  value={shopId}
                  disabled={locked}
                  onChange={(e) => setShopId(e.target.value ? Number(e.target.value) : "")}
                >
                  <option value="">Select shop</option>
                  {shops.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                      {s.city ? ` (${s.city})` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="coupon-code">Code</Label>
                <Input
                  id="coupon-code"
                  value={code}
                  maxLength={32}
                  disabled={locked}
                  className="font-mono uppercase"
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="DIWALI10"
                />
                <p className="text-xs text-gray-500">Letters, digits, - or _; not case-sensitive; unique per shop.</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="coupon-description">Description (optional, shown to customers)</Label>
              <Input
                id="coupon-description"
                value={description}
                maxLength={200}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Festive offer: 10% off making charges"
              />
            </div>
          </FormSection>

          <FormSection title="Discount">
            <div className={TWO_COLUMNS}>
              <div className="space-y-1.5">
                <Label htmlFor="coupon-type">Discount type</Label>
                <select
                  id="coupon-type"
                  className={SELECT_CLASS}
                  value={discountType}
                  disabled={locked}
                  onChange={(e) => setDiscountType(e.target.value as CouponDiscountType)}
                >
                  <option value="Percentage">Percentage of making charge</option>
                  <option value="Fixed">Fixed amount (₹)</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="coupon-value">{discountType === "Percentage" ? "Discount (%)" : "Discount amount (₹)"}</Label>
                <Input
                  id="coupon-value"
                  type="number"
                  min={0}
                  step="0.01"
                  value={discountValue}
                  disabled={locked}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  placeholder={discountType === "Percentage" ? "e.g. 10" : "e.g. 500"}
                />
              </div>
            </div>

            {discountType === "Percentage" && (
              <div className={TWO_COLUMNS}>
                <div className="space-y-1.5">
                  <Label htmlFor="coupon-max">Maximum discount (₹, optional)</Label>
                  <Input
                    id="coupon-max"
                    type="number"
                    min={0}
                    step="0.01"
                    value={maxDiscount}
                    disabled={locked}
                    onChange={(e) => setMaxDiscount(e.target.value)}
                    placeholder="No cap"
                  />
                </div>
                <p className="self-end pb-2 text-xs text-gray-500">Caps the rupee value of a percentage discount.</p>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="coupon-min">Minimum eligible making charge (₹, optional)</Label>
              <Input
                id="coupon-min"
                type="number"
                min={0}
                step="0.01"
                value={minEligible}
                disabled={locked}
                onChange={(e) => setMinEligible(e.target.value)}
                placeholder="No minimum"
              />
              <p className="text-xs text-gray-500">
                Total making charge of the eligible items, after their existing discount on making, needed before the coupon applies.
              </p>
            </div>
          </FormSection>

          <FormSection title="Applies to">
            <div className="flex flex-col gap-2 text-sm sm:flex-row sm:gap-6">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="coupon-eligibility"
                  checked={eligibility === "AllMakingCharges"}
                  disabled={locked}
                  onChange={() => setEligibility("AllMakingCharges")}
                />
                All making charges in the cart
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="coupon-eligibility"
                  checked={eligibility === "SelectedItems"}
                  disabled={locked}
                  onChange={() => setEligibility("SelectedItems")}
                />
                Selected items only
              </label>
            </div>
            {eligibility === "SelectedItems" && (
              <div className="space-y-2 rounded-md border border-gray-200 bg-gray-50/60 p-3">
                <Label htmlFor="coupon-items">Item IDs / tag numbers (comma or space separated)</Label>
                <textarea
                  id="coupon-items"
                  className="min-h-[80px] w-full rounded-md border border-gray-300 bg-white p-2 font-mono text-sm disabled:bg-gray-100"
                  value={itemText}
                  disabled={locked}
                  onChange={(e) => {
                    setItemText(e.target.value);
                    setItems(null);
                  }}
                  placeholder="10234, 10235"
                />
                <div className="flex flex-wrap items-center gap-3">
                  <Button type="button" variant="outline" size="sm" disabled={checking || itemIds.length === 0} onClick={checkItems}>
                    {checking && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                    Check items ({itemIds.length})
                  </Button>
                  {unknownItems.length > 0 && <span className="text-xs text-red-600">Not found: {unknownItems.join(", ")}</span>}
                </div>
                {items && items.length > 0 && (
                  <ul className="grid max-h-40 grid-cols-1 gap-x-6 gap-y-0.5 overflow-y-auto text-xs text-gray-700 sm:grid-cols-2">
                    {items.map((i) => (
                      <li key={i.itemId} className="truncate">
                        <span className="font-mono">{i.itemId}</span> — {i.itemName}
                        {i.category ? ` · ${i.category}` : ""}
                        {i.metal ? ` · ${i.metal}` : ""}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </FormSection>

          <FormSection title="Validity & limits">
            <div className={TWO_COLUMNS}>
              <div className="space-y-1.5">
                <Label htmlFor="coupon-from">Valid from (IST)</Label>
                <Input id="coupon-from" type="datetime-local" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="coupon-to">Valid to (IST)</Label>
                <Input id="coupon-to" type="datetime-local" value={validTo} onChange={(e) => setValidTo(e.target.value)} />
              </div>
            </div>

            <div className={TWO_COLUMNS}>
              <div className="space-y-1.5">
                <Label htmlFor="coupon-limit">Total uses (optional)</Label>
                <Input
                  id="coupon-limit"
                  type="number"
                  min={1}
                  step="1"
                  value={maxRedemptions}
                  onChange={(e) => setMaxRedemptions(e.target.value)}
                  placeholder="Unlimited"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="coupon-per-customer">Uses per customer (optional)</Label>
                <Input
                  id="coupon-per-customer"
                  type="number"
                  min={1}
                  step="1"
                  value={perCustomer}
                  onChange={(e) => setPerCustomer(e.target.value)}
                  placeholder="Unlimited"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Switch id="coupon-active" checked={isActive} onCheckedChange={setIsActive} />
              <Label htmlFor="coupon-active" className="cursor-pointer">
                Active (customers can apply it during the validity period)
              </Label>
            </div>
          </FormSection>

          {errors.length > 0 && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
              {errors.map((e) => (
                <div key={e}>{e}</div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 border-t px-6 py-4 sm:space-x-0">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/** A titled group of fields inside the coupon dialog. */
const FormSection = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="space-y-4">
    <h3 className="border-b border-gray-100 pb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</h3>
    {children}
  </section>
);
