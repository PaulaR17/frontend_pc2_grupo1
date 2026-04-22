import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login'; 
import { authGuard } from './core/guards/auth-guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { 
    path: 'dashboard', 
    canActivate: [authGuard], 

    loadComponent: () => import('./pages/dashboard/dashboard').then(m => m.DashboardComponent)
  }
];