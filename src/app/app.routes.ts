import { Routes } from '@angular/router';
import { PublicHomeComponent } from './pages/public-home/public-home';
import { LoginComponent } from './pages/login/login';
import { RegisterComponent } from './pages/register/register';
import { DashboardComponent } from './pages/dashboard/dashboard';
import { UserHomeComponent } from './pages/user-home/user-home';
import { VehiclesComponent } from './pages/vehicles/vehicles';
import { ProfileComponent } from './pages/profile/profile';
import { PetComponent } from './pages/pet/pet';
import { AdminIncidentsComponent } from './pages/admin-incidents/admin-incidents';
import { RecoveryComponent } from './pages/recovery/recovery';
import { ShopComponent } from './pages/shop/shop';
import { RoutesComponent } from './pages/routes/routes';
import { AdminUsersComponent } from './pages/admin-users/admin-users';
import { AdminUserDetailComponent } from './pages/admin-user-detail/admin-user-detail';
import { authGuard } from './core/guards/auth-guard';
import { adminGuard } from './core/guards/admin-guard';

//rutas de la app con sus guards
export const routes: Routes = [
  { path: 'home',      component: PublicHomeComponent },
  { path: 'login',     component: LoginComponent },
  { path: 'register',  component: RegisterComponent },
  { path: 'recovery',  component: RecoveryComponent },

  { path: 'dashboard',        component: DashboardComponent,       canActivate: [adminGuard] },
  { path: 'admin/incidents',  component: AdminIncidentsComponent,  canActivate: [adminGuard] },
  { path: 'admin/users',      component: AdminUsersComponent,      canActivate: [adminGuard] },
  { path: 'admin/users/:id',  component: AdminUserDetailComponent, canActivate: [adminGuard] },

  { path: 'user-home', component: UserHomeComponent,  canActivate: [authGuard] },
  { path: 'vehicles',  component: VehiclesComponent,  canActivate: [authGuard] },
  { path: 'profile',   component: ProfileComponent,   canActivate: [authGuard] },
  { path: 'pet',       component: PetComponent,       canActivate: [authGuard] },
  { path: 'shop',      component: ShopComponent,      canActivate: [authGuard] },
  { path: 'routes',    component: RoutesComponent,    canActivate: [authGuard] },

  { path: '',   redirectTo: '/home', pathMatch: 'full' },
  { path: '**', redirectTo: '/home' }
];
