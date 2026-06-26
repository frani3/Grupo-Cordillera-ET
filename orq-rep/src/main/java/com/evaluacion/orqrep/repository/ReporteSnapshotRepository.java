package com.evaluacion.orqrep.repository;

import com.evaluacion.orqrep.model.ReporteSnapshot;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ReporteSnapshotRepository extends JpaRepository<ReporteSnapshot, Long> {
    List<ReporteSnapshot> findTop10ByOrderByTimestampDesc();
}
