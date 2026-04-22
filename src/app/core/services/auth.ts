import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private url = 'http://localhost:8000/api/login';

  login(credentials: any) {
    return this.http.post<any>(this.url, credentials).pipe(
      tap(res => {
        let token = res.access_token;
        if (token) {
          localStorage.setItem('token', token);
        }
      })
    );
  }

  isLoggedIn(): boolean {
    let token = localStorage.getItem('token');
    let authenticated = false;
    
    if (token) {
      authenticated = true;
    }
    
    return authenticated;
  }
}