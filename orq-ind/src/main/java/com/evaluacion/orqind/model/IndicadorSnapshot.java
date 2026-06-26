package com.evaluacion.orqind.model;

import jakarta.persistence.*;
import java.time.Instant;

// BD IND: snapshot de indicadores operacionales (inventario + empleados)
@Entity
@Table(name = "indicador_snapshot")
public class IndicadorSnapshot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "request_id")
    private String requestId;

    @Column(name = "total_items_inventario")
    private Integer totalItemsInventario;

    @Column(name = "total_registros_empleados")
    private Integer totalRegistrosEmpleados;

    @Column(name = "total_horas_trabajadas")
    private Double totalHorasTrabajadas;

    @Column(name = "timestamp")
    private Instant timestamp;

    public IndicadorSnapshot() {}

    public IndicadorSnapshot(String requestId, Integer totalItemsInventario,
                             Integer totalRegistrosEmpleados, Double totalHorasTrabajadas) {
        this.requestId = requestId;
        this.totalItemsInventario = totalItemsInventario;
        this.totalRegistrosEmpleados = totalRegistrosEmpleados;
        this.totalHorasTrabajadas = totalHorasTrabajadas;
        this.timestamp = Instant.now();
    }

    public Long getId() { return id; }
    public String getRequestId() { return requestId; }
    public Integer getTotalItemsInventario() { return totalItemsInventario; }
    public Integer getTotalRegistrosEmpleados() { return totalRegistrosEmpleados; }
    public Double getTotalHorasTrabajadas() { return totalHorasTrabajadas; }
    public Instant getTimestamp() { return timestamp; }
}
