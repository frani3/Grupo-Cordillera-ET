package com.evaluacion.orqrep.model;

import jakarta.persistence.*;
import java.time.Instant;

// BD REP: snapshot de reportes financieros consolidados desde MS5
@Entity
@Table(name = "reporte_snapshot")
public class ReporteSnapshot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "request_id")
    private String requestId;

    @Column(name = "total_eventos")
    private Integer totalEventos;

    @Column(name = "total_monto")
    private Double totalMonto;

    @Column(name = "timestamp")
    private Instant timestamp;

    public ReporteSnapshot() {}

    public ReporteSnapshot(String requestId, Integer totalEventos, Double totalMonto) {
        this.requestId = requestId;
        this.totalEventos = totalEventos;
        this.totalMonto = totalMonto;
        this.timestamp = Instant.now();
    }

    public Long getId() { return id; }
    public String getRequestId() { return requestId; }
    public Integer getTotalEventos() { return totalEventos; }
    public Double getTotalMonto() { return totalMonto; }
    public Instant getTimestamp() { return timestamp; }
}
