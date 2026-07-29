import { Component, OnInit } from '@angular/core';
import { Sale } from '../../core/models/sale.model';
import { SaleService } from '../../core/services/sale.service';
import Toastify from 'toastify-js';

@Component({
  selector: 'app-sales',
  templateUrl: './sales.component.html',
  styleUrls: ['./sales.component.scss']
})
export class SalesComponent implements OnInit {
  sales: Sale[] = [];
  loading: boolean = false;
  deletingId: number | null = null;
  error: string | null = null;
  expandedSaleId: number | null = null;

  constructor(private saleService: SaleService) {}

  ngOnInit(): void {
    this.loadSales();
  }

  loadSales(): void {
    this.loading = true;
    this.error = null;
    this.saleService.getSales().subscribe({
      next: (data: Sale[]) => {
        this.sales = data;
        this.loading = false;
      },
      error: () => {
        this.error = 'No se pudo cargar la lista de ventas. Verifica que el servidor esté activo.';
        this.loading = false;
      }
    });
  }

  toggleDetail(saleId: number): void {
    this.expandedSaleId = this.expandedSaleId === saleId ? null : saleId;
  }

  deleteSale(id: number): void {
    if (!confirm('¿Estás seguro de que deseas eliminar esta venta?')) return;

    this.deletingId = id;
    this.saleService.deleteSale(id).subscribe({
      next: () => {
        this.sales = this.sales.filter((s: Sale) => s.id !== id);
        this.deletingId = null;
        this.showToast('Venta eliminada correctamente', '#27ae60');
      },
      error: () => {
        this.deletingId = null;
        this.showToast('Error al eliminar la venta', '#e74c3c');
      }
    });
  }

  private showToast(message: string, background: string): void {
    Toastify({
      text: message,
      duration: 3000,
      gravity: 'top',
      position: 'right',
      style: { background }
    }).showToast();
  }
}
