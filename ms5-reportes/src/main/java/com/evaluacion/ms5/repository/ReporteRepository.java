package com.evaluacion.ms5.repository;

import com.evaluacion.ms5.model.EventoReporte;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ReporteRepository extends JpaRepository<EventoReporte, Long> {

    List<EventoReporte> findBySucursal(String sucursal);
    List<EventoReporte> findByTipo(String tipo);
    List<EventoReporte> findBySucursalAndTipo(String sucursal, String tipo);
}
