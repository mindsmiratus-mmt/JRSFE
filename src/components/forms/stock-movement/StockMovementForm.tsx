// components/stock-movement/StockMovementForm.tsx
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Formik, Form, Field, type FormikHelpers } from "formik";
import * as Yup from "yup";
import { toast } from "@/components/ui/toast";

import {
  useCreateStockMovement,
  useUpdateStockMovement,
  type CreateStockMovementData,
  type StockMovement,
  type UpdateStockMovementData,
} from "@/hooks/useStockMovement";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { useAllItems } from "@/hooks/useItem";
import { useAllShop } from "@/hooks/useShop";
import { cn } from "@/lib/utils";

// ========================
// Validation Schema
// ========================
const StockMovementSchema = Yup.object().shape({
  itemId: Yup.number()
    .typeError("Please select an item")
    .required("Please select an item"),
  shopId: Yup.number()
    .typeError("Please select a shop")
    .min(1, "Shop ID must be greater than 0")
    .required("Shop ID is required"),
  type: Yup.string().required("Type is required"),
  quantity: Yup.number()
    .typeError("Quantity must be a number")
    .min(0.001, "Quantity must be greater than 0")
    .required("Quantity is required"),
  grossWeight: Yup.number()
    .typeError("Gross weight must be a number")
    .min(0, "Gross weight must be 0 or greater")
    .required("Gross weight is required"),
  netWeight: Yup.number()
    .typeError("Net weight must be a number")
    .min(0, "Net weight must be 0 or greater")
    .required("Net weight is required"),
  referenceNo: Yup.string().trim().required("Reference number is required"),
  remarks: Yup.string().optional(),
});

// ========================
// Types
// ========================
interface StockMovementFormProps {
  stockMovement?: StockMovement;
  onSuccess: (msg: string) => void;
  onCancel: () => void;
}

type StockMovementFormValues = {
  itemId: number | "";
  shopId: number | "";
  type: string;
  quantity: number | "";
  grossWeight: number | "";
  netWeight: number | "";
  referenceNo: string;
  remarks: string;
};

type ApiError = {
  response?: {
    data?: {
      message?: string;
    };
  };
};

// ========================
// Component
// ========================
export const StockMovementForm = ({
  stockMovement,
  onSuccess,
  onCancel,
}: StockMovementFormProps) => {
  const isEdit = !!stockMovement;

  const { data: allItems = [] } = useAllItems();
  const { data: allShop = [] } = useAllShop();
  const createMutation = useCreateStockMovement();
  const updateMutation = useUpdateStockMovement();

  const initialValues: StockMovementFormValues = {
    itemId: stockMovement?.itemId || "",
    shopId: stockMovement?.shopId || "",
    type: stockMovement?.type || "",
    quantity: stockMovement?.quantity || "",
    grossWeight: stockMovement?.grossWeight || "",
    netWeight: stockMovement?.netWeight || "",
    referenceNo: stockMovement?.referenceNo || "",
    remarks: stockMovement?.remarks || "",
  };

  const handleSubmit = async (
    values: StockMovementFormValues,
    { setSubmitting }: FormikHelpers<StockMovementFormValues>
  ) => {
    const payload: CreateStockMovementData | UpdateStockMovementData = {
      itemId: Number(values.itemId),
      shopId: Number(values.shopId),
      type: values.type,
      quantity: Number(values.quantity),
      grossWeight: Number(values.grossWeight),
      netWeight: Number(values.netWeight),
      referenceNo: values.referenceNo.trim(),
      remarks: values.remarks.trim() || undefined,
    };

    try {
      if (isEdit) {
        await updateMutation.mutateAsync({
          id: stockMovement!.id,
          data: payload as UpdateStockMovementData,
        });
        onSuccess("Stock movement updated successfully!");
      } else {
        await createMutation.mutateAsync(payload as CreateStockMovementData);
        onSuccess("Stock movement created successfully!");
      }
    } catch (err: unknown) {
      console.error("Stock movement save error:", err);
      const message = (err as ApiError)?.response?.data?.message;
      toast.error(message || "Failed to save stock movement");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Formik
      enableReinitialize
      initialValues={initialValues}
      validationSchema={StockMovementSchema}
      onSubmit={handleSubmit}
    >
      {({ values, errors, touched, setFieldValue, isSubmitting }) => (
        <Form
          className={cn(
            "space-y-8",
            !isEdit && "pb-[calc(9rem+env(safe-area-inset-bottom))] sm:pb-0"
          )}
        >
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 bg-white p-6 rounded-lg border">
            <div className="space-y-2 lg:col-span-2">
              <Label>Item *</Label>
              <SearchableSelect
                disabled={isEdit}
                value={String(values.itemId || "")}
                onChange={(v) => setFieldValue("itemId", v ? Number(v) : "")}
                placeholder="Select item"
                options={allItems.map((i: any) => ({
                  value: i.id,
                  label: i.name,
                }))}
              />
              {touched.itemId && errors.itemId && (
                <p className="text-sm text-red-500">{errors.itemId}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Shop *</Label>
              <SearchableSelect
                disabled={isEdit}
                value={String(values.shopId || "")}
                onChange={(v) => setFieldValue("shopId", v ? Number(v) : "")}
                placeholder="Select shop"
                options={allShop.map((s: any) => ({
                  value: s.id,
                  label: s.name,
                }))}
              />
              {touched.shopId && errors.shopId && (
                <p className="text-sm text-red-500">{errors.shopId}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Type *</Label>
              <Select
                disabled={isEdit}
                value={values.type}
                onValueChange={(v) => setFieldValue("type", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IN">IN (Purchase/Receive)</SelectItem>
                  <SelectItem value="OUT">OUT (Sale/Issue)</SelectItem>
                  <SelectItem value="ADJUSTMENT">ADJUSTMENT</SelectItem>
                  <SelectItem value="TRANSFER">TRANSFER</SelectItem>
                </SelectContent>
              </Select>
              {touched.type && errors.type && (
                <p className="text-sm text-red-500">{errors.type}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Reference No. *</Label>
              <Field
                disabled={isEdit}
                as={Input}
                name="referenceNo"
                placeholder="Enter reference number"
              />
              {touched.referenceNo && errors.referenceNo && (
                <p className="text-sm text-red-500">{errors.referenceNo}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 bg-white p-6 rounded-lg border">
            <div className="space-y-2">
              <Label>Quantity *</Label>
              <Field
                disabled={isEdit}
                as={Input}
                type="number"
                step="0.001"
                name="quantity"
                placeholder="0.000"
              />
              {touched.quantity && errors.quantity && (
                <p className="text-sm text-red-500">{errors.quantity}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Gross Weight (g) *</Label>
              <Field
                disabled={isEdit}
                as={Input}
                type="number"
                step="0.001"
                name="grossWeight"
                placeholder="0.000"
              />
              {touched.grossWeight && errors.grossWeight && (
                <p className="text-sm text-red-500">{errors.grossWeight}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Net Weight (g) *</Label>
              <Field
                disabled={isEdit}
                as={Input}
                type="number"
                step="0.001"
                name="netWeight"
                placeholder="0.000"
              />
              {touched.netWeight && errors.netWeight && (
                <p className="text-sm text-red-500">{errors.netWeight}</p>
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border space-y-2">
            <Label>Remarks (Optional)</Label>
            <Field
              disabled={isEdit}
              as={Textarea}
              name="remarks"
              placeholder="Enter any remarks..."
              rows={4}
            />
            {touched.remarks && errors.remarks && (
              <p className="text-sm text-red-500">{errors.remarks}</p>
            )}
          </div>

          {!isEdit && (
            <>
              <div className="hidden justify-end gap-4 pt-8 border-t sm:flex">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>

                <Button type="submit" disabled={isSubmitting} size="lg">
                  {isSubmitting && (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  )}
                  Create Stock Movement
                </Button>
              </div>

              <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/75 sm:hidden">
                <div
                  className="mx-auto grid max-w-7xl grid-cols-2 gap-3 px-6 py-3"
                  style={{
                    paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom))",
                  }}
                >
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onCancel}
                    disabled={isSubmitting}
                    className="w-full"
                  >
                    Cancel
                  </Button>

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    size="lg"
                    className="w-full"
                  >
                    {isSubmitting && (
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    )}
                    Create Stock Movement
                  </Button>
                </div>
              </div>
            </>
          )}
        </Form>
      )}
    </Formik>
  );
};