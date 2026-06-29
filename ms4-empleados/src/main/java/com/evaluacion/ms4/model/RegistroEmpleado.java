package com.evaluacion.ms4.model;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "registro_empleado")
public class RegistroEmpleado {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String empleadoId;

    @Column(nullable = false)
    private String nombre;

    @Column
    private String sucursal;

    @Column
    private String turno;

    @Column
    private Double horasTrabajadas;

    @Column
    private LocalDate fecha;

    @Column
    private LocalDateTime createdAt;

    public RegistroEmpleado() {}

    public RegistroEmpleado(Long id, String empleadoId, String nombre, String sucursal,
                            String turno, Double horasTrabajadas, LocalDate fecha) {
        this.id              = id;
        this.empleadoId      = empleadoId;
        this.nombre          = nombre;
        this.sucursal        = sucursal;
        this.turno           = turno;
        this.horasTrabajadas = horasTrabajadas;
        this.fecha           = fecha;
        this.createdAt       = LocalDateTime.now();
    }

    public Long getId()                             { return id; }
    public void setId(Long id)                      { this.id = id; }
    public String getEmpleadoId()                   { return empleadoId; }
    public void setEmpleadoId(String empleadoId)    { this.empleadoId = empleadoId; }
    public String getNombre()                       { return nombre; }
    public void setNombre(String nombre)            { this.nombre = nombre; }
    public String getSucursal()                     { return sucursal; }
    public void setSucursal(String sucursal)        { this.sucursal = sucursal; }
    public String getTurno()                        { return turno; }
    public void setTurno(String turno)              { this.turno = turno; }
    public Double getHorasTrabajadas()                          { return horasTrabajadas; }
    public void setHorasTrabajadas(Double horasTrabajadas)      { this.horasTrabajadas = horasTrabajadas; }
    public LocalDate getFecha()                     { return fecha; }
    public void setFecha(LocalDate fecha)           { this.fecha = fecha; }
    public LocalDateTime getCreatedAt()                         { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt)           { this.createdAt = createdAt; }
}
