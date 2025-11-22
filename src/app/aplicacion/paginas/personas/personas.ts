import { CommonModule } from '@angular/common';
import { Component, inject, ViewChild } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NgxSpinnerService } from 'ngx-spinner';
import { Router } from '@angular/router';

import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { PersonaInterface } from '../../interfaces/personas.interface';
import { PersonaModal } from '../personas-modal/personas-modal';
import { PersonasService } from '../../services/personas.service';
import { GlobalFuntions as GlobalFunctionsService } from '../../services/global-funtions';

@Component({
  selector: 'app-personas',
  standalone: true,
  imports: [
    CommonModule,
    MatPaginatorModule,
    MatTableModule,
    MatIconModule,
    MatSlideToggleModule,
    MatTooltipModule
  ],
  templateUrl: './personas.html'
})
export class PersonasComponent {
  displayedColumns: string[] = [
    'nombre_completo',
    'ci',
    'telefono', 
    'direccion',
    'activo',
    'acciones'
  ];
  dataSource = new MatTableDataSource<PersonaInterface>([]);
  private router = inject(Router);

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private global: GlobalFunctionsService,
    private dialog: MatDialog,
    private cargando: NgxSpinnerService,
    private personaService: PersonasService
  ) {}

  ngOnInit() {
    this.global.validacionToken();
    this.cargarPersonas();
  }

  cargarPersonas() {
    this.cargando.show();
    this.personaService.lista().subscribe({
      next: (res: any) => {
        this.cargando.hide();
        if (res.isSuccess === false) {
          if (res.status === 401) {
            this.router.navigate(['/login']);
            return;
          }
          Swal.fire('Error', res.message || 'Error al cargar personas', 'error');
          return;
        }

        this.dataSource.data = res.data || [];
        this.dataSource.paginator = this.paginator;

        // Filtro que busque en todos los campos
        this.dataSource.filterPredicate = (data: PersonaInterface, filter: string) => {
          const dataStr = Object.values(data).join(' ').toLowerCase();
          return dataStr.includes(filter);
        };
      },
      error: (err) => {
        this.cargando.hide();
        if (err.status === 401) this.router.navigate(['/login']);
        else console.error('Error al obtener personas:', err);
      }
    });
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
    if (this.dataSource.paginator) this.dataSource.paginator.firstPage();
  }

  openModal(data?: PersonaInterface) {
    const dialogRef = this.dialog.open(PersonaModal, {
      width: '500px',
      data: data ? { ...data } : { 
        id: 0, 
        nombre: '', 
        apellido: '', 
        ci: '', 
        telefono: '', 
        direccion: '', 
        activo: true 
      }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (!result) return;

      const obj = {
        nombre: result.nombre,
        apellido: result.apellido,
        ci: result.ci,
        telefono: result.telefono,
        direccion: result.direccion,
        activo: result.activo
      };

      if (result.id === 0) {
        this.personaService.crear(obj).subscribe({
          next: (res: any) => {
            if (res.isSuccess) {
              Swal.fire('¡Creado!', res.message || 'La persona ha sido creada.', 'success');
              this.cargarPersonas();
            } else {
              Swal.fire('Error', res.message || 'No se pudo crear la persona', 'error');
            }
          },
          error: () => Swal.fire('Error', 'Error al crear la persona', 'error')
        });
      } else {
        this.personaService.actualizar(result.id, obj).subscribe({
          next: (res: any) => {
            if (res.isSuccess) {
              Swal.fire('¡Actualizado!', res.message || 'La persona ha sido actualizada.', 'success');
              this.cargarPersonas();
            } else {
              Swal.fire('Error', res.message || 'No se pudo actualizar la persona', 'error');
            }
          },
          error: () => Swal.fire('Error', 'Error al actualizar la persona', 'error')
        });
      }
    });
  }

  delete(id?: number) {
    if (!id) return;
    Swal.fire({
      title: '¿Estás seguro?',
      text: '¡No podrás revertir esto!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar!',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.personaService.eliminar(id).subscribe({
          next: (res: any) => {
            if (res.isSuccess) {
              Swal.fire('Eliminado!', res.message || 'La persona ha sido eliminada.', 'success');
              this.cargarPersonas();
            } else {
              Swal.fire('Error', res.message || 'No se pudo eliminar la persona', 'error');
            }
          },
          error: () => Swal.fire('Error', 'Error al eliminar la persona', 'error')
        });
      }
    });
  }

  cambiarEstado(persona: PersonaInterface) {
    const nuevoEstado = !persona.activo;
    const accion = nuevoEstado ? 'activar' : 'desactivar';
    
    Swal.fire({
      title: `¿Deseas ${accion} la persona?`,
      text: `La persona "${persona.nombre} ${persona.apellido}" cambiará de estado.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: `Sí, ${accion}`,
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        const obj = {
          nombre: persona.nombre,
          apellido: persona.apellido,
          ci: persona.ci,
          telefono: persona.telefono,
          direccion: persona.direccion,
          activo: nuevoEstado
        };

        this.personaService.actualizar(persona.id!, obj).subscribe({
          next: (res: any) => {
            if (res.isSuccess) {
              Swal.fire('Actualizado!', res.message || 'El estado ha sido cambiado.', 'success');
              this.cargarPersonas();
            } else {
              Swal.fire('Error', res.message || 'No se pudo cambiar el estado', 'error');
            }
          },
          error: () => Swal.fire('Error', 'Error al cambiar el estado', 'error')
        });
      }
    });
  }

  exportExcel() {
    const worksheet = XLSX.utils.json_to_sheet(
      this.dataSource.data.map(p => ({
        'Nombre': p.nombre || '',
        'Apellido': p.apellido || '',
        'CI': p.ci || '',
        'Teléfono': p.telefono || '',
        'Dirección': p.direccion || '',
        'Estado': p.activo ? 'Activo' : 'Inactivo'
      }))
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Personas');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/octet-stream' });
    saveAs(data, `personas_${new Date().toISOString().split('T')[0]}.xlsx`);
  }

  exportPDF() {
    const doc = new jsPDF();
    
    doc.setFontSize(16);
    doc.text('Reporte de Personas', 14, 15);
    
    doc.setFontSize(10);
    doc.text(`Generado: ${new Date().toLocaleDateString()}`, 14, 22);
    
    autoTable(doc, {
      startY: 30,
      head: [['Nombre', 'Apellido', 'CI', 'Teléfono', 'Dirección', 'Estado']],
      body: this.dataSource.data.map(p => [
        p.nombre || '',
        p.apellido || '',
        p.ci || '',
        p.telefono || '',
        p.direccion || '',
        p.activo ? 'Activo' : 'Inactivo'
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [59, 130, 246] }
    });
    
    doc.save(`personas_${new Date().toISOString().split('T')[0]}.pdf`);
  }
}