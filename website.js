// website.js (browser-friendly version)

// Form handling
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("contactForm");

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.getElementById("name").value;
    const email = document.getElementById("email").value;
    const message = document.getElementById("message").value;

    alert(`Thank you, ${name}! We will contact you at ${email}.`);

    // Reset form
    form.reset();
  });
});
import React, { useMemo, useState } from "react"; import { motion, AnimatePresence } from "framer-motion"; import { Card, CardContent, CardHeader, CardTitle, } from "@/components/ui/card"; import { Button } from "@/components/ui/button"; import { Input } from "@/components/ui/input"; import { Textarea } from "@/components/ui/textarea"; import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select"; import { Badge } from "@/components/ui/badge"; import { ShoppingCart, Factory, Building2, Truck, Phone, Star, Search, Filter, Calculator, X, Info, MessageSquare, } from "lucide-react";

// --- Mock Data (You will replace with your backend APIs later) --- const CATEGORIES = [ { key: "bricks", label: "Bricks" }, { key: "rod", label: "Rod (Rebar)" }, { key: "cement", label: "Cement" }, { key: "tiles", label: "Tiles" }, { key: "sanitary", label: "Sanitary" }, { key: "cables", label: "Electrical Cables" }, { key: "paint", label: "Paints" }, { key: "tools", label: "Tools" }, ];

const DISTRICTS = [ "Dhaka", "Chattogram", "Gazipur", "Narayanganj", "Cumilla", "Rajshahi", "Khulna", "Sylhet", "Barishal", "Rangpur", ];

type Product = { id: string; name: string; category: string; brand: string; origin: string; // supplier / factory name quality: "Standard" | "Premium" | "Economy"; unit: string; // e.g., bag, piece, ton, bundle price: number; // base price per unit (BDT) leadTimeDays: number; rating: number; // 0–5 image?: string; };

const MOCK_PRODUCTS: Product[] = [ { id: "p1", name: "Solid Clay Bricks (1st Class)", category: "bricks", brand: "Shah Cement Bricks", origin: "Tongi Kiln, Gazipur", quality: "Premium", unit: "1000 pcs", price: 9500, leadTimeDays: 2, rating: 4.7, image: "https://images.unsplash.com/photo-1606216794074-735e91b5f1c6?q=80&w=1200&auto=format&fit=crop", }, { id: "p2", name: "60 Grade Rod (12mm)", category: "rod", brand: "BSRM", origin: "BSRM Plant, Chattogram", quality: "Premium", unit: "per ton", price: 88500, leadTimeDays: 3, rating: 4.8, image: "https://images.unsplash.com/photo-1614767250754-5f8fd98399a6?q=80&w=1200&auto=format&fit=crop", }, { id: "p3", name: "OPC Cement (50kg)", category: "cement", brand: "Shah Cement", origin: "Mongla, Khulna", quality: "Standard", unit: "per bag", price: 520, leadTimeDays: 1, rating: 4.5, image: "https://images.unsplash.com/photo-1610563166150-b34df4fe88fa?q=80&w=1200&auto=format&fit=crop", }, { id: "p4", name: "Ceramic Floor Tiles 24x24", category: "tiles", brand: "RAK", origin: "Savar, Dhaka", quality: "Premium", unit: "per box", price: 1450, leadTimeDays: 2, rating: 4.3, image: "https://images.unsplash.com/photo-1523419409543-07f36caad8a7?q=80&w=1200&auto=format&fit=crop", }, { id: "p5", name: "CPVC Pipe 1"", category: "sanitary", brand: "Partex", origin: "Narayanganj", quality: "Standard", unit: "per 10ft", price: 320, leadTimeDays: 2, rating: 4.1, image: "https://images.unsplash.com/photo-1565183997392-2f6f122e5912?q=80&w=1200&auto=format&fit=crop", }, { id: "p6", name: "3-Core Copper Cable 2.5mm", category: "cables", brand: "BRB Cables", origin: "Sreepur, Gazipur", quality: "Premium", unit: "per meter", price: 110, leadTimeDays: 1, rating: 4.6, image: "https://images.unsplash.com/photo-1581094794329-c8112a89af12?q=80&w=1200&auto=format&fit=crop", }, ];

// --- Utilities --- function formatBDT(n: number) { return new Intl.NumberFormat("en-BD", { style: "currency", currency: "BDT", maximumFractionDigits: 0, }).format(n); }

function estimateDeliveryCost(district: string, weightKg: number) { // Simple demo logic: base + distance factor + weight factor const base = 150; const distanceFactor: Record<string, number> = { Dhaka: 1, Gazipur: 1.1, Narayanganj: 1.1, Cumilla: 1.3, Chattogram: 1.6, Rajshahi: 1.5, Khulna: 1.5, Sylhet: 1.6, Barishal: 1.4, Rangpur: 1.7, }; const d = distanceFactor[district] ?? 1.5; const perKg = 8; return Math.round(base * d + weightKg * perKg); }

function leadTimeLabel(days: number) { if (days <= 1) return "Tomorrow"; if (days === 2) return "In 2 days"; return ${days} days; }

// --- Components --- function Logo() { return ( <div className="flex items-center gap-2"> <Building2 className="h-7 w-7" /> <span className="font-bold text-xl tracking-tight"> BPC (Building Procurement Construction) </span> </div> ); }

function TopBar({ onOpenFilters }: { onOpenFilters: () => void }) { return ( <div className="sticky top-0 z-40 w-full backdrop-blur bg-white/70 border-b"> <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3"> <Logo /> <div className="flex-1" /> <Button variant="outline" className="gap-2" onClick={onOpenFilters}> <Filter className="h-4 w-4" /> Filters </Button> <a
href="https://wa.me/8801714736623"
target="_blank"
className="ml-2"
rel="noreferrer"
> <Button className="gap-2"> <MessageSquare className="h-4 w-4" /> Talk to Manager </Button> </a> </div> </div> ); }

function CategoryPills({ current, onChange, }: { current: string | null; onChange: (c: string | null) => void; }) { return ( <div className="flex flex-wrap gap-2"> <Badge onClick={() => onChange(null)} className={cursor-pointer px-3 py-1 text-sm ${ current === null ? "bg-black text-white" : "bg-neutral-100" }} > All </Badge> {CATEGORIES.map((c) => ( <Badge key={c.key} onClick={() => onChange(c.key)} className={cursor-pointer px-3 py-1 text-sm ${ current === c.key ? "bg-black text-white" : "bg-neutral-100" }} > {c.label} </Badge> ))} </div> ); }

function SearchBar({ query, onQuery, }: { query: string; onQuery: (v: string) => void; }) { return ( <div className="relative w-full"> <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" /> <Input value={query} onChange={(e) => onQuery(e.target.value)} placeholder="Search bricks, rod, cement, tiles, sanitary, cables..." className="pl-9 h-11" /> </div> ); }

function ProductCard({ product, onAdd, onOpen, }: { product: Product; onAdd: (p: Product) => void; onOpen: (p: Product) => void; }) { return ( <Card className="overflow-hidden hover:shadow-md transition-shadow"> <div className="h-36 w-full bg-cover bg-center" style={{ backgroundImage: url(${product.image}) }} onClick={() => onOpen(product)} role="button" /> <CardContent className="p-4 space-y-2"> <div className="flex items-start justify-between gap-2"> <div> <div className="font-medium leading-tight line-clamp-2"> {product.name} </div> <div className="text-xs text-neutral-500">{product.brand}</div> </div> <Badge className="bg-emerald-600">{product.quality}</Badge> </div> <div className="flex items-center gap-1 text-amber-600"> {Array.from({ length: 5 }).map((_, i) => ( <Star key={i} className={h-4 w-4 ${i < Math.round(product.rating) ? "fill-current" : ""}} /> ))} <span className="text-xs ml-1 text-neutral-500"> {product.rating.toFixed(1)} </span> </div> <div className="flex items-center justify-between"> <div> <div className="text-lg font-semibold">{formatBDT(product.price)}</div> <div className="text-xs text-neutral-500">{product.unit}</div> </div> <div className="text-xs text-neutral-600 flex items-center gap-1"> <Truck className="h-4 w-4" /> {leadTimeLabel(product.leadTimeDays)} </div> </div> <div className="flex gap-2 pt-1"> <Button className="flex-1" onClick={() => onAdd(product)}> <ShoppingCart className="h-4 w-4 mr-1" /> Add </Button> <Button variant="outline" onClick={() => onOpen(product)}> <Info className="h-4 w-4 mr-1" /> Details </Button> </div> </CardContent> </Card> ); }

function DetailsSheet({ product, onClose, }: { product: Product | null; onClose: () => void; }) { if (!product) return null; return ( <AnimatePresence> <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/50" onClick={onClose} /> <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", stiffness: 300, damping: 30 }} className="fixed top-0 right-0 h-full w-full max-w-xl z-50 bg-white shadow-2xl p-6 overflow-y-auto" > <div className="flex items-center justify-between mb-4"> <div className="flex items-center gap-2"> <Factory className="h-6 w-6" /> <h3 className="text-xl font-semibold">{product.name}</h3> </div> <Button variant="ghost" onClick={onClose}> <X className="h-5 w-5" /> </Button> </div> <div className="h-56 rounded-xl bg-cover bg-center" style={{ backgroundImage: url(${product.image}) }} /> <div className="grid grid-cols-2 gap-4 mt-5"> <Card> <CardHeader className="pb-2"> <CardTitle className="text-sm">Price</CardTitle> </CardHeader> <CardContent> <div className="text-2xl font-bold">{formatBDT(product.price)}</div> <div className="text-xs text-neutral-500">{product.unit}</div> </CardContent> </Card> <Card> <CardHeader className="pb-2"> <CardTitle className="text-sm">Delivery</CardTitle> </CardHeader> <CardContent> <div className="text-sm">Lead time: {leadTimeLabel(product.leadTimeDays)}</div> <div className="text-xs text-neutral-500">Origin: {product.origin}</div> </CardContent> </Card> </div> <div className="mt-4"> <h4 className="font-semibold mb-2">Quality & Brand</h4> <div className="flex items-center gap-2 text-sm"> <Badge className="bg-emerald-600">{product.quality}</Badge> <span className="text-neutral-600">Brand: {product.brand}</span> </div> </div> <div className="mt-6"> <DeliveryEstimator /> </div> <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3"> <a href="https://wa.me/8801711000000" target="_blank" rel="noreferrer"> <Button className="w-full gap-2"> <Phone className="h-4 w-4" /> Talk to Customer Manager </Button> </a> <Button variant="outline" className="w-full"> <Calculator className="h-4 w-4 mr-1" /> Request Bulk Quotation </Button> </div> </motion.div> </AnimatePresence> ); }

function DeliveryEstimator() { const [district, setDistrict] = useState("Dhaka"); const [weight, setWeight] = useState(1000); const cost = useMemo(() => estimateDeliveryCost(district, weight), [district, weight]); return ( <Card> <CardHeader className="pb-2"> <CardTitle className="text-sm">Delivery Cost & Time Estimator</CardTitle> </CardHeader> <CardContent className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end"> <div className="col-span-2"> <label className="text-xs text-neutral-600">Delivery District</label> <Select value={district} onValueChange={setDistrict}> <SelectTrigger className="h-11"> <SelectValue placeholder="Select district" /> </SelectTrigger> <SelectContent> {DISTRICTS.map((d) => ( <SelectItem key={d} value={d}> {d} </SelectItem> ))} </SelectContent> </Select> </div> <div> <label className="text-xs text-neutral-600">Estimated Weight (kg)</label> <Input type="number" value={weight} onChange={(e) => setWeight(parseInt(e.target.value || "0"))} className="h-11" min={1} /> </div> <div> <div className="text-xs text-neutral-600">Approx. Delivery Cost</div> <div className="text-2xl font-bold">{formatBDT(cost)}</div> <div className="text-xs text-neutral-500">Time: 1–3 days</div> </div> </CardContent> </Card> ); }

function CartDrawer({ items, onClose, }: { items: Product[]; onClose: () => void; }) { const total = items.reduce((sum, p) => sum + p.price, 0); return ( <AnimatePresence> <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 bg-black/40" onClick={onClose} /> <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", stiffness: 300, damping: 30 }} className="fixed top-0 right-0 h-full w-full max-w-md z-50 bg-white p-6 shadow-2xl" > <div className="flex items-center justify-between"> <h3 className="text-xl font-semibold">Your Cart</h3> <Button variant="ghost" onClick={onClose}> <X className="h-5 w-5" /> </Button> </div> <div className="mt-4 space-y-3 overflow-y-auto h-[70%] pr-1"> {items.length === 0 && ( <div className="text-sm text-neutral-500">Cart is empty.</div> )} {items.map((p) => ( <Card key={p.id}> <CardContent className="p-3 flex items-center gap-3"> <div className="h-14 w-14 rounded bg-cover bg-center" style={{ backgroundImage: url(${p.image}) }} /> <div className="flex-1"> <div className="text-sm font-medium line-clamp-1">{p.name}</div> <div className="text-xs text-neutral-500">{p.unit}</div> </div> <div className="text-sm font-semibold">{formatBDT(p.price)}</div> </CardContent> </Card> ))} </div> <div className="mt-4 border-t pt-4"> <div className="flex items-center justify-between mb-3"> <span className="text-neutral-600">Subtotal</span> <span className="font-semibold">{formatBDT(total)}</span> </div> <Button className="w-full gap-2"> <ShoppingCart className="h-4 w-4" /> Checkout / Get Quotation </Button> <div className="text-[11px] text-neutral-500 mt-2"> Pay via bKash, Nagad, bank transfer or Cash on Delivery. </div> </div> </motion.div> </AnimatePresence> ); }

function Hero() { return ( <div className="rounded-3xl bg-gradient-to-br from-neutral-900 to-neutral-700 text-white p-8 md:p-12 flex flex-col md:flex-row items-center gap-8"> <div className="flex-1"> <h1 className="text-3xl md:text-5xl font-bold leading-tight"> All Building Materials in One Place </h1> <p className="mt-3 text-neutral-200 max-w-xl"> Instantly find bricks, rod, cement, tiles, sanitary & cables. Transparent price, delivery cost & time, quality and supplier info. Talk to a manager and confirm in minutes. </p> <div className="mt-5 flex items-center gap-2 text-xs"> <Badge className="bg-emerald-600">Reasonable Pricing</Badge> <Badge className="bg-emerald-600">Verified Suppliers</Badge> <Badge className="bg-emerald-600">1–3 Day Delivery</Badge> </div> </div> <div className="flex-1 w-full"> <DeliveryEstimator /> </div> </div> ); }

export default function ConstructionMaterialsMarketplace() { const [query, setQuery] = useState(""); const [category, setCategory] = useState<string | null>(null); const [district, setDistrict] = useState("Dhaka"); const [openFilters, setOpenFilters] = useState(false); const [selected, setSelected] = useState<Product | null>(null); const [cart, setCart] = useState<Product[]>([]); const [cartOpen, setCartOpen] = useState(false);

const filtered = useMemo(() => { return MOCK_PRODUCTS.filter((p) => { const matchesCategory = !category || p.category === category; const q = query.toLowerCase(); const matchesQuery = !q || p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q) || p.category.toLowerCase().includes(q); return matchesCategory && matchesQuery; }); }, [query, category]);

function addToCart(p: Product) { setCart((prev) => [...prev, p]); setCartOpen(true); }

return ( <div className="min-h-screen bg-neutral-50"> <TopBar onOpenFilters={() => setOpenFilters(true)} />

<main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
    <Hero />

    <Card>
      <CardContent className="p-4 md:p-6 space-y-4">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
          <div className="flex-1">
            <SearchBar query={query} onQuery={setQuery} />
          </div>
          <div className="md:w-72">
            <label className="text-xs text-neutral-600">Deliver to</label>
            <Select value={district} onValueChange={setDistrict}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Select district" />
              </SelectTrigger>
              <SelectContent>
                {DISTRICTS.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button className="gap-2" onClick={() => setCartOpen(true)}>
            <ShoppingCart className="h-4 w-4" /> Cart ({cart.length})
          </Button>
        </div>
        <CategoryPills current={category} onChange={setCategory} />
      </CardContent>
    </Card>

    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {filtered.map((p) => (
        <motion.div
          key={p.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <ProductCard product={p} onAdd={addToCart} onOpen={setSelected} />
        </motion.div>
      ))}
    </div>

    <Card className="border-dashed">
      <CardContent className="p-5 grid md:grid-cols-2 gap-5 items-center">
        <div>
          <h3 className="text-xl font-semibold">Need a custom quotation?</h3>
          <p className="text-sm text-neutral-600 mt-1">
            For large or industrial orders, submit your BOQ or requirements.
            Our team will verify supplier availability and lock reasonable pricing.
          </p>
        </div>
        <form className="grid grid-cols-2 gap-3">
          <Input placeholder="Your name" className="h-11" />
          <Input placeholder="Phone (bKash/Nagad)" className="h-11" />
          <Input placeholder="Company (optional)" className="h-11 col-span-2" />
          <Textarea placeholder="List items, quantities, specs (or paste BOQ link)" className="col-span-2" />
          <Button className="col-span-2">Request Quotation</Button>
          <div className="text-[11px] text-neutral-500 col-span-2">
            Payments: bKash • Nagad • Bank • COD | GST/VAT invoices available for companies.
          </div>
        </form>
      </CardContent>
    </Card>
  </main>

  {/* Drawers / Sheets */}
  {selected && <DetailsSheet product={selected} onClose={() => setSelected(null)} />}
  {cartOpen && <CartDrawer items={cart} onClose={() => setCartOpen(false)} />}

  {/* Footer */}
  <footer className="border-t bg-white">
    <div className="max-w-7xl mx-auto px-4 py-8 grid md:grid-cols-3 gap-6">
      <div>
        <Logo />
        <p className="text-sm text-neutral-600 mt-2">
          A professional marketplace for construction materials in Bangladesh.
          Transparent prices, fast delivery, verified suppliers.
        </p>
      </div>
      <div>
        <h4 className="font-semibold mb-2">Quick Links</h4>
        <ul className="text-sm text-neutral-600 space-y-1">
          <li>About Us</li>
          <li>Supplier Onboarding</li>
          <li>Bulk Orders</li>
          <li>Refund & Returns</li>
        </ul>
      </div>
      <div>
        <h4 className="font-semibold mb-2">Contact</h4>
        <div className="text-sm text-neutral-600">
          House 11, Road 96, Gulshan-2, Dhaka 1212
          <br />
          Hotline: 01714-736623
          <br />
          Email: bpc.proc@gmail.com
        </div>
      </div>
    </div>
    <div className="text-center text-xs text-neutral-500 py-3">
