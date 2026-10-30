import React, { useState, useEffect, useCallback } from 'react';
import {
  ShoppingCart, Plus, Trash2, Search, User, ChevronDown, ChevronUp,
  CreditCard, Banknote, Smartphone, Calculator, CheckCircle, AlertCircle, Tag,
  PauseCircle, Play, Printer, Layers, RefreshCw
} from 'lucide-react';
import { Button } from '../../components/ui/Button.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { productService, customerService, saleService } from '../../services/businessServices.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { formatCurrency as formatCur } from '../../utils/formatters.js';

const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Cash', icon: Banknote },
  { value: 'CARD', label: 'Card', icon: CreditCard },
  { value: 'UPI', label: 'UPI', icon: Smartphone },
  { value: 'OTHER', label: 'Other', icon: Calculator }
];

function CartItem({ item, onRemove, onChangeQty, onChangeDiscount, onChangePrice }) {
  const lineGross = item.quantity * item.unit_price;
  const lineDiscount = lineGross * (item.discount_percent / 100);
  const lineNet = lineGross - lineDiscount;
  const tax = lineNet * (item.tax_rate / 100);
  const lineTotal = lineNet + tax;

  return (
    <div className="border border-slate-100 rounded-lg p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-900 truncate">{item.name}</p>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
            <span>{item.sku}</span>
            <span>·</span>
            <span>Tax: {item.tax_rate}%</span>
            {item.carton_pack_qty && (
              <span className="text-[10px] bg-slate-100 text-slate-600 px-1 py-0.2 rounded font-mono">
                {item.carton_pack_qty} / carton
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => onRemove(item.product_id)}
          className="text-slate-300 hover:text-rose-500 shrink-0 p-0.5"
          title="Remove item"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center gap-2">
        {/* Quantity control */}
        <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden">
          <button
            onClick={() => onChangeQty(item.product_id, item.quantity - 1)}
            className="px-2 py-1 text-slate-600 hover:bg-slate-100 text-sm font-medium"
          >
            −
          </button>
          <span className="px-3 py-1 text-sm font-medium text-slate-900 min-w-[40px] text-center">
            {item.quantity}
          </span>
          <button
            onClick={() => onChangeQty(item.product_id, item.quantity + 1)}
            className="px-2 py-1 text-slate-600 hover:bg-slate-100 text-sm font-medium"
          >
            +
          </button>
        </div>

        <span className="text-xs text-slate-400">@</span>

        {/* Price display / toggle */}
        <div className="flex items-center gap-1">
          <input
            type="number"
            step="0.01"
            min="0"
            value={item.unit_price}
            onChange={(e) => onChangePrice(item.product_id, parseFloat(e.target.value) || 0)}
            className="w-16 border border-slate-200 rounded px-1.5 py-0.5 text-xs font-mono text-right focus:outline-none focus:ring-1 focus:ring-slate-900"
          />
          {item.wholesale_price && (
            <button
              type="button"
              onClick={() => onChangePrice(item.product_id, parseFloat(item.wholesale_price))}
              className="text-[10px] text-indigo-600 hover:underline shrink-0"
              title={`Switch to Wholesale: ${item.wholesale_price}`}
            >
              WS
            </button>
          )}
        </div>

        {/* Discount control */}
        <div className="flex items-center gap-1 ml-auto">
          <Tag className="w-3 h-3 text-slate-400" />
          <input
            type="number"
            min="0"
            max="100"
            value={item.discount_percent}
            onChange={(e) => onChangeDiscount(item.product_id, Number(e.target.value))}
            className="w-12 border border-slate-200 rounded px-1.5 py-0.5 text-xs text-center focus:outline-none focus:ring-1 focus:ring-slate-900"
            placeholder="0"
          />
          <span className="text-xs text-slate-400">%</span>
        </div>
      </div>

      <div className="flex justify-between text-xs pt-1 border-t border-slate-50">
        <span className="text-slate-500">Line Total</span>
        <span className="font-semibold text-slate-800">{lineTotal.toFixed(2)}</span>
      </div>
    </div>
  );
}

export function POSPage() {
  const { business } = useAuth();
  const currency = business?.currency_symbol || '$';

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [cart, setCart] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [orderDiscount, setOrderDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [paidAmount, setPaidAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [successSale, setSuccessSale] = useState(null);
  const [error, setError] = useState('');

  // Wholesale POS features: Pricing mode & Park/Hold bills
  const [pricingMode, setPricingMode] = useState('RETAIL'); // 'RETAIL' | 'WHOLESALE'
  const [heldBills, setHeldBills] = useState(() => {
    try {
      const saved = localStorage.getItem('bf_held_bills');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [showHeldModal, setShowHeldModal] = useState(false);

  useEffect(() => {
    productService.listCategories().then(r => setCategories(r.data?.categories || [])).catch(() => {});
  }, []);

  const fetchProducts = useCallback(async () => {
    setLoadingProducts(true);
    try {
      const params = { limit: 50, is_active: true };
      if (search) params.search = search;
      if (filterCategory) params.category_id = filterCategory;
      const res = await productService.list(params);
      setProducts(res.data?.products || []);
    } catch {}
    finally { setLoadingProducts(false); }
  }, [search, filterCategory]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const fetchCustomers = useCallback(async () => {
    if (!customerSearch) { setCustomers([]); return; }
    try {
      const res = await customerService.list({ search: customerSearch, limit: 8 });
      setCustomers(res.data?.customers || []);
    } catch {}
  }, [customerSearch]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(i => i.product_id === product.id);
      if (existing) {
        if (existing.quantity >= product.quantity) return prev; // max stock
        return prev.map(i => i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      const initialPrice = pricingMode === 'WHOLESALE' && product.wholesale_price
        ? parseFloat(product.wholesale_price)
        : parseFloat(product.selling_price);

      return [...prev, {
        product_id: product.id,
        name: product.name,
        sku: product.sku,
        unit_price: initialPrice,
        selling_price: product.selling_price,
        wholesale_price: product.wholesale_price,
        carton_pack_qty: product.carton_pack_qty,
        quantity: 1,
        discount_percent: 0,
        tax_rate: parseFloat(product.tax_rate || 0),
        max_qty: product.quantity
      }];
    });
  };

  const removeFromCart = (productId) => setCart(prev => prev.filter(i => i.product_id !== productId));

  const changeQty = (productId, qty) => {
    if (qty <= 0) return removeFromCart(productId);
    const item = cart.find(i => i.product_id === productId);
    if (item && qty > item.max_qty) return;
    setCart(prev => prev.map(i => i.product_id === productId ? { ...i, quantity: qty } : i));
  };

  const changeDiscount = (productId, disc) => {
    setCart(prev => prev.map(i => i.product_id === productId ? { ...i, discount_percent: Math.min(100, Math.max(0, disc)) } : i));
  };

  const changePrice = (productId, price) => {
    setCart(prev => prev.map(i => i.product_id === productId ? { ...i, unit_price: price } : i));
  };

  // Hold / Park Bill
  const handleHoldBill = () => {
    if (cart.length === 0) return;
    const newHeld = [
      ...heldBills,
      {
        id: Date.now(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        customer: selectedCustomer,
        cart,
        orderDiscount,
        paymentMethod,
        notes
      }
    ];
    setHeldBills(newHeld);
    localStorage.setItem('bf_held_bills', JSON.stringify(newHeld));
    // Clear active cart
    setCart([]);
    setSelectedCustomer(null);
    setOrderDiscount(0);
    setPaidAmount('');
    setNotes('');
  };

  // Resume Held Bill
  const handleResumeBill = (bill) => {
    setCart(bill.cart);
    setSelectedCustomer(bill.customer || null);
    setOrderDiscount(bill.orderDiscount || 0);
    setPaymentMethod(bill.paymentMethod || 'CASH');
    setNotes(bill.notes || '');
    const updated = heldBills.filter(b => b.id !== bill.id);
    setHeldBills(updated);
    localStorage.setItem('bf_held_bills', JSON.stringify(updated));
    setShowHeldModal(false);
  };

  const handleDeleteHeldBill = (billId) => {
    const updated = heldBills.filter(b => b.id !== billId);
    setHeldBills(updated);
    localStorage.setItem('bf_held_bills', JSON.stringify(updated));
  };

  // Totals computation
  const totals = cart.reduce((acc, item) => {
    const gross = item.quantity * item.unit_price;
    const disc = gross * (item.discount_percent / 100);
    const net = gross - disc;
    const tax = net * (item.tax_rate / 100);
    acc.subtotal += gross;
    acc.discountTotal += disc;
    acc.taxTotal += tax;
    return acc;
  }, { subtotal: 0, discountTotal: 0, taxTotal: 0 });

  const orderDisc = parseFloat(orderDiscount) || 0;
  const rawGrandTotal = totals.subtotal - totals.discountTotal - orderDisc + totals.taxTotal;
  const grandTotal = Math.round(rawGrandTotal);
  const roundOff = grandTotal - rawGrandTotal;
  const paid = parseFloat(paidAmount) || 0;
  const change = paid - grandTotal;

  const handleCheckout = async () => {
    if (cart.length === 0) { setError('Add items to cart'); return; }
    setError('');
    setLoading(true);
    try {
      const saleData = {
        customer_id: selectedCustomer?.id || null,
        items: cart.map(i => ({
          product_id: i.product_id,
          quantity: i.quantity,
          unit_price: i.unit_price,
          discount_percent: i.discount_percent
        })),
        order_discount: orderDisc,
        payment_method: paymentMethod,
        paid_amount: paid,
        notes
      };
      const res = await saleService.create(saleData);
      setSuccessSale(res.data.sale);
      setCart([]);
      setSelectedCustomer(null);
      setOrderDiscount(0);
      setPaidAmount('');
      setNotes('');
      fetchProducts(); // Refresh stock
    } catch (err) {
      setError(err.message || 'Checkout failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (successSale) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 max-w-sm w-full text-center space-y-4">
          <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-9 h-9 text-emerald-500" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Sale Complete!</h2>
            <p className="text-slate-500 text-sm mt-1">Invoice #{successSale.invoice_number}</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-4 text-sm space-y-1.5 text-left">
            <div className="flex justify-between"><span className="text-slate-500">Shop</span><span className="font-semibold text-slate-800">{business?.name || 'Wholesale Hub'}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Grand Total</span><span className="font-semibold">{currency}{parseFloat(successSale.grand_total).toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Paid</span><span className="font-semibold text-emerald-600">{currency}{parseFloat(successSale.paid_amount).toFixed(2)}</span></div>
            {parseFloat(successSale.balance_due) > 0 && (
              <div className="flex justify-between"><span className="text-slate-500">Balance Due</span><span className="font-semibold text-amber-600">{currency}{parseFloat(successSale.balance_due).toFixed(2)}</span></div>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              icon={Printer}
              onClick={() => window.print()}
              className="flex-1"
            >
              Print Bill
            </Button>
            <Button onClick={() => setSuccessSale(null)} className="flex-1">
              New Sale
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-57px)] overflow-hidden">
      {/* Product Grid — Left Panel */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-slate-100">
        {/* Search, Filter & Wholesale Mode Toggle */}
        <div className="p-4 border-b border-slate-100 space-y-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                placeholder="Search packaged items, biscuits, beverages, or scan barcode..."
              />
            </div>

            {/* Price Tier Toggle */}
            <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-100">
              <button
                type="button"
                onClick={() => setPricingMode('RETAIL')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                  pricingMode === 'RETAIL' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Retail
              </button>
              <button
                type="button"
                onClick={() => setPricingMode('WHOLESALE')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                  pricingMode === 'WHOLESALE' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Wholesale
              </button>
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setFilterCategory('')}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${!filterCategory ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              All
            </button>
            {categories.map(c => (
              <button
                key={c.id}
                onClick={() => setFilterCategory(filterCategory === String(c.id) ? '' : String(c.id))}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterCategory === String(c.id) ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {loadingProducts ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="h-28 bg-slate-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <ShoppingCart className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No products found</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {products.map(p => {
                const inCart = cart.find(i => i.product_id === p.id);
                const outOfStock = p.quantity <= 0;
                const activePrice = pricingMode === 'WHOLESALE' && p.wholesale_price
                  ? parseFloat(p.wholesale_price)
                  : parseFloat(p.selling_price);

                return (
                  <button
                    key={p.id}
                    onClick={() => !outOfStock && addToCart(p)}
                    disabled={outOfStock}
                    className={`relative text-left p-3 rounded-xl border-2 transition-all duration-150 ${
                      inCart ? 'border-slate-900 bg-slate-900 text-white' :
                      outOfStock ? 'border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed' :
                      'border-slate-200 bg-white hover:border-slate-400 hover:shadow-sm'
                    }`}
                  >
                    <p className={`text-sm font-semibold leading-tight mb-1 ${inCart ? 'text-white' : 'text-slate-900'}`}>
                      {p.name}
                    </p>
                    <div className="flex items-center justify-between text-xs">
                      <span className={inCart ? 'text-slate-300' : 'text-slate-400'}>{p.sku}</span>
                      {p.brand && (
                        <span className={`text-[10px] px-1 py-0.2 rounded font-medium ${inCart ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                          {p.brand}
                        </span>
                      )}
                    </div>
                    <div className="flex items-baseline justify-between mt-2">
                      <p className={`text-sm font-bold ${inCart ? 'text-white' : 'text-slate-900'}`}>
                        {currency}{activePrice.toFixed(2)}
                      </p>
                      {p.wholesale_price && (
                        <span className={`text-[10px] ${inCart ? 'text-indigo-200' : 'text-indigo-600'}`}>
                          WS: {currency}{parseFloat(p.wholesale_price).toFixed(2)}
                        </span>
                      )}
                    </div>
                    <p className={`text-xs mt-0.5 ${p.quantity <= p.low_stock_threshold ? 'text-amber-400' : inCart ? 'text-slate-300' : 'text-slate-400'}`}>
                      {outOfStock ? 'Out of Stock' : `${p.quantity} ${p.unit}`}
                    </p>
                    {inCart && (
                      <span className="absolute top-2 right-2 bg-white text-slate-900 text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-sm">
                        {inCart.quantity}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Cart — Right Panel */}
      <div className="w-80 lg:w-96 flex flex-col bg-white">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900 flex items-center gap-2">
            <ShoppingCart className="w-4 h-4" /> Cart
            {cart.length > 0 && <Badge variant="info">{cart.length}</Badge>}
          </h2>

          <div className="flex items-center gap-1.5">
            {heldBills.length > 0 && (
              <button
                type="button"
                onClick={() => setShowHeldModal(true)}
                className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-1 rounded-md font-semibold flex items-center gap-1 hover:bg-amber-100"
              >
                <PauseCircle className="w-3.5 h-3.5" />
                Held ({heldBills.length})
              </button>
            )}
            {cart.length > 0 && (
              <button
                type="button"
                onClick={handleHoldBill}
                className="text-xs text-slate-600 hover:text-slate-900 border border-slate-200 px-2 py-1 rounded-md flex items-center gap-1"
                title="Hold bill to attend another customer"
              >
                <PauseCircle className="w-3.5 h-3.5" />
                Hold
              </button>
            )}
          </div>
        </div>

        {/* Customer Selector */}
        <div className="p-3 border-b border-slate-100">
          {selectedCustomer ? (
            <div className="flex items-center justify-between bg-slate-50 rounded-lg p-2.5">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-slate-400" />
                <div>
                  <p className="text-sm font-medium text-slate-800">{selectedCustomer.name}</p>
                  <p className="text-xs text-slate-400">
                    {selectedCustomer.phone || 'No phone'} · Balance: {currency}{parseFloat(selectedCustomer.outstanding_balance || 0).toFixed(2)}
                  </p>
                </div>
              </div>
              <button onClick={() => setSelectedCustomer(null)} className="text-slate-400 hover:text-slate-600 text-xs font-bold">
                ✕
              </button>
            </div>
          ) : (
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={customerSearch}
                onChange={e => setCustomerSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                placeholder="Search customer (optional)..."
              />
              {customers.length > 0 && customerSearch && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-10 divide-y divide-slate-50">
                  {customers.map(c => (
                    <button
                      key={c.id}
                      onClick={() => { setSelectedCustomer(c); setCustomerSearch(''); setCustomers([]); }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50"
                    >
                      <p className="font-medium text-slate-800">{c.name}</p>
                      <p className="text-xs text-slate-400">{c.phone}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {cart.length === 0 ? (
            <div className="text-center py-10 text-slate-300">
              <ShoppingCart className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm">Cart is empty</p>
              <p className="text-xs mt-1">Click products to add</p>
            </div>
          ) : (
            cart.map(item => (
              <CartItem
                key={item.product_id}
                item={item}
                onRemove={removeFromCart}
                onChangeQty={changeQty}
                onChangeDiscount={changeDiscount}
                onChangePrice={changePrice}
              />
            ))
          )}
        </div>

        {/* Totals & Checkout */}
        <div className="p-4 border-t border-slate-100 space-y-3">
          {/* Order Discount */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-500 flex-1">Order Discount</span>
            <input
              type="number"
              min="0"
              value={orderDiscount}
              onChange={e => setOrderDiscount(e.target.value)}
              className="w-24 border border-slate-200 rounded-lg px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          {/* Summary */}
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between text-slate-500">
              <span>Subtotal</span><span>{currency}{totals.subtotal.toFixed(2)}</span>
            </div>
            {totals.discountTotal > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Item Discounts</span><span>−{currency}{totals.discountTotal.toFixed(2)}</span>
              </div>
            )}
            {orderDisc > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Order Discount</span><span>−{currency}{orderDisc.toFixed(2)}</span>
              </div>
            )}
            {totals.taxTotal > 0 && (
              <div className="flex justify-between text-slate-500">
                <span>Tax</span><span>+{currency}{totals.taxTotal.toFixed(2)}</span>
              </div>
            )}
            {roundOff !== 0 && (
              <div className="flex justify-between text-slate-400 text-xs">
                <span>Round Off</span><span>{roundOff >= 0 ? '+' : ''}{roundOff.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-slate-900 text-base pt-1 border-t border-slate-100">
              <span>Total</span><span>{currency}{grandTotal.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <p className="text-xs text-slate-500 mb-2">Payment Method</p>
            <div className="grid grid-cols-4 gap-1.5">
              {PAYMENT_METHODS.map(m => (
                <button
                  key={m.value}
                  onClick={() => setPaymentMethod(m.value)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg text-xs font-medium border transition-colors ${
                    paymentMethod === m.value
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <m.icon className="w-4 h-4" />
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Paid Amount */}
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <label className="text-xs text-slate-500 block mb-1">Amount Received</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">{currency}</span>
                <input
                  type="number"
                  min="0"
                  value={paidAmount}
                  onChange={e => setPaidAmount(e.target.value)}
                  className="w-full pl-7 pr-3 py-2 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-slate-900"
                  placeholder={grandTotal.toFixed(2)}
                />
              </div>
            </div>
            {paid > 0 && (
              <div className={`text-xs font-medium px-2 py-1 rounded ${change >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                {change >= 0 ? `Change: ${currency}${change.toFixed(2)}` : `Due: ${currency}${(-change).toFixed(2)}`}
              </div>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 text-rose-600 text-xs bg-rose-50 px-3 py-2 rounded-lg border border-rose-100">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <Button
            onClick={handleCheckout}
            isLoading={loading}
            disabled={cart.length === 0}
            className="w-full text-base py-3"
          >
            Complete Sale · {currency}{grandTotal.toFixed(2)}
          </Button>
        </div>
      </div>

      {/* HELD BILLS MODAL */}
      <Modal
        isOpen={showHeldModal}
        onClose={() => setShowHeldModal(false)}
        title="Held / Parked Bills"
        size="md"
      >
        <div className="space-y-3">
          {heldBills.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-6">No held bills.</p>
          ) : (
            heldBills.map(b => (
              <div key={b.id} className="p-3 border border-slate-200 rounded-xl flex items-center justify-between text-xs hover:bg-slate-50">
                <div>
                  <p className="font-bold text-slate-900">{b.customer ? b.customer.name : 'Walk-in Customer'}</p>
                  <p className="text-slate-400 text-[11px] mt-0.5">
                    Parked at {b.timestamp} · {b.cart.length} items
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" icon={Play} onClick={() => handleResumeBill(b)}>
                    Resume
                  </Button>
                  <button
                    type="button"
                    onClick={() => handleDeleteHeldBill(b.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded"
                    title="Discard held bill"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </Modal>
    </div>
  );
}
