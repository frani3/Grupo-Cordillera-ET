package com.servicio1.demo.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.Data;

@Data
public class PosTransactionItem {
    private Long id;

    @JsonIgnore
    private PosTransaction transaction;

    private String sku;
    private Integer cantidad;
    private Double precioUnitario;
}
