package com.evaluacion.orqdatos.repository;

import com.evaluacion.orqdatos.model.DatoConsolidado;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DatoConsolidadoRepository extends JpaRepository<DatoConsolidado, Long> {
    List<DatoConsolidado> findTop10ByOrderByTimestampDesc();
}
