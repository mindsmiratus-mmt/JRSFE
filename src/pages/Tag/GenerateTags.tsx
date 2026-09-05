// src/pages/tag/GenerateTags.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useGenerateTags } from "@/hooks/useTag";
import { useAllItems } from "@/hooks/useItem"; // You'll need this hook (see note below)
import { toast } from "@/components/ui/toast";
import { ArrowLeft, PackagePlus } from "lucide-react";

export const GenerateTags = () => {
    const navigate = useNavigate();
    const [itemId, setItemId] = useState<string>("");
    const [quantity, setQuantity] = useState<string>("1");

    const { data: items = [], isLoading: itemsLoading } = useAllItems();
    const generateMutation = useGenerateTags();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!itemId || !quantity || Number(quantity) <= 0) {
            toast.error("Please select an item and enter valid quantity");
            return;
        }

        generateMutation.mutate(
            {
                itemId: Number(itemId),
            },
            {
                onSuccess: (newTags) => {
                    toast.success(`${newTags.length} tag(s) generated successfully!`);
                    navigate("/admin/tag"); // Back to tag list
                },
                onError: (error: any) => {
                    toast.error(error?.response?.data?.message || "Failed to generate tags");
                },
            }
        );
    };

    return (
        <div className="p-6 max-w-2xl mx-auto">
            <div className="flex items-center gap-4 mb-8">
                <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <h1 className="text-3xl font-bold flex items-center gap-3">
                    <PackagePlus className="w-8 h-8" />
                    Generate New Tags
                </h1>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Select Item & Quantity</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="item">Item</Label>
                            <Select value={itemId} onValueChange={setItemId} required disabled={itemsLoading}>
                                <SelectTrigger id="item">
                                    <SelectValue placeholder={itemsLoading ? "Loading items..." : "Select an item"} />
                                </SelectTrigger>
                                <SelectContent className="max-h-96">
                                    {items.map((item) => (
                                        <SelectItem key={item.id} value={String(item.id)}>
                                            <div className="flex flex-col">
                                                <span className="font-medium">{item.name}</span>
                                                <span className="text-xs text-gray-500">
                                                    {item.goldKT} • {item.category?.categoryName || "Uncategorized"} • Stock: {item.quantity - item.sold}
                                                </span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="quantity">Quantity to Tag</Label>
                            <Input
                                id="quantity"
                                type="number"
                                min="1"
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value)}
                                placeholder="e.g. 5"
                                required
                            />
                            <p className="text-sm text-gray-500">
                                This will create {quantity || 0} separate tags for the selected item.
                            </p>
                        </div>

                        <div className="flex gap-4 pt-4">
                            <Button
                                type="submit"
                                size="lg"
                                className="flex-1"
                                disabled={generateMutation.isPending || itemsLoading}
                            >
                                {generateMutation.isPending ? "Generating..." : "Generate Tags"}
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                size="lg"
                                onClick={() => navigate("/admin/tag")}
                            >
                                Cancel
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            {generateMutation.isPending && (
                <div className="mt-6 text-center text-sm text-gray-600">
                    Generating {quantity} tag(s), please wait...
                </div>
            )}
        </div>
    );
};