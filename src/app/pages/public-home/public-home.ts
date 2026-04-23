import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-public-home',
  standalone: true,
  imports: [RouterModule], 
  templateUrl: './public-home.html',
  styleUrls: ['./public-home.scss']
})
export class PublicHomeComponent {
  errorMessage: string | null = null;

  constructor() {}

  triggerError(message: string): void {
    this.errorMessage = message;
  }

  clearError(): void {
    this.errorMessage = null;
  }
}