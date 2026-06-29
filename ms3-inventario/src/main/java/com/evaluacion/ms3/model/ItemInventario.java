package com.evaluacion.ms3.model;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "item_inventario")
public class ItemInventario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String itemId;

    @Column
    private String categoria;

    @Column(nullable = false)
    private String nombre;

    @Column
    private Integer cantidad;

    @Column
    private Long precioUnitario;

    @Column
    private String sucursal;

    @Column
    private LocalDate fecha;

    @Column
    private LocalDateTime createdAt;

    public ItemInventario() {}

    public ItemInventario(Long id, String itemId, String categoria, String nombre,
                          Integer cantidad, Long precioUnitario, String sucursal,
                          LocalDate fecha) {
        this.id             = id;
        this.itemId         = itemId;
        this.categoria      = categoria;
        this.nombre         = nombre;
        this.cantidad       = cantidad;
        this.precioUnitario = precioUnitario;
        this.sucursal       = sucursal;
        this.fecha          = fecha;
        this.createdAt      = LocalDateTime.now();
    }

    public Long getId()                        { return id; }
    public void setId(Long id)                 { this.id = id; }
    public String getItemId()                  { return itemId; }
    public void setItemId(String itemId)       { this.itemId = itemId; }
    public String getCategoria()               { return categoria; }
    public void setCategoria(String categoria) { this.categoria = categoria; }
    public String getNombre()                  { return nombre; }
    public void setNombre(String nombre)       { this.nombre = nombre; }
    public Integer getCantidad()               { return cantidad; }
    public void setCantidad(Integer cantidad)  { this.cantidad = cantidad; }
    public Long getPrecioUnitario()                        { return precioUnitario; }
    public void setPrecioUnitario(Long precioUnitario)     { this.precioUnitario = precioUnitario; }
    public String getSucursal()                { return sucursal; }
    public void setSucursal(String sucursal)   { this.sucursal = sucursal; }
    public LocalDate getFecha()                { return fecha; }
    public void setFecha(LocalDate fecha)      { this.fecha = fecha; }
    public LocalDateTime getCreatedAt()                    { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt)      { this.createdAt = createdAt; }
}
