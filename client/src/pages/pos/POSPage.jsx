import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  ShoppingCart, Plus, Minus, Trash2, Search, User, UserPlus, ChevronDown,
  CreditCard, Banknote, Smartphone, Calculator, CheckCircle, AlertCircle,
  PauseCircle, Printer, Boxes, Box, Package, X, Check, Clock
} from 'lucide-react';
import { Button } from '../../components/ui/Button.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { productService, customerService, invoiceService } from '../../services/businessServices.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { formatCurrency as formatCur } from '../../utils/formatters.js';
import { InvoiceDocument } from '../../components/invoice/InvoiceDocument.jsx';
import { ConnectionBadge } from '../../components/pos/ConnectionBadge.jsx';
import { masterDataCache } from '../../offline/masterDataCache.js';
import { cartPersistence } from '../../offline/cartPersistence.js';
import { offlineInvoiceManager, generateUUID } from '../../offline/offlineInvoiceManager.js';
import { connectionManager, CONNECTION_STATUS } from '../../offline/connectionManager.js';

export function POSPage() {
  const { user, business, isAdmin } = useAuth();
  const currency = (business?.currency_symbol && business.currency_symbol !== '$') ? business.currency_symbol : '₹';

  // Live Clock & Invoice Tag
  const [currentTime, setCurrentTime] = useState(() =>
    new Date().toLocaleTimeString('en-US', { hour12: true })
  );
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('en-US', { hour12: true }));
    }, 1000);
  return () => clearInterval(timer);
  }, []);

  const invoiceNumberRef = useRef(
    'INV-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000)
  );

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

  // Customer Selection & Pricing Tier
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);
  const [pricingMode, setPricingMode] = useState('WHOLESALE'); // 'WHOLESALE' | 'RETAIL'

  // Add Customer Modal State
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState({
    name: '',
    phone: '',
    customer_type: 'RETAIL',
    address: '',
    tax_number: ''
  });
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [addCustomerError, setAddCustomerError] = useState('');

  // Cart State
  const [cart, setCart] = useState([]);
  const [orderDiscount, setOrderDiscount] = useState(0);

  // Payment Mode: 'CASH' | 'UPI' | 'CREDIT' | 'SPLIT'
  const [paymentMode, setPaymentMode] = useState('CASH');
  const [cashAmount, setCashAmount] = useState('');
  const [upiAmount, setUpiAmount] = useState('');
  const [upiRef, setUpiRef] = useState('');
  const [creditAmount, setCreditAmount] = useState('');

  // Operations & UI Feedback
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [scanSuccess, setScanSuccess] = useState('');
  const [creditWarning, setCreditWarning] = useState('');
  const [successInvoice, setSuccessInvoice] = useState(null);
  const [printLayout, setPrintLayout] = useState('thermal'); // 'thermal' | 'a4'

  // USB Barcode Scanner References
  const scannerBufferRef = useRef('');
  const lastKeyTimeRef = useRef(0);
  const lastScanRef = useRef({ code: '', time: 0 });

  // Held Bills
  const [heldBills, setHeldBills] = useState(() => {
    try {
      const saved = localStorage.getItem('bf_held_bills');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [showHeldModal, setShowHeldModal] = useState(false);
  const cartRestoredRef = useRef(false);

  // Cache business details whenever available
  useEffect(() => {
    if (business) {
      masterDataCache.cacheBusiness(business);
    }
  }, [business]);

  // Cart Recovery Foundation: Restore saved active cart from IndexedDB on refresh
  useEffect(() => {
    cartPersistence.load().then((saved) => {
      if (saved && Array.isArray(saved.cart) && saved.cart.length > 0) {
        setCart(saved.cart);
        if (saved.selectedCustomer) setSelectedCustomer(saved.selectedCustomer);
        if (saved.pricingMode) setPricingMode(saved.pricingMode);
        if (saved.orderDiscount) setOrderDiscount(saved.orderDiscount);
        if (saved.paymentMode) setPaymentMode(saved.paymentMode);
      }
      cartRestoredRef.current = true;
    }).catch(() => {
      cartRestoredRef.current = true;
    });
  }, []);

  // Cart Persistence: Automatically save in-progress cart to IndexedDB
  useEffect(() => {
    if (!cartRestoredRef.current) return;
    cartPersistence.save({
      cart,
      selectedCustomer,
      pricingMode,
      orderDiscount,
      paymentMode
    });
  }, [cart, selectedCustomer, pricingMode, orderDiscount, paymentMode]);

  // 1. Initial Data Fetching with IndexedDB Master Data Caching
  useEffect(() => {
    productService.listCategories()
      .then(r => {
        const cats = r.data?.categories || [];
        setCategories(cats);
        masterDataCache.cacheCategories(cats);
      })
      .catch(async () => {
        const cachedCats = await masterDataCache.getCachedCategories();
        if (cachedCats && cachedCats.length > 0) setCategories(cachedCats);
      });
  }, []);

  const fetchProducts = useCallback(async () => {
    setLoadingProducts(true);
    try {
      const res = await productService.list({ limit: 100, is_active: true });
      const prods = res.data?.products || [];
      setProducts(prods);
      setSearchResults(prods);
      masterDataCache.cacheProducts(prods);
    } catch {
      try {
        const res = await productService.search('', { limit: 100 });
        const prods = res.data?.products || [];
        setProducts(prods);
        setSearchResults(prods);
        masterDataCache.cacheProducts(prods);
      } catch {
        // Fallback: Read products from IndexedDB local cache when network is down
        const cachedProds = await masterDataCache.getCachedProducts();
        if (cachedProds && cachedProds.length > 0) {
          setProducts(cachedProds);
          setSearchResults(cachedProds);
        }
      }
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Synchronize category list with any category present on products
  const allCategories = useMemo(() => {
    const map = new Map();
    categories.forEach(c => {
      if (c && c.id && c.name) {
        map.set(String(c.id), { id: c.id, name: c.name });
      }
    });

    products.forEach(p => {
      const pCat = p.category;
      if (pCat && pCat.id && pCat.name) {
        if (!map.has(String(pCat.id))) {
          map.set(String(pCat.id), { id: pCat.id, name: pCat.name });
        }
      } else if (p.category_id && p.category_name) {
        if (!map.has(String(p.category_id))) {
          map.set(String(p.category_id), { id: p.category_id, name: p.category_name });
        }
      }
    });

    return Array.from(map.values());
  }, [categories, products]);

  // Fast client-side barcode / product search handler
  useEffect(() => {
    if (!search.trim()) {
      setSearchResults(products);
      return;
    }
    const q = search.trim().toLowerCase();
    const localMatches = products.filter(p =>
      (p.name && p.name.toLowerCase().includes(q)) ||
      (p.sku && p.sku.toLowerCase().includes(q)) ||
      (p.barcode && p.barcode.toLowerCase().includes(q))
    );
    setSearchResults(localMatches);

    const timer = setTimeout(async () => {
      try {
        const res = await productService.search(search.trim(), { limit: 30 });
        const remoteProds = res.data?.products || [];
        if (remoteProds.length > 0) {
          setSearchResults(prev => {
            const ids = new Set(prev.map(p => p.id));
            const fresh = remoteProds.filter(r => !ids.has(r.id));
            return [...prev, ...fresh];
          });
          setProducts(prev => {
            const ids = new Set(prev.map(p => p.id));
            const fresh = remoteProds.filter(r => !ids.has(r.id));
            return fresh.length > 0 ? [...prev, ...fresh] : prev;
          });
        }
      } catch {}
    }, 250);
  return () => clearTimeout(timer);
  }, [search, products]);

  // Instant product category & search filtering (pure frontend filter for immediate response)
  const displayedProducts = useMemo(() => {
    return products.filter(p => {
      // 1. Category Filter
      if (filterCategory) {
        const targetId = String(filterCategory);
        const selectedCat = allCategories.find(c => String(c.id) === targetId);
        const targetName = (selectedCat ? selectedCat.name : String(filterCategory)).toLowerCase();

        const pCatId = p.category_id ?? p.category?.id;
        const matchesId = pCatId !== undefined && pCatId !== null && String(pCatId) === targetId;

        const pCatName = (
          p.category?.name ||
          p.category_name ||
          (typeof p.category === 'string' ? p.category : '')
        ).toLowerCase();

        let matchesName = false;
        if (pCatName) {
          if (pCatName === targetName || targetName.includes(pCatName) || pCatName.includes(targetName)) {
            matchesName = true;
          } else {
            const keywords = ['beverage', 'drink', 'chocolate', 'biscuit', 'cookie', 'snack', 'namkeen', 'candy', 'juice'];
            for (const kw of keywords) {
              if (targetName.includes(kw) && pCatName.includes(kw)) {
                matchesName = true;
                break;
              }
            }
          }
        }

        if (!matchesId && !matchesName) {
          return false;
        }
      }

      // 2. Barcode / Search Query Filter
      if (search && search.trim()) {
        const q = search.trim().toLowerCase();
        const matchName = p.name && p.name.toLowerCase().includes(q);
        const matchSku = p.sku && p.sku.toLowerCase().includes(q);
        const matchBarcode = p.barcode && p.barcode.toLowerCase().includes(q);
        const matchBrand = p.brand && p.brand.toLowerCase().includes(q);
        if (!matchName && !matchSku && !matchBarcode && !matchBrand) {
          return false;
        }
      }

      return true;
    });
  }, [products, filterCategory, allCategories, search]);

  const fetchCustomers = useCallback(async () => {
    try {
      const res = await customerService.list({ search: customerSearch, limit: 12 });
      const custs = res.data?.customers || [];
      setCustomers(custs);
      if (!customerSearch) {
        masterDataCache.cacheCustomers(custs);
      }
    } catch {
      if (!customerSearch) {
        const cachedCusts = await masterDataCache.getCachedCustomers();
        if (cachedCusts && cachedCusts.length > 0) {
          setCustomers(cachedCusts);
        }
      }
    }
  }, [customerSearch]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // Auto-focus search input on mount
  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  // Helper to compute standard product units
  const getProductUnits = (product) => {
    if (product.units && product.units.length > 0) return product.units;
    const boxQty = product.carton_pack_qty || 12;
    const ctnQty = boxQty * 10;
    const baseSell = parseFloat(product.selling_price) || 0;
    const baseWhole = parseFloat(product.wholesale_price || product.selling_price) || 0;
    return [
      { unit_name: 'PCS', conversion_factor: 1, retail_price: baseSell, wholesale_price: baseWhole },
      { unit_name: 'BOX', conversion_factor: boxQty, retail_price: (baseSell * boxQty).toFixed(2), wholesale_price: (baseWhole * boxQty).toFixed(2) },
      { unit_name: 'CTN', conversion_factor: ctnQty, retail_price: (baseSell * ctnQty).toFixed(2), wholesale_price: (baseWhole * boxQty * 9.5).toFixed(2) }
    ];
  };

  // 3. Cart Calculations & Totals
  const totals = cart.reduce((acc, item) => {
    const gross = item.quantity * item.unit_price;
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

  // Payment totals calculation
  const cashNum = parseFloat(cashAmount) || 0;
  const upiNum = parseFloat(upiAmount) || 0;
  const creditNum = parseFloat(creditAmount) || 0;

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
    }
  };

  // 4. Warehouse Dispatch Summary (Cartons, Boxes, Pieces)
  const dispatchSummary = cart.reduce((acc, item) => {
    const factor = item.conversion_factor || 1;
    const totalItemBase = item.quantity * factor;
    acc.totalBasePieces += totalItemBase;

    const uName = (item.unit_name || 'PCS').toUpperCase();
    if (uName === 'CTN') {
      acc.totalCartons += item.quantity;
    } else if (uName === 'BOX') {
      acc.totalBoxes += item.quantity;
    } else {
      acc.totalPieces += item.quantity;
    }
    return acc;
  }, {
    totalCartons: 0,
    totalBoxes: 0,
    totalPieces: 0,
    totalBasePieces: 0
  });

  // 5. Add / Update / Remove Items in Cart
  const addToCart = (product, requestedBatch = null, requestedUnit = null) => {
    setCart(prev => {
      const existingIndex = prev.findIndex(i => i.product_id === product.id);
      const units = getProductUnits(product);

      let defaultUnit = units.find(u => u.unit_name.toUpperCase() === 'PCS') || units[0];
      if (requestedUnit) {
        defaultUnit = units.find(u => u.unit_name.toUpperCase() === requestedUnit.toUpperCase()) || defaultUnit;
      } else if (pricingMode === 'WHOLESALE') {
        const box = units.find(u => u.unit_name.toUpperCase() === 'BOX');
        const ctn = units.find(u => u.unit_name.toUpperCase() === 'CTN');
        if (box) defaultUnit = box;
        if (ctn && (product.quantity >= ctn.conversion_factor)) defaultUnit = ctn;
      }

      const batches = product.batches && product.batches.length > 0 ? product.batches : [
        { id: 0, batch_number: product.batch_number || 'BATCH-001', expiry_date: product.expiry_date || null, stock_quantity: product.quantity }
      ];
      const validBatches = batches.filter(b => !b.is_expired);
      const chosenBatch = requestedBatch || (validBatches.length > 0 ? validBatches[0] : batches[0]);

      const initialPrice = pricingMode === 'WHOLESALE'
        ? parseFloat(defaultUnit.wholesale_price || product.wholesale_price || product.selling_price)
        : parseFloat(defaultUnit.retail_price || product.selling_price);

      if (existingIndex >= 0) {
        const item = prev[existingIndex];
        // If specific unit clicked and different from current unit, update unit and add 1
        if (requestedUnit && item.unit_name.toUpperCase() !== requestedUnit.toUpperCase()) {
          const unitObj = item.units.find(u => u.unit_name.toUpperCase() === requestedUnit.toUpperCase());
          if (unitObj) {
            const newFactor = parseFloat(unitObj.conversion_factor) || 1;
            const newUnitPrice = pricingMode === 'WHOLESALE'
              ? parseFloat(unitObj.wholesale_price || item.wholesale_price)
              : parseFloat(unitObj.retail_price || item.retail_price);
            const updated = [...prev];
            updated[existingIndex] = {
              ...item,
              unit_name: unitObj.unit_name,
              conversion_factor: newFactor,
              unit_price: newUnitPrice,
              quantity: item.quantity + 1
            };
            return updated;
          }
        }

        const newQty = item.quantity + 1;
        const neededBase = newQty * item.conversion_factor;
        if (neededBase > product.quantity) {
          alert(`Insufficient stock for "${product.name}". Available: ${product.quantity} base PCS.`);
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

  // 6. Automatic Barcode Scanner Handler
  const handleBarcodeScan = useCallback(async (rawCode) => {
    const code = (rawCode || '').trim();
    if (!code) return;

    // Prevent duplicate additions caused by scanner Enter events (within 350ms)
    const now = Date.now();
    if (lastScanRef.current.code === code && (now - lastScanRef.current.time < 350)) {
      return;
    }
    lastScanRef.current = { code, time: now };

    const norm = code.toLowerCase();

    // Step 1: Look for exact barcode match in loaded products
    let matched = products.find(p => p.barcode && String(p.barcode).trim().toLowerCase() === norm);

    // Step 2: Look for exact SKU match in loaded products
    if (!matched) {
      matched = products.find(p => p.sku && String(p.sku).trim().toLowerCase() === norm);
    }

    // Step 3: Check case-insensitive exact name match
    if (!matched) {
      matched = products.find(p => p.name && p.name.trim().toLowerCase() === norm);
    }

    // Step 4: Check partial barcode match
    if (!matched) {
      matched = products.find(p => p.barcode && String(p.barcode).toLowerCase().includes(norm));
    }

    // Step 5: If search results exist, match top candidate
    if (!matched && searchResults.length > 0) {
      const top = searchResults.find(p =>
        (p.barcode && String(p.barcode).trim().toLowerCase() === norm) ||
        (p.sku && String(p.sku).trim().toLowerCase() === norm)
      ) || searchResults[0];
      if (top && (searchResults.length === 1 || top.name.toLowerCase().includes(norm) || (top.sku && top.sku.toLowerCase().includes(norm)))) {
        matched = top;
      }
    }

    // Step 6: Query API search endpoint if not found in loaded products
    if (!matched) {
      try {
        const res = await productService.search(code, { limit: 10 });
        const apiProds = res.data?.products || [];
        matched = apiProds.find(p =>
          (p.barcode && String(p.barcode).trim().toLowerCase() === norm) ||
          (p.sku && String(p.sku).trim().toLowerCase() === norm)
        ) || (apiProds.length === 1 ? apiProds[0] : null);

        if (matched) {
          setProducts(prev => {
            if (!prev.some(p => p.id === matched.id)) {
              return [...prev, matched];
            }
            return prev;
          });
        }
      } catch {}
    }

    // Step 7: Process match or show clear not-found alert
    if (matched) {
      addToCart(matched);
      setSearch('');
      setShowSearchDropdown(false);
      setError('');
      setScanSuccess(`Added "${matched.name}" to cart`);
      setTimeout(() => setScanSuccess(''), 2500);

      // Clear input and keep it focused and ready for the next scan
      if (searchInputRef.current) {
        searchInputRef.current.value = '';
        searchInputRef.current.focus();
      }
    } else {
      setError(`Product not found for barcode: "${code}"`);
      setShowSearchDropdown(false);
      // Keep input focused ready for next scan
      if (searchInputRef.current) {
        searchInputRef.current.focus();
        searchInputRef.current.select();
      }
    }
  }, [products, searchResults, pricingMode]);

  // 7. Global Keyboard Shortcuts & USB Barcode Scanner Event Listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      // 1. Keyboard Shortcuts
      if (e.key === 'F2') {
        e.preventDefault();
        if (searchInputRef.current) {
          searchInputRef.current.focus();
          searchInputRef.current.select();
        }
        return;
      }
      if (e.key === 'F8') {
        e.preventDefault();
        handleCheckout();
        return;
      }
      if (e.key === 'Escape') {
        if (cart.length > 0) {
          if (window.confirm('Clear cart and reset current bill?')) {
            handleResetBilling();
          }
        } else {
          setShowSearchDropdown(false);
          setCustomerDropdownOpen(false);
        }
        return;
      }

      // 2. USB Barcode Scanner Detection
      const activeEl = document.activeElement;
      const isSearchInput = activeEl === searchInputRef.current;
      const isOtherInput = activeEl && activeEl !== searchInputRef.current && (
        activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'SELECT'
      );

      // Do not intercept if user is typing in another input (like rate spinbutton or quantity)
      if (isOtherInput) {
        return;
      }

      const now = Date.now();
      const timeDiff = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      // Handle Enter keypress from Scanner or Keyboard
      if (e.key === 'Enter') {
        if (isSearchInput) {
          const val = (searchInputRef.current?.value || search || '').trim();
          if (val) {
            e.preventDefault();
            scannerBufferRef.current = '';
            handleBarcodeScan(val);
            return;
          }
        }

        // If focus is elsewhere and scanner sent a rapid burst of characters (< 80ms interval)
        if (scannerBufferRef.current.length >= 2 && timeDiff < 80) {
          e.preventDefault();
          const scanned = scannerBufferRef.current.trim();
          scannerBufferRef.current = '';
          handleBarcodeScan(scanned);
          return;
        }

        scannerBufferRef.current = '';
        return;
      }

      // Collect rapid character keystrokes into barcode scanner buffer
      if (e.key && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (!isSearchInput) {
          if (timeDiff < 70) {
            scannerBufferRef.current += e.key;
          } else {
            scannerBufferRef.current = e.key;
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, selectedCustomer, cashAmount, upiAmount, creditAmount, paymentMode, orderDiscount, search, handleBarcodeScan]);

  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(i => i.product_id !== productId));
  };

  const changeQty = (productId, qty) => {
    if (qty <= 0) return removeFromCart(productId);
    setCart(prev => prev.map(item => {
      if (item.product_id !== productId) return item;
      const totalBase = qty * item.conversion_factor;
      if (totalBase > item.max_base_stock) {
        alert(`Cannot set quantity. Required: ${totalBase} PCS, Available: ${item.max_base_stock} PCS.`);
        return item;
      }
      return { ...item, quantity: qty };
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

  const changePrice = (productId, price) => {
    setCart(prev => prev.map(item => item.product_id === productId ? { ...item, unit_price: Math.max(0, price) } : item));
  };

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

  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    if (!newCustomerForm.name || !newCustomerForm.name.trim()) {
      setAddCustomerError('Customer Name is required');
      return;
    }
    setSavingCustomer(true);
    setAddCustomerError('');
    try {
      const payload = {
        name: newCustomerForm.name.trim(),
        phone: newCustomerForm.phone ? newCustomerForm.phone.trim() : null,
        customer_type: newCustomerForm.customer_type,
        address: newCustomerForm.address ? newCustomerForm.address.trim() : null,
        tax_number: newCustomerForm.tax_number ? newCustomerForm.tax_number.trim() : null
      };

      const res = await customerService.create(payload);
      const createdCustomer = res?.data?.customer || res?.customer || res?.data || res;

      await fetchCustomers();

      if (createdCustomer && createdCustomer.id) {
        handleSelectCustomer(createdCustomer);
      }

      setNewCustomerForm({
        name: '',
        phone: '',
        customer_type: 'RETAIL',
        address: '',
        tax_number: ''
      });
      setShowAddCustomerModal(false);
    } catch (err) {
      console.error('Failed to create customer:', err);
      setAddCustomerError(err.response?.data?.error?.message || err.message || 'Failed to create customer');
    } finally {
      setSavingCustomer(false);
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
        creditAmount
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
    setCreditAmount(bill.creditAmount || '');

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
    cartPersistence.clear();
    setCart([]);
    setSelectedCustomer(null);
    setOrderDiscount(0);
    setCashAmount('');
    setUpiAmount('');
    setUpiRef('');
    setCreditAmount('');
    setError('');
    setCreditWarning('');
    if (searchInputRef.current) searchInputRef.current.focus();
  };

  // 7. Complete Sale & Submit Invoice (Online & Offline Support)
  const handleCheckout = async () => {
    if (loading) return; // Prevent duplicate clicks
    if (cart.length === 0) {
      setError('Please add at least one product item to the invoice.');
      return;
    }

    // Customer selection is optional. If credit payment is chosen without a customer,
    // automatically fallback to Cash payment so the walk-in invoice saves successfully.
    const effectivePaymentMode = (!selectedCustomer && paymentMode === 'CREDIT') ? 'CASH' : paymentMode;

    const splitPayments = [];
    if (effectivePaymentMode === 'CASH') {
      splitPayments.push({ method: 'CASH', amount: grandTotal });
    } else if (effectivePaymentMode === 'UPI') {
      splitPayments.push({ method: 'UPI', amount: grandTotal, reference_number: upiRef || null });
    } else if (effectivePaymentMode === 'CREDIT') {
      splitPayments.push({ method: 'CREDIT', amount: grandTotal });
    } else if (effectivePaymentMode === 'SPLIT') {
      if (cashNum > 0) splitPayments.push({ method: 'CASH', amount: cashNum });
      if (upiNum > 0) splitPayments.push({ method: 'UPI', amount: upiNum, reference_number: upiRef || null });
      if (creditNum > 0) splitPayments.push({ method: 'CREDIT', amount: creditNum });
    }

    setError('');
    setLoading(true);

    try {
      const isSystemOnline = connectionManager.getStatus() === CONNECTION_STATUS.ONLINE;
      let createdInv = null;

      // 1. If system reports ONLINE, attempt primary server checkout
      if (isSystemOnline) {
        try {
          const idempotencyKey = generateUUID();
          const invoicePayload = {
            customer_id: selectedCustomer?.id || null,
            items: cart.map(item => ({
              product_id: item.product_id,
              batch_number: item.selected_batch,
              unit_name: item.unit_name,
              quantity: item.quantity,
              free_quantity: 0,
              unit_price: item.unit_price,
              discount_percent: 0
            })),
            order_discount: orderDisc,
            payment_mode: effectivePaymentMode,
            payment_method: effectivePaymentMode === 'SPLIT' ? 'CASH' : effectivePaymentMode,
            paid_amount: effectivePaymentMode === 'CREDIT' ? 0 : grandTotal,
            payments: splitPayments,
            idempotency_key: idempotencyKey
          };

          const res = await invoiceService.create(invoicePayload);
          createdInv = res.data?.invoice || res.data?.sale;
        } catch (onlineErr) {
          // If server rejects with validation or auth error (4xx), do not fallback
          if (onlineErr.response && onlineErr.response.status >= 400 && onlineErr.response.status < 500) {
            setError(onlineErr.response?.data?.message || 'Invoice processing failed.');
            setLoading(false);
            return;
          }
          // Server error, database offline, or network disconnect: seamlessly proceed to offline checkout
          console.warn('[Checkout] Online checkout failed, falling back to offline checkout:', onlineErr);
          connectionManager.checkHealth();
        }
      }

      // 2. Offline Checkout Fallback (or direct offline when disconnected)
      if (!createdInv) {
        createdInv = await offlineInvoiceManager.createOfflineInvoice({
          cart,
          selectedCustomer,
          pricingMode,
          orderDiscount: orderDisc,
          paymentMode: effectivePaymentMode,
          splitPayments,
          cashAmount: cashNum,
          upiAmount: upiNum,
          upiRef,
          creditAmount: creditNum,
          business,
          user
        });
      }

      setSuccessInvoice(createdInv);
      fetchProducts();
      handleResetBilling();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Invoice processing failed.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrintReceipt = () => {
    const invoiceEl = document.getElementById('invoice-print-area');
    if (!invoiceEl) return;

    // 1. Clean up any previous direct print container
    let directContainer = document.getElementById('invoice-print-direct-container');
    if (directContainer) {
      directContainer.remove();
    }

    // 2. Create dedicated direct print container mounted directly on document.body
    directContainer = document.createElement('div');
    directContainer.id = 'invoice-print-direct-container';
    directContainer.appendChild(invoiceEl.cloneNode(true));
    document.body.appendChild(directContainer);

    // 3. Inject print styles with dynamic @page sizing and strict isolation
    let style = document.getElementById('print-page-style');
    if (!style) {
      style = document.createElement('style');
      style.id = 'print-page-style';
      document.head.appendChild(style);
    }

    const isThermal = printLayout === 'thermal';
    const pageRule = isThermal
      ? '@page { size: 80mm auto; margin: 0; }'
      : '@page { size: A4 portrait; margin: 8mm; }';

    style.innerHTML = `
      ${pageRule}

      /* Screen: Never display the direct print container on screen */
      @media screen {
        #invoice-print-direct-container {
          display: none !important;
        }
      }

      /* Print: Strictly hide EVERYTHING except the dedicated direct print container */
      @media print {
        html, body {
          height: auto !important;
          min-height: 0 !important;
          overflow: visible !important;
          margin: 0 !important;
          padding: 0 !important;
          background: #ffffff !important;
        }

        /* HIDE the entire application tree, modal, backdrop, headers, dashboard */
        body > *:not(#invoice-print-direct-container) {
          display: none !important;
        }

        /* SHOW ONLY the dedicated invoice container */
        #invoice-print-direct-container {
          display: block !important;
          position: static !important;
          margin: 0 auto !important;
          padding: 0 !important;
          background: #ffffff !important;
          width: ${isThermal ? '72mm' : '100%'} !important;
          max-width: ${isThermal ? '72mm' : '190mm'} !important;
        }

        #invoice-print-direct-container #invoice-print-area {
          display: block !important;
          position: static !important;
          width: 100% !important;
          max-width: 100% !important;
          margin: 0 auto !important;
          padding: ${isThermal ? '2mm 0' : '0'} !important;
          border: none !important;
          box-shadow: none !important;
          background: #ffffff !important;
        }

        #invoice-print-direct-container table {
          width: 100% !important;
          table-layout: fixed !important;
        }

        #invoice-print-direct-container tr {
          page-break-inside: avoid !important;
        }

        .print-thermal {
          width: 72mm !important;
          max-width: 72mm !important;
          font-size: 11px !important;
          margin: 0 auto !important;
        }

        .print-a4 {
          width: 190mm !important;
          max-width: 190mm !important;
          font-size: 13px !important;
          margin: 0 auto !important;
        }
      }
    `;

    // 4. Cleanup function after print dialog closes or cancels
    const cleanup = () => {
      const container = document.getElementById('invoice-print-direct-container');
      if (container) container.remove();
      const s = document.getElementById('print-page-style');
      if (s) s.remove();
      window.removeEventListener('afterprint', cleanup);
    };

    window.addEventListener('afterprint', cleanup);

    // 5. Brief timeout to allow browser layout to stabilize before opening print preview
    setTimeout(() => {
      window.print();
    }, 100);
  };

  return (
    <div className="pos-root flex flex-col h-[calc(100vh-80px)] font-sans select-none space-y-2.5 bg-[#F8F8F8]">
      {/* =========================================================================
          TOP HEADER: Invoice ID | Time | Payment Method Toggles | Customer Tier
      ========================================================================= */}
      <header className="no-print bg-[#0B1120] text-white rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-sm border border-[#D4AF37]/30">
        {/* Left: Invoice ID, Live Time & Connection Status */}
        <div className="flex items-center gap-3">
          <span className="font-mono font-bold text-sm text-[#D4AF37] tracking-wider">
            {invoiceNumberRef.current}
          </span>
          <div className="flex items-center gap-1.5 text-xs text-slate-300 font-mono">
            <Clock className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>{currentTime}</span>
          </div>
          <ConnectionBadge />
        </div>

        {/* Right: Wholesale vs Retail Tier Switcher & Held Bills */}
        <div className="flex items-center gap-3">
          <div className="inline-flex rounded-lg border border-[#D4AF37]/40 p-0.5 bg-[#162038]">
            <button
              type="button"
              onClick={() => applyPricingTier('WHOLESALE')}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                pricingMode === 'WHOLESALE'
                  ? 'bg-[#D4AF37] text-[#0B1120] shadow-xs'
                  : 'text-slate-300 hover:text-[#D4AF37]'
              }`}
            >
              Wholesale Tier
            </button>
            <button
              type="button"
              onClick={() => applyPricingTier('RETAIL')}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                pricingMode === 'RETAIL'
                  ? 'bg-[#D4AF37] text-[#0B1120] shadow-xs'
                  : 'text-slate-300 hover:text-[#D4AF37]'
              }`}
            >
              Retail Tier
            </button>
          </div>

          {heldBills.length > 0 && (
            <button
              type="button"
              onClick={() => setShowHeldModal(true)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-300 font-semibold text-xs hover:bg-amber-500/20 transition-colors"
            >
              <PauseCircle className="w-3.5 h-3.5" />
              <span>Held ({heldBills.length})</span>
            </button>
          )}

          <div className="hidden md:flex items-center gap-2 pl-3 border-l border-slate-700">
            <div className="w-6 h-6 rounded-full bg-[#D4AF37] text-[#0B1120] font-bold text-xs flex items-center justify-center">
              {(user?.name || 'A').charAt(0).toUpperCase()}
            </div>
            <span className="text-xs text-slate-200 font-semibold truncate max-w-[120px]">
              {user?.name || 'Cashier'}
            </span>
          </div>
        </div>
      </header>

      {/* Scan Success Confirmation Banner */}
      {scanSuccess && (
        <div className="no-print flex items-center justify-between gap-3 bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-2 rounded-xl text-xs shrink-0 shadow-2xs">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
            <span className="font-semibold">{scanSuccess}</span>
          </div>
          <button type="button" onClick={() => setScanSuccess('')} className="text-emerald-500 hover:text-emerald-800 p-1">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Error Alert Banner */}
      {error && (
        <div className="no-print flex items-center justify-between gap-3 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-2 rounded-xl text-xs shrink-0 shadow-2xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span className="font-semibold">{error}</span>
          </div>
          <button type="button" onClick={() => setError('')} className="text-rose-400 hover:text-rose-700 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* =========================================================================
          MAIN WORKSPACE (SPLIT TWO SECTIONS)
          Left Section: Category Tabs | Search | Product Cards (~40%)
          Right Section: Billing Items Table | Bottom Billing Panel (~60%)
      ========================================================================= */}
      <div className="no-print flex-1 grid grid-cols-12 gap-3 min-h-0 overflow-hidden">
        {/* =======================================================================
            LEFT SECTION: PRODUCT CATALOG & CATEGORIES (~40% / 5 cols)
        ======================================================================= */}
        <section className="col-span-12 lg:col-span-5 flex flex-col bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
          {/* 1. Category Tabs */}
          <div className="flex items-center gap-1.5 p-2 bg-[#0B1120] border-b border-[#D4AF37]/30 overflow-x-auto no-scrollbar shrink-0">
            <button
              type="button"
              onClick={() => setFilterCategory('')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                !filterCategory
                  ? 'bg-[#D4AF37] text-[#0B1120] shadow-xs'
                  : 'bg-[#162038] text-slate-300 hover:text-white hover:bg-[#1E2B4A]'
              }`}
            >
              All
            </button>
            {allCategories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setFilterCategory(String(filterCategory) === String(c.id) ? '' : c.id)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                  String(filterCategory) === String(c.id)
                    ? 'bg-[#D4AF37] text-[#0B1120] shadow-xs'
                    : 'bg-[#162038] text-slate-300 hover:text-white hover:bg-[#1E2B4A]'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>

          {/* 2. Barcode / Product Search Input */}
          <div className="p-2.5 bg-white border-b border-slate-200/90 shrink-0">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
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
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const code = (search || e.target.value || '').trim();
                    if (code) {
                      handleBarcodeScan(code);
                    }
                  }
                }}
                placeholder="Scan Barcode or Search (e.g. Pepsi, Bovonto, Coke)... [F2]"
                className="w-full pl-9 pr-12 py-2 bg-[#F8F8F8] border border-slate-200 rounded-lg text-xs font-medium text-[#0B1120] placeholder-slate-400 focus:bg-white focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] focus:outline-none transition-all shadow-[inset_0_1px_2px_rgba(11,17,32,0.02)]"
              />
              <span className="absolute right-2.5 px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded text-[10px] font-mono font-bold">
                F2
              </span>
            </div>

            {/* Quick search drop results */}
            {showSearchDropdown && search.trim() && searchResults.length > 0 && (
              <div className="absolute left-4 right-4 mt-1 bg-white border border-[#D4AF37]/40 rounded-xl shadow-lg z-50 max-h-60 overflow-y-auto py-1">
                {searchResults.map((prod) => (
                  <button
                    key={prod.id}
                    type="button"
                    onClick={() => addToCart(prod)}
                    className="w-full text-left px-3.5 py-2 text-xs hover:bg-[#FAF5E8] border-b border-slate-50 last:border-0 flex items-center justify-between"
                  >
                    <div>
                      <span className="font-bold text-[#0B1120]">{prod.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono ml-2">[{prod.sku}]</span>
                    </div>
                    <span className="font-mono font-bold text-[#0B1120]">
                      {currency}{pricingMode === 'WHOLESALE' && prod.wholesale_price ? prod.wholesale_price : prod.selling_price}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 3. Product Cards in List / Grid Layout */}
          <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
            {loadingProducts ? (
              <div className="space-y-2">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-24 rounded-lg bg-slate-100 animate-pulse border border-slate-200" />
                ))}
              </div>
            ) : displayedProducts.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-400">
                <Package className="w-10 h-10 text-slate-300 mb-2" />
                <p className="text-xs font-bold text-slate-700">
                  {filterCategory ? 'No products found in this category' : 'No products found'}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {filterCategory
                    ? 'Try selecting another category or click "All" to view all items.'
                    : 'Try clearing your search query.'}
                </p>
              </div>
            ) : (
              displayedProducts.map((p) => {
                const units = getProductUnits(p);
                const ctnUnit = units.find(u => u.unit_name === 'CTN') || units[0];
                const boxUnit = units.find(u => u.unit_name === 'BOX') || units[1] || units[0];
                const isOutOfStock = p.quantity <= 0;

                const displayPrice = pricingMode === 'WHOLESALE' && ctnUnit.wholesale_price
                  ? ctnUnit.wholesale_price
                  : ctnUnit.retail_price;

              return (
                  <div
                    key={p.id}
                    className={`bg-white rounded-xl border border-slate-200 hover:border-[#D4AF37]/60 shadow-[0_1px_4px_rgba(11,17,32,0.03)] hover:shadow-md transition-all p-3 space-y-2 ${
                      isOutOfStock ? 'opacity-60 bg-slate-50' : ''
                    }`}
                  >
                    {/* Top Row: SKU code (NO BRAND BADGE) & GST Badge */}
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono text-[11px] font-semibold text-slate-500">
                        {p.barcode || p.sku}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 font-mono">
                        GST {p.tax_rate || 0}%
                      </span>
                    </div>

                    {/* Middle Row: Minimal Product Icon, Product Name & Packing Ratio */}
                    <div
                      onClick={() => !isOutOfStock && addToCart(p)}
                      className="cursor-pointer group flex items-start gap-2.5"
                    >
                      <div className="w-8 h-8 rounded-lg bg-[#FAF5E8] border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37] shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                        <Box className="w-4 h-4 text-[#D4AF37]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-bold text-[#0B1120] group-hover:text-[#B89326] transition-colors leading-snug">
                          {p.name}
                        </h4>
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                          Ratio: 1 CTN = {ctnUnit.conversion_factor} Pcs | 1 BOX = {boxUnit.conversion_factor} Pcs
                        </p>
                      </div>
                    </div>

                    {/* Bottom Row: Price & Unit on Left, Quantity Add Buttons on Right */}
                    <div className="flex items-center justify-between pt-1.5 border-t border-slate-100">
                      <div>
                        <span className="text-sm font-extrabold font-mono text-[#D4AF37]">
                          {currency}{parseFloat(displayPrice || 0).toFixed(0)}
                        </span>
                        <span className="text-[11px] text-slate-500 font-medium ml-1">
                          / {ctnUnit.unit_name || 'CTN'}
                        </span>
                      </div>

                      {/* Quantity Add Buttons: +PCS, +BOX, + CTN */}
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => addToCart(p, null, 'PCS')}
                          disabled={isOutOfStock}
                          className="px-2.5 py-1 text-[11px] font-bold rounded-md bg-[#0B1120] text-white hover:bg-[#162038] transition-colors disabled:opacity-40"
                        >
                          +PCS
                        </button>
                        <button
                          type="button"
                          onClick={() => addToCart(p, null, 'BOX')}
                          disabled={isOutOfStock}
                          className="px-2.5 py-1 text-[11px] font-bold rounded-md bg-[#0B1120] text-white hover:bg-[#162038] transition-colors disabled:opacity-40"
                        >
                          +BOX
                        </button>
                        <button
                          type="button"
                          onClick={() => addToCart(p, null, 'CTN')}
                          disabled={isOutOfStock}
                          className="px-3 py-1 text-[11px] font-extrabold rounded-md bg-[#D4AF37] text-[#0B1120] hover:bg-[#B89326] transition-colors shadow-xs disabled:opacity-40"
                        >
                          + CTN
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* =======================================================================
            RIGHT SECTION: BILLING ITEMS TABLE & BOTTOM BILLING PANEL (~60% / 7 cols)
        ======================================================================= */}
        <section className="col-span-12 lg:col-span-7 flex flex-col bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
          {/* Customer Selection Row */}
          <div className="p-2.5 border-b border-slate-200/90 bg-[#FAF5E8]/30 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <div className="relative flex-1">
                {!selectedCustomer ? (
                  <div>
                    <div className="flex items-center border border-slate-200 rounded-lg bg-white px-2.5 py-1.5 focus-within:border-[#D4AF37] shadow-2xs">
                      <User className="w-3.5 h-3.5 text-slate-400 mr-2 shrink-0" />
                      <input
                        type="text"
                        value={customerSearch}
                        onChange={(e) => {
                          setCustomerSearch(e.target.value);
                          setCustomerDropdownOpen(true);
                        }}
                        onFocus={() => setCustomerDropdownOpen(true)}
                        placeholder="Search Customer (Name or Phone)..."
                        className="w-full text-xs bg-transparent text-[#0B1120] placeholder-slate-400 focus:outline-none"
                      />
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1 shrink-0" />
                    </div>

                    {customerDropdownOpen && customers.length > 0 && (
                      <div className="absolute left-0 top-full mt-1 w-full bg-white border border-[#D4AF37]/40 rounded-xl shadow-lg z-50 max-h-52 overflow-y-auto py-1">
                        {customers.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => handleSelectCustomer(c)}
                            className="w-full text-left px-3 py-2 text-xs hover:bg-[#FAF5E8] border-b border-slate-50 last:border-0 flex items-center justify-between"
                          >
                            <div>
                              <p className="font-bold text-[#0B1120]">{c.name}</p>
                              <p className="text-[10px] text-slate-500 font-mono">{c.phone || 'Walk-in'}</p>
                            </div>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#0B1120] text-[#D4AF37]">
                              {c.customer_type || 'RETAIL'}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-between bg-white border border-[#D4AF37]/50 rounded-lg px-2.5 py-1 shadow-2xs">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#0B1120]">{selectedCustomer.name}</span>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#0B1120] text-[#D4AF37]">
                        {selectedCustomer.customer_type || 'RETAIL'}
                      </span>
                      {selectedCustomer.phone && (
                        <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
                          ({selectedCustomer.phone})
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedCustomer(null)}
                      title="Clear Customer"
                      className="p-1 text-slate-400 hover:text-rose-600 rounded"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* + Add Customer Button */}
              <button
                type="button"
                onClick={() => {
                  setAddCustomerError('');
                  setShowAddCustomerModal(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#D4AF37] text-[#0B1120] hover:bg-[#B89326] transition-colors shadow-xs whitespace-nowrap shrink-0 cursor-pointer"
                title="Add New Customer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ Add Customer</span>
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="font-bold text-slate-500 font-mono">
                {cart.length} {cart.length === 1 ? 'item' : 'items'}
              </span>
            </div>
          </div>

          {/* 1. Billing Items Table */}
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#0B1120] text-slate-200 font-bold sticky top-0 z-10 text-[11px] tracking-wide uppercase">
                <tr>
                  <th className="w-8 py-2.5 px-3 text-left">#</th>
                  <th className="py-2.5 px-3 text-left">ITEM DESCRIPTION</th>
                  <th className="w-28 py-2.5 px-2 text-center">PACK UNIT</th>
                  <th className="w-16 py-2.5 px-2 text-center">QTY</th>
                  <th className="w-24 py-2.5 px-2 text-right">RATE ({currency})</th>
                  <th className="w-16 py-2.5 px-2 text-center">GST</th>
                  <th className="w-24 py-2.5 px-3 text-right">TOTAL ({currency})</th>
                  <th className="w-10 py-2.5 px-2 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {cart.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-16 text-center text-slate-400">
                      <ShoppingCart className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs font-bold text-slate-600">Cart is empty</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Click any product or quantity button (+PCS, +BOX, + CTN) to add items.
                      </p>
                    </td>
                  </tr>
                ) : (
                  cart.map((item, idx) => {
                    const gross = item.quantity * item.unit_price;
                    const tax = gross * ((item.tax_rate || 0) / 100);
                    const lineTotal = gross + tax;

                  return (
                      <tr key={item.product_id} className="hover:bg-[#FAF5E8]/30 transition-colors">
                        {/* Index */}
                        <td className="py-2 px-3 text-slate-400 font-mono">{idx + 1}</td>

                        {/* Item Description (NO BRAND BADGE) */}
                        <td className="py-2 px-3">
                          <div className="font-bold text-[#0B1120] text-xs leading-snug">{item.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">{item.sku}</div>
                        </td>

                        {/* Pack Unit Selector */}
                        <td className="py-2 px-2 text-center">
                          <select
                            value={item.unit_name}
                            onChange={(e) => changeUnit(item.product_id, e.target.value)}
                            className="text-[11px] font-bold border border-slate-200 rounded px-2 py-1 bg-white text-[#0B1120] focus:border-[#D4AF37] focus:outline-none"
                          >
                            {item.units.map((u) => (
                              <option key={u.unit_name} value={u.unit_name}>
                                {u.unit_name} ({u.conversion_factor})
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Quantity */}
                        <td className="py-2 px-2 text-center">
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => changeQty(item.product_id, parseInt(e.target.value, 10) || 1)}
                            className="w-14 text-center text-xs font-bold border border-slate-200 rounded py-1 font-mono focus:border-[#D4AF37] focus:outline-none"
                          />
                        </td>

                        {/* Rate */}
                        <td className="py-2 px-2 text-right">
                          <input
                            type="number"
                            role="spinbutton"
                            value={item.unit_price}
                            onChange={(e) => changePrice(item.product_id, parseFloat(e.target.value) || 0)}
                            className="w-20 text-right text-xs font-bold font-mono border border-slate-200 rounded px-1.5 py-1 focus:border-[#D4AF37] focus:outline-none"
                          />
                        </td>

                        {/* GST */}
                        <td className="py-2 px-2 text-center">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 font-mono">
                            {item.tax_rate}%
                          </span>
                        </td>

                        {/* Total */}
                        <td className="py-2 px-3 text-right font-mono font-bold text-xs text-[#0B1120]">
                          {lineTotal.toFixed(2)}
                        </td>

                        {/* Remove Action */}
                        <td className="py-2 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => removeFromCart(item.product_id)}
                            className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors"
                            title="Remove item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* =====================================================================
              BOTTOM BILLING SECTION
              1. Dispatch Packs Summary & Taxable / GST / Round Off
              2. Grand Total Box & Action Buttons (Clear, Hold Bill, Print, Complete Sale)
          ===================================================================== */}
          <div className="border-t border-slate-200/90 bg-white p-3 space-y-2.5 shrink-0 shadow-sm">
            {/* Row 1: Dispatch Packs & Tax Summary Strip */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs border-b border-slate-100 pb-2">
              {/* 1. Dispatch Packs Summary */}
              <div className="flex items-center gap-2">
                <span className="text-[#0B1120] font-bold flex items-center gap-1.5 text-xs">
                  <Boxes className="w-4 h-4 text-[#D4AF37]" /> Dispatch Packs:
                </span>
                <span className="px-2.5 py-0.5 rounded-md bg-[#0B1120] text-[#D4AF37] font-bold font-mono text-xs border border-[#D4AF37]/30">
                  {dispatchSummary.totalCartons} Cartons
                </span>
                <span className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold font-mono text-xs border border-slate-200">
                  {dispatchSummary.totalBoxes} Boxes
                </span>
                <span className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold font-mono text-xs border border-slate-200">
                  {dispatchSummary.totalPieces} Pcs
                </span>
              </div>

              {/* Taxable, GST Tax, Round Off */}
              <div className="flex items-center gap-4 text-xs font-mono">
                <span className="text-slate-600">
                  Taxable: <strong className="text-[#0B1120] font-bold">{currency}{totals.subtotal.toFixed(2)}</strong>
                </span>
                <span className="text-slate-600">
                  GST Tax: <strong className="text-[#0B1120] font-bold">{currency}{totals.taxTotal.toFixed(2)}</strong>
                </span>
                <span className="text-slate-600">
                  Round Off: <strong className="text-[#0B1120] font-bold">{roundOff}</strong>
                </span>
              </div>
            </div>

            {/* Row 2: Grand Total Display Box & Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Grand Total Box */}
              <div className="bg-[#0B1120] border border-[#D4AF37]/40 rounded-xl px-5 py-2 flex flex-col justify-center min-w-[170px] shadow-sm">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  GRAND TOTAL
                </span>
                <span className="text-2xl font-extrabold font-mono text-[#D4AF37] leading-tight">
                  {currency}{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                </span>
              </div>

              {/* Action Buttons: Clear | Hold Bill | Print | Complete Sale */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* 6. Clear Button */}
                <button
                  type="button"
                  onClick={() => {
                    if (cart.length > 0 && window.confirm('Clear cart and reset current bill?')) {
                      handleResetBilling();
                    } else if (cart.length > 0) {
                      handleResetBilling();
                    }
                  }}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors shadow-2xs"
                >
                  Clear
                </button>

                {/* 7. Hold Bill Button */}
                <button
                  type="button"
                  onClick={handleHoldBill}
                  disabled={cart.length === 0}
                  className="px-4 py-2.5 rounded-xl border border-slate-700 bg-[#0B1120] hover:bg-[#162038] text-[#D4AF37] font-bold text-xs transition-colors disabled:opacity-50 shadow-2xs flex items-center gap-1.5"
                >
                  <PauseCircle className="w-4 h-4 text-[#D4AF37]" />
                  <span>Hold Bill</span>
                </button>

                {/* 8. Payment Method Pills: Credit | Cash | UPI */}
                <div className="inline-flex rounded-lg border border-slate-700 p-0.5 bg-[#0B1120]">
                  <button
                    type="button"
                    onClick={() => setPaymentModeDirect('CREDIT')}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                      paymentMode === 'CREDIT'
                        ? 'bg-[#D4AF37] text-[#0B1120] shadow-xs'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    Credit
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentModeDirect('CASH')}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                      paymentMode === 'CASH'
                        ? 'bg-[#D4AF37] text-[#0B1120] shadow-xs'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    Cash
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentModeDirect('UPI')}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                      paymentMode === 'UPI'
                        ? 'bg-[#D4AF37] text-[#0B1120] shadow-xs'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    UPI
                  </button>
                </div>

                {/* 9. Complete Sale / Payment Action */}
                <button
                  type="button"
                  role="button"
                  onClick={handleCheckout}
                  disabled={loading || cart.length === 0}
                  className="px-6 py-2.5 rounded-xl bg-[#D4AF37] hover:bg-[#B89326] text-[#0B1120] font-extrabold text-sm transition-all shadow-gold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 active:scale-[0.99]"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Complete Sale [F8]</span>
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* =========================================================================
          MODALS: Success Invoice & Parked / Held Bills
      ========================================================================= */}
      {successInvoice && (
        <Modal
          isOpen={!!successInvoice}
          onClose={() => setSuccessInvoice(null)}
          title={`Invoice Generated #${successInvoice.invoice_number}`}
          size="xl"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 no-print">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500">Print Format:</span>
                <div className="inline-flex rounded-xl border border-slate-200 p-0.5 bg-slate-100">
                  <button
                    type="button"
                    onClick={() => setPrintLayout('thermal')}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                      printLayout === 'thermal' ? 'bg-white text-[#0B1120] shadow-xs font-bold' : 'text-slate-600'
                    }`}
                  >
                    3-Inch Thermal Receipt
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrintLayout('a4')}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                      printLayout === 'a4' ? 'bg-white text-[#0B1120] shadow-xs font-bold' : 'text-slate-600'
                    }`}
                  >
                    A4 Tax Invoice
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" icon={Printer} onClick={handlePrintReceipt} size="sm">
                  Print
                </Button>
                <Button onClick={() => setSuccessInvoice(null)} size="sm">
                  New Sale
                </Button>
              </div>
            </div>

            {/* Dynamic Enterprise Invoice Document (Thermal / A4) */}
            <div className="receipt-preview-container max-h-[65vh] overflow-y-auto p-4 bg-slate-100 rounded-xl flex justify-center">
              <InvoiceDocument
                invoice={successInvoice}
                printLayout={printLayout}
                business={business}
                selectedCustomer={selectedCustomer}
                pricingMode={pricingMode}
                currency={currency}
              />
            </div>
          </div>
        </Modal>
      )}

      {/* Held Bills Modal */}
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
                    <Button size="sm" onClick={() => handleResumeBill(bill)} className="text-xs py-1">
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

      {/* Add Customer Modal */}
      {showAddCustomerModal && (
        <Modal
          isOpen={showAddCustomerModal}
          onClose={() => {
            if (!savingCustomer) {
              setShowAddCustomerModal(false);
              setAddCustomerError('');
            }
          }}
          title="Add New Customer"
          size="md"
        >
          <form onSubmit={handleCreateCustomer} className="space-y-4">
            {addCustomerError && (
              <div className="bg-rose-50 text-rose-700 text-xs px-3 py-2 rounded-lg border border-rose-200">
                {addCustomerError}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Customer Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={newCustomerForm.name}
                onChange={(e) => setNewCustomerForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. Ramesh Kumar / Sai Traders"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#D4AF37] focus:border-[#D4AF37]"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mobile Number
                </label>
                <input
                  type="tel"
                  value={newCustomerForm.phone}
                  onChange={(e) => setNewCustomerForm((prev) => ({ ...prev, phone: e.target.value }))}
                  placeholder="e.g. 9876543210"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#D4AF37] focus:border-[#D4AF37]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Customer Type <span className="text-rose-500">*</span>
                </label>
                <select
                  value={newCustomerForm.customer_type}
                  onChange={(e) => setNewCustomerForm((prev) => ({ ...prev, customer_type: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#D4AF37] focus:border-[#D4AF37] bg-white"
                >
                  <option value="RETAIL">Retail Customer</option>
                  <option value="WHOLESALE">Wholesale Customer</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Address
              </label>
              <textarea
                rows={2}
                value={newCustomerForm.address}
                onChange={(e) => setNewCustomerForm((prev) => ({ ...prev, address: e.target.value }))}
                placeholder="Shop / House No, Street, City, State..."
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#D4AF37] focus:border-[#D4AF37] resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                GSTIN <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                maxLength={15}
                value={newCustomerForm.tax_number}
                onChange={(e) => setNewCustomerForm((prev) => ({ ...prev, tax_number: e.target.value.toUpperCase() }))}
                placeholder="e.g. 33AAAAA0000A1Z5"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#D4AF37] focus:border-[#D4AF37] uppercase"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowAddCustomerModal(false);
                  setAddCustomerError('');
                }}
                disabled={savingCustomer}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={savingCustomer}
                className="bg-[#D4AF37] text-[#0B1120] hover:bg-[#B89326] font-bold"
              >
                {savingCustomer ? 'Saving...' : 'Save & Select Customer'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

export default POSPage;
