import { Routes } from '@angular/router';
import { PublicHomeComponent } from './pages/public-home/public-home';
import { LoginComponent } from './pages/login/login';
import { RegisterComponent} from './pages/register/register';

// AÑADE 'export' justo antes de 'const'
export const routes: Routes = [
  { path: 'home', component: PublicHomeComponent },
  { path: 'login', component: LoginComponent },
  { path: '', redirectTo: '/home', pathMatch: 'full' },
  { path: 'register', component: RegisterComponent }
];