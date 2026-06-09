// Products are provided by ProductsProvider (a single fetch + a single realtime
// subscription for the whole app). This re-export keeps existing
// `@/hooks/useProducts` import paths working.
export { useProducts } from '@/context/ProductsContext';
