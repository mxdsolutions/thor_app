"use client";

import { useState, useEffect } from "react";
import { DashboardPage, DashboardHeader, DashboardControls } from "@/components/dashboard/DashboardPage";
import {
    tableBase,
    tableHead,
    tableHeadCell,
    tableRow,
    tableCell,
    tableCellMuted
} from "@/lib/design-system";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn, formatCurrency } from "@/lib/utils";
import {
    MagnifyingGlassIcon,
    PlusIcon,
    ArrowUpRightIcon,
} from "@heroicons/react/24/outline";
import { CreateProductModal } from "@/components/modals/CreateProductModal";
import { ProductSideSheet } from "@/components/sheets/ProductSideSheet";
import { toast } from "sonner";

type Product = {
    id: string;
    name: string;
    description: string | null;
    initial_value: number | null;
    monthly_value: number | null;
    yearly_value: number | null;
    status: string;
    created_at: string;
};

export default function ProductsPage() {
    const [search, setSearch] = useState("");
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/products");
            if (!res.ok) throw new Error("Failed to fetch products");
            const data = await res.json();
            setProducts(data.products || []);
        } catch (err) {
            console.error(err);
            toast.error("Failed to load products");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.description?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <DashboardPage>
            <DashboardHeader
                title="Products"
                subtitle="Manage your products and service offerings."
            >
                <Button className="rounded-full px-6 shrink-0" onClick={() => setShowCreate(true)}>
                    <PlusIcon className="w-4 h-4 mr-2" />
                    Add Product
                </Button>
            </DashboardHeader>

            <DashboardControls>
                <div className="relative flex-1 max-w-sm">
                    <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Search products..."
                        className="pl-9 rounded-xl border-border/50"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </DashboardControls>

            <div className="w-full overflow-x-auto">
                <table className={tableBase + " border-collapse min-w-full"}>
                    <thead className={tableHead}>
                        <tr>
                            <th className={tableHeadCell + " pl-4 md:pl-6 lg:pl-10 pr-4"}>Product</th>
                            <th className={tableHeadCell + " px-4 hidden sm:table-cell"}>Initial Value</th>
                            <th className={tableHeadCell + " px-4 hidden sm:table-cell"}>Monthly Value</th>
                            <th className={tableHeadCell + " px-4"}>Yearly Value</th>
                            <th className={tableHeadCell + " px-4 hidden sm:table-cell"}>Status</th>
                            <th className={tableHeadCell + " pl-4 pr-4 md:pr-6 lg:pr-10 text-right"}></th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={6} className="text-center py-12 text-sm text-muted-foreground">Loading products...</td>
                            </tr>
                        ) : filteredProducts.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="text-center py-12 text-sm text-muted-foreground">No products found.</td>
                            </tr>
                        ) : (
                            filteredProducts.map((product) => (
                                <tr key={product.id} className={tableRow + " group cursor-pointer"} onClick={() => setSelectedProduct(product)}>
                                    <td className={tableCell + " pl-4 md:pl-6 lg:pl-10 pr-4"}>
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center font-bold text-xs text-foreground ring-1 ring-border/50 shrink-0">
                                                {product.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-semibold text-sm truncate">{product.name}</p>
                                                {product.description && <p className="text-xs text-muted-foreground truncate">{product.description}</p>}
                                            </div>
                                        </div>
                                    </td>
                                    <td className={tableCellMuted + " px-4 hidden sm:table-cell"}>
                                        {formatCurrency(product.initial_value)}
                                    </td>
                                    <td className={tableCellMuted + " px-4 hidden sm:table-cell"}>
                                        {formatCurrency(product.monthly_value)}
                                    </td>
                                    <td className={tableCellMuted + " px-4"}>
                                        {formatCurrency(product.yearly_value)}
                                    </td>
                                    <td className={tableCell + " px-4 hidden sm:table-cell"}>
                                        <div className="flex items-center gap-2">
                                            <div className={cn(
                                                "w-1.5 h-1.5 rounded-full",
                                                product.status === "active" ? "bg-emerald-500" : "bg-amber-500"
                                            )} />
                                            <span className="text-xs font-medium text-muted-foreground capitalize">
                                                {product.status}
                                            </span>
                                        </div>
                                    </td>
                                    <td className={tableCell + " pl-4 pr-4 md:pr-6 lg:pr-10 text-right md:opacity-0 md:group-hover:opacity-100 transition-opacity"}>
                                        <Button variant="ghost" size="icon" className="rounded-lg h-8 w-8 text-muted-foreground">
                                            <ArrowUpRightIcon className="w-4 h-4" />
                                        </Button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
            <CreateProductModal
                open={showCreate}
                onOpenChange={setShowCreate}
                onCreated={() => fetchProducts()}
            />

            <ProductSideSheet
                product={selectedProduct}
                open={!!selectedProduct}
                onOpenChange={(open) => { if (!open) setSelectedProduct(null); }}
            />
        </DashboardPage>
    );
}
