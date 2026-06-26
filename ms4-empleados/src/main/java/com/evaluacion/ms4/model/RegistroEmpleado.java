package com.evaluacion.ms4.model;

import java.time.LocalDate;
import java.time.LocalDateTime;

public class RegistroEmpleado {
    private Long id;
    private String empleadoId;
    private String nombre;
    private String sucursal;
    private String turno;
    private Double horasTrabajadas;
    private LocalDate fecha;
    private LocalDateTime createdAt;

    public RegistroEmpleado() {}

    public RegistroEmpleado(Long id, String empleadoId, String nombre, String sucursal,
                            String turno, Double horasTrabajadas, LocalDate fecha) {
        this.id = id;
        this.empleadoId = empleadoId;
        this.nombre = nombre;
        this.sucursal = sucursal;
        this.turno = turno;
        this.horasTrabajadas = horasTrabajadas;
        this.fecha = fecha;
        this.createdAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getEmpleadoId() { return empleadoId; }
    public String getNombre() { return nombre; }
    public String getSucursal() { return sucursal; }
    public String getTurno() { return turno; }
    public Double getHorasTrabajadas() { return horasTrabajadas; }
    public LocalDate getFecha() { return fecha; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
