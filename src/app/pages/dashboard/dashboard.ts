import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class DashboardComponent implements OnInit {
  private router = inject(Router);
  private authService = inject(AuthService);

  user: any = null;
  errorMessage = '';

  ngOnInit(): void {
    this.authService.getUser(1).subscribe({
      next: (res: any) => {
        this.user = res;
      },
      error: (err: any) => {
        this.errorMessage = 'No se pudo cargar el usuario desde Laravel.';
        console.error(err);
      }
    });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}