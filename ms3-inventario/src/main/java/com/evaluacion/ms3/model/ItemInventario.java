package com.evaluacion.ms3.model;

import java.time.LocalDate;
import java.time.LocalDateTime;

public class ItemInventario {
    private Long id;
    private String itemId;
    private String categoria;
    private String nombre;
    private Integer cantidad;
    private Long precioUnitario;
    private String sucursal;
    private LocalDate fecha;
    private LocalDateTime createdAt;

    public ItemInventario() {}

    public ItemInventario(Long id, String itemId, String categoria, String nombre,
                          Integer cantidad, Long precioUnitario, String sucursal,
                          LocalDate fecha) {
        this.id = id;
        this.itemId = itemId;
        this.categoria = categoria;
        this.nombre = nombre;
        this.cantidad = cantidad;
        this.precioUnitario = precioUnitario;
        this.sucursal = sucursal;
        this.fecha = fecha;
        this.createdAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getItemId() { return itemId; }
    public String getCategoria() { return categoria; }
    public String getNombre() { return nombre; }
    public Integer getCantidad() { return cantidad; }
    public Long getPrecioUnitario() { return precioUnitario; }
    public String getSucursal() { return sucursal; }
    public LocalDate getFecha() { return fecha; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
