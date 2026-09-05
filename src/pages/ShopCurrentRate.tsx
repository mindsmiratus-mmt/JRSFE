// pages/shop/ShopCurrentRate.tsx
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Edit,
  Trash2,
  Plus,
  ArrowLeft,
  DollarSign,
  Zap,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { CommonTable } from "@/components/ui/table";
import { ConfirmDialog } from "@/components/ui/confirmDialog";
import { toast } from "@/components/ui/toast";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Formik, Form, Field, type FormikHelpers } from "formik";
import * as Yup from "yup";
import {
  useAllShopCurrentRates,
  useCreateShopCurrentRate,
  useUpdateShopCurrentRate,
  useDeleteShopCurrentRate,
  useUpdateShopGoldRates,
  type ShopCurrentRate,
  type CreateShopCurrentRateData,
} from "@/hooks/useShopCurrentRate";
import { useAllShop } from "@/hooks/useShop";
import { useAllSalesChannels } from "@/hooks/useSalesChannelRegistry";
import { useAllLookUp } from "@/hooks/useLookup";
import { SearchInput } from "@/components/ui/searchInput";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrentRates } from "@/hooks/useCurruntrate";

// ========================
// Validation
// ========================
const ShopCurrentRateSchema = Yup.object()
  .shape({
    currentRateId: Yup.string().required("Rate ID is required"),
    shopId: Yup.number()
      .nullable()
      .transform((value, originalValue) =>
        originalValue === "" || originalValue == null ? null : value
      ),
    salesChannel: Yup.string().nullable(),
    rate: Yup.number()
      .typeError("Rate must be a number")
      .min(0, "Rate cannot be negative")
      .required("Rate is required"),
    makingCharge: Yup.number()
      .typeError("Making charge must be a number")
      .min(0, "Cannot be negative")
      .notRequired(),
    makingChargeType: Yup.string().notRequired(),
    discountOnMaking: Yup.number()
      .typeError("Discount must be a number")
      .min(0, "Cannot be negative")
      .notRequired(),
    discountType: Yup.string().notRequired(),
    isActive: Yup.boolean().required(),
  })
  .test(
    "shop-or-sales-channel",
    "Please select either Shop or Sales Channel",
    function (values) {
      const hasShop = !!values.shopId;
      const hasSalesChannel = !!values.salesChannel?.trim();
      return hasShop || hasSalesChannel;
    }
  )
  .test(
    "not-both-shop-and-sales-channel",
    "Use either Shop or Sales Channel, not both",
    function (values) {
      const hasShop = !!values.shopId;
      const hasSalesChannel = !!values.salesChannel?.trim();
      return !(hasShop && hasSalesChannel);
    }
  );

const UpdateGoldRateSchema = Yup.object().shape({
  shopId: Yup.number()
    .nullable()
    .transform((value, originalValue) =>
      originalValue === "" || originalValue == null ? null : value
    ),
  salesChannel: Yup.string().nullable(),
  rate24K: Yup.number()
    .typeError("24K Rate must be a number")
    .moreThan(0, "24K Rate must be greater than 0")
    .required("24K Rate is required"),
}).test(
  "shop-or-sales-channel",
  "Please select either Shop or Sales Channel",
  function (values) {
    const hasShop = !!values.shopId;
    const hasSalesChannel = !!values.salesChannel?.trim();
    return hasShop || hasSalesChannel;
  }
).test(
  "not-both-shop-and-sales-channel",
  "Use either Shop or Sales Channel, not both",
  function (values) {
    const hasShop = !!values.shopId;
    const hasSalesChannel = !!values.salesChannel?.trim();
    return !(hasShop && hasSalesChannel);
  }
);

type FormValues = {
  currentRateId: string;
  shopId: number | null;
  salesChannel: string;
  rate: number | "";
  makingCharge: number | "";
  makingChargeType: string;
  discountOnMaking: number | "";
  discountType: string;
  isActive: boolean;
};

type UpdateGoldFormValues = {
  shopId: number | null;
  salesChannel: string;
  rate24K: number | "";
};

type ApiError = {
  response?: { data?: { message?: string } };
};

// ========================
// Page
// ========================
export const ShopCurrentRatePage = () => {
  const navigate = useNavigate();
  const { permissions, user } = useAuth();

  const actionPermissions = permissions?.find(
    (item: any) => item?.Module === "ShopCurrentRate"
  );
  const isAdmin =
    (user as any)?.userRoles?.some((ur: any) => ur.role?.name === "Admin") ??
    false;

  const hasCreate = actionPermissions?.Create || isAdmin;
  const hasUpdate = actionPermissions?.Update || isAdmin;
  const hasDelete = actionPermissions?.Delete || isAdmin;

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedShopId, setSelectedShopId] = useState<string>("all");
  const [selectedSalesChannel, setSelectedSalesChannel] =
    useState<string>("all");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRate, setEditingRate] = useState<ShopCurrentRate | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [goldDialogOpen, setGoldDialogOpen] = useState(false);

  const { data: rates = [], isLoading } = useAllShopCurrentRates();
  const { data: allShops = [] } = useAllShop();
  const { data: allSalesChannels = [] } = useAllSalesChannels();
  const { data: lookup } = useAllLookUp();
  const { data: currentRates = [] } = useCurrentRates();
  const createMutation = useCreateShopCurrentRate();
  const updateMutation = useUpdateShopCurrentRate();
  const deleteMutation = useDeleteShopCurrentRate();
  const updateShopGoldRatesMutation = useUpdateShopGoldRates();

  const filtered = rates.filter((r) => {
    const q = searchTerm.trim().toLowerCase();

    const matchesSearch =
      !q ||
      r.shopName?.toLowerCase().includes(q) ||
      r.currentRateId?.toLowerCase().includes(q) ||
      r.salesChannel?.toLowerCase().includes(q) ||
      r.currentRateDescription?.toLowerCase().includes(q);

    const matchesShop =
      selectedShopId === "all" || String(r.shopId) === selectedShopId;

    const matchesSalesChannel =
      selectedSalesChannel === "all" ||
      (r.salesChannel || "") === selectedSalesChannel;

    return matchesSearch && matchesShop && matchesSalesChannel;
  });

  const handleAdd = () => {
    setEditingRate(null);
    setDialogOpen(true);
  };

  const handleEdit = (row: ShopCurrentRate) => {
    setEditingRate(row);
    setDialogOpen(true);
  };

  const handleDeleteClick = (id: number) => {
    setDeleteId(id);
    setConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (!deleteId) return;
    deleteMutation.mutate(deleteId, {
      onSuccess: () => {
        toast.success("Rate override deleted successfully");
        setConfirmOpen(false);
        setDeleteId(null);
      },
      onError: () => {
        toast.error("Failed to delete rate override");
      },
    });
  };

  const handleSubmit = async (
    values: FormValues,
    { setSubmitting }: FormikHelpers<FormValues>
  ) => {
    try {
      const payload: CreateShopCurrentRateData = {
        currentRateId: values.currentRateId,
        shopId: values.shopId ?? 0,
        salesChannel: values.salesChannel?.trim() || undefined,
        rate: Number(values.rate) || 0,
        makingCharge: Number(values.makingCharge) || 0,
        makingChargeType: values.makingChargeType || undefined,
        discountOnMaking: Number(values.discountOnMaking) || 0,
        discountType: values.discountType || undefined,
        isActive: values.isActive,
      };

      if (editingRate) {
        await updateMutation.mutateAsync({
          id: editingRate.id,
          data: payload,
        });
        toast.success("Rate override updated successfully");
      } else {
        await createMutation.mutateAsync(payload);
        toast.success("Rate override created successfully");
      }

      setDialogOpen(false);
      setEditingRate(null);
    } catch (err: unknown) {
      const message = (err as ApiError)?.response?.data?.message;
      toast.error(message || "Failed to save rate override");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateGoldSubmit = async (
    values: UpdateGoldFormValues,
    { setSubmitting, resetForm }: FormikHelpers<UpdateGoldFormValues>
  ) => {
    try {
      const payload: {
        shopId?: number;
        salesChannel?: string;
        rate24K: number;
      } = {
        rate24K: Number(values.rate24K),
      };

      if (values.shopId) {
        payload.shopId = values.shopId;
      } else if (values.salesChannel?.trim()) {
        payload.salesChannel = values.salesChannel.trim();
      }

      await updateShopGoldRatesMutation.mutateAsync(payload);

      toast.success("24K Gold Rate updated successfully");
      setGoldDialogOpen(false);
      resetForm();
    } catch (err: unknown) {
      const message = (err as ApiError)?.response?.data?.message;
      toast.error(message || "Failed to update 24K Gold rate");
    } finally {
      setSubmitting(false);
    }
  };

  const initialValues: FormValues = {
    currentRateId: editingRate?.currentRateId ?? "",
    shopId: editingRate?.shopId ?? null,
    salesChannel: editingRate?.salesChannel ?? "",
    rate: editingRate?.rate ?? "",
    makingCharge: editingRate?.makingCharge ?? "",
    makingChargeType: editingRate?.makingChargeType ?? "FIXED",
    discountOnMaking: editingRate?.discountOnMaking ?? "",
    discountType: editingRate?.discountType ?? "FLAT",
    isActive: editingRate?.isActive ?? true,
  };

  const goldInitialValues: UpdateGoldFormValues = {
    shopId: null,
    salesChannel: "",
    rate24K: "",
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedShopId("all");
    setSelectedSalesChannel("all");
  };

  const salesChannelOptions =
    allSalesChannels?.length > 0
      ? allSalesChannels
        .filter((channel: any) => channel.isActive)
        .map((channel: any) => channel.name)
      : ["Offline", "Online"];

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-full overflow-x-hidden">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/admin/currentrate")}
            className="h-9 px-2 shrink-0"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold flex items-center gap-2 min-w-0">
            <DollarSign className="w-6 h-6 sm:w-8 sm:h-8 text-[#b08d28] shrink-0" />
            <span className="truncate">Sale Channels | Shop Rates</span>
          </h1>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:gap-2">
          {hasUpdate && (
            <Button
              onClick={() => setGoldDialogOpen(true)}
              size="default"
              variant="outline"
              className="w-full sm:w-auto h-10"
            >
              <Zap className="w-4 h-4 mr-2" />
              Update 24K Gold Rate
            </Button>
          )}

          {hasCreate && (
            <Button onClick={handleAdd} size="default" className="w-full sm:w-auto h-10">
              <Plus className="w-4 h-4 mr-2" />
              Add Override
            </Button>
          )}
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label className="mb-1 block text-xs font-semibold text-gray-600">
              Search
            </Label>
            <SearchInput
              placeholder="Search by shop, rate ID or channel..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClear={() => setSearchTerm("")}
              className="w-full"
            />
          </div>

          <div>
            <Label className="mb-1 block text-xs font-semibold text-gray-600">
              Filter by Shop
            </Label>
            <Select value={selectedShopId} onValueChange={setSelectedShopId}>
              <SelectTrigger>
                <SelectValue placeholder="All shops" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Shops</SelectItem>
                {allShops.map((shop: any) => (
                  <SelectItem key={shop.id} value={String(shop.id)}>
                    {shop.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="mb-1 block text-xs font-semibold text-gray-600">
              Filter by Sales Channel
            </Label>
            <Select
              value={selectedSalesChannel}
              onValueChange={setSelectedSalesChannel}
            >
              <SelectTrigger>
                <SelectValue placeholder="All sales channels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sales Channels</SelectItem>
                {allSalesChannels
                  .filter((channel: any) => channel.isActive)
                  .map((channel: any) => (
                    <SelectItem key={channel.id} value={channel.name}>
                      {channel.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button variant="outline" size="sm" onClick={clearFilters}>
            Clear Filters
          </Button>
          <p className="text-sm text-gray-500">
            Showing <span className="font-semibold">{filtered.length}</span> of{" "}
            <span className="font-semibold">{rates.length}</span> overrides
          </p>
        </div>
      </div>

      <div className="w-full bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <CommonTable
          columns={[
            {
              key: "shopName",
              label: "Shop",
              render: (r: any) => (
                <span className="font-semibold text-gray-900">
                  {r.shopName || "—"}
                </span>
              ),
            },
            {
              key: "salesChannel",
              label: "Sales Channel",
              render: (r: any) =>
                r.salesChannel || <span className="text-gray-400">—</span>,
            },
            {
              key: "currentRateId",
              label: "Rate ID",
              render: (r: any) => (
                <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">
                  {r.currentRateId}
                </span>
              ),
            },
            {
              key: "currentRateDescription",
              label: "Description",
              render: (r: any) =>
                r.currentRateDescription || (
                  <span className="text-gray-400">—</span>
                ),
            },
            {
              key: "rate",
              label: "Rate",
              render: (r: any) => (
                <span className="font-medium">
                  ₹{Number(r.rate).toLocaleString("en-IN")}
                </span>
              ),
            },
            {
              key: "makingCharge",
              label: "Making Charge",
              render: (r: any) => (
                <span>
                  {r.makingCharge ?? "—"}{" "}
                  {r.makingChargeType ? (
                    <span className="text-xs text-gray-400">
                      ({r.makingChargeType})
                    </span>
                  ) : null}
                </span>
              ),
            },
            {
              key: "discountOnMaking",
              label: "Discount",
              render: (r: any) => (
                <span>
                  {r.discountOnMaking ?? "—"}{" "}
                  {r.discountType ? (
                    <span className="text-xs text-gray-400">
                      ({r.discountType})
                    </span>
                  ) : null}
                </span>
              ),
            },
            {
              key: "isActive",
              label: "Status",
              render: (r: any) => (
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide whitespace-nowrap ${r.isActive
                      ? "bg-green-100 text-green-700 border border-green-200"
                      : "bg-red-100 text-red-700 border border-red-200"
                    }`}
                >
                  {r.isActive ? "Active" : "Inactive"}
                </span>
              ),
            },
          ]}
          data={filtered}
          loading={isLoading}
          emptyMessage="No rate overrides found"
          actions={[
            ...(hasUpdate
              ? [
                {
                  icon: <Edit className="h-4 w-4" />,
                  onClick: (row: any) => handleEdit(row),
                  label: "Edit",
                },
              ]
              : []),
            ...(hasDelete
              ? [
                {
                  icon: <Trash2 className="h-4 w-4" />,
                  onClick: (row: any) => handleDeleteClick(row.id),
                  label: "Delete",
                },
              ]
              : []),
          ]}
        />
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingRate ? "Edit Rate Override" : "Add Rate Override"}
            </DialogTitle>
          </DialogHeader>

          <Formik
            enableReinitialize
            initialValues={initialValues}
            validationSchema={ShopCurrentRateSchema}
            onSubmit={handleSubmit}
          >
            {({ values, errors, touched, isSubmitting, setFieldValue }) => {
              const isBusy =
                isSubmitting ||
                createMutation.isPending ||
                updateMutation.isPending;

              return (
                <Form className="space-y-4">
                  {typeof errors === "string" && (
                    <p className="text-sm text-red-500">{errors}</p>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs">Rate ID *</Label>
                      <Select
                        value={values.currentRateId}
                        onValueChange={(v) => setFieldValue("currentRateId", v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select rate (e.g. Gold-22K)" />
                        </SelectTrigger>
                        <SelectContent>
                          {(currentRates ?? []).map((rate) => (
                            <SelectItem key={rate.id} value={rate.id}>
                              {rate.id}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {touched.currentRateId && errors.currentRateId && (
                        <p className="text-sm text-red-500">
                          {errors.currentRateId}
                        </p>
                      )}
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Rate *</Label>
                      <Field
                        as={Input}
                        name="rate"
                        type="number"
                        placeholder="e.g. 7200"
                      />
                      {touched.rate && errors.rate && (
                        <p className="text-sm text-red-500">
                          {errors.rate as string}
                        </p>
                      )}
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Shop</Label>
                      <Select
                        value={values.shopId ? String(values.shopId) : "__none__"}
                        onValueChange={(v) => {
                          if (v === "__none__") {
                            setFieldValue("shopId", null);
                            return;
                          }
                          setFieldValue("shopId", Number(v));
                          setFieldValue("salesChannel", "");
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select shop" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">None</SelectItem>
                          {allShops.map((shop: any) => (
                            <SelectItem key={shop.id} value={String(shop.id)}>
                              {shop.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {touched.shopId && errors.shopId && (
                        <p className="text-sm text-red-500">
                          {errors.shopId as string}
                        </p>
                      )}
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Sales Channel</Label>
                      <Select
                        value={values.salesChannel || "__none__"}
                        onValueChange={(v) => {
                          if (v === "__none__") {
                            setFieldValue("salesChannel", "");
                            return;
                          }
                          setFieldValue("salesChannel", v);
                          setFieldValue("shopId", null);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select sales channel" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">None</SelectItem>
                          {allSalesChannels
                            .filter((channel: any) => channel.isActive)
                            .map((channel: any) => (
                              <SelectItem key={channel.id} value={channel.name}>
                                {channel.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      {touched.salesChannel && errors.salesChannel && (
                        <p className="text-sm text-red-500">
                          {errors.salesChannel as string}
                        </p>
                      )}
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Making Charge</Label>
                      <Field
                        as={Input}
                        name="makingCharge"
                        type="number"
                        placeholder="e.g. 500"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Making Charge Type</Label>
                      <Select
                        value={values.makingChargeType}
                        onValueChange={(v) =>
                          setFieldValue("makingChargeType", v)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          {(lookup?.makingChargeTypes ?? []).map(
                            (item: string) => (
                              <SelectItem key={item} value={item}>
                                {item}
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Discount on Making</Label>
                      <Field
                        as={Input}
                        name="discountOnMaking"
                        type="number"
                        placeholder="e.g. 50"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Discount Type</Label>
                      <Select
                        value={values.discountType}
                        onValueChange={(v) => setFieldValue("discountType", v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          {(lookup?.discountTypes ?? lookup?.makingChargeTypes ?? []).map(
                            (item: string) => (
                              <SelectItem key={item} value={item}>
                                {item}
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {typeof errors === "object" &&
                    !Array.isArray(errors) &&
                    !errors.shopId &&
                    !errors.salesChannel &&
                    (errors as any)["shop-or-sales-channel"] && (
                      <p className="text-sm text-red-500">
                        {(errors as any)["shop-or-sales-channel"]}
                      </p>
                    )}

                  <div className="flex items-center gap-3 pt-2">
                    <Switch
                      id="isActive"
                      checked={values.isActive}
                      onCheckedChange={(checked) =>
                        setFieldValue("isActive", checked)
                      }
                    />
                    <Label
                      htmlFor="isActive"
                      className="cursor-pointer text-sm"
                    >
                      Active
                    </Label>
                  </div>

                  <DialogFooter className="pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setDialogOpen(false)}
                      disabled={isBusy}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isBusy}>
                      {isBusy
                        ? "Saving..."
                        : editingRate
                          ? "Update Override"
                          : "Create Override"}
                    </Button>
                  </DialogFooter>
                </Form>
              );
            }}
          </Formik>
        </DialogContent>
      </Dialog>

      <Dialog open={goldDialogOpen} onOpenChange={setGoldDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Update 24K Gold Rate</DialogTitle>
          </DialogHeader>

          <Formik
            initialValues={goldInitialValues}
            validationSchema={UpdateGoldRateSchema}
            onSubmit={handleUpdateGoldSubmit}
          >
            {({ values, errors, touched, isSubmitting, setFieldValue }) => {
              const isBusy = isSubmitting || updateShopGoldRatesMutation.isPending;
              const shopSelected = !!values.shopId;
              const salesChannelSelected = !!values.salesChannel;

              return (
                <Form className="space-y-4">
                  <p className="text-sm text-gray-500">
                    Select either a shop or a sales channel. If shop is selected,
                    sales channel will not be sent. If sales channel is selected,
                    shop selection will be disabled.
                  </p>

                  <div className="space-y-1">
                    <Label className="text-xs">Shop</Label>
                    <Select
                      value={values.shopId ? String(values.shopId) : "__none__"}
                      onValueChange={(v) => {
                        if (v === "__none__") {
                          setFieldValue("shopId", null);
                          return;
                        }
                        setFieldValue("shopId", Number(v));
                        setFieldValue("salesChannel", "");
                      }}
                      disabled={salesChannelSelected}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select shop" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {allShops
                          .filter((shop: any) => shop.isActive !== false)
                          .map((shop: any) => (
                            <SelectItem key={shop.id} value={String(shop.id)}>
                              {shop.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    {touched.shopId && errors.shopId && (
                      <p className="text-sm text-red-500">
                        {errors.shopId as string}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Sales Channel</Label>
                    <Select
                      value={values.salesChannel || "__none__"}
                      onValueChange={(v) => {
                        if (v === "__none__") {
                          setFieldValue("salesChannel", "");
                          return;
                        }
                        setFieldValue("salesChannel", v);
                        setFieldValue("shopId", null);
                      }}
                      disabled={shopSelected}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select sales channel" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {salesChannelOptions.map((channel: string) => (
                          <SelectItem key={channel} value={channel}>
                            {channel}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {touched.salesChannel && errors.salesChannel && (
                      <p className="text-sm text-red-500">
                        {errors.salesChannel as string}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">24K Gold Rate *</Label>
                    <Field
                      as={Input}
                      name="rate24K"
                      type="number"
                      placeholder="e.g. 72000"
                    />
                    {touched.rate24K && errors.rate24K && (
                      <p className="text-sm text-red-500">
                        {errors.rate24K as string}
                      </p>
                    )}
                  </div>

                  {typeof errors === "object" &&
                    !Array.isArray(errors) &&
                    (errors as any)["shop-or-sales-channel"] && (
                      <p className="text-sm text-red-500">
                        {(errors as any)["shop-or-sales-channel"]}
                      </p>
                    )}

                  {typeof errors === "object" &&
                    !Array.isArray(errors) &&
                    (errors as any)["not-both-shop-and-sales-channel"] && (
                      <p className="text-sm text-red-500">
                        {(errors as any)["not-both-shop-and-sales-channel"]}
                      </p>
                    )}

                  <DialogFooter className="pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setGoldDialogOpen(false)}
                      disabled={isBusy}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isBusy}>
                      {isBusy ? "Updating..." : "Update Gold Rate"}
                    </Button>
                  </DialogFooter>
                </Form>
              );
            }}
          </Formik>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmOpen}
        title="Delete Rate Override?"
        message="This rate override will be permanently deleted."
        onConfirm={confirmDelete}
        onCancel={() => setConfirmOpen(false)}
        confirmText="Delete"
        variant="destructive"
      />
    </div>
  );
};