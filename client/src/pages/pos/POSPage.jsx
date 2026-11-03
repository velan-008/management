import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ShoppingCart, Plus, Minus, Trash2, Search, User, ChevronDown, ChevronUp,
  CreditCard, Banknote, Smartphone, Calculator, CheckCircle, AlertCircle, Tag,
  PauseCircle, Play, Printer, Layers, RefreshCw, Barcode, Shield, AlertTriangle,
  FileText, Clock, PackageCheck, Box, Boxes, Sparkles, X, ArrowRight
} from 'lucide-react';
import { Button } from '../../components/ui/Button.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { productService, customerService, invoiceService, saleService } from '../../services/businessServices.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { formatCurrency as formatCur } from '../../utils/formatters.js';

export function POSPage() {
  const { user, business, isAdmin } = useAuth();
  const currency = business?.currency_symbol || '$';

  // Master Data
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // Search & Barcode
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchInputRef = useRef(null);
  const paymentInputRef = useRef(null);

  // Customer Selection
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);

  // Billing Grid Cart
  const [cart, setCart] = useState([]);
  const [orderDiscount, setOrderDiscount] = useState(0);
  const [pricingMode, setPricingMode] = useState('WHOLESALE'); // 'WHOLESALE' | 'RETAIL'
  const [notes, setNotes] = useState('');

  // Payment State (Split Tender: CASH, UPI, CREDIT)
  const [paymentMode, setPaymentMode] = useState('CASH'); // 'CASH' | 'UPI' | 'CREDIT' | 'SPLIT'
  const [cashAmount, setCashAmount] = useState('');
  const [upiAmount, setUpiAmount] = useState('');
  const [upiRef, setUpiRef] = useState('');
  const [creditAmount, setCreditAmount] = useState('');

  // Operations & UI Feedback
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [creditWarning, setCreditWarning] = useState('');
  const [successInvoice, setSuccessInvoice] = useState(null);
  const [printLayout, setPrintLayout] = useState('thermal'); // 'thermal' | 'a4'

  // Park / Hold Bills
  const [heldBills, setHeldBills] = useState(() => {
    try {
      const saved = localStorage.getItem('bf_held_bills');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [showHeldModal, setShowHeldModal] = useState(false);

  // 1. Initial Data Fetching
  useEffect(() => {
    productService.listCategories().then(r => setCategories(r.data?.categories || [])).catch(() => {});
  }, []);

  const fetchProducts = useCallback(async () => {
    setLoadingProducts(true);
    try {
      const res = await productService.search(search, { category_id: filterCategory, limit: 50 });
      const prods = res.data?.products || [];
      setProducts(prods);
      setSearchResults(prods);
    } catch {
      // Fallback to standard list if search endpoint has issues
      try {
        const res = await productService.list({ search, category_id: filterCategory, limit: 50, is_active: true });
        setProducts(res.data?.products || []);
        setSearchResults(res.data?.products || []);
      } catch {}
    } finally {
      setLoadingProducts(false);
    }
  }, [search, filterCategory]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Customer search
  const fetchCustomers = useCallback(async () => {
    try {
      const res = await customerService.list({ search: customerSearch, limit: 12 });
      setCustomers(res.data?.customers || []);
    } catch {}
  }, [customerSearch]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // Auto-focus barcode scanner input on mount
  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  // 2. Keyboard Shortcuts Handler
  // F2 -> Focus Search / Barcode
  // F4 -> Focus Payment
  // F8 -> Complete Sale / Save Invoice
  // ESC -> Clear / Reset
  useEffect(() => {
    const handleKeyDown = (e) => {
      // F2: Focus Barcode / Search
      if (e.key === 'F2') {
        e.preventDefault();
        if (searchInputRef.current) {
          searchInputRef.current.focus();
          searchInputRef.current.select();
        }
      }
      // F4: Focus Payment section
      else if (e.key === 'F4') {
        e.preventDefault();
        if (paymentInputRef.current) {
          paymentInputRef.current.focus();
          paymentInputRef.current.select();
        }
      }
      // F8: Save Invoice / Checkout
      else if (e.key === 'F8') {
        e.preventDefault();
        handleCheckout();
      }
      // ESC: Reset / Clear screen
      else if (e.key === 'Escape') {
        if (cart.length > 0) {
          if (window.confirm('Reset current billing screen and clear cart?')) {
            handleResetBilling();
          }
        } else {
          setShowSearchDropdown(false);
          setCustomerDropdownOpen(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, selectedCustomer, cashAmount, upiAmount, creditAmount, paymentMode, orderDiscount, notes]);

  // 3. Cart Calculations & Totals
  const totals = cart.reduce((acc, item) => {
    const gross = item.quantity * item.unit_price; // Free quantity is NOT charged
    const disc = gross * ((item.discount_percent || 0) / 100);
    const net = gross - disc;
    const tax = net * ((item.tax_rate || 0) / 100);
    acc.subtotal += gross;
    acc.discountTotal += disc;
    acc.taxTotal += tax;
    return acc;
  }, { subtotal: 0, discountTotal: 0, taxTotal: 0 });

  const orderDisc = parseFloat(orderDiscount) || 0;
  const rawGrandTotal = Math.max(0, totals.subtotal - totals.discountTotal - orderDisc + totals.taxTotal);
  const grandTotal = Math.round(rawGrandTotal);
  const roundOff = (grandTotal - rawGrandTotal).toFixed(2);

  // Split payment totals calculation
  const cashNum = parseFloat(cashAmount) || 0;
  const upiNum = parseFloat(upiAmount) || 0;
  const creditNum = parseFloat(creditAmount) || 0;
  const totalTendered = cashNum + upiNum + creditNum;
  const balanceRemaining = Math.max(0, grandTotal - (cashNum + upiNum));
  const changeDue = Math.max(0, (cashNum + upiNum) - grandTotal);

  // Update payment amounts when grand total or mode changes
  const setPaymentModeDirect = (mode) => {
    setPaymentMode(mode);
    if (mode === 'CASH') {
      setCashAmount(grandTotal > 0 ? String(grandTotal) : '');
      setUpiAmount('');
      setCreditAmount('');
    } else if (mode === 'UPI') {
      setCashAmount('');
      setUpiAmount(grandTotal > 0 ? String(grandTotal) : '');
      setCreditAmount('');
    } else if (mode === 'CREDIT') {
      setCashAmount('');
      setUpiAmount('');
      setCreditAmount(grandTotal > 0 ? String(grandTotal) : '');
    } else if (mode === 'SPLIT') {
      // Keep existing inputs or initialize
      if (!cashAmount && !upiAmount && !creditAmount && grandTotal > 0) {
        setCashAmount(String(Math.floor(grandTotal / 2)));
        setUpiAmount(String(Math.ceil(grandTotal / 2)));
      }
    }
  };

  // Sync cash amount with grand total if single mode
  useEffect(() => {
    if (paymentMode === 'CASH' && grandTotal > 0 && !cashAmount) {
      setCashAmount(String(grandTotal));
    }
  }, [grandTotal, paymentMode, cashAmount]);

  // Real-time credit validation warning
  useEffect(() => {
    if (creditNum > 0 && selectedCustomer) {
      const avail = parseFloat(selectedCustomer.available_credit ?? (selectedCustomer.credit_limit - selectedCustomer.outstanding_balance)) || 0;
      if (creditNum > avail) {
        setCreditWarning(`Credit limit exceeded! Customer available credit is ${currency}${avail.toFixed(2)}. Requested credit: ${currency}${creditNum.toFixed(2)}.`);
      } else if (avail - creditNum < (parseFloat(selectedCustomer.credit_limit) * 0.15)) {
        setCreditWarning(`Warning: Customer will be close to credit limit after this transaction.`);
      } else {
        setCreditWarning('');
      }
    } else {
      setCreditWarning('');
    }
  }, [creditNum, selectedCustomer, currency]);

  // 4. Warehouse Dispatch Summary (Cartons, Boxes, Pieces, Items, Free)
  const dispatchSummary = cart.reduce((acc, item) => {
    const factor = item.conversion_factor || 1;
    const totalItemBase = (item.quantity + (item.free_quantity || 0)) * factor;

    acc.totalBasePieces += totalItemBase;
    acc.totalChargedUnits += item.quantity;
    acc.totalFreeUnits += item.free_quantity || 0;

    // Unit classification
    const uName = (item.unit_name || 'PCS').toUpperCase();
    if (uName === 'CTN') {
      acc.totalCartons += (item.quantity + (item.free_quantity || 0));
    } else if (uName === 'BOX') {
      acc.totalBoxes += (item.quantity + (item.free_quantity || 0));
    } else {
      acc.totalPieces += (item.quantity + (item.free_quantity || 0));
    }

    return acc;
  }, {
    totalCartons: 0,
    totalBoxes: 0,
    totalPieces: 0,
    totalBasePieces: 0,
    totalChargedUnits: 0,
    totalFreeUnits: 0,
    distinctItems: cart.length
  });

  // 5. Add / Update / Remove Items in Cart
  const addToCart = (product, requestedBatch = null, requestedUnit = null) => {
    setCart(prev => {
      const existingIndex = prev.findIndex(i => i.product_id === product.id);

      // Resolve available units
      const units = product.units && product.units.length > 0 ? product.units : [
        { unit_name: 'PCS', conversion_factor: 1, retail_price: product.selling_price, wholesale_price: product.wholesale_price || product.selling_price },
        { unit_name: 'BOX', conversion_factor: product.carton_pack_qty || 12, retail_price: (product.selling_price * (product.carton_pack_qty || 12)).toFixed(2), wholesale_price: ((product.wholesale_price || product.selling_price) * (product.carton_pack_qty || 12)).toFixed(2) },
        { unit_name: 'CTN', conversion_factor: (product.carton_pack_qty || 12) * 10, retail_price: (product.selling_price * (product.carton_pack_qty || 12) * 10).toFixed(2), wholesale_price: ((product.wholesale_price || product.selling_price) * (product.carton_pack_qty || 12) * 9.5).toFixed(2) }
      ];

      // Default unit selection: CTN for wholesale mode if available, else BOX/PCS
      let defaultUnit = units.find(u => u.unit_name.toUpperCase() === 'PCS') || units[0];
      if (requestedUnit) {
        defaultUnit = units.find(u => u.unit_name.toUpperCase() === requestedUnit.toUpperCase()) || defaultUnit;
      } else if (pricingMode === 'WHOLESALE') {
        const ctn = units.find(u => u.unit_name.toUpperCase() === 'CTN');
        const box = units.find(u => u.unit_name.toUpperCase() === 'BOX');
        if (box) defaultUnit = box;
        if (ctn && (product.quantity >= ctn.conversion_factor)) defaultUnit = ctn;
      }

      // Default batch selection: FIFO earliest expiry or requested
      const batches = product.batches && product.batches.length > 0 ? product.batches : [
        { id: 0, batch_number: product.batch_number || 'BATCH-001', expiry_date: product.expiry_date || null, stock_quantity: product.quantity }
      ];
      const validBatches = batches.filter(b => !b.is_expired);
      const chosenBatch = requestedBatch || (validBatches.length > 0 ? validBatches[0] : batches[0]);

      // Calculate initial price based on pricingMode and unit
      const initialPrice = pricingMode === 'WHOLESALE'
        ? parseFloat(defaultUnit.wholesale_price || product.wholesale_price || product.selling_price)
        : parseFloat(defaultUnit.retail_price || product.selling_price);

      if (existingIndex >= 0) {
        const item = prev[existingIndex];
        const newQty = item.quantity + 1;
        // Check stock availability in base units
        const neededBase = (newQty + (item.free_quantity || 0)) * item.conversion_factor;
        if (neededBase > product.quantity) {
          alert(`Cannot add more. Insufficient overall stock for "${product.name}". Available: ${product.quantity} base PCS.`);
          return prev;
        }

        const updated = [...prev];
        updated[existingIndex] = {
          ...item,
          quantity: newQty
        };
        return updated;
      }

      return [
        ...prev,
        {
          product_id: product.id,
          name: product.name,
          sku: product.sku,
          barcode: product.barcode,
          base_unit: product.base_unit || 'PCS',
          units,
          batches,
          selected_batch: chosenBatch?.batch_number || 'BATCH-001',
          expiry_date: chosenBatch?.expiry_date || null,
          near_expiry: chosenBatch?.near_expiry || false,
          is_expired: chosenBatch?.is_expired || false,
          unit_name: defaultUnit.unit_name,
          conversion_factor: parseFloat(defaultUnit.conversion_factor) || 1,
          quantity: 1,
          free_quantity: 0,
          unit_price: initialPrice,
          retail_price: parseFloat(defaultUnit.retail_price || product.selling_price),
          wholesale_price: parseFloat(defaultUnit.wholesale_price || product.wholesale_price || product.selling_price),
          discount_percent: 0,
          tax_rate: parseFloat(product.tax_rate || 0),
          max_base_stock: product.quantity
        }
      ];
    });

    setSearch('');
    setShowSearchDropdown(false);
  };

  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(i => i.product_id !== productId));
  };

  const changeQty = (productId, qty) => {
    if (qty <= 0) return removeFromCart(productId);
    setCart(prev => prev.map(item => {
      if (item.product_id !== productId) return item;
      const totalBase = (qty + (item.free_quantity || 0)) * item.conversion_factor;
      if (totalBase > item.max_base_stock) {
        alert(`Cannot set quantity. Required: ${totalBase} PCS, Available: ${item.max_base_stock} PCS.`);
        return item;
      }
      return { ...item, quantity: qty };
    }));
  };

  const changeFreeQty = (productId, freeQty) => {
    const fQty = Math.max(0, parseInt(freeQty, 10) || 0);
    setCart(prev => prev.map(item => {
      if (item.product_id !== productId) return item;
      const totalBase = (item.quantity + fQty) * item.conversion_factor;
      if (totalBase > item.max_base_stock) {
        alert(`Cannot add free quantity. Exceeds available stock (${item.max_base_stock} base PCS).`);
        return item;
      }
      return { ...item, free_quantity: fQty };
    }));
  };

  // Quick Scheme Applier (e.g. Buy 10 Get 1 Free, Buy 20 Get 2 Free)
  const applyWholesaleScheme = (productId, buyCount, freeCount) => {
    setCart(prev => prev.map(item => {
      if (item.product_id !== productId) return item;
      const schemeMultiplier = Math.floor(item.quantity / buyCount);
      const computedFree = schemeMultiplier * freeCount;
      const totalBase = (item.quantity + computedFree) * item.conversion_factor;
      if (totalBase > item.max_base_stock) {
        alert(`Scheme cannot be applied: insufficient stock for ${computedFree} free units.`);
        return item;
      }
      return { ...item, free_quantity: computedFree };
    }));
  };

  const changeUnit = (productId, newUnitName) => {
    setCart(prev => prev.map(item => {
      if (item.product_id !== productId) return item;
      const unitObj = item.units.find(u => u.unit_name.toUpperCase() === newUnitName.toUpperCase());
      if (!unitObj) return item;

      const newFactor = parseFloat(unitObj.conversion_factor) || 1;
      const newUnitPrice = pricingMode === 'WHOLESALE'
        ? parseFloat(unitObj.wholesale_price || item.wholesale_price)
        : parseFloat(unitObj.retail_price || item.retail_price);

      // Verify stock in new unit
      const totalBase = (item.quantity + (item.free_quantity || 0)) * newFactor;
      if (totalBase > item.max_base_stock) {
        alert(`Switching to ${newUnitName} exceeds available stock (${item.max_base_stock} PCS). Adjusting quantity.`);
      }

      return {
        ...item,
        unit_name: unitObj.unit_name,
        conversion_factor: newFactor,
        unit_price: newUnitPrice,
        wholesale_price: parseFloat(unitObj.wholesale_price || item.wholesale_price),
        retail_price: parseFloat(unitObj.retail_price || item.retail_price)
      };
    }));
  };

  const changeBatch = (productId, newBatchNumber) => {
    setCart(prev => prev.map(item => {
      if (item.product_id !== productId) return item;
      const batchObj = item.batches.find(b => b.batch_number === newBatchNumber);
      if (batchObj && batchObj.is_expired) {
        alert(`Batch ${newBatchNumber} is expired! Sales from expired batches are blocked.`);
        return item;
      }
      return {
        ...item,
        selected_batch: newBatchNumber,
        expiry_date: batchObj?.expiry_date || null,
        near_expiry: batchObj?.near_expiry || false,
        is_expired: batchObj?.is_expired || false
      };
    }));
  };

  const changePrice = (productId, price) => {
    setCart(prev => prev.map(item => item.product_id === productId ? { ...item, unit_price: Math.max(0, price) } : item));
  };

  const changeDiscount = (productId, disc) => {
    setCart(prev => prev.map(item => item.product_id === productId ? { ...item, discount_percent: Math.min(100, Math.max(0, disc)) } : item));
  };

  // Apply Pricing Tier (Wholesale vs Retail) & immediately recalculate unit rates for cart products
  const applyPricingTier = (tier) => {
    setPricingMode(tier);
    setCart(prev => prev.map(item => {
      const unitObj = (item.units || []).find(u => u.unit_name?.toUpperCase() === item.unit_name?.toUpperCase());
      let newPrice;
      if (tier === 'WHOLESALE') {
        const uPrice = unitObj?.wholesale_price !== undefined && unitObj?.wholesale_price !== null ? parseFloat(unitObj.wholesale_price) : null;
        newPrice = (uPrice !== null && !isNaN(uPrice)) ? uPrice : parseFloat(item.wholesale_price || item.retail_price || item.unit_price);
      } else {
        const uPrice = unitObj?.retail_price !== undefined && unitObj?.retail_price !== null ? parseFloat(unitObj.retail_price) : null;
        newPrice = (uPrice !== null && !isNaN(uPrice)) ? uPrice : parseFloat(item.retail_price || item.unit_price);
      }

      return {
        ...item,
        unit_price: Math.max(0, isNaN(newPrice) ? 0 : newPrice)
      };
    }));
  };

  // Customer Selection & Automatic Pricing Tier Identification
  const handleSelectCustomer = (customer) => {
    setSelectedCustomer(customer);
    setCustomerDropdownOpen(false);
    setCustomerSearch('');
    setError('');

    if (customer) {
      const typeUpper = String(customer.customer_type || '').toUpperCase();
      const isWholesale = typeUpper === 'WHOLESALE' || typeUpper === 'SUB_WHOLESALER' || typeUpper === 'BULK';
      const targetTier = isWholesale ? 'WHOLESALE' : 'RETAIL';
      applyPricingTier(targetTier);
    }
  };

  // 6. Hold / Park & Resume Bills
  const handleHoldBill = () => {
    if (cart.length === 0) return;
    const newHeld = [
      ...heldBills,
      {
        id: Date.now(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        customer: selectedCustomer,
        cart,
        pricingMode,
        orderDiscount,
        paymentMode,
        cashAmount,
        upiAmount,
        upiRef,
        creditAmount,
        notes
      }
    ];
    setHeldBills(newHeld);
    localStorage.setItem('bf_held_bills', JSON.stringify(newHeld));
    handleResetBilling();
  };

  const handleResumeBill = (bill) => {
    setCart(bill.cart || []);
    setSelectedCustomer(bill.customer || null);
    if (bill.pricingMode) setPricingMode(bill.pricingMode);
    setOrderDiscount(bill.orderDiscount || 0);
    setPaymentMode(bill.paymentMode || 'CASH');
    setCashAmount(bill.cashAmount || '');
    setUpiAmount(bill.upiAmount || '');
    setUpiRef(bill.upiRef || '');
    setCreditAmount(bill.creditAmount || '');
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

  const handleResetBilling = () => {
    setCart([]);
    setSelectedCustomer(null);
    setOrderDiscount(0);
    setCashAmount('');
    setUpiAmount('');
    setUpiRef('');
    setCreditAmount('');
    setNotes('');
    setError('');
    setCreditWarning('');
    if (searchInputRef.current) searchInputRef.current.focus();
  };

  // 7. Complete Sale & Submit Invoice
  const handleCheckout = async () => {
    if (!selectedCustomer) {
      setError('Please select a customer by name before creating the bill.');
      return;
    }

    if (cart.length === 0) {
      setError('Please add at least one product item to the invoice.');
      return;
    }

    // Verify expired batches
    const expiredItem = cart.find(i => i.is_expired);
    if (expiredItem) {
      setError(`Cannot create invoice: Item "${expiredItem.name}" has an expired batch (${expiredItem.selected_batch}).`);
      return;
    }

    // Prepare split payments payload
    const splitPayments = [];
    if (cashNum > 0) {
      splitPayments.push({ method: 'CASH', amount: cashNum });
    }
    if (upiNum > 0) {
      splitPayments.push({ method: 'UPI', amount: upiNum, reference_number: upiRef || null });
    }
    if (creditNum > 0) {
      splitPayments.push({ method: 'CREDIT', amount: creditNum });
    }

    // If no payment entered but grandTotal > 0, default to cash full
    if (splitPayments.length === 0 && grandTotal > 0) {
      splitPayments.push({ method: 'CASH', amount: grandTotal });
    }

    // Credit limit validation on client before submission
    if (creditNum > 0) {
      if (!selectedCustomer) {
        setError('Credit payment requires selecting an active customer account.');
        return;
      }
      const availCredit = parseFloat(selectedCustomer.available_credit ?? (selectedCustomer.credit_limit - selectedCustomer.outstanding_balance)) || 0;
      if (parseFloat(selectedCustomer.credit_limit) > 0 && creditNum > availCredit) {
        setError(`Cannot proceed: Customer credit limit exceeded by ${currency}${(creditNum - availCredit).toFixed(2)}.`);
        return;
      }
    }

    setError('');
    setLoading(true);

    try {
      const invoicePayload = {
        customer_id: selectedCustomer?.id || null,
        items: cart.map(item => ({
          product_id: item.product_id,
          batch_number: item.selected_batch,
          unit_name: item.unit_name,
          quantity: item.quantity,
          free_quantity: item.free_quantity || 0,
          unit_price: item.unit_price,
          discount_percent: item.discount_percent || 0
        })),
        order_discount: orderDisc,
        payment_mode: paymentMode,
        payment_method: paymentMode === 'SPLIT' ? 'CASH' : paymentMode,
        paid_amount: cashNum + upiNum,
        payments: splitPayments,
        notes
      };

      // Call API
      const res = await invoiceService.create(invoicePayload);
      const createdInv = res.data?.invoice || res.data?.sale;
      setSuccessInvoice(createdInv);

      // Refresh stock in catalog
      fetchProducts();
      // Clear cart
      handleResetBilling();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Invoice processing failed.');
    } finally {
      setLoading(false);
    }
  };

  // Helper date
  const todayFormatted = new Date().toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric'
  });

  return (
    <div className="flex flex-col h-[calc(100vh-57px)] bg-slate-50 overflow-hidden font-sans">
      {/* 1. TOP HEADER & WHOLESALE BAR */}
      <header className="bg-white border-b border-slate-200 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
        {/* Left: Customer Selection Dropdown & Banner */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative">
            {!selectedCustomer ? (
              <div className="relative">
                <div className="flex items-center border border-slate-200 rounded-lg bg-slate-50 hover:bg-white transition-colors">
                  <User className="w-4 h-4 text-slate-400 ml-2.5 shrink-0" />
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={(e) => {
                      setCustomerSearch(e.target.value);
                      setCustomerDropdownOpen(true);
                    }}
                    onFocus={() => setCustomerDropdownOpen(true)}
                    placeholder="Search Customer (Name/Phone)..."
                    className="w-56 text-xs bg-transparent py-1.5 pl-2 pr-3 text-slate-800 placeholder-slate-400 focus:outline-none"
                  />
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 mr-2 shrink-0" />
                </div>

                {customerDropdownOpen && customers.length > 0 && (
                  <div className="absolute left-0 top-full mt-1 w-80 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-64 overflow-y-auto py-1">
                    <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                      Select Customer
                    </div>
                    {customers.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleSelectCustomer(c)}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-indigo-50/70 border-b border-slate-50 last:border-0 flex items-center justify-between"
                      >
                        <div>
                          <p className="font-semibold text-slate-800">{c.name}</p>
                          <p className="text-[11px] text-slate-500 font-mono">{c.phone || 'No phone'}</p>
                        </div>
                        <div className="text-right">
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            c.customer_type === 'WHOLESALE' ? 'bg-indigo-100 text-indigo-700' :
                            c.customer_type === 'BULK' ? 'bg-purple-100 text-purple-700' :
                            c.customer_type === 'SUB_WHOLESALER' ? 'bg-blue-100 text-blue-700' :
                            c.customer_type === 'RETAIL' ? 'bg-emerald-100 text-emerald-700' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {c.customer_type || 'RETAIL'}
                          </span>
                          <p className="text-[10px] text-slate-500 mt-0.5">Limit: {currency}{c.credit_limit || 0}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-slate-900 text-white px-3 py-1.5 rounded-lg text-xs shadow-xs">
                <User className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <div className="flex items-center gap-2">
                  <span className="font-bold tracking-tight">{selectedCustomer.name}</span>
                  <span className="text-slate-400 font-mono text-[11px]">({selectedCustomer.phone || 'Walk-in'})</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold uppercase ${
                    selectedCustomer.customer_type === 'WHOLESALE' ? 'bg-indigo-500 text-white' :
                    selectedCustomer.customer_type === 'BULK' ? 'bg-purple-500 text-white' :
                    selectedCustomer.customer_type === 'SUB_WHOLESALER' ? 'bg-blue-500 text-white' :
                    selectedCustomer.customer_type === 'RETAIL' ? 'bg-emerald-600 text-white' :
                    'bg-slate-700 text-slate-200'
                  }`}>
                    {selectedCustomer.customer_type || 'RETAIL'}
                  </span>
                </div>
                <div className="h-3 w-px bg-slate-700 mx-1" />
                <div className="text-[11px] flex items-center gap-1.5">
                  <span className="text-slate-400">Due:</span>
                  <span className="font-mono font-semibold text-amber-300">
                    {currency}{parseFloat(selectedCustomer.current_outstanding ?? selectedCustomer.outstanding_balance ?? 0).toFixed(2)}
                  </span>
                  <span className="text-slate-400 ml-1">Avail Credit:</span>
                  <span className="font-mono font-semibold text-emerald-400">
                    {currency}{parseFloat(selectedCustomer.available_credit ?? (selectedCustomer.credit_limit - selectedCustomer.outstanding_balance) ?? 0).toFixed(2)}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedCustomer(null)}
                  className="ml-1 text-slate-400 hover:text-white"
                  title="Clear Customer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Credit Warning Banner */}
          {creditWarning && (
            <div className="hidden lg:flex items-center gap-1.5 bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-1 rounded-md text-[11px]">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>{creditWarning}</span>
            </div>
          )}
        </div>

        {/* Center & Right: Billing Counter, Retail/Wholesale Toggle & Hotkey Pills */}
        <div className="flex items-center gap-2.5 text-xs">
          {/* Pricing Mode Toggle */}
          <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-100">
            <button
              type="button"
              onClick={() => applyPricingTier('WHOLESALE')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                pricingMode === 'WHOLESALE' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Wholesale Tier
            </button>
            <button
              type="button"
              onClick={() => applyPricingTier('RETAIL')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                pricingMode === 'RETAIL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Retail Tier
            </button>
          </div>

          {/* Held Bills button */}
          <button
            onClick={() => setShowHeldModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs transition-colors"
          >
            <PauseCircle className="w-3.5 h-3.5 text-amber-600" />
            <span>Held ({heldBills.length})</span>
          </button>

          {/* Invoice Date & Staff Info */}
          <div className="hidden md:flex items-center gap-2 pl-2 border-l border-slate-200 text-slate-500 text-[11px]">
            <span>{todayFormatted}</span>
            <span>·</span>
            <span className="font-semibold text-slate-800">{user?.name || 'Staff'}</span>
            <span className="px-1.5 py-0.2 bg-slate-100 text-slate-700 rounded text-[10px] font-semibold">
              {isAdmin ? 'ADMIN' : 'STAFF'}
            </span>
          </div>

          {/* Shortcut Keys Pill Bar */}
          <div className="hidden xl:flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-lg text-[10px] text-slate-500 font-mono">
            <span className="bg-white border border-slate-200 px-1 py-0.5 rounded text-slate-700 font-semibold">F2</span>
            <span>Search</span>
            <span className="text-slate-300 mx-0.5">·</span>
            <span className="bg-white border border-slate-200 px-1 py-0.5 rounded text-slate-700 font-semibold">F4</span>
            <span>Pay</span>
            <span className="text-slate-300 mx-0.5">·</span>
            <span className="bg-white border border-slate-200 px-1 py-0.5 rounded text-slate-700 font-semibold">F8</span>
            <span>Complete Sale</span>
            <span className="text-slate-300 mx-0.5">·</span>
            <span className="bg-white border border-slate-200 px-1 py-0.5 rounded text-slate-700 font-semibold">ESC</span>
            <span>Reset</span>
          </div>
        </div>
      </header>

      {/* 2. MAIN SPLIT INTERFACE: BILLING GRID (LEFT 68%) + PAYMENT & DISPATCH (RIGHT 32%) */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT COLUMN: BARCODE SEARCH + FMCG BILLING GRID */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-slate-200 bg-white">
          {/* Barcode & Product Instant Search Bar */}
          <div className="p-3 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
            <div className="relative flex-1">
              <Barcode className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setShowSearchDropdown(true);
                }}
                onFocus={() => setShowSearchDropdown(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchResults.length > 0) {
                    addToCart(searchResults[0]);
                  }
                }}
                placeholder="Scan barcode or type item name, SKU, biscuits, chocolates (F2)..."
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all shadow-xs"
              />

              {/* Fast Autocomplete Dropdown */}
              {showSearchDropdown && search.trim() && searchResults.length > 0 && (
                <div className="absolute left-0 top-full mt-1.5 w-full bg-white border border-slate-200 rounded-xl shadow-2xl z-50 max-h-72 overflow-y-auto py-1">
                  {searchResults.map((prod) => (
                    <button
                      key={prod.id}
                      type="button"
                      onClick={() => addToCart(prod)}
                      className="w-full text-left px-4 py-2.5 text-xs hover:bg-indigo-50 border-b border-slate-50 last:border-0 flex items-center justify-between transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm truncate">{prod.name}</span>
                          <span className="font-mono text-[11px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded">{prod.sku}</span>
                          {prod.barcode && <span className="font-mono text-[11px] text-slate-400">[{prod.barcode}]</span>}
                        </div>
                        <div className="text-slate-500 text-[11px] mt-0.5 flex items-center gap-2">
                          <span>Stock: <strong className="text-slate-800 font-mono">{prod.quantity} PCS</strong></span>
                          <span>·</span>
                          <span className="text-indigo-600 font-semibold">{prod.stock_breakdown?.formatted || `${prod.quantity} PCS`}</span>
                        </div>
                      </div>
                      <div className="text-right ml-4 shrink-0">
                        <div className="text-xs font-mono font-bold text-slate-900">
                          {currency}{pricingMode === 'WHOLESALE' && prod.wholesale_price ? prod.wholesale_price : prod.selling_price}
                        </div>
                        <span className="text-[10px] text-slate-400">per {prod.base_unit || 'PCS'}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Category Filter Chips */}
            <div className="hidden md:flex items-center gap-1.5 overflow-x-auto max-w-xs">
              <button
                onClick={() => setFilterCategory('')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  !filterCategory ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All
              </button>
              {categories.slice(0, 4).map(c => (
                <button
                  key={c.id}
                  onClick={() => setFilterCategory(c.id === filterCategory ? '' : c.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                    filterCategory === c.id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {c.name.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mx-3 mt-2 flex items-center justify-between gap-2 bg-rose-50 border border-rose-200 text-rose-700 px-3 py-2 rounded-lg text-xs">
              <div className="flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{error}</span>
              </div>
              <button onClick={() => setError('')} className="text-rose-400 hover:text-rose-700">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* FMCG BILLING GRID TABLE */}
          <div className="flex-1 overflow-y-auto">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-400">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                  <ShoppingCart className="w-8 h-8 text-slate-300" />
                </div>
                <h3 className="text-base font-semibold text-slate-700">Cart is empty</h3>
                <p className="text-xs text-slate-400 max-w-xs mt-1">
                  Scan packaged products or use the search bar above to build a wholesale FMCG invoice.
                </p>

                {/* Catalog items */}
                <div className="mt-6 w-full max-w-md border border-slate-200 rounded-xl p-3 bg-white text-left">
                  <div className="grid grid-cols-2 gap-2">
                    {products.slice(0, 6).map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => addToCart(p)}
                        className="text-left p-2 rounded-lg border border-slate-100 hover:border-indigo-500 hover:bg-indigo-50/50 transition-all text-xs"
                      >
                        <p className="font-semibold text-slate-900 truncate">{p.name}</p>
                        <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                          <span className="font-mono">{currency}{p.selling_price}</span>
                          <span className="text-emerald-600 font-semibold">{p.quantity} pcs</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100/75 text-slate-600 sticky top-0 z-10 border-b border-slate-200 font-semibold">
                    <tr>
                      <th className="py-2.5 px-3 w-8">#</th>
                      <th className="py-2.5 px-3 min-w-[160px]">Product & SKU</th>
                      <th className="py-2.5 px-2 min-w-[130px]">Batch & Expiry</th>
                      <th className="py-2.5 px-2 min-w-[110px]">Packaging Unit</th>
                      <th className="py-2.5 px-2 text-center w-28">Qty</th>
                      <th className="py-2.5 px-2 text-center w-24">Free Scheme</th>
                      <th className="py-2.5 px-2 text-right w-24">Unit Rate</th>
                      <th className="py-2.5 px-2 text-center w-16">Disc %</th>
                      <th className="py-2.5 px-2 text-center w-14">Tax %</th>
                      <th className="py-2.5 px-3 text-right w-24">Line Total</th>
                      <th className="py-2.5 px-2 w-10 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                    {cart.map((item, idx) => {
                      const gross = item.quantity * item.unit_price;
                      const disc = gross * ((item.discount_percent || 0) / 100);
                      const net = gross - disc;
                      const tax = net * ((item.tax_rate || 0) / 100);
                      const lineTotal = net + tax;

                      return (
                        <tr key={item.product_id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">{idx + 1}</td>

                          {/* Product Info */}
                          <td className="py-3 px-3">
                            <p className="font-semibold text-slate-900 leading-tight">{item.name}</p>
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono mt-0.5">
                              <span>{item.sku}</span>
                              {item.barcode && <span>· {item.barcode}</span>}
                            </div>
                          </td>

                          {/* Batch & Expiry Selector */}
                          <td className="py-3 px-2">
                            <select
                              value={item.selected_batch}
                              onChange={(e) => changeBatch(item.product_id, e.target.value)}
                              className={`w-full text-xs font-mono border rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-slate-900 bg-white ${
                                item.is_expired ? 'border-rose-400 text-rose-600 bg-rose-50' :
                                item.near_expiry ? 'border-amber-400 text-amber-700 bg-amber-50' :
                                'border-slate-200 text-slate-800'
                              }`}
                            >
                              {item.batches.map(b => (
                                <option key={b.id || b.batch_number} value={b.batch_number} disabled={b.is_expired}>
                                  {b.batch_number} ({b.expiry_date || 'No Exp'}) {b.is_expired ? '[EXPIRED]' : b.near_expiry ? '[SOON]' : ''}
                                </option>
                              ))}
                            </select>
                            {item.near_expiry && (
                              <p className="text-[10px] text-amber-600 font-semibold mt-0.5 flex items-center gap-1">
                                <Clock className="w-2.5 h-2.5" /> Near Expiry
                              </p>
                            )}
                          </td>

                          {/* Packaging Unit (CTN / BOX / PCS) */}
                          <td className="py-3 px-2">
                            <select
                              value={item.unit_name}
                              onChange={(e) => changeUnit(item.product_id, e.target.value)}
                              className="w-full text-xs font-semibold border border-slate-200 rounded px-1.5 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                            >
                              {item.units.map(u => (
                                <option key={u.unit_name} value={u.unit_name}>
                                  {u.unit_name} ({u.conversion_factor} {item.base_unit || 'pcs'})
                                </option>
                              ))}
                            </select>
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                              1 {item.unit_name} = {item.conversion_factor} base
                            </p>
                          </td>

                          {/* Billed Quantity (+/-) */}
                          <td className="py-3 px-2">
                            <div className="flex items-center justify-center border border-slate-200 rounded-lg overflow-hidden bg-white shadow-2xs">
                              <button
                                type="button"
                                onClick={() => changeQty(item.product_id, item.quantity - 1)}
                                className="px-2 py-1 text-slate-500 hover:bg-slate-100 transition-colors font-bold"
                              >
                                −
                              </button>
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => changeQty(item.product_id, parseInt(e.target.value, 10) || 1)}
                                className="w-12 text-center text-xs font-bold text-slate-900 focus:outline-none border-x border-slate-100 py-1"
                              />
                              <button
                                type="button"
                                onClick={() => changeQty(item.product_id, item.quantity + 1)}
                                className="px-2 py-1 text-slate-500 hover:bg-slate-100 transition-colors font-bold"
                              >
                                +
                              </button>
                            </div>
                          </td>

                          {/* Wholesale Scheme Free Quantity */}
                          <td className="py-3 px-2">
                            <div className="flex flex-col items-center">
                              <input
                                type="number"
                                min="0"
                                value={item.free_quantity}
                                onChange={(e) => changeFreeQty(item.product_id, e.target.value)}
                                className="w-16 text-center text-xs font-mono border border-slate-200 rounded px-1.5 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                                placeholder="0 Free"
                              />
                              {/* Quick Scheme Buttons */}
                              <div className="flex items-center gap-1 mt-1">
                                <button
                                  type="button"
                                  onClick={() => applyWholesaleScheme(item.product_id, 10, 1)}
                                  className="text-[9px] px-1 py-0.2 rounded bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-semibold"
                                  title="Apply Buy 10 Get 1 Free"
                                >
                                  10+1
                                </button>
                                <button
                                  type="button"
                                  onClick={() => applyWholesaleScheme(item.product_id, 20, 2)}
                                  className="text-[9px] px-1 py-0.2 rounded bg-purple-50 text-purple-700 hover:bg-purple-100 font-semibold"
                                  title="Apply Buy 20 Get 2 Free"
                                >
                                  20+2
                                </button>
                              </div>
                            </div>
                          </td>

                          {/* Unit Rate (Wholesale / Retail) */}
                          <td className="py-3 px-2 text-right">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={item.unit_price}
                              onChange={(e) => changePrice(item.product_id, parseFloat(e.target.value) || 0)}
                              className="w-20 text-right text-xs font-mono font-bold border border-slate-200 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-slate-900 bg-white"
                            />
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {pricingMode === 'WHOLESALE' ? 'Wholesale' : 'Retail'}
                            </div>
                          </td>

                          {/* Discount % */}
                          <td className="py-3 px-2 text-center">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={item.discount_percent}
                              onChange={(e) => changeDiscount(item.product_id, parseFloat(e.target.value) || 0)}
                              className="w-12 text-center text-xs font-mono border border-slate-200 rounded px-1 py-1 focus:outline-none focus:ring-1 focus:ring-slate-900 bg-white"
                            />
                          </td>

                          {/* Tax % */}
                          <td className="py-3 px-2 text-center">
                            <span className="font-mono text-slate-600 text-xs">{item.tax_rate}%</span>
                          </td>

                          {/* Line Total */}
                          <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 text-sm">
                            {currency}{lineTotal.toFixed(2)}
                          </td>

                          {/* Remove */}
                          <td className="py-3 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => removeFromCart(item.product_id)}
                              className="text-slate-300 hover:text-rose-500 p-1 rounded transition-colors"
                              title="Remove line item"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 4. LIVE WAREHOUSE DISPATCH SUMMARY (Sticky at bottom of Billing Grid) */}
          <div className="border-t border-slate-200 bg-slate-900 text-white px-4 py-2.5 flex flex-wrap items-center justify-between gap-4 shrink-0 shadow-lg">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-400">
              <PackageCheck className="w-4 h-4 text-indigo-400" />
              <span>Warehouse Dispatch:</span>
            </div>

            <div className="flex items-center gap-6 text-xs">
              <div className="flex items-center gap-1.5">
                <Boxes className="w-4 h-4 text-amber-400" />
                <span className="text-slate-400">Total Cartons:</span>
                <span className="font-mono font-bold text-sm text-white">{dispatchSummary.totalCartons} CTN</span>
              </div>

              <div className="flex items-center gap-1.5">
                <Box className="w-4 h-4 text-blue-400" />
                <span className="text-slate-400">Total Boxes:</span>
                <span className="font-mono font-bold text-sm text-white">{dispatchSummary.totalBoxes} BOX</span>
              </div>

              <div className="flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-emerald-400" />
                <span className="text-slate-400">Total Pieces:</span>
                <span className="font-mono font-bold text-sm text-emerald-400">{dispatchSummary.totalBasePieces} PCS</span>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">Distinct Items:</span>
                <span className="font-mono font-bold text-sm text-white">{dispatchSummary.distinctItems}</span>
              </div>

              {dispatchSummary.totalFreeUnits > 0 && (
                <div className="flex items-center gap-1.5 bg-emerald-950/80 border border-emerald-500/30 px-2 py-0.5 rounded text-[11px] text-emerald-300">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Scheme Free Units: <strong>+{dispatchSummary.totalFreeUnits} Free</strong></span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: TOTALS, SPLIT TENDER PAYMENT & CHECKOUT (32% width) */}
        <div className="w-80 md:w-96 bg-white flex flex-col justify-between overflow-y-auto shrink-0 shadow-xs border-l border-slate-200">
          <div className="p-4 space-y-4">
            {/* Header Title */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Calculator className="w-4 h-4 text-slate-700" />
                <span>Invoice Summary</span>
              </h2>
              <span className="text-[11px] font-mono text-slate-400">#{cart.length} items</span>
            </div>

            {/* Price Breakdown */}
            <div className="bg-slate-50 rounded-xl p-3.5 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal (Gross)</span>
                <span className="font-mono font-semibold text-slate-800">{currency}{totals.subtotal.toFixed(2)}</span>
              </div>

              {totals.discountTotal > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Item Discounts</span>
                  <span className="font-mono font-semibold">−{currency}{totals.discountTotal.toFixed(2)}</span>
                </div>
              )}

              {/* Order Level Discount Input */}
              <div className="flex items-center justify-between gap-2 pt-1">
                <span className="text-slate-600">Order Discount</span>
                <div className="flex items-center gap-1">
                  <span className="text-slate-400 text-xs">−{currency}</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={orderDiscount}
                    onChange={(e) => setOrderDiscount(parseFloat(e.target.value) || 0)}
                    className="w-16 text-right text-xs font-mono border border-slate-200 rounded px-1.5 py-0.5 bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="flex justify-between text-slate-600">
                <span>GST Tax (CGST + SGST)</span>
                <span className="font-mono font-semibold text-slate-800">+{currency}{totals.taxTotal.toFixed(2)}</span>
              </div>

              {parseFloat(roundOff) !== 0 && (
                <div className="flex justify-between text-slate-500 text-[11px]">
                  <span>Round Off</span>
                  <span className="font-mono">{roundOff > 0 ? `+${roundOff}` : roundOff}</span>
                </div>
              )}

              {/* Grand Net Total */}
              <div className="border-t border-slate-200 pt-2 flex justify-between items-baseline">
                <span className="text-sm font-bold text-slate-900">Grand Total</span>
                <span className="text-xl font-mono font-extrabold text-slate-900">
                  {currency}{grandTotal.toFixed(2)}
                </span>
              </div>
            </div>

            {/* PAYMENT METHOD & SPLIT TENDER CONTROLS */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Payment Mode:
                </label>
                <span className="text-[10px] text-slate-400 font-mono">[F4 to Pay]</span>
              </div>

              {/* Payment Mode Selector Tabs */}
              <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 rounded-lg">
                {[
                  { id: 'CASH', label: 'Cash', icon: Banknote },
                  { id: 'UPI', label: 'UPI', icon: Smartphone },
                  { id: 'CREDIT', label: 'Credit', icon: CreditCard },
                  { id: 'SPLIT', label: 'Split', icon: Calculator }
                ].map(m => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentModeDirect(m.id)}
                    className={`py-1.5 text-xs font-semibold rounded-md flex flex-col items-center gap-1 transition-all ${
                      paymentMode === m.id
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <m.icon className="w-3.5 h-3.5" />
                    <span>{m.label}</span>
                  </button>
                ))}
              </div>

              {/* Split Tender Inputs */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2.5">
                {/* Cash Input */}
                {(paymentMode === 'CASH' || paymentMode === 'SPLIT') && (
                  <div>
                    <div className="flex justify-between text-[11px] font-semibold text-slate-700 mb-1">
                      <span className="flex items-center gap-1"><Banknote className="w-3 h-3 text-emerald-600" /> Cash Tendered</span>
                      <button
                        type="button"
                        onClick={() => setCashAmount(String(grandTotal))}
                        className="text-[10px] text-indigo-600 hover:underline"
                      >
                        Exact
                      </button>
                    </div>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">{currency}</span>
                      <input
                        ref={paymentMode === 'CASH' ? paymentInputRef : null}
                        type="number"
                        step="0.01"
                        min="0"
                        value={cashAmount}
                        onChange={(e) => setCashAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full pl-6 pr-3 py-1.5 text-xs font-mono font-bold bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 text-right"
                      />
                    </div>
                  </div>
                )}

                {/* UPI Input */}
                {(paymentMode === 'UPI' || paymentMode === 'SPLIT') && (
                  <div>
                    <div className="flex justify-between text-[11px] font-semibold text-slate-700 mb-1">
                      <span className="flex items-center gap-1"><Smartphone className="w-3 h-3 text-indigo-600" /> UPI Amount</span>
                      <button
                        type="button"
                        onClick={() => setUpiAmount(String(grandTotal - (cashNum || 0)))}
                        className="text-[10px] text-indigo-600 hover:underline"
                      >
                        Balance
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">{currency}</span>
                        <input
                          ref={paymentMode === 'UPI' ? paymentInputRef : null}
                          type="number"
                          step="0.01"
                          min="0"
                          value={upiAmount}
                          onChange={(e) => setUpiAmount(e.target.value)}
                          placeholder="0.00"
                          className="w-full pl-6 pr-2 py-1.5 text-xs font-mono font-bold bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 text-right"
                        />
                      </div>
                      <input
                        type="text"
                        value={upiRef}
                        onChange={(e) => setUpiRef(e.target.value)}
                        placeholder="UTR / Ref #"
                        className="w-full px-2 py-1.5 text-[11px] font-mono bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                      />
                    </div>
                  </div>
                )}

                {/* Credit Input */}
                {(paymentMode === 'CREDIT' || paymentMode === 'SPLIT') && (
                  <div>
                    <div className="flex justify-between text-[11px] font-semibold text-slate-700 mb-1">
                      <span className="flex items-center gap-1"><CreditCard className="w-3 h-3 text-purple-600" /> Credit / Ledger</span>
                      <button
                        type="button"
                        onClick={() => setCreditAmount(String(Math.max(0, grandTotal - (cashNum + upiNum))))}
                        className="text-[10px] text-indigo-600 hover:underline"
                      >
                        Remaining
                      </button>
                    </div>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">{currency}</span>
                      <input
                        ref={paymentMode === 'CREDIT' ? paymentInputRef : null}
                        type="number"
                        step="0.01"
                        min="0"
                        value={creditAmount}
                        onChange={(e) => setCreditAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full pl-6 pr-3 py-1.5 text-xs font-mono font-bold bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 text-right"
                      />
                    </div>
                  </div>
                )}

                {/* Tender Balance Indicators */}
                <div className="pt-2 border-t border-slate-200 text-xs space-y-1">
                  <div className="flex justify-between text-slate-600">
                    <span>Total Tendered</span>
                    <span className="font-mono font-bold text-slate-900">{currency}{totalTendered.toFixed(2)}</span>
                  </div>

                  {changeDue > 0 && (
                    <div className="flex justify-between text-emerald-600 font-semibold">
                      <span>Change to Return</span>
                      <span className="font-mono text-sm">{currency}{changeDue.toFixed(2)}</span>
                    </div>
                  )}

                  {balanceRemaining > 0 && paymentMode !== 'CREDIT' && creditNum < balanceRemaining && (
                    <div className="flex justify-between text-amber-600 font-semibold">
                      <span>Balance Due</span>
                      <span className="font-mono text-sm">{currency}{(balanceRemaining - creditNum).toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Order Notes */}
              <div>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional billing notes / PO number..."
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>
            </div>
          </div>

          {/* CHECKOUT ACTION BUTTONS (Sticky at bottom of sidebar) */}
          <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-2">
            <Button
              type="button"
              onClick={handleCheckout}
              disabled={loading || cart.length === 0}
              className="w-full py-3 bg-slate-900 hover:bg-indigo-600 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
            >
              <Printer className="w-4 h-4 text-indigo-400" />
              <span>Complete Sale [F8]</span>
            </Button>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleHoldBill}
                disabled={cart.length === 0}
                className="flex-1 py-2 text-xs font-semibold rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 transition-colors disabled:opacity-50"
              >
                Park / Hold
              </button>
              <button
                type="button"
                onClick={handleResetBilling}
                className="flex-1 py-2 text-xs font-semibold rounded-lg border border-slate-200 bg-white hover:bg-rose-50 hover:text-rose-600 text-slate-700 transition-colors"
              >
                Reset [ESC]
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 5. INSTANT PRINT MODAL (THERMAL RECEIPT & A4 TAX INVOICE) */}
      {successInvoice && (
        <Modal
          isOpen={!!successInvoice}
          onClose={() => setSuccessInvoice(null)}
          title={`Invoice Generated #${successInvoice.invoice_number}`}
          size="lg"
        >
          <div className="space-y-4">
            {/* Header controls: Thermal vs A4 Toggle */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500">Print Format:</span>
                <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-100">
                  <button
                    onClick={() => setPrintLayout('thermal')}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                      printLayout === 'thermal' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    3-Inch Thermal Receipt
                  </button>
                  <button
                    onClick={() => setPrintLayout('a4')}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                      printLayout === 'a4' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    A4 Tax Invoice
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  icon={Printer}
                  onClick={() => window.print()}
                  className="text-xs"
                >
                  Print Invoice
                </Button>
                <Button
                  onClick={() => setSuccessInvoice(null)}
                  className="text-xs"
                >
                  New Sale
                </Button>
              </div>
            </div>

            {/* RECEIPT / INVOICE PREVIEW CONTAINER */}
            <div className="max-h-[60vh] overflow-y-auto p-4 bg-slate-100 rounded-xl flex justify-center">
              {printLayout === 'thermal' ? (
                /* 3-INCH THERMAL RECEIPT VIEW (80mm width standard) */
                <div className="w-[340px] bg-white p-4 shadow-sm border border-slate-200 font-mono text-[11px] leading-tight text-slate-900 print:w-full print:border-none print:shadow-none">
                  {/* Shop Details */}
                  <div className="text-center pb-2 border-b border-dashed border-slate-300">
                    <h2 className="text-sm font-bold uppercase tracking-wider">{business?.name || 'BUSINESSFLOW WHOLESALE'}</h2>
                    <p className="text-[10px] text-slate-500">{business?.address || 'Wholesale Market Complex'}</p>
                    <p className="text-[10px] text-slate-500">Phone: {business?.phone || '+91 98765 43210'}</p>
                    {business?.tax_number && (
                      <p className="text-[10px] font-semibold mt-0.5">GSTIN: {business.tax_number}</p>
                    )}
                  </div>

                  {/* Invoice Meta */}
                  <div className="py-2 border-b border-dashed border-slate-300 space-y-0.5 text-[10px]">
                    <div className="flex justify-between">
                      <span>Inv: <strong>{successInvoice.invoice_number}</strong></span>
                      <span>{successInvoice.invoice_date}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Cust: {successInvoice.customer?.name || 'Walk-in Customer'}</span>
                      <span>Mode: {successInvoice.payment_mode || 'CASH'}</span>
                    </div>
                    {successInvoice.customer?.phone && (
                      <p>Phone: {successInvoice.customer.phone}</p>
                    )}
                  </div>

                  {/* Items List */}
                  <div className="py-2 border-b border-dashed border-slate-300">
                    <div className="flex justify-between font-bold border-b border-slate-200 pb-1 mb-1 text-[10px]">
                      <span>Item</span>
                      <span>Qty/Rate</span>
                      <span>Total</span>
                    </div>
                    {(successInvoice.items || []).map((si, idx) => (
                      <div key={idx} className="py-1">
                        <div className="flex justify-between">
                          <span className="font-semibold">{si.product_name}</span>
                          <span>{currency}{parseFloat(si.line_total || si.total_price || 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-500">
                          <span>
                            {si.quantity} {si.unit_name || 'PCS'}
                            {si.free_quantity > 0 && <strong className="text-emerald-600"> +{si.free_quantity} Free</strong>}
                            {' @ '}{currency}{si.unit_selling_price}
                          </span>
                          {si.batch_number && <span>B:{si.batch_number}</span>}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Financials */}
                  <div className="py-2 border-b border-dashed border-slate-300 space-y-1 text-[10px]">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>{currency}{parseFloat(successInvoice.subtotal || successInvoice.total_amount || 0).toFixed(2)}</span>
                    </div>
                    {parseFloat(successInvoice.discount_total || successInvoice.discount_amount || 0) > 0 && (
                      <div className="flex justify-between">
                        <span>Discount:</span>
                        <span>−{currency}{parseFloat(successInvoice.discount_total || successInvoice.discount_amount).toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Tax (GST):</span>
                      <span>+{currency}{parseFloat(successInvoice.tax_total || successInvoice.tax_amount || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs font-bold pt-1 border-t border-slate-200">
                      <span>NET AMOUNT:</span>
                      <span>{currency}{parseFloat(successInvoice.grand_total || successInvoice.net_amount || 0).toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Payment Breakdown */}
                  <div className="py-2 border-b border-dashed border-slate-300 space-y-0.5 text-[10px]">
                    <div className="flex justify-between font-semibold">
                      <span>Paid Amount:</span>
                      <span>{currency}{parseFloat(successInvoice.paid_amount || 0).toFixed(2)}</span>
                    </div>
                    {parseFloat(successInvoice.balance_due || 0) > 0 && (
                      <div className="flex justify-between text-amber-700 font-bold">
                        <span>Balance Due / Credit:</span>
                        <span>{currency}{parseFloat(successInvoice.balance_due).toFixed(2)}</span>
                      </div>
                    )}
                  </div>

                  {/* Customer Outstanding Account */}
                  {successInvoice.customer && (
                    <div className="py-2 border-b border-dashed border-slate-300 text-[10px] space-y-0.5">
                      <div className="flex justify-between text-slate-600">
                        <span>Total Outstanding Due:</span>
                        <span className="font-bold text-slate-900 font-mono">
                          {currency}{parseFloat(successInvoice.customer.outstanding_balance || 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Footer message */}
                  <div className="pt-3 text-center text-[10px] text-slate-400 space-y-0.5">
                    <p className="font-semibold text-slate-700">Thank you for your business!</p>
                    <p>Computer generated wholesale invoice.</p>
                  </div>
                </div>
              ) : (
                /* A4 TAX INVOICE VIEW (Full detailed enterprise layout) */
                <div className="w-[720px] bg-white p-8 shadow-sm border border-slate-200 text-xs text-slate-900 print:w-full print:border-none print:shadow-none space-y-6">
                  {/* Company Header */}
                  <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-slate-900 text-white font-bold flex items-center justify-center text-sm">
                          BF
                        </div>
                        <h1 className="text-xl font-bold tracking-tight text-slate-900">
                          {business?.name || 'BUSINESSFLOW WHOLESALE'}
                        </h1>
                      </div>
                      <p className="text-slate-500 mt-1 max-w-sm">{business?.address || 'Wholesale Distribution Hub, Sector 4'}</p>
                      <p className="text-slate-500">Phone: {business?.phone || '+91 98765 43210'} · Email: {business?.email || 'sales@businessflow.com'}</p>
                      {business?.tax_number && (
                        <p className="font-mono font-semibold text-slate-800 mt-0.5">GSTIN / TAX ID: {business.tax_number}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <h2 className="text-lg font-extrabold uppercase tracking-wider text-slate-900 bg-slate-100 px-3 py-1 rounded inline-block">
                        Tax Invoice
                      </h2>
                      <p className="font-mono font-bold text-sm mt-2">{successInvoice.invoice_number}</p>
                      <p className="text-slate-500 mt-0.5">Date: {successInvoice.invoice_date}</p>
                      <p className="text-slate-500 font-semibold">Payment: {successInvoice.payment_mode || 'CASH'}</p>
                    </div>
                  </div>

                  {/* Customer Billing & Shipping Information */}
                  <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Billed To (Customer):</p>
                      <h3 className="text-sm font-bold text-slate-900 mt-0.5">
                        {successInvoice.customer?.name || 'Walk-in Retail / Wholesale Customer'}
                      </h3>
                      <p className="text-slate-600 mt-0.5">{successInvoice.customer?.address || 'Counter Pickup'}</p>
                      <p className="text-slate-600">Phone: {successInvoice.customer?.phone || 'N/A'}</p>
                      {successInvoice.customer?.tax_number && (
                        <p className="font-mono text-slate-700 mt-0.5">Customer GSTIN: {successInvoice.customer.tax_number}</p>
                      )}
                    </div>
                    <div className="text-right space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Account Summary:</p>
                      <p className="text-slate-600">
                        Type: <span className="font-semibold text-slate-800 uppercase">{successInvoice.customer?.customer_type || 'REGULAR'}</span>
                      </p>
                      <p className="text-slate-600">
                        Current Outstanding: <strong className="font-mono text-slate-900">{currency}{parseFloat(successInvoice.customer?.outstanding_balance || 0).toFixed(2)}</strong>
                      </p>
                    </div>
                  </div>

                  {/* Invoice Items Table */}
                  <table className="w-full text-left text-xs border border-slate-200">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-2.5 w-8">#</th>
                        <th className="py-2 px-2.5">Description of Goods</th>
                        <th className="py-2 px-2">Batch / Exp</th>
                        <th className="py-2 px-2 text-center">Unit</th>
                        <th className="py-2 px-2 text-center">Billed Qty</th>
                        <th className="py-2 px-2 text-center">Free Qty</th>
                        <th className="py-2 px-2 text-right">Rate</th>
                        <th className="py-2 px-2 text-center">Disc %</th>
                        <th className="py-2 px-2 text-center">Tax %</th>
                        <th className="py-2 px-2.5 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {(successInvoice.items || []).map((it, idx) => (
                        <tr key={idx}>
                          <td className="py-2 px-2.5 text-slate-400 font-mono">{idx + 1}</td>
                          <td className="py-2 px-2.5">
                            <span className="font-semibold text-slate-900">{it.product_name}</span>
                            <span className="text-slate-400 font-mono text-[10px] ml-1.5">[{it.product_sku}]</span>
                          </td>
                          <td className="py-2 px-2 font-mono text-[10px] text-slate-600">
                            {it.batch_number || 'BATCH-01'}
                          </td>
                          <td className="py-2 px-2 text-center font-semibold text-slate-700">
                            {it.unit_name || 'PCS'}
                          </td>
                          <td className="py-2 px-2 text-center font-bold font-mono">
                            {it.quantity}
                          </td>
                          <td className="py-2 px-2 text-center font-bold font-mono text-emerald-600">
                            {it.free_quantity > 0 ? `+${it.free_quantity}` : '—'}
                          </td>
                          <td className="py-2 px-2 text-right font-mono">
                            {currency}{parseFloat(it.unit_selling_price || 0).toFixed(2)}
                          </td>
                          <td className="py-2 px-2 text-center font-mono">
                            {it.discount_percentage > 0 ? `${it.discount_percentage}%` : '0%'}
                          </td>
                          <td className="py-2 px-2 text-center font-mono">
                            {it.tax_rate}%
                          </td>
                          <td className="py-2 px-2.5 text-right font-mono font-bold text-slate-900">
                            {currency}{parseFloat(it.line_total || it.total_price || 0).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Summary & Totals */}
                  <div className="flex items-start justify-between gap-6 pt-2">
                    <div className="flex-1 text-[11px] text-slate-500 space-y-1">
                      <p className="font-bold text-slate-700 uppercase tracking-wider">Payment Breakdown:</p>
                      {(successInvoice.payments || []).map((pm, i) => (
                        <div key={i} className="flex justify-between max-w-xs font-mono text-slate-700">
                          <span>{pm.payment_method} {pm.reference_number ? `(${pm.reference_number})` : ''}:</span>
                          <span>{currency}{parseFloat(pm.amount).toFixed(2)}</span>
                        </div>
                      ))}
                      {parseFloat(successInvoice.balance_due || 0) > 0 && (
                        <div className="flex justify-between max-w-xs font-mono text-amber-700 font-bold">
                          <span>Credit Balance Due:</span>
                          <span>{currency}{parseFloat(successInvoice.balance_due).toFixed(2)}</span>
                        </div>
                      )}
                    </div>

                    <div className="w-64 space-y-1.5 font-mono text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Subtotal:</span>
                        <span className="font-bold">{currency}{parseFloat(successInvoice.subtotal || successInvoice.total_amount || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Total Discount:</span>
                        <span className="text-emerald-600">−{currency}{parseFloat(successInvoice.discount_total || successInvoice.discount_amount || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">GST Tax:</span>
                        <span>+{currency}{parseFloat(successInvoice.tax_total || successInvoice.tax_amount || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm font-extrabold border-t-2 border-slate-900 pt-1 text-slate-900">
                        <span>Grand Total:</span>
                        <span>{currency}{parseFloat(successInvoice.grand_total || successInvoice.net_amount || 0).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Signatory Footer */}
                  <div className="pt-8 flex justify-between items-end border-t border-slate-200 text-xs text-slate-500">
                    <div>
                      <p className="font-semibold text-slate-700">Terms & Conditions:</p>
                      <p className="text-[10px]">Goods once sold can only be returned within 7 days with original invoice.</p>
                    </div>
                    <div className="text-center">
                      <div className="w-40 border-b border-slate-400 mb-1" />
                      <p className="text-[11px] font-semibold text-slate-700">Authorized Signatory</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* 6. PARK / HELD BILLS MODAL */}
      {showHeldModal && (
        <Modal
          isOpen={showHeldModal}
          onClose={() => setShowHeldModal(false)}
          title={`Parked / Held Bills (${heldBills.length})`}
          size="md"
        >
          <div className="space-y-3">
            {heldBills.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6">No bills currently on hold.</p>
            ) : (
              heldBills.map((bill) => (
                <div key={bill.id} className="p-3 border border-slate-200 rounded-xl bg-slate-50 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">
                        {bill.customer ? bill.customer.name : 'Walk-in Customer'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">{bill.timestamp}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {bill.cart?.length || 0} items · Total: {currency}{bill.cart?.reduce((sum, i) => sum + (i.quantity * i.unit_price), 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleResumeBill(bill)}
                      className="text-xs py-1"
                    >
                      Resume
                    </Button>
                    <button
                      type="button"
                      onClick={() => handleDeleteHeldBill(bill.id)}
                      className="text-slate-400 hover:text-rose-500 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
