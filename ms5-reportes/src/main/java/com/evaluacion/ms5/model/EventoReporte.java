package com.evaluacion.ms5.model;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "evento_reporte")
public class EventoReporte {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String reporteId;

    @Column(nullable = false)
    private String tipo;

    @Column
    private String descripcion;

    @Column
    private Long monto;

    @Column
    private String sucursal;

    @Column
    private LocalDate fecha;

    @Column
    private LocalDateTime createdAt;

    public EventoReporte() {}

    public EventoReporte(Long id, String reporteId, String tipo, String descripcion,
                         Long monto, String sucursal, LocalDate fecha) {
        this.id          = id;
        this.reporteId   = reporteId;
        this.tipo        = tipo;
        this.descripcion = descripcion;
        this.monto       = monto;
        this.sucursal    = sucursal;
        this.fecha       = fecha;
        this.createdAt   = LocalDateTime.now();
    }

    public Long getId()                             { return id; }
    public void setId(Long id)                      { this.id = id; }
    public String getReporteId()                    { return reporteId; }
    public void setReporteId(String reporteId)      { this.reporteId = reporteId; }
    public String getTipo()                         { return tipo; }
    public void setTipo(String tipo)                { this.tipo = tipo; }
    public String getDescripcion()                  { return descripcion; }
    public void setDescripcion(String descripcion)  { this.descripcion = descripcion; }
    public Long getMonto()                          { return monto; }
    public void setMonto(Long monto)                { this.monto = monto; }
    public String getSucursal()                     { return sucursal; }
    public void setSucursal(String sucursal)        { this.sucursal = sucursal; }
    public LocalDate getFecha()                     { return fecha; }
    public void setFecha(LocalDate fecha)           { this.fecha = fecha; }
    public LocalDateTime getCreatedAt()                         { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt)           { this.createdAt = createdAt; }
}
