import { Routes } from '@angular/router';
import { PublicHomeComponent } from './pages/public-home/public-home';
import { LoginComponent } from './pages/login/login';
import { RegisterComponent } from './pages/register/register';
import { DashboardComponent } from './pages/dashboard/dashboard';
import { authGuard } from './core/guards/auth-guard';
import { UserHomeComponent } from './pages/user-home/user-home';
import { VehiclesComponent } from './pages/vehicles/vehicles';


export const routes: Routes = [
  { path: 'home', component: PublicHomeComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },
  { path: 'user-home', component: UserHomeComponent},
  { path: 'vehicles', component: VehiclesComponent },
  { path: '', redirectTo: '/home', pathMatch: 'full' },
  { path: '**', redirectTo: '/home' }
];