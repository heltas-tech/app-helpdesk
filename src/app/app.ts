import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NgxSpinnerModule } from 'ngx-spinner';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NgxSpinnerModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('app-template-angular');
  //title = 'app-sicoes-ceass';
}
