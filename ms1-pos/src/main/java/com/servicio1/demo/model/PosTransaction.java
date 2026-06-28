package com.servicio1.demo.model;

import lombok.Data;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class PosTransaction {
    private Long id;
    private String transactionId;
    private String sucursal;
    private String cajaId;
    private LocalDate fecha;
    private Long montoTotal;
    private String metodoPago;
    private String vendedorId;
    private String status;
    private LocalDateTime createdAt = LocalDateTime.now();
    private List<PosTransactionItem> items;
}
