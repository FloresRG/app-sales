import { Component, OnInit } from '@angular/core';
import { Sale } from '../../core/models/sale.model';
import { SaleService } from '../../core/services/sale.service';
import { MessageService } from 'primeng/api';

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

  constructor(
    private saleService: SaleService,
    private messageService: MessageService
  ) {}

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
        this.showToast('error', 'Error', this.error);
      }
    });
  }

  deleteSale(id: number): void {
    if (!confirm('¿Estás seguro de que deseas eliminar esta venta?')) return;

    this.deletingId = id;
    this.saleService.deleteSale(id).subscribe({
      next: () => {
        this.sales = this.sales.filter((s: Sale) => s.id !== id);
        this.deletingId = null;
        this.showToast('success', 'Éxito', 'Venta eliminada correctamente');
      },
      error: () => {
        this.deletingId = null;
        this.showToast('error', 'Error', 'Error al eliminar la venta');
      }
    });
  }

  private showToast(severity: string, summary: string, detail: string): void {
    this.messageService.add({ severity, summary, detail, life: 3000 });
  }
}
