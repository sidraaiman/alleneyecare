import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { Product } from '../data/products';

// A lens package key (see data/lenses.ts). Widened from a fixed union so the
// lens wizard can offer tiered packages (blue-cut, thin, premium, …).
export type LensType = string;

/**
 * A cart line is identified by product + lens type, so the same frame can be
 * added with different lenses without silently merging into one line (which
 * would bill the customer for the wrong lens).
 */
export function cartLineKey(productId: string, lensType: LensType): string {
  return `${productId}::${lensType}`;
}

export interface CartItem {
  product: Product;
  quantity: number;
  lensType: LensType;
  hasPower: boolean;
  prescription?: string;
}

interface CartState {
  items: CartItem[];
  wishlist: string[];
}

type CartAction =
  | { type: 'ADD_ITEM'; payload: CartItem }
  | { type: 'REMOVE_ITEM'; payload: string } // payload = cart line key
  | { type: 'UPDATE_QUANTITY'; payload: { key: string; quantity: number } }
  | { type: 'TOGGLE_WISHLIST'; payload: string }
  | { type: 'CLEAR_CART' }
  | { type: 'SET_CART'; payload: { items: CartItem[]; wishlist: string[] } };

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM': {
      const existing = state.items.findIndex(
        i => i.product.id === action.payload.product.id && i.lensType === action.payload.lensType
      );
      if (existing >= 0) {
        const updated = [...state.items];
        updated[existing] = { ...updated[existing], quantity: updated[existing].quantity + 1 };
        return { ...state, items: updated };
      }
      return { ...state, items: [...state.items, action.payload] };
    }
    case 'REMOVE_ITEM':
      return {
        ...state,
        items: state.items.filter(i => cartLineKey(i.product.id, i.lensType) !== action.payload),
      };
    case 'UPDATE_QUANTITY':
      return {
        ...state,
        items: state.items.map(i =>
          cartLineKey(i.product.id, i.lensType) === action.payload.key
            ? { ...i, quantity: action.payload.quantity }
            : i
        ),
      };
    case 'TOGGLE_WISHLIST':
      return {
        ...state,
        wishlist: state.wishlist.includes(action.payload)
          ? state.wishlist.filter(id => id !== action.payload)
          : [...state.wishlist, action.payload],
      };
    case 'CLEAR_CART':
      return { ...state, items: [] };
    case 'SET_CART':
      return action.payload;
    default:
      return state;
  }
}

interface CartContextValue {
  items: CartItem[];
  wishlist: string[];
  totalItems: number;
  totalPrice: number;
  addItem: (item: CartItem) => void;
  removeItem: (lineKey: string) => void;
  updateQuantity: (lineKey: string, quantity: number) => void;
  toggleWishlist: (id: string) => void;
  clearCart: () => void;
  setCart: (cart: { items: CartItem[]; wishlist: string[] }) => void;
  isInWishlist: (id: string) => boolean;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, { items: [], wishlist: [] });

  const totalItems = state.items.reduce((sum, i) => sum + i.quantity, 0);
  const totalPrice = state.items.reduce((sum, i) => sum + i.product.price * i.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items: state.items,
        wishlist: state.wishlist,
        totalItems,
        totalPrice,
        addItem: item => dispatch({ type: 'ADD_ITEM', payload: item }),
        removeItem: lineKey => dispatch({ type: 'REMOVE_ITEM', payload: lineKey }),
        updateQuantity: (lineKey, quantity) =>
          dispatch({ type: 'UPDATE_QUANTITY', payload: { key: lineKey, quantity } }),
        toggleWishlist: id => dispatch({ type: 'TOGGLE_WISHLIST', payload: id }),
        clearCart: () => dispatch({ type: 'CLEAR_CART' }),
        setCart: cart => dispatch({ type: 'SET_CART', payload: cart }),
        isInWishlist: id => state.wishlist.includes(id),
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
