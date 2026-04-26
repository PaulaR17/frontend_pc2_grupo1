import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './register.html',
  styleUrls: ['./register.scss']
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private authService = inject(AuthService);

  registerForm: FormGroup;
  errorMessage = '';
  successMessage = '';
  loading = false;

  constructor() {
    this.registerForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.maxLength(100)]],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(100)]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });
  }

  passwordMatchValidator(form: FormGroup) {
    const password = form.get('password')?.value;
    const confirmPassword = form.get('confirmPassword')?.value;

    if (password === confirmPassword) {
      return null;
    }

    return { mismatch: true };
  }

  onSubmit(): void {
    this.errorMessage = '';
    this.successMessage = '';

    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      this.errorMessage = 'Revisa los campos del formulario.';
      return;
    }

    const formValue = this.registerForm.value;

    const payload = {
      name: formValue.nombre,
      mail: formValue.email,
      password: formValue.password,
      password_confirmation: formValue.confirmPassword
    };

    this.loading = true;

    this.authService.register(payload).subscribe({
      next: () => {
        this.loading = false;
        this.successMessage = 'Cuenta creada correctamente.';
        this.router.navigate(['/user-home']);
      },
      error: (err: any) => {
        this.loading = false;

        if (err.status === 422) {
          this.errorMessage = 'El email ya existe o hay algún dato incorrecto.';
          return;
        }

        this.errorMessage = 'No se pudo crear la cuenta. Revisa el backend.';
        console.error('Error registrando usuario:', err);
      }
    });
  }
}