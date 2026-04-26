import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  private apiUrl = 'http://127.0.0.1:8000/api';

  login(data: { mail: string; password: string }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/login`, data).pipe(
      tap((response: any) => {
        this.saveSession(response);
      })
    );
  }

  register(data: {
    name: string;
    mail: string;
    password: string;
    password_confirmation: string;
  }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/register`, data).pipe(
      tap((response: any) => {
        this.saveSession(response);
      })
    );
  }

  me(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/me`, {
      headers: this.getAuthHeaders()
    });
  }

  getUser(userId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/users/${userId}`, {
      headers: this.getAuthHeaders()
    });
  }

  updateUser(userId: number, data: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/users/${userId}`, data, {
      headers: this.getAuthHeaders()
    });
  }

  logoutRequest(): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/logout`, {}, {
      headers: this.getAuthHeaders()
    });
  }

  logout(): void {
    localStorage.clear();
    sessionStorage.clear();
    this.router.navigate(['/login']);
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('token');
  }

  isAdmin(): boolean {
    return localStorage.getItem('user_role') === 'ADMIN';
  }

  getCurrentUserId(): number | null {
    const rawId = localStorage.getItem('user_id');
    return rawId ? Number(rawId) : null;
  }

  getCurrentUserRole(): string | null {
    return localStorage.getItem('user_role');
  }

  getCurrentToken(): string | null {
    return localStorage.getItem('token');
  }

  getAuthHeaders(): HttpHeaders {
    const token = this.getCurrentToken() || '';

    return new HttpHeaders({
      Authorization: `Bearer ${token}`
    });
  }

  private saveSession(response: any): void {
    localStorage.clear();

    const token = response.access_token || response.token;

    if (token) {
      localStorage.setItem('token', token);
    }

    if (response.user) {
      localStorage.setItem('user_id', String(response.user.id));
      localStorage.setItem('user_name', response.user.name ?? '');
      localStorage.setItem('user_mail', response.user.mail ?? '');
      localStorage.setItem('user_role', response.user.rol ?? 'USER');
    }
  }
}