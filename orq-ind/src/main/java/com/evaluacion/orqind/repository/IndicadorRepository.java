package com.evaluacion.orqind.repository;

import com.evaluacion.orqind.model.IndicadorSnapshot;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface IndicadorRepository extends JpaRepository<IndicadorSnapshot, Long> {
    List<IndicadorSnapshot> findTop10ByOrderByTimestampDesc();
}
