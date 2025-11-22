import { CommonModule } from '@angular/common';
import { Component, inject, ViewChild } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatDialog } from '@angular/material/dialog';
import { NgxSpinnerService } from 'ngx-spinner';
import { Router } from '@angular/router';
import { Usuario as UsuarioInterfase } from '../../interfaces/usuario';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

import { Acceso as AccesoService } from '../../services/acceso';
import { UsuarioModal } from '../usuarios-modal/usuarios-modal';
import { GlobalFuntions as GlobalFunctionsService } from '../../services/global-funtions';

@Component({
  selector: 'app-usuario',
  imports: [
    CommonModule,
    //material
    MatPaginatorModule,
    MatTableModule,
    MatIconModule,
    MatSlideToggleModule
  ],
  templateUrl: './usuario.html',
  styleUrl: './usuario.scss'
})
export class Usuario {
  displayedColumns: string[] = ['nombre', 'email', 'password', 'activo', 'acciones'];
  dataSource = new MatTableDataSource<UsuarioInterfase>([]);
  private router = inject(Router);
  usuarioObjeto: any;

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private global: GlobalFunctionsService,
    private dialog: MatDialog,
    private cargando: NgxSpinnerService,
    private usuarioService: AccesoService,
  ) {
  }

  ngOnInit() {
    this.global.validacionToken();
    this.cargando.show();
    this.usuarioService.lista().subscribe({
      next: unidadOrganizacinal => {
        this.cargando.hide();        
        this.dataSource.data = unidadOrganizacinal;
      },
      error: err => {
        this.cargando.hide();
        if (err.status === 401) {
          console.error('No autorizado:', err.message);
          this.router.navigate(['/login']);
        } else {
          console.error('Error al obtener los unidad organizacional:', err);
        }
      }
    });
  }


  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }

  openModal(data?: any, index?: number, title?: string) {
    const dialogRef = this.dialog.open(UsuarioModal, {
      width: '80%',
      maxWidth: 'unset',
      data: data || null
    });

    dialogRef.afterClosed().subscribe(result => {
      if (!result) return;
      this.usuarioObjeto = {
        nombre: result.nombre,
        email: result.email,
        password: result.password,
        ...(index == null && { password_confirmation: result.password }),
        usuario_registro: data?.nombre || 'admin'
      };

      if (index != null) {
        const updated = [...this.dataSource.data];
        updated[index] = result;

        this.usuarioService.Actualiza(this.usuarioObjeto, result.id).subscribe({
          next: (data) => {
            if (data.isSuccess) {
              console.log(data.message);
              this.ngOnInit();
            }
          },
          error: (error) => {
            console.error('Error al actualizar:', error.message);
          }
        });
      } else {
        this.usuarioService.registrarse(this.usuarioObjeto).subscribe({
          next: (data) => {
            if (data.isSuccess) {
              this.ngOnInit();
            }
          },
          error: (error) => {
            console.error('Error al registrar:', error.message);
          }
        });
      }
    });
  }

  delete(index: number) {
    if (confirm('¿Deseas eliminar este registro?')) {
      const data = [...this.dataSource.data];
      data.splice(index, 1);
      this.dataSource.data = data;
    }
  }

  exportExcel() {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Usuarios');
    worksheet.columns = [
      { header: 'Nombre de usuario', key: 'nombre' },
      { header: 'Correo Electrónico', key: 'email' },
      { header: 'Estado', key: 'activo' },
    ];
    this.dataSource.data.forEach(row => worksheet.addRow(row));
    workbook.xlsx.writeBuffer().then((buffer) => {
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, 'usuario.xlsx');
    });
  }

  exportPDF() {
    const doc = new jsPDF();
    autoTable(doc, {
      head: [['Nombre de usuario', 'Correo Electrónico', 'Estado']],
      body: this.dataSource.data.map(d => [d.nombre, d.email, d.activo])
    });
    doc.save('unidadOrganizacional.pdf');
  }

  toggleActivo(element: any, value: boolean) {
    this.usuarioObjeto = {
      activo: value
    }
    this.usuarioService.Actualiza(this.usuarioObjeto, element.id).subscribe({
      next: (data) => {
        if (data.isSuccess) {
          this.ngOnInit();
        }
      },
      error: (error) => {
        console.log(error.message);
      }
    })
  }
}
