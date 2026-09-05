import { Formik, Form, Field } from "formik";
import * as Yup from "yup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

import { useAllItems } from "@/hooks/useItem";
import {
    useCreateTag,
    useUpdateTag,
    useGenerateTags,
    type Tag,
    type CreateTagPayload,
} from "@/hooks/useTag";
import { toast } from "@/components/ui/toast";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { DateInput } from "@/components/ui/DatePicker";

/* ---------------------------------------------
   Helpers
--------------------------------------------- */

const ktToPurity = (kt?: string) => {
    const map: Record<string, number> = {
        "24KT": 99.9,
        "22KT": 91.6,
        "18KT": 75,
        "14KT": 58.5,
    };
    return kt ? map[kt] ?? 91.6 : 91.6;
};

/* ---------------------------------------------
   Validation
--------------------------------------------- */

const TagSchema = Yup.object().shape({
    tagNo: Yup.string().trim().required("Tag number is required"),
    itemId: Yup.number().required("Please select an item"),
    weight: Yup.number().min(0.001, "Weight must be greater than 0").required(),
    purity: Yup.number().min(1).max(99.9).required(),
    rate: Yup.number().min(1, "Rate is required").required(),
    makingCharge: Yup.number().min(0).required(),
    tagDate: Yup.string().required("Tag date required"),
});

interface TagFormProps {
    tag?: Tag;
    onSuccess: (msg: string) => void;
}

export const TagForm = ({ tag, onSuccess }: TagFormProps) => {
    const isEdit = !!tag;

    const { data: items = [] } = useAllItems();
    const createMutation = useCreateTag();
    const updateMutation = useUpdateTag();
    const generateTagMutation = useGenerateTags();

    const initialValues = {
        tagNo: tag?.tagNo ?? "",
        itemId: tag?.itemId ?? "",
        weight: tag?.weight ?? "",
        purity: tag?.purity ?? 91.6,
        rate: tag?.rate ?? "",
        makingCharge: tag?.makingCharge ?? 0,
        tagDate: tag?.tagDate
            ? tag.tagDate.split("T")[0]
            : new Date().toISOString().split("T")[0],
    };

    const handleSubmit = async (values: any, { setSubmitting }: any) => {
        const payload: CreateTagPayload = {
            tagNo: values.tagNo,
            itemId: Number(values.itemId),
            weight: Number(values.weight),
            purity: Number(values.purity),
            rate: Number(values.rate),
            makingCharge: Number(values.makingCharge),
            tagDate: new Date(values.tagDate).toISOString(),
            isPrinted: false,
        };

        try {
            if (isEdit) {
                await updateMutation.mutateAsync({
                    id: tag!.id,
                    data: { ...payload, id: tag!.id },
                });
                onSuccess("Tag updated successfully!");
            } else {
                await createMutation.mutateAsync(payload);
                onSuccess("Tag created successfully!");
            }
        } catch (err: any) {
            toast.error(err?.response?.data?.message || "Failed to save tag");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Formik
            initialValues={initialValues}
            validationSchema={TagSchema}
            onSubmit={handleSubmit}
            enableReinitialize
        >
            {({ values, setFieldValue, isSubmitting, errors, touched }) => {
                const amount =
                    (+values.weight || 0) * (+values.rate || 0) +
                    (+values.makingCharge || 0);

                return (
                    <Form className="bg-white rounded-lg border p-8 space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Item */}
                            <div className="space-y-2">
                                <Label>Item *</Label>
                                <SearchableSelect
                                    value={values.itemId}
                                    onChange={async (v) => {
                                        const itemId = v ? Number(v) : undefined;
                                        setFieldValue("itemId", itemId);

                                        if (!itemId) return;

                                        const selectedItem = items.find(
                                            (i) => i.id === itemId
                                        );

                                        if (selectedItem && !isEdit) {
                                            setFieldValue(
                                                "weight",
                                                selectedItem.netWt ?? ""
                                            );
                                            setFieldValue(
                                                "makingCharge",
                                                selectedItem.making ?? 0
                                            );
                                            setFieldValue(
                                                "purity",
                                                ktToPurity(
                                                    selectedItem.goldKT
                                                )
                                            );
                                        }

                                        if (!isEdit) {
                                            try {
                                                const tagNo =
                                                    await generateTagMutation.mutateAsync(
                                                        { itemId }
                                                    );
                                                if (tagNo) {
                                                    setFieldValue(
                                                        "tagNo",
                                                        tagNo
                                                    );
                                                }
                                            } catch (err: any) {
                                                toast.error(
                                                    err?.response?.data
                                                        ?.message ||
                                                    "Failed to generate tag number"
                                                );
                                            }
                                        }
                                    }}
                                    placeholder="Select Item"
                                    options={items.map((i) => ({
                                        value: i.id,
                                        label: i.name,
                                    }))}
                                />
                                {touched.itemId && errors.itemId && (
                                    <p className="text-sm text-red-500">
                                        {errors.itemId}
                                    </p>
                                )}
                            </div>

                            {/* Tag No */}
                            <div className="space-y-2">
                                <Label>Tag Number *</Label>
                                <Field placeholder="Tag Number" as={Input} name="tagNo" />
                            </div>

                            {/* Date */}
                            <div className="space-y-2">
                                <Label>Tag Date</Label>
                                <DateInput
                                    value={values.tagDate}
                                    onValueChange={(v) =>
                                        setFieldValue("tagDate", v)
                                    }
                                />
                            </div>

                            {/* Weight */}
                            <div className="space-y-2">
                                <Label>Weight (g) *</Label>
                                <Field
                                    as={Input}
                                    type="number"
                                    step="0.001"
                                    name="weight"
                                />
                            </div>

                            {/* Purity */}
                            <div className="space-y-2">
                                <Label>Purity (%) *</Label>
                                <Field
                                    as={Input}
                                    type="number"
                                    step="0.1"
                                    name="purity"
                                />
                            </div>

                            {/* Rate */}
                            <div className="space-y-2">
                                <Label>Rate per gram *</Label>
                                <Field
                                    as={Input}
                                    type="number"
                                    name="rate"
                                />
                            </div>

                            {/* Making */}
                            <div className="space-y-2">
                                <Label>Making Charge</Label>
                                <Field
                                    as={Input}
                                    type="number"
                                    name="makingCharge"
                                />
                            </div>
                        </div>

                        {/* Summary */}
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
                            <h3 className="text-lg font-semibold mb-4">
                                Tag Summary
                            </h3>
                            <div className="grid grid-cols-2 gap-4 text-lg">
                                <div>
                                    Gold Value:
                                    <span className="font-bold ml-3">
                                        ₹
                                        {(
                                            (+values.weight || 0) *
                                            (+values.rate || 0)
                                        ).toLocaleString("en-IN")}
                                    </span>
                                </div>
                                <div>
                                    Making:
                                    <span className="font-bold ml-3">
                                        ₹
                                        {(values.makingCharge || 0).toLocaleString(
                                            "en-IN"
                                        )}
                                    </span>
                                </div>
                                <div className="col-span-2 text-xl font-bold text-amber-700">
                                    Total Amount: ₹
                                    {amount.toLocaleString("en-IN")}
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end gap-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => window.history.back()}
                                disabled={isSubmitting}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                )}
                                {isEdit ? "Update Tag" : "Create Tag"}
                            </Button>
                        </div>
                    </Form>
                );
            }}
        </Formik>
    );
};
