package com.evaluacion.ms4.repository;

import com.evaluacion.ms4.model.RegistroEmpleado;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface EmpleadoRepository extends JpaRepository<RegistroEmpleado, Long> {

    List<RegistroEmpleado> findBySucursal(String sucursal);
    List<RegistroEmpleado> findByTurno(String turno);
    List<RegistroEmpleado> findBySucursalAndTurno(String sucursal, String turno);
}
