import { Component, OnInit } from '@angular/core';
import { Sale } from '../../core/models/sale.model';
import { SaleService } from '../../core/services/sale.service';
import { ConfirmationService, MessageService } from 'primeng/api';

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
    private messageService: MessageService,
    private confirmationService: ConfirmationService
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
    this.confirmationService.confirm({
      message: '¿Estás seguro de que deseas eliminar esta venta? El stock será restaurado.',
      header: 'Confirmar Eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-text',
      accept: () => {
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
    });
  }

  private showToast(severity: string, summary: string, detail: string): void {
    this.messageService.add({ severity, summary, detail, life: 3000 });
  }

  printReceipt(sale: Sale): void {
    let receiptHtml = `
      <html>
        <head>
          <title>Nota de Venta #${sale.id}</title>
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
              <p>Comprobante de Venta (Copia)</p>
              <p>Venta #${sale.id}</p>
              <p>Fecha: ${new Date(sale.created_at).toLocaleString()}</p>
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

    sale.details?.forEach(detail => {
      receiptHtml += `
        <tr>
          <td>${detail.quantity}</td>
          <td>${detail.product || 'Desconocido'}</td>
          <td class="right">Bs. ${Number(detail.subtotal).toFixed(2)}</td>
        </tr>
      `;
    });

    receiptHtml += `
              </tbody>
            </table>
            <div class="total">TOTAL: Bs. ${Number(sale.total).toFixed(2)}</div>
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
}
