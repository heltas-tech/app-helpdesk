import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-test-route',
  template: `<h1>✅ Ruta de prueba FUNCIONA</h1>`,
  standalone: true,
  imports: [CommonModule]
})
export class TestRouteComponent {}