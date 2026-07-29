import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Sale,
  CreateSaleRequest,
  CreateSaleResponse,
  DeleteSaleResponse
} from '../models/sale.model';

@Injectable({
  providedIn: 'root'
})
export class SaleService {
  private readonly apiUrl: string = `${environment.apiUrl}/sales`;

  constructor(private http: HttpClient) {}

  getSales(): Observable<Sale[]> {
    return this.http.get<{data: Sale[]}>(this.apiUrl).pipe(
      map(response => response.data)
    );
  }

  createSale(data: CreateSaleRequest): Observable<CreateSaleResponse> {
    return this.http.post<CreateSaleResponse>(this.apiUrl, data);
  }

  deleteSale(id: number): Observable<DeleteSaleResponse> {
    return this.http.delete<DeleteSaleResponse>(`${this.apiUrl}/${id}`);
  }
}
