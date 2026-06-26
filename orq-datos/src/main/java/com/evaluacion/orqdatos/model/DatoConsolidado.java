package com.evaluacion.orqdatos.model;

import jakarta.persistence.*;
import java.time.Instant;

// BD DATOS: snapshot de cada consolidacion de MS1 + MS2
@Entity
@Table(name = "dato_consolidado")
public class DatoConsolidado {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "request_id")
    private String requestId;

    @Column(name = "total_transacciones")
    private Integer totalTransacciones;

    @Column(name = "total_monto")
    private Double totalMonto;

    @Column(name = "estrategia")
    private String estrategia;

    @Column(name = "resultado", length = 1000)
    private String resultado;

    @Column(name = "timestamp")
    private Instant timestamp;

    public DatoConsolidado() {}

    public DatoConsolidado(String requestId, Integer totalTransacciones,
                           Double totalMonto, String estrategia, String resultado) {
        this.requestId = requestId;
        this.totalTransacciones = totalTransacciones;
        this.totalMonto = totalMonto;
        this.estrategia = estrategia;
        this.resultado = resultado;
        this.timestamp = Instant.now();
    }

    public Long getId() { return id; }
    public String getRequestId() { return requestId; }
    public Integer getTotalTransacciones() { return totalTransacciones; }
    public Double getTotalMonto() { return totalMonto; }
    public String getEstrategia() { return estrategia; }
    public String getResultado() { return resultado; }
    public Instant getTimestamp() { return timestamp; }
}
