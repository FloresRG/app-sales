import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators, AbstractControl } from '@angular/forms';
import { Router } from '@angular/router';
import { Product } from '../../core/models/product.model';
import { CreateSaleRequest, SaleItem } from '../../core/models/sale.model';
import { ProductService } from '../../core/services/product.service';
import { SaleService } from '../../core/services/sale.service';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-sale-form',
  templateUrl: './sale-form.component.html',
  styleUrls: ['./sale-form.component.scss']
})
export class SaleFormComponent implements OnInit {
  products: Product[] = [];
  searchTerm: string = '';
  form: FormGroup;
  submitting: boolean = false;
  loadingProducts: boolean = false;
  mobileCartOpen: boolean = false;

  toggleMobileCart(): void {
    this.mobileCartOpen = !this.mobileCartOpen;
  }

  constructor(
    private fb: FormBuilder,
    private productService: ProductService,
    private saleService: SaleService,
    private router: Router,
    private messageService: MessageService
  ) {
    this.form = this.fb.group({
      items: this.fb.array([])
    });
  }

  ngOnInit(): void {
    this.loadProducts();
  }

  get items(): FormArray {
    return this.form.get('items') as FormArray;
  }

  getItemGroup(index: number): FormGroup {
    return this.items.at(index) as FormGroup;
  }

  getProductControl(index: number): AbstractControl {
    return this.getItemGroup(index).get('product_id')!;
  }

  getQuantityControl(index: number): AbstractControl {
    return this.getItemGroup(index).get('quantity')!;
  }

  get filteredProducts(): Product[] {
    if (!this.searchTerm) return this.products;
    const term = this.searchTerm.toLowerCase();
    return this.products.filter(p => p.name.toLowerCase().includes(term));
  }

  loadProducts(): void {
    this.loadingProducts = true;
    this.productService.getProducts().subscribe({
      next: (data: Product[]) => {
        // Mostramos todos los productos para que el usuario sepa que existen,
        // pero validaremos al hacer click.
        this.products = data;
        this.loadingProducts = false;
        this.restoreCartFromStorage();
      },
      error: () => {
        this.loadingProducts = false;
        this.showToast('error', 'Error', 'No se pudo cargar los productos');
      }
    });
  }

  private saveCartToStorage(): void {
    localStorage.setItem('posCart', JSON.stringify(this.form.value.items));
  }

  private restoreCartFromStorage(): void {
    const saved = localStorage.getItem('posCart');
    if (saved) {
      try {
        const items = JSON.parse(saved);
        items.forEach((item: any) => {
          const product = this.getProductById(item.product_id);
          if (product) {
            const finalQty = Math.min(item.quantity, product.stock);
            if (finalQty > 0) {
              const itemGroup = this.fb.group({
                product_id: [item.product_id, [Validators.required]],
                quantity: [finalQty, [Validators.required, Validators.min(1)]]
              });
              this.items.push(itemGroup);
            }
          }
        });
      } catch(e) {
        console.error('Error parsing cart from storage', e);
      }
    }
    
    // Suscribirnos a los cambios para autoguardar
    this.form.valueChanges.subscribe(() => {
      this.saveCartToStorage();
    });
  }

  addToCart(product: Product): void {
    if (product.stock <= 0) {
      this.showToast('error', 'Sin stock', `No hay unidades disponibles de ${product.name}`);
      return;
    }

    const index = this.items.controls.findIndex(
      (ctrl) => (ctrl as FormGroup).get('product_id')?.value === product.id
    );

    if (index >= 0) {
      const control = this.getQuantityControl(index);
      const currentQty = control.value;
      if (currentQty < product.stock) {
        control.setValue(currentQty + 1);
      } else {
        this.showToast('warn', 'Atención', `Stock máximo alcanzado para ${product.name}`);
      }
    } else {
      const itemGroup = this.fb.group({
        product_id: [product.id, [Validators.required]],
        quantity: [1, [Validators.required, Validators.min(1)]]
      });
      this.items.push(itemGroup);
      this.showToast('success', 'Agregado', `${product.name} agregado al carrito`);
    }
  }

  removeItem(index: number): void {
    this.items.removeAt(index);
  }

  getProductById(id: number | null): Product | undefined {
    if (!id) return undefined;
    return this.products.find((p: Product) => p.id === +id);
  }

  getSubtotal(index: number): number {
    const group = this.getItemGroup(index);
    const productId: number = group.get('product_id')?.value;
    const quantity: number = group.get('quantity')?.value ?? 0;
    const product = this.getProductById(productId);
    if (!product || quantity < 1) return 0;
    return product.price * quantity;
  }

  getTotal(): number {
    return this.items.controls.reduce((acc: number, _, index: number) => {
      return acc + this.getSubtotal(index);
    }, 0);
  }

  getAvailableStock(index: number): number {
    const productId = this.getItemGroup(index).get('product_id')?.value;
    const product = this.getProductById(productId);
    return product?.stock ?? 0;
  }

  onSubmit(): void {
    if (this.form.invalid || this.submitting || this.items.length === 0) {
      if (this.items.length === 0) {
        this.showToast('warn', 'Atención', 'El carrito está vacío');
      }
      return;
    }

    const payload: CreateSaleRequest = {
      user_id: 1,
      items: this.items.controls.map((ctrl: AbstractControl) => {
        const group = ctrl as FormGroup;
        return {
          product_id: +group.get('product_id')!.value,
          quantity: +group.get('quantity')!.value
        } as SaleItem;
      })
    };

    this.submitting = true;
    this.saleService.createSale(payload).subscribe({
      next: (res) => {
        this.submitting = false;
        localStorage.removeItem('posCart'); // Limpiar el carrito guardado
        this.showToast('success', 'Éxito', `Venta #${res.sale_id} creada – Total: Bs. ${res.total.toFixed(2)}`);
        
        // Podemos imprimir la nota de venta directamente o ir a la lista. 
        // Para imprimir al vender, abriremos un popup rápido y luego navegaremos
        this.printReceipt(res.sale_id, res.total, payload.items);
        this.router.navigate(['/ventas']);
      },
      error: (err) => {
        this.submitting = false;
        const msg = err?.error?.error ?? 'Error al crear la venta';
        this.showToast('error', 'Error', msg);
      }
    });
  }

  // --- Nueva función para imprimir nota de venta ---
  private printReceipt(saleId: number, total: number, items: SaleItem[]): void {
    let receiptHtml = `
      <html>
        <head>
          <title>Nota de Venta #${saleId}</title>
          <style>
            body { font-family: 'Courier New', Courier, monospace; font-size: 14px; color: #000; background: #f0f0f0; margin: 0; padding: 20px; display: flex; flex-direction: column; align-items: center; }
            .ticket { background: #fff; width: 80mm; padding: 15px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); border: 1px solid #ddd; }
            .header { text-align: center; margin-bottom: 20px; }
            .header h2 { margin: 0; font-size: 18px; }
            .header p { margin: 2px 0; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 12px; }
            th, td { padding: 4px 0; border-bottom: 1px dashed #ccc; text-align: left; }
            th.right, td.right { text-align: right; }
            .total { font-size: 16px; font-weight: bold; text-align: right; margin-top: 10px; border-top: 1px dashed #000; padding-top: 10px; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; font-weight: bold; }
            
            .actions { margin-top: 20px; display: flex; gap: 10px; }
            .actions button { padding: 10px 20px; cursor: pointer; border: none; border-radius: 4px; font-weight: bold; }
            .btn-print { background: #0d6efd; color: white; }
            .btn-close { background: #6c757d; color: white; }
            
            @media print {
              body { background: transparent; padding: 0; display: block; margin: 0; }
              .ticket { box-shadow: none; border: none; width: 80mm; padding: 0; margin: 0; }
              .actions { display: none !important; }
            }
          </style>
        </head>
        <body>
          <div class="ticket">
            <div class="header">
              <h2>SISTEMA POS</h2>
              <p>Comprobante de Venta</p>
              <p>Venta #${saleId}</p>
              <p>Fecha: ${new Date().toLocaleString()}</p>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Cant</th>
                  <th>Producto</th>
                  <th class="right">Subtotal</th>
                </tr>
              </thead>
              <tbody>
    `;

    items.forEach(item => {
      const p = this.getProductById(item.product_id);
      if (p) {
        const sub = p.price * item.quantity;
        receiptHtml += `
          <tr>
            <td>${item.quantity}</td>
            <td>${p.name}</td>
            <td class="right">Bs. ${sub.toFixed(2)}</td>
          </tr>
        `;
      }
    });

    receiptHtml += `
              </tbody>
            </table>
            <div class="total">TOTAL: Bs. ${total.toFixed(2)}</div>
            <div class="footer">¡Gracias por su compra!</div>
          </div>
          <div class="actions">
            <button class="btn-print" onclick="window.print()">Imprimir Ticket</button>
            <button class="btn-close" onclick="window.close()">Cerrar</button>
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank', 'width=450,height=650,left=200,top=100');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(receiptHtml);
      printWindow.document.close();
    }
  }

  private showToast(severity: string, summary: string, detail: string): void {
    this.messageService.add({ severity, summary, detail, life: 4000 });
  }

  preventInvalidKeys(event: KeyboardEvent): void {
    if (['-', 'e', 'E', '+', '.', ','].includes(event.key)) {
      event.preventDefault();
    }
  }

  enforceQuantityBounds(index: number): void {
    const control = this.getQuantityControl(index);
    let value = control.value;
    const max = this.getAvailableStock(index);
    
    if (value === null || value === undefined || value < 1) {
      control.setValue(1);
    } else if (max > 0 && value > max) {
      control.setValue(max);
      this.showToast('warn', 'Atención', `Solo hay ${max} unidades disponibles de este producto`);
    }
  }
}
