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
    this.registerForm = this.fb.group(
      {
        nombre: ['', [Validators.required, Validators.maxLength(100)]],
        email: ['', [Validators.required, Validators.email, Validators.maxLength(100)]],
        password: ['', [Validators.required, Validators.minLength(8)]],
        confirmPassword: ['', Validators.required]
      },
      { validators: this.passwordMatchValidator }
    );
  }

  //valida que las dos contraseñas coincidan
  passwordMatchValidator(form: FormGroup) {
    const password = form.get('password')?.value;
    const confirmPassword = form.get('confirmPassword')?.value;

    const coinciden = password === confirmPassword;
    return coinciden ? null : { mismatch: true };
  }

  //true si el campo esta tocado y no valida
  esInvalido(nombreCampo: string): boolean {
    const campo = this.registerForm.get(nombreCampo);
    return !!campo && campo.invalid && campo.touched;
  }

  //envia el registro si el formulario esta bien
  onSubmit(): void {
    this.errorMessage = '';
    this.successMessage = '';

    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      this.errorMessage = 'Revisa los campos del formulario.';
    } else {
      this.enviarRegistro();
    }
  }

  private enviarRegistro(): void {
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
        this.errorMessage = this.traducirErrorRegistro(err);
        console.error('Error registrando usuario:', err);
      }
    });
  }

  //traduce el error HTTP a un mensaje legible
  private traducirErrorRegistro(err: any): string {
    let mensaje = 'No se pudo crear la cuenta. Revisa el backend.';

    if (err?.status === 422) {
      mensaje = 'El email ya existe o hay algún dato incorrecto.';
    } else if (err?.status === 0) {
      mensaje = 'No se puede contactar con el servidor.';
    }

    return mensaje;
  }
}
