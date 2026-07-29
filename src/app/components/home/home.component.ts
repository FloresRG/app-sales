import { Component, OnInit } from '@angular/core';
import { ProductService } from '../../core/services/product.service';
import { SaleService } from '../../core/services/sale.service';
import { Product } from '../../core/models/product.model';
import { Sale } from '../../core/models/sale.model';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  totalProducts: number = 0;
  totalSales: number = 0;
  totalRevenue: number = 0;
  loading: boolean = true;

  constructor(
    private productService: ProductService,
    private saleService: SaleService
  ) {}

  ngOnInit(): void {
    this.productService.getProducts().subscribe({
      next: (products: Product[]) => {
        this.totalProducts = products.length;
        this.checkLoading();
      },
      error: () => this.checkLoading()
    });

    this.saleService.getSales().subscribe({
      next: (sales: Sale[]) => {
        this.totalSales = sales.length;
        this.totalRevenue = sales.reduce((sum: number, s: Sale) => sum + s.total, 0);
        this.checkLoading();
      },
      error: () => this.checkLoading()
    });
  }

  private checkLoading(): void {
    this.loading = false;
  }
}
