package com.evaluacion.ms5.model;

import java.time.LocalDate;
import java.time.LocalDateTime;

public class EventoReporte {
    private Long id;
    private String reporteId;
    private String tipo;
    private String descripcion;
    private Double monto;
    private String sucursal;
    private LocalDate fecha;
    private LocalDateTime createdAt;

    public EventoReporte() {}

    public EventoReporte(Long id, String reporteId, String tipo, String descripcion,
                         Double monto, String sucursal, LocalDate fecha) {
        this.id = id;
        this.reporteId = reporteId;
        this.tipo = tipo;
        this.descripcion = descripcion;
        this.monto = monto;
        this.sucursal = sucursal;
        this.fecha = fecha;
        this.createdAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getReporteId() { return reporteId; }
    public String getTipo() { return tipo; }
    public String getDescripcion() { return descripcion; }
    public Double getMonto() { return monto; }
    public String getSucursal() { return sucursal; }
    public LocalDate getFecha() { return fecha; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
