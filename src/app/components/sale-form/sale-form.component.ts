import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators, AbstractControl } from '@angular/forms';
import { Router } from '@angular/router';
import { Product } from '../../core/models/product.model';
import { CreateSaleRequest, SaleItem } from '../../core/models/sale.model';
import { ProductService } from '../../core/services/product.service';
import { SaleService } from '../../core/services/sale.service';
import Toastify from 'toastify-js';

@Component({
  selector: 'app-sale-form',
  templateUrl: './sale-form.component.html',
  styleUrls: ['./sale-form.component.scss']
})
export class SaleFormComponent implements OnInit {
  products: Product[] = [];
  form: FormGroup;
  submitting: boolean = false;
  loadingProducts: boolean = false;

  constructor(
    private fb: FormBuilder,
    private productService: ProductService,
    private saleService: SaleService,
    private router: Router
  ) {
    this.form = this.fb.group({
      items: this.fb.array([])
    });
  }

  ngOnInit(): void {
    this.loadProducts();
    this.addItem();
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

  loadProducts(): void {
    this.loadingProducts = true;
    this.productService.getProducts().subscribe({
      next: (data: Product[]) => {
        this.products = data.filter((p: Product) => p.stock > 0);
        this.loadingProducts = false;
      },
      error: () => {
        this.loadingProducts = false;
        this.showToast('No se pudo cargar los productos', '#e74c3c');
      }
    });
  }

  addItem(): void {
    const itemGroup: FormGroup = this.fb.group({
      product_id: [null, [Validators.required]],
      quantity: [1, [Validators.required, Validators.min(1)]]
    });
    this.items.push(itemGroup);
  }

  removeItem(index: number): void {
    if (this.items.length > 1) {
      this.items.removeAt(index);
    }
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
    if (this.form.invalid || this.submitting) return;

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
        this.showToast(`Venta #${res.sale_id} creada – Total: Bs. ${res.total.toFixed(2)}`, '#27ae60');
        this.router.navigate(['/ventas']);
      },
      error: (err) => {
        this.submitting = false;
        const msg = err?.error?.error ?? 'Error al crear la venta';
        this.showToast(msg, '#e74c3c');
      }
    });
  }

  private showToast(message: string, background: string): void {
    Toastify({
      text: message,
      duration: 4000,
      gravity: 'top',
      position: 'right',
      style: { background }
    }).showToast();
  }

  preventInvalidKeys(event: KeyboardEvent): void {
    // Evitar signos negativos, letras (como la 'e'), suma y punto decimal en cantidades
    if (['-', 'e', 'E', '+', '.', ','].includes(event.key)) {
      event.preventDefault();
    }
  }

  enforceQuantityBounds(index: number): void {
    const control = this.getQuantityControl(index);
    let value = control.value;
    const max = this.getAvailableStock(index);
    
    // Si dejan el campo vacío o ponen menos de 1, se fuerza a 1
    if (value === null || value === undefined || value < 1) {
      control.setValue(1);
    } 
    // Si ponen más del stock, se fuerza al stock máximo
    else if (max > 0 && value > max) {
      control.setValue(max);
      this.showToast(`Solo hay ${max} unidades disponibles de este producto`, '#f39c12');
    }
  }
}
