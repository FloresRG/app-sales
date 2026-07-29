export interface SaleDetail {
  product: string;
  quantity: number;
  subtotal: number;
}

export interface Sale {
  id: number;
  total: number;
  created_at: string;
  details: SaleDetail[];
}

export interface SaleItem {
  product_id: number;
  quantity: number;
}

export interface CreateSaleRequest {
  user_id: number;
  items: SaleItem[];
}

export interface CreateSaleResponse {
  message: string;
  sale_id: number;
  total: number;
}

export interface DeleteSaleResponse {
  message: string;
}
